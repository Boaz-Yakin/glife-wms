-- Migration: 20261024130500_update_dynamic_thresholds_rpc.sql
-- Description: Update calculate_item_dynamic_thresholds with valid order_status enums

CREATE OR REPLACE FUNCTION public.calculate_item_dynamic_thresholds(
  p_client_id UUID DEFAULT NULL,
  p_lookback_days INT DEFAULT 30
)
RETURNS TABLE (
  item_id UUID,
  sku VARCHAR,
  name_en VARCHAR,
  lead_time_days INT,
  daily_velocity NUMERIC,
  demand_std_dev NUMERIC,
  safety_stock INT,
  reorder_point INT,
  surplus_point INT,
  has_history BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH order_scope AS (
    SELECT 
      o.id AS order_id,
      o.order_date::DATE AS o_date,
      o.client_id
    FROM public.orders o
    WHERE o.order_date >= (CURRENT_DATE - (p_lookback_days || ' days')::INTERVAL)
      AND o.status IN ('SHIPPED', 'DISPATCHED', 'PACKED', 'INVOICED', 'PICKED')
      AND (p_client_id IS NULL OR o.client_id = p_client_id)
  ),
  daily_item_outbound AS (
    SELECT
      oi.item_id,
      os.o_date,
      SUM(oi.qty) AS daily_qty
    FROM public.order_items oi
    JOIN order_scope os ON os.order_id = oi.order_id
    GROUP BY oi.item_id, os.o_date
  ),
  item_stats AS (
    SELECT
      dio.item_id,
      -- Average daily usage over lookback period (total outbound / lookback days)
      ROUND(COALESCE(SUM(dio.daily_qty), 0)::NUMERIC / GREATEST(p_lookback_days, 1), 2) AS adu,
      -- Sample standard deviation of daily outbound
      ROUND(COALESCE(STDDEV_SAMP(dio.daily_qty), 0)::NUMERIC, 2) AS std_dev,
      COUNT(DISTINCT dio.o_date) AS active_days
    FROM daily_item_outbound dio
    GROUP BY dio.item_id
  )
  SELECT
    i.id AS item_id,
    i.sku,
    i.name_en,
    COALESCE(i.lead_time_days, 7) AS lead_time_days,
    COALESCE(st.adu, 0)::NUMERIC AS daily_velocity,
    COALESCE(st.std_dev, 0)::NUMERIC AS demand_std_dev,
    -- 1) Calculated Safety Stock (SS):
    -- If sales history exists: SS = Ceil(Z * σ_D * sqrt(L))
    -- If no history: fallback to configured min_stock_qty or default 10
    CASE 
      WHEN st.item_id IS NOT NULL AND st.adu > 0 THEN
        GREATEST(
          1,
          CEIL(COALESCE(i.target_service_level, 0.95) * 1.73 * GREATEST(COALESCE(st.std_dev, st.adu * 0.5), 0.5) * SQRT(COALESCE(i.lead_time_days, 7)))
        )::INT
      ELSE
        GREATEST(COALESCE(i.min_stock_qty, 10), 1)::INT
    END AS safety_stock,
    -- 2) Reorder Point (ROP = ADU * L + SS):
    -- Level where order should be placed
    CASE 
      WHEN st.item_id IS NOT NULL AND st.adu > 0 THEN
        GREATEST(
          CASE 
            WHEN st.item_id IS NOT NULL AND st.adu > 0 THEN
              GREATEST(1, CEIL(COALESCE(i.target_service_level, 0.95) * 1.73 * GREATEST(COALESCE(st.std_dev, st.adu * 0.5), 0.5) * SQRT(COALESCE(i.lead_time_days, 7))))::INT
            ELSE GREATEST(COALESCE(i.min_stock_qty, 10), 1)::INT
          END + 1,
          CEIL(st.adu * COALESCE(i.lead_time_days, 7)) + 
          CEIL(COALESCE(i.target_service_level, 0.95) * 1.73 * GREATEST(COALESCE(st.std_dev, st.adu * 0.5), 0.5) * SQRT(COALESCE(i.lead_time_days, 7)))::INT
        )::INT
      ELSE
        GREATEST(COALESCE(i.min_stock_qty, 10) * 3, 50)::INT
    END AS reorder_point,
    -- 3) Surplus / High point (ROP + 14 days review buffer):
    -- Capped by shelf life if configured
    CASE 
      WHEN st.item_id IS NOT NULL AND st.adu > 0 THEN
        LEAST(
          -- Shelf life cap (cannot exceed 70% of shelf life consumption)
          CASE 
            WHEN i.shelf_life_days IS NOT NULL AND i.shelf_life_days > 0 THEN
              GREATEST(10, CEIL(st.adu * i.shelf_life_days * 0.70)::INT)
            ELSE 999999
          END,
          -- Regular ROP + 14 days buffer
          GREATEST(
            50,
            CEIL((st.adu * COALESCE(i.lead_time_days, 7)) + (st.adu * 14) + 
            CEIL(COALESCE(i.target_service_level, 0.95) * 1.73 * GREATEST(COALESCE(st.std_dev, st.adu * 0.5), 0.5) * SQRT(COALESCE(i.lead_time_days, 7)))::INT)
          )
        )::INT
      ELSE
        GREATEST(COALESCE(i.min_stock_qty, 10) * 10, 200)::INT
    END AS surplus_point,
    (st.item_id IS NOT NULL AND st.adu > 0) AS has_history
  FROM public.items i
  LEFT JOIN item_stats st ON st.item_id = i.id
  WHERE i.is_active = TRUE
    AND (p_client_id IS NULL OR i.client_id = p_client_id OR i.client_id IS NULL);
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_item_dynamic_thresholds(UUID, INT) TO authenticated, service_role, anon;
