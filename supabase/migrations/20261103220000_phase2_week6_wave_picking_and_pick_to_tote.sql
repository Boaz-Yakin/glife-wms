-- ==============================================================================
-- Phase 2 - Week 6: Dynamic Wave Picking & Multi-Order Pick-to-Tote Engine
-- Description: 주문 자동 군집화(권역/온도대/단일품목) 기반 파동 출고(Wave Picking) 및
--              다중 오더 카트 분배 피킹(Pick-to-Tote 1~8) DDL & RPC
-- Migration Date: 2026-11-03
-- ==============================================================================

-- 1. 파동 출고 메인 테이블 (picking_waves) 신설
CREATE TABLE IF NOT EXISTS public.picking_waves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    wave_no VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'CREATED' 
        CHECK (status IN ('CREATED', 'RELEASED', 'PICKING', 'COMPLETED', 'CANCELLED')),
    zone_type VARCHAR(20) DEFAULT 'ALL', -- ALL, ROOM, CHILLED, FROZEN
    cluster_criteria JSONB DEFAULT '{}'::jsonb, -- 군집화 메타데이터 (권역, 온도대 등)
    total_orders INT NOT NULL DEFAULT 0,
    total_items INT NOT NULL DEFAULT 0,
    total_qty INT NOT NULL DEFAULT 0,
    picked_qty INT NOT NULL DEFAULT 0,
    assigned_picker_id UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_tenant_wave_no UNIQUE (tenant_id, wave_no)
);

COMMENT ON TABLE public.picking_waves IS '동적 파동 출고(Wave Picking) 배치 마스터 원장';
COMMENT ON COLUMN public.picking_waves.wave_no IS '웨이브 고유 식별 번호 (예: WAVE-20261103-01)';
COMMENT ON COLUMN public.picking_waves.status IS '상태: CREATED(생성), RELEASED(배포), PICKING(진행중), COMPLETED(완료)';

-- 2. 웨이브 - 주문 - 카트 토트 매핑 테이블 (wave_orders) 신설
CREATE TABLE IF NOT EXISTS public.wave_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wave_id UUID NOT NULL REFERENCES public.picking_waves(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    tote_no INT NOT NULL CHECK (tote_no >= 1 AND tote_no <= 12),
    tote_barcode VARCHAR(50) NOT NULL, -- 예: TOTE-01, TOTE-02
    status VARCHAR(20) NOT NULL DEFAULT 'ASSIGNED' 
        CHECK (status IN ('ASSIGNED', 'PICKING', 'PACKED', 'COMPLETED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_wave_order UNIQUE (wave_id, order_id),
    CONSTRAINT uk_wave_tote UNIQUE (wave_id, tote_no)
);

COMMENT ON TABLE public.wave_orders IS '파동 출고 대상 주문과 피킹 카트 토트 바구니(1~12) 매핑';
COMMENT ON COLUMN public.wave_orders.tote_no IS '카트 내 바구니 구획 번호 (1번~8번)';
COMMENT ON COLUMN public.wave_orders.tote_barcode IS '검증용 토트 바코드 (예: TOTE-01)';

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_picking_waves_tenant ON public.picking_waves(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_wave_orders_wave ON public.wave_orders(wave_id);
CREATE INDEX IF NOT EXISTS idx_wave_orders_order ON public.wave_orders(order_id);

-- 4. Supabase Row-Level Security (RLS) 정책
ALTER TABLE public.picking_waves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wave_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation picking_waves" ON public.picking_waves;
CREATE POLICY "Tenant Isolation picking_waves" ON public.picking_waves
FOR ALL USING (
    tenant_id = public.get_current_tenant_id()
    OR public.is_platform_super_admin()
)
WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    OR public.is_platform_super_admin()
);

DROP POLICY IF EXISTS "Tenant Isolation wave_orders" ON public.wave_orders;
CREATE POLICY "Tenant Isolation wave_orders" ON public.wave_orders
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.picking_waves pw 
        WHERE pw.id = wave_orders.wave_id 
        AND (pw.tenant_id = public.get_current_tenant_id() OR public.is_platform_super_admin())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.picking_waves pw 
        WHERE pw.id = wave_orders.wave_id 
        AND (pw.tenant_id = public.get_current_tenant_id() OR public.is_platform_super_admin())
    )
);

