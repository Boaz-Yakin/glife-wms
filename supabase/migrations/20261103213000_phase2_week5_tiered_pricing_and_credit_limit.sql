-- ==============================================================================
-- Phase 2 - Week 5: B2B OrderAPP Tiered Pricing & Credit Limit Control Engine
-- Description: 가맹점/바이어별 차등 등급(VIP, WHOLESALE, STANDARD), 특수 단가표 및
--              외상/여신 한도(Credit Limit) 자동 차단 통제 엔진 DDL & RPC
-- Migration Date: 2026-11-03
-- ==============================================================================

-- 1. stores 테이블에 거래처 등급 및 여신 한도 컬럼 확장
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS price_tier VARCHAR(20) NOT NULL DEFAULT 'STANDARD',
ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC(12,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.stores.price_tier IS 'B2B 거래처 공급 등급 (VIP, WHOLESALE, STANDARD, RETAIL)';
COMMENT ON COLUMN public.stores.credit_limit IS '여신(외상 발주) 허용 한도액 (0이면 선입금 전용/무여신)';
COMMENT ON COLUMN public.stores.outstanding_balance IS '현재 미수금(외상 발주 누적액) 원장';

-- 2. 등급별 / 거래처별 맞춤 특수 단가표 (store_item_prices) 신설
CREATE TABLE IF NOT EXISTS public.store_item_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    price_tier VARCHAR(20), -- NULL이면 특정 store_id 전용, store_id가 NULL이면 해당 등급 전체 적용
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    uom VARCHAR(20) NOT NULL DEFAULT 'EA',
    custom_price NUMERIC(12,2) NOT NULL CHECK (custom_price >= 0),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.store_item_prices IS 'B2B 테넌트별 등급(Tier) 및 매장(Store) 맞춤 차등 단가표';
COMMENT ON COLUMN public.store_item_prices.price_tier IS '적용 등급 (VIP, WHOLESALE, STANDARD)';
COMMENT ON COLUMN public.store_item_prices.custom_price IS '지정된 등급/매장 적용 납품 단가';

-- 3. 빠른 단가 조회를 위한 복합 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_store_item_prices_lookup 
ON public.store_item_prices (tenant_id, item_id, uom, store_id, price_tier);

CREATE INDEX IF NOT EXISTS idx_store_item_prices_store 
ON public.store_item_prices (store_id);

CREATE INDEX IF NOT EXISTS idx_store_item_prices_tier 
ON public.store_item_prices (price_tier);

-- 4. Supabase Row-Level Security (RLS) 정책
ALTER TABLE public.store_item_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation store_item_prices" ON public.store_item_prices;
CREATE POLICY "Tenant Isolation store_item_prices" ON public.store_item_prices
FOR ALL USING (
    tenant_id = public.get_current_tenant_id()
    OR public.is_platform_super_admin()
)
WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    OR public.is_platform_super_admin()
);

-- 5. [PostgreSQL RPC] 여신 한도 검증 함수 (check_store_credit_limit)
--    발주 전 또는 발주 시점에 한도 초과 여부를 계산하여 승인 또는 차단 반환
CREATE OR REPLACE FUNCTION public.check_store_credit_limit(
    p_store_id UUID,
    p_order_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_store RECORD;
    v_new_balance NUMERIC;
    v_remaining NUMERIC;
    v_is_allowed BOOLEAN := true;
    v_reason TEXT := 'OK';
BEGIN
    SELECT id, name, price_tier, credit_limit, outstanding_balance
    INTO v_store
    FROM public.stores
    WHERE id = p_store_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', '매장 정보를 찾을 수 없습니다.'
        );
    END IF;

    v_new_balance := COALESCE(v_store.outstanding_balance, 0) + COALESCE(p_order_amount, 0);

    -- credit_limit > 0 인 경우 엄격한 외상 한도 적용
    IF v_store.credit_limit > 0 THEN
        IF v_new_balance > v_store.credit_limit THEN
            v_is_allowed := false;
            v_reason := format(
                '외상(여신) 한도를 초과하여 발주가 제한되었습니다. (한도: %s, 현재 미수금: %s, 신규 발주액: %s, 예상 미수금: %s)',
                to_char(v_store.credit_limit, 'FM999,999,999,990'),
                to_char(v_store.outstanding_balance, 'FM999,999,999,990'),
                to_char(p_order_amount, 'FM999,999,999,990'),
                to_char(v_new_balance, 'FM999,999,999,990')
            );
        END IF;
        v_remaining := v_store.credit_limit - v_new_balance;
    ELSE
        -- credit_limit = 0: 기본적으로 0원이면 한도 제약 없음(또는 관리자 설정에 따름)
        v_remaining := 0;
    END IF;

    RETURN jsonb_build_object(
        'allowed', v_is_allowed,
        'store_id', v_store.id,
        'store_name', v_store.name,
        'price_tier', v_store.price_tier,
        'credit_limit', v_store.credit_limit,
        'current_balance', v_store.outstanding_balance,
        'order_amount', p_order_amount,
        'projected_balance', v_new_balance,
        'remaining_credit', v_remaining,
        'reason', v_reason
    );
END;
$$;

-- 6. [PostgreSQL RPC] 여신 미수금 누적 반영 함수 (apply_store_credit_charge)
CREATE OR REPLACE FUNCTION public.apply_store_credit_charge(
    p_store_id UUID,
    p_order_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_check JSONB;
    v_updated_balance NUMERIC;
BEGIN
    -- 1. 한도 검증 수행
    v_check := public.check_store_credit_limit(p_store_id, p_order_amount);

    IF (v_check->>'allowed')::boolean = false THEN
        RAISE EXCEPTION 'CREDIT_LIMIT_EXCEEDED: %', (v_check->>'reason');
    END IF;

    -- 2. 미수금 가산
    UPDATE public.stores
    SET outstanding_balance = COALESCE(outstanding_balance, 0) + p_order_amount,
        updated_at = NOW()
    WHERE id = p_store_id
    RETURNING outstanding_balance INTO v_updated_balance;

    RETURN jsonb_build_object(
        'success', true,
        'store_id', p_store_id,
        'updated_balance', v_updated_balance
    );
END;
$$;
