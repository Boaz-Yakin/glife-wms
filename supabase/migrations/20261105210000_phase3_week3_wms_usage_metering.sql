-- ==============================================================================
-- Phase 3 - Week 3: WMS Resource Usage Metering (종량제 사용량 집계 엔진)
-- Description: 카카오 알림톡 등 외부 서드파티 종속을 완전히 배제하고,
--              WMS 핵심 자원(현장 PDA 추가 계정, 당월 주문 처리량)을 실시간 미터링
-- Migration Date: 2026-11-05
-- ==============================================================================

-- 1. 테넌트 종량제 사용량 미터링 테이블
CREATE TABLE IF NOT EXISTS public.tenant_usage_meters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL, -- 'ADDITIONAL_SEAT', 'ORDER_OVERAGE'
    usage_count INT NOT NULL DEFAULT 0,
    period_month VARCHAR(7) NOT NULL, -- e.g. '2026-11'
    unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_usage_meter UNIQUE (tenant_id, metric_type, period_month)
);

COMMENT ON TABLE public.tenant_usage_meters IS '테넌트별 월간 WMS 자원 초과 종량제 사용량 집계 원장';
COMMENT ON COLUMN public.tenant_usage_meters.metric_type IS '미터링 자원 유형 (ADDITIONAL_SEAT: 추가 계정, ORDER_OVERAGE: 초과 주문량)';
COMMENT ON COLUMN public.tenant_usage_meters.period_month IS '정산 대상 월 (YYYY-MM 형식)';

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_tenant_usage_meters_lookup
ON public.tenant_usage_meters (tenant_id, period_month);

-- 3. RLS 활성화 및 정책 등록
ALTER TABLE public.tenant_usage_meters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_usage_meters_tenant_isolation" ON public.tenant_usage_meters;
CREATE POLICY "tenant_usage_meters_tenant_isolation"
ON public.tenant_usage_meters
FOR ALL
USING (
    tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    OR (SELECT role::text FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
);

-- 4. WMS 자원 사용량 실시간 동기화 RPC 함수
CREATE OR REPLACE FUNCTION public.sync_tenant_usage_meter(
    p_tenant_id UUID,
    p_period_month TEXT DEFAULT to_char(CURRENT_DATE, 'YYYY-MM')
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_plan_tier TEXT := 'STARTER';
    v_active_seats INT := 0;
    v_max_seats INT := 3;
    v_seat_unit_price NUMERIC(10,2) := 15.00;
    v_seat_overage INT := 0;
    v_seat_charge NUMERIC(10,2) := 0;

    v_monthly_orders INT := 0;
    v_max_orders INT := 1000;
    v_order_unit_price NUMERIC(10,2) := 0.05;
    v_order_overage INT := 0;
    v_order_charge NUMERIC(10,2) := 0;

    v_total_overage NUMERIC(10,2) := 0;
BEGIN
    -- 테넌트 구독 플랜 확인
    SELECT COALESCE(plan_tier, 'STARTER')
    INTO v_plan_tier
    FROM public.tenant_subscriptions
    WHERE tenant_id = p_tenant_id
    LIMIT 1;

    IF v_plan_tier IS NULL THEN
        v_plan_tier := 'STARTER';
    END IF;

    -- 플랜별 자원 한도 설정
    IF v_plan_tier = 'STARTER' THEN
        v_max_seats := 3;
        v_max_orders := 1000;
        v_seat_unit_price := 15.00;
        v_order_unit_price := 0.05;
    ELSIF v_plan_tier = 'PRO' THEN
        v_max_seats := 10;
        v_max_orders := 10000;
        v_seat_unit_price := 12.00;
        v_order_unit_price := 0.03;
    ELSE -- ENTERPRISE
        v_max_seats := -1; -- 무제한
        v_max_orders := -1; -- 무제한
        v_seat_unit_price := 0;
        v_order_unit_price := 0;
    END IF;

    -- 1. 활성 사용자 수 집계 (users 테이블)
    SELECT COUNT(*)
    INTO v_active_seats
    FROM public.users
    WHERE tenant_id = p_tenant_id
      AND status = 'ACTIVE';

    -- 2. 당월 주문 처리량 집계 (orders 테이블)
    SELECT COUNT(*)
    INTO v_monthly_orders
    FROM public.orders
    WHERE tenant_id = p_tenant_id
      AND to_char(created_at, 'YYYY-MM') = p_period_month;

    -- 3. 계정 초과분 계산
    IF v_max_seats > 0 AND v_active_seats > v_max_seats THEN
        v_seat_overage := v_active_seats - v_max_seats;
        v_seat_charge := v_seat_overage * v_seat_unit_price;
    ELSE
        v_seat_overage := 0;
        v_seat_charge := 0;
    END IF;

    -- 4. 주문량 초과분 계산
    IF v_max_orders > 0 AND v_monthly_orders > v_max_orders THEN
        v_order_overage := v_monthly_orders - v_max_orders;
        v_order_charge := v_order_overage * v_order_unit_price;
    ELSE
        v_order_overage := 0;
        v_order_charge := 0;
    END IF;

    v_total_overage := v_seat_charge + v_order_charge;

    -- 5. tenant_usage_meters 테이블 원자적 Upsert (Seat)
    INSERT INTO public.tenant_usage_meters (
        tenant_id,
        metric_type,
        usage_count,
        period_month,
        unit_price,
        updated_at
    ) VALUES (
        p_tenant_id,
        'ADDITIONAL_SEAT',
        v_seat_overage,
        p_period_month,
        v_seat_unit_price,
        NOW()
    )
    ON CONFLICT (tenant_id, metric_type, period_month)
    DO UPDATE SET
        usage_count = EXCLUDED.usage_count,
        unit_price = EXCLUDED.unit_price,
        updated_at = NOW();

    -- 6. tenant_usage_meters 테이블 원자적 Upsert (Order)
    INSERT INTO public.tenant_usage_meters (
        tenant_id,
        metric_type,
        usage_count,
        period_month,
        unit_price,
        updated_at
    ) VALUES (
        p_tenant_id,
        'ORDER_OVERAGE',
        v_order_overage,
        p_period_month,
        v_order_unit_price,
        NOW()
    )
    ON CONFLICT (tenant_id, metric_type, period_month)
    DO UPDATE SET
        usage_count = EXCLUDED.usage_count,
        unit_price = EXCLUDED.unit_price,
        updated_at = NOW();

    RETURN jsonb_build_object(
        'plan_tier', v_plan_tier,
        'period_month', p_period_month,
        'active_seats', v_active_seats,
        'max_seats', v_max_seats,
        'seat_overage', v_seat_overage,
        'seat_unit_price', v_seat_unit_price,
        'seat_charge', v_seat_charge,
        'monthly_orders', v_monthly_orders,
        'max_orders', v_max_orders,
        'order_overage', v_order_overage,
        'order_unit_price', v_order_unit_price,
        'order_charge', v_order_charge,
        'total_overage_charge', v_total_overage
    );
END;
$$;
