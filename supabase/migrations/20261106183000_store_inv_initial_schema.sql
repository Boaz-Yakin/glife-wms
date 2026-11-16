-- ==============================================================================
-- Store-Inv: 대형 매장 재고 실사 & 자동 보충 발주 앱 초기 스키마 및 RPC
-- Description: store_item_targets, store_target_logs, inventory_audits, inventory_audit_items 생성,
--              테넌트 RLS 정책 적용 및 자동 발주 연동 RPC 함수 생성
-- Migration Date: 2026-11-06
-- ==============================================================================

-- 1. 실사 세션 상태 및 반품 사유 ENUM 타입
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_status') THEN 
        CREATE TYPE public.audit_status AS ENUM ('in_progress', 'submitted', 'cancelled'); 
    END IF; 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'return_reason_type') THEN 
        CREATE TYPE public.return_reason_type AS ENUM ('DAMAGED', 'OUT_OF_DATE', 'DEFECTIVE', 'OTHER'); 
    END IF; 
END $$;

-- 2. 매장별 품목 기준 적정 재고 (PAR Level) 및 진열 순서 테이블
CREATE TABLE IF NOT EXISTS public.store_item_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE DEFAULT public.get_current_tenant_id(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    par_level INTEGER NOT NULL DEFAULT 0 CHECK (par_level >= 0),
    min_order_qty INTEGER NOT NULL DEFAULT 1 CHECK (min_order_qty >= 1),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_store_item_target UNIQUE(store_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_store_item_targets_store ON public.store_item_targets(store_id, display_order);
CREATE INDEX IF NOT EXISTS idx_store_item_targets_tenant ON public.store_item_targets(tenant_id, store_id);

-- 3. 매장 PAR 변경 이력 추적 테이블
CREATE TABLE IF NOT EXISTS public.store_target_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE DEFAULT public.get_current_tenant_id(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    old_par INTEGER NOT NULL,
    new_par INTEGER NOT NULL,
    reason TEXT,
    changed_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_target_logs_lookup ON public.store_target_logs(store_id, item_id, created_at DESC);

-- 4. 매장 실사 세션 헤더 테이블
CREATE TABLE IF NOT EXISTS public.inventory_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE DEFAULT public.get_current_tenant_id(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
    auditor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status public.audit_status NOT NULL DEFAULT 'in_progress',
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_audits_store ON public.inventory_audits(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_audits_tenant ON public.inventory_audits(tenant_id, store_id);

-- 5. 실사 품목 상세 내역 테이블
CREATE TABLE IF NOT EXISTS public.inventory_audit_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE DEFAULT public.get_current_tenant_id(),
    audit_id UUID NOT NULL REFERENCES public.inventory_audits(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
    physical_count INTEGER NOT NULL DEFAULT 0 CHECK (physical_count >= 0),
    target_par INTEGER NOT NULL DEFAULT 0,
    deficit_qty INTEGER NOT NULL DEFAULT 0,
    suggested_order_qty INTEGER NOT NULL DEFAULT 0,
    final_order_qty INTEGER NOT NULL DEFAULT 0 CHECK (final_order_qty >= 0),
    adjustment_reason TEXT,
    return_qty INTEGER NOT NULL DEFAULT 0 CHECK (return_qty >= 0),
    return_reason public.return_reason_type,
    return_note TEXT,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    credit_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_inventory_audit_items UNIQUE(audit_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_audit_items_audit ON public.inventory_audit_items(audit_id);

-- 5-2. 매장 반품 및 자동 Credit 원장 테이블 (store_credits)
CREATE TABLE IF NOT EXISTS public.store_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE DEFAULT public.get_current_tenant_id(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    audit_id UUID REFERENCES public.inventory_audits(id) ON DELETE SET NULL,
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
    return_qty INTEGER NOT NULL CHECK (return_qty > 0),
    return_reason public.return_reason_type NOT NULL DEFAULT 'DAMAGED',
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    credit_unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    credit_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'ISSUED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_credits_store ON public.store_credits(store_id, created_at DESC);

-- 6. Row-Level Security (RLS) 활성화 및 테넌트 격리 정책
ALTER TABLE public.store_item_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_target_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_audit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_credits ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY['store_item_targets', 'store_target_logs', 'inventory_audits', 'inventory_audit_items', 'store_credits'])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON public.%I', tbl);
        EXECUTE format(
            'CREATE POLICY tenant_isolation_policy ON public.%I FOR ALL USING (
                public.is_platform_super_admin() OR tenant_id = public.get_current_tenant_id()
            ) WITH CHECK (
                public.is_platform_super_admin() OR tenant_id = public.get_current_tenant_id()
            )',
            tbl
        );
    END LOOP;
END $$;

-- 7. RPC 함수: 실사 완료 및 WMS 주문 등록 원자적 트랜잭션 (submit_store_audit_order)
CREATE OR REPLACE FUNCTION public.submit_store_audit_order(
    p_audit_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_audit RECORD;
    v_order_id UUID;
    v_order_no TEXT;
    v_client_id UUID;
    v_tenant_id UUID;
    v_valid_user_id UUID;
    v_today TEXT;
    v_seq INT;
BEGIN
    -- 1. 실사 세션 유효성 확인
    SELECT * INTO v_audit FROM public.inventory_audits 
    WHERE id = p_audit_id AND status = 'in_progress' FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Audit session is not found or already submitted';
    END IF;

    v_tenant_id := COALESCE(v_audit.tenant_id, public.get_current_tenant_id());

    -- 유효한 사용자 ID 확인 (익명 또는 더미 UUID인 경우 NULL 처리)
    IF p_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
        v_valid_user_id := p_user_id;
    ELSE
        v_valid_user_id := NULL;
    END IF;

    -- 2. 주문 번호 생성 (형식: SO-YYYYMMDD-XXXX)
    v_today := to_char(now(), 'YYYYMMDD');
    SELECT count(*) + 1 INTO v_seq FROM public.orders 
    WHERE order_no LIKE 'SO-' || v_today || '-%';
    v_order_no := 'SO-' || v_today || '-' || lpad(v_seq::text, 4, '0');

    -- 3. 매장의 기준 client_id 조회 (없을 경우 기본 클라이언트 매핑)
    SELECT client_id INTO v_client_id FROM public.stores WHERE id = v_audit.store_id;
    IF v_client_id IS NULL THEN
        SELECT id INTO v_client_id FROM public.clients WHERE is_active = true LIMIT 1;
    END IF;

    -- 4. WMS orders 테이블에 생성 (상태: PENDING)
    INSERT INTO public.orders (
        order_no,
        tenant_id,
        store_id,
        client_id,
        status,
        order_date,
        note,
        user_id
    ) VALUES (
        v_order_no,
        v_tenant_id,
        v_audit.store_id,
        v_client_id,
        'PENDING',
        now(),
        COALESCE(p_notes, '[Store-Inv] Food Depot 실사 자동 발주'),
        v_valid_user_id
    ) RETURNING id INTO v_order_id;

    -- 5. 발주 수량이 1개 이상인 품목을 order_items에 일괄 삽입
    INSERT INTO public.order_items (
        order_id,
        tenant_id,
        item_id,
        qty,
        price,
        uom
    )
    SELECT 
        v_order_id,
        v_tenant_id,
        ai.item_id,
        ai.final_order_qty,
        COALESCE(i.unit_price, 0),
        COALESCE(i.uom, 'EA')
    FROM public.inventory_audit_items ai
    JOIN public.items i ON i.id = ai.item_id
    WHERE ai.audit_id = p_audit_id AND ai.final_order_qty > 0;

    -- 5-2. 반품 수량이 1개 이상인 품목을 store_credits에 자동 등록 ((단가 - 단가의 5%) * 갯수)
    INSERT INTO public.store_credits (
        tenant_id,
        store_id,
        audit_id,
        item_id,
        return_qty,
        return_reason,
        unit_price,
        credit_unit_price,
        credit_amount,
        note,
        status
    )
    SELECT
        v_tenant_id,
        v_audit.store_id,
        p_audit_id,
        ai.item_id,
        ai.return_qty,
        COALESCE(ai.return_reason, 'DAMAGED'),
        COALESCE(i.unit_price, 0),
        ROUND(COALESCE(i.unit_price, 0) * 0.95, 2),
        ROUND((COALESCE(i.unit_price, 0) - COALESCE(i.unit_price, 0) * 0.05) * ai.return_qty, 2),
        ai.return_note,
        'ISSUED'
    FROM public.inventory_audit_items ai
    JOIN public.items i ON i.id = ai.item_id
    WHERE ai.audit_id = p_audit_id AND ai.return_qty > 0;

    -- 6. 실사 세션 상태 업데이트 (submitted 및 생성된 order_id 바인딩)
    UPDATE public.inventory_audits
    SET status = 'submitted',
        order_id = v_order_id,
        submitted_at = now(),
        notes = p_notes,
        updated_at = now()
    WHERE id = p_audit_id;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RPC 함수: 매장 간 PAR 세팅 복사 (clone_store_targets)
CREATE OR REPLACE FUNCTION public.clone_store_targets(
    p_source_store_id UUID,
    p_target_store_id UUID,
    p_overwrite BOOLEAN DEFAULT false
) RETURNS INTEGER AS $$
DECLARE
    v_copied_count INT;
    v_tenant_id UUID := public.get_current_tenant_id();
BEGIN
    IF p_overwrite THEN
        DELETE FROM public.store_item_targets WHERE store_id = p_target_store_id;
    END IF;

    INSERT INTO public.store_item_targets (
        tenant_id,
        store_id,
        item_id,
        par_level,
        min_order_qty,
        display_order,
        is_active
    )
    SELECT 
        v_tenant_id,
        p_target_store_id,
        item_id,
        par_level,
        min_order_qty,
        display_order,
        is_active
    FROM public.store_item_targets
    WHERE store_id = p_source_store_id
    ON CONFLICT (store_id, item_id) DO UPDATE
    SET par_level = EXCLUDED.par_level,
        min_order_qty = EXCLUDED.min_order_qty,
        display_order = EXCLUDED.display_order,
        is_active = EXCLUDED.is_active,
        updated_at = now();

    GET DIAGNOSTICS v_copied_count = ROW_COUNT;
    RETURN v_copied_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
