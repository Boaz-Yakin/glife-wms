-- ==============================================================================
-- Phase 4 - Week 3: 3PL Multi-Tenant Logistics Billing Engine
-- Description: 3PL 다중 화주사 일일 파렛트/CBM 보관료 및 입출고 하역 작업비 정산 엔진
-- Migration Date: 2026-11-05
-- ==============================================================================

-- 1. 화주사별 3PL 물류 요율 계약 테이블
CREATE TABLE IF NOT EXISTS public.client_billing_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    daily_pallet_storage_fee NUMERIC(10,2) NOT NULL DEFAULT 800.00,  -- 상온 파렛트 일일 보관료 (₩800/일)
    daily_chilled_pallet_fee NUMERIC(10,2) NOT NULL DEFAULT 1500.00, -- 냉장/냉동 파렛트 일일 보관료 (₩1,500/일)
    daily_cbm_storage_fee NUMERIC(10,2) NOT NULL DEFAULT 1200.00,    -- CBM당 일일 보관료 (₩1,200/CBM)
    inbound_handling_fee_per_box NUMERIC(10,2) NOT NULL DEFAULT 150.00, -- 입고 하역 박스당 피 (₩150)
    outbound_picking_fee_per_ea NUMERIC(10,2) NOT NULL DEFAULT 100.00,  -- 피킹 건당 피 (₩100)
    packing_fee_per_order NUMERIC(10,2) NOT NULL DEFAULT 500.00,     -- 포장/검수 오더당 피 (₩500)
    billing_currency VARCHAR(10) NOT NULL DEFAULT 'KRW',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_client_billing_contract UNIQUE (tenant_id, client_id)
);

COMMENT ON TABLE public.client_billing_contracts IS '3PL 화주사별 보관/하역/피킹 요율표 계약 원장';

-- 2. 일일 3PL 보관 및 하역 정산 원장
CREATE TABLE IF NOT EXISTS public.third_party_logistics_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    settlement_month VARCHAR(7) NOT NULL, -- e.g. '2026-11'
    record_date DATE NOT NULL,
    pallet_count INT NOT NULL DEFAULT 0,
    chilled_pallet_count INT NOT NULL DEFAULT 0,
    storage_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
    inbound_boxes INT NOT NULL DEFAULT 0,
    inbound_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
    outbound_items_count INT NOT NULL DEFAULT 0,
    outbound_orders_count INT NOT NULL DEFAULT 0,
    handling_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_daily_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_client_daily_ledger UNIQUE (tenant_id, client_id, record_date)
);

COMMENT ON TABLE public.third_party_logistics_ledger IS '3PL 화주사 일별 보관료 및 입출고 작업비 정산 스냅샷';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_3pl_ledger_lookup 
ON public.third_party_logistics_ledger (tenant_id, client_id, settlement_month, record_date DESC);