-- 5. [PostgreSQL RPC] 파동 출고(Wave) 생성 함수 (create_picking_wave)
CREATE OR REPLACE FUNCTION public.create_picking_wave(
    p_wave_no TEXT,
    p_name TEXT,
    p_order_ids UUID[],
    p_zone_type TEXT DEFAULT 'ALL',
    p_cluster_criteria JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_wave_id UUID;
    v_order_id UUID;
    v_idx INT := 1;
    v_total_orders INT := 0;
    v_total_items INT := 0;
    v_total_qty INT := 0;
BEGIN
    v_tenant_id := public.get_current_tenant_id();
    IF v_tenant_id IS NULL THEN
        -- Fallback to default tenant if not in session context
        SELECT id INTO v_tenant_id FROM public.tenants LIMIT 1;
    END IF;

    IF array_length(p_order_ids, 1) IS NULL OR array_length(p_order_ids, 1) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', '선택된 주문이 없습니다.');
    END IF;

    -- 1. 주문들의 총 품목수 및 총 수량 계산
    SELECT 
        COUNT(DISTINCT oi.id),
        COALESCE(SUM(oi.qty), 0)
    INTO v_total_items, v_total_qty
    FROM public.order_items oi
    WHERE oi.order_id = ANY(p_order_ids);

    v_total_orders := array_length(p_order_ids, 1);

    -- 2. picking_waves 마스터 레코드 생성
    INSERT INTO public.picking_waves (
        tenant_id,
        wave_no,
        name,
        status,
        zone_type,
        cluster_criteria,
        total_orders,
        total_items,
        total_qty
    ) VALUES (
        v_tenant_id,
        p_wave_no,
        p_name,
        'RELEASED',
        p_zone_type,
        p_cluster_criteria,
        v_total_orders,
        v_total_items,
        v_total_qty
    )
    RETURNING id INTO v_wave_id;

    -- 3. 각 주문에 1번부터 순차적으로 카트 토트(Tote 1~N) 부여
    FOREACH v_order_id IN ARRAY p_order_ids
    LOOP
        INSERT INTO public.wave_orders (
            wave_id,
            order_id,
            tote_no,
            tote_barcode,
            status
        ) VALUES (
            v_wave_id,
            v_order_id,
            v_idx,
            format('TOTE-%s', to_char(v_idx, 'FM00')),
            'ASSIGNED'
        );

        -- 주문 상태 업데이트
        UPDATE public.orders
        SET status = 'ALLOCATED',
            updated_at = NOW()
        WHERE id = v_order_id;

        v_idx := v_idx + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'wave_id', v_wave_id,
        'wave_no', p_wave_no,
        'total_orders', v_total_orders,
        'total_qty', v_total_qty
    );
END;
$$;

-- 6. [PostgreSQL RPC] 파동 출고 완료 함수 (complete_picking_wave)
CREATE OR REPLACE FUNCTION public.complete_picking_wave(
    p_wave_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
BEGIN
    -- 1. 웨이브 상태를 COMPLETED로 변경
    UPDATE public.picking_waves
    SET status = 'COMPLETED',
        picked_qty = total_qty,
        updated_at = NOW()
    WHERE id = p_wave_id;

    -- 2. 해당 웨이브에 속한 모든 주문을 PACKED 상태로 갱신
    UPDATE public.orders
    SET status = 'PACKED',
        updated_at = NOW()
    WHERE id IN (
        SELECT order_id FROM public.wave_orders WHERE wave_id = p_wave_id
    );

    UPDATE public.wave_orders
    SET status = 'COMPLETED'
    WHERE wave_id = p_wave_id;

    RETURN jsonb_build_object(
        'success', true,
        'wave_id', p_wave_id,
        'message', '파동 출고 작업이 성공적으로 완료되었습니다.'
    );
END;
$$;