-- RLS 활성화
ALTER TABLE public.client_billing_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.third_party_logistics_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_billing_contracts_policy" ON public.client_billing_contracts;
CREATE POLICY "client_billing_contracts_policy"
ON public.client_billing_contracts
FOR ALL
USING (
    tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    OR (SELECT role::text FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
);

DROP POLICY IF EXISTS "3pl_ledger_policy" ON public.third_party_logistics_ledger;
CREATE POLICY "3pl_ledger_policy"
ON public.third_party_logistics_ledger
FOR ALL
USING (
    tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    OR (SELECT role::text FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
);

-- 3. 일일 3PL 보관/작업 정산 계산 RPC 함수
CREATE OR REPLACE FUNCTION public.calculate_daily_3pl_settlement(
    p_tenant_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_month TEXT := to_char(p_date, 'YYYY-MM');
    v_client RECORD;
    v_contract RECORD;
    v_room_pallets INT;
    v_chilled_pallets INT;
    v_storage_fee NUMERIC(12,2);
    v_outbound_orders INT;
    v_outbound_items INT;
    v_handling_fee NUMERIC(12,2);
    v_total_fee NUMERIC(12,2);
    v_processed_count INT := 0;
BEGIN
    FOR v_client IN 
        SELECT id, name FROM public.clients 
        WHERE (tenant_id = p_tenant_id OR tenant_id IS NULL)
          AND is_active = TRUE
    LOOP
        -- 계약 요율 확인 (없으면 기본값 적용)
        SELECT * INTO v_contract 
        FROM public.client_billing_contracts
        WHERE tenant_id = p_tenant_id AND client_id = v_client.id;

        IF v_contract IS NULL THEN
            -- 기본 계약 요율 생성
            INSERT INTO public.client_billing_contracts (
                tenant_id, client_id,
                daily_pallet_storage_fee, daily_chilled_pallet_fee,
                inbound_handling_fee_per_box, outbound_picking_fee_per_ea, packing_fee_per_order
            ) VALUES (
                p_tenant_id, v_client.id, 800, 1500, 150, 100, 500
            ) RETURNING * INTO v_contract;
        END IF;

        -- 1. 상온/냉장 점유 로케이션(파렛트) 수 계산
        SELECT 
            COALESCE(COUNT(DISTINCT CASE WHEN l.temperature_zone IN ('CHILLED', 'FROZEN') THEN i.location_id END), 0),
            COALESCE(COUNT(DISTINCT CASE WHEN l.temperature_zone NOT IN ('CHILLED', 'FROZEN') OR l.temperature_zone IS NULL THEN i.location_id END), 0)
        INTO v_chilled_pallets, v_room_pallets
        FROM public.inventory i
        JOIN public.locations l ON i.location_id = l.id
        WHERE i.client_id = v_client.id
          AND i.quantity > 0;

        v_storage_fee := (v_room_pallets * v_contract.daily_pallet_storage_fee) +
                         (v_chilled_pallets * v_contract.daily_chilled_pallet_fee);

        -- 2. 당일 출고 주문 및 피킹 품목 수 계산
        SELECT 
            COALESCE(COUNT(DISTINCT o.id), 0),
            COALESCE(SUM(oi.quantity), 0)
        INTO v_outbound_orders, v_outbound_items
        FROM public.orders o
        LEFT JOIN public.order_items oi ON o.id = oi.order_id
        WHERE o.client_id = v_client.id
          AND o.created_at::date = p_date;

        v_handling_fee := (v_outbound_orders * v_contract.packing_fee_per_order) +
                          (v_outbound_items * v_contract.outbound_picking_fee_per_ea);

        v_total_fee := v_storage_fee + v_handling_fee;

        -- 3. 일일 정산 원장 Upsert
        INSERT INTO public.third_party_logistics_ledger (
            tenant_id, client_id, settlement_month, record_date,
            pallet_count, chilled_pallet_count, storage_fee,
            inbound_boxes, inbound_fee,
            outbound_items_count, outbound_orders_count, handling_fee,
            total_daily_fee, created_at
        ) VALUES (
            p_tenant_id, v_client.id, v_month, p_date,
            v_room_pallets, v_chilled_pallets, v_storage_fee,
            0, 0,
            v_outbound_items, v_outbound_orders, v_handling_fee,
            v_total_fee, NOW()
        )
        ON CONFLICT (tenant_id, client_id, record_date)
        DO UPDATE SET
            pallet_count = EXCLUDED.pallet_count,
            chilled_pallet_count = EXCLUDED.chilled_pallet_count,
            storage_fee = EXCLUDED.storage_fee,
            outbound_items_count = EXCLUDED.outbound_items_count,
            outbound_orders_count = EXCLUDED.outbound_orders_count,
            handling_fee = EXCLUDED.handling_fee,
            total_daily_fee = EXCLUDED.total_daily_fee;

        v_processed_count := v_processed_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'date', p_date,
        'processed_clients', v_processed_count
    );
END;
$$;

-- 4. 초기 샘플 데이터 시딩 (Food Depot 및 Cosmetics Co 기본 계약 및 정산 원장)
DO $$
DECLARE
    v_glife_tenant UUID := '9df4f04d-b4be-4256-bfa5-aa48c4fd5d13';
    v_food_client UUID;
    v_cosmetics_client UUID;
BEGIN
    SELECT id INTO v_food_client FROM public.clients WHERE code = 'CLIENT-FOOD' LIMIT 1;
    SELECT id INTO v_cosmetics_client FROM public.clients WHERE code = 'CLIENT-COSMETICS' LIMIT 1;

    IF v_food_client IS NOT NULL THEN
        INSERT INTO public.client_billing_contracts (
            tenant_id, client_id, daily_pallet_storage_fee, daily_chilled_pallet_fee,
            inbound_handling_fee_per_box, outbound_picking_fee_per_ea, packing_fee_per_order
        ) VALUES (
            v_glife_tenant, v_food_client, 800, 1500, 150, 100, 500
        ) ON CONFLICT DO NOTHING;

        -- 최근 3일 정산 스냅샷
        INSERT INTO public.third_party_logistics_ledger (
            tenant_id, client_id, settlement_month, record_date,
            pallet_count, chilled_pallet_count, storage_fee,
            inbound_boxes, inbound_fee, outbound_items_count, outbound_orders_count, handling_fee,
            total_daily_fee
        ) VALUES 
        (v_glife_tenant, v_food_client, to_char(CURRENT_DATE, 'YYYY-MM'), CURRENT_DATE, 12, 6, 18600, 20, 3000, 85, 8, 12500, 34100),
        (v_glife_tenant, v_food_client, to_char(CURRENT_DATE, 'YYYY-MM'), CURRENT_DATE - 1, 12, 6, 18600, 0, 0, 120, 10, 17000, 35600),
        (v_glife_tenant, v_food_client, to_char(CURRENT_DATE, 'YYYY-MM'), CURRENT_DATE - 2, 10, 5, 15500, 50, 7500, 60, 5, 8500, 31500)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
