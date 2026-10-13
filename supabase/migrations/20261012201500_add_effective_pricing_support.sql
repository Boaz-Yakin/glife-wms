-- ======================================================================================
-- Migration: 20261012201500_add_effective_pricing_support.sql
-- Description: 중앙 집중식 단가 계산 로직 (BOX, PACK, UNIT/EA) 지원 함수 및 뷰 생성
-- ======================================================================================

-- 1. 순수 가격 계산 함수 (IMMUTABLE, UOM 및 가격 3종을 받아 유효 단가 계산)
CREATE OR REPLACE FUNCTION public.get_item_effective_price(
    p_uom TEXT,
    p_unit_price NUMERIC,
    p_pack_price NUMERIC,
    p_box_price NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
    v_uom TEXT := UPPER(TRIM(COALESCE(p_uom, '')));
    v_unit NUMERIC := COALESCE(p_unit_price, 0);
    v_pack NUMERIC := COALESCE(p_pack_price, 0);
    v_box NUMERIC := COALESCE(p_box_price, 0);
BEGIN
    IF v_uom = 'BOX' THEN
        IF v_box > 0 THEN RETURN v_box; END IF;
        IF v_unit > 0 THEN RETURN v_unit; END IF;
        RETURN v_pack;
    ELSIF v_uom = 'PACK' THEN
        IF v_pack > 0 THEN RETURN v_pack; END IF;
        IF v_box > 0 THEN RETURN v_box; END IF;
        IF v_unit > 0 THEN RETURN v_unit; END IF;
        RETURN 0;
    ELSIF v_uom = 'EA' THEN
        IF v_unit > 0 THEN RETURN v_unit; END IF;
        IF v_box > 0 THEN RETURN v_box; END IF;
        RETURN v_pack;
    ELSE
        -- Fallback: unit_price > box_price > pack_price
        IF v_unit > 0 THEN RETURN v_unit; END IF;
        IF v_box > 0 THEN RETURN v_box; END IF;
        RETURN v_pack;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.get_item_effective_price(TEXT, NUMERIC, NUMERIC, NUMERIC)
IS 'UOM(BOX, PACK, EA 등)과 가격 정보에 따라 유효 단가를 계산하는 표준 함수 (pricing.ts와 100% 동일 규칙 적용)';

-- 2. 특정 품목(item_id)과 주문 UOM에 대한 유효 단가 조회 RPC (OrderApp 및 타 앱용)
CREATE OR REPLACE FUNCTION public.get_effective_price_for_item(
    p_item_id UUID,
    p_order_uom TEXT DEFAULT NULL
) RETURNS NUMERIC AS $$
DECLARE
    v_rec RECORD;
    v_target_uom TEXT;
BEGIN
    SELECT uom, unit_price, pack_price, box_price
    INTO v_rec
    FROM public.items
    WHERE id = p_item_id;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- 지정된 order_uom이 없으면 품목의 기본 uom 사용
    v_target_uom := COALESCE(NULLIF(TRIM(p_order_uom), ''), v_rec.uom);

    RETURN public.get_item_effective_price(
        v_target_uom,
        v_rec.unit_price,
        v_rec.pack_price,
        v_rec.box_price
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_effective_price_for_item(UUID, TEXT)
IS '특정 item_id와 주문 UOM(선택)을 전달하면 최종 유효 단가를 반환하는 RPC';

-- 3. 유효 단가가 계산된 상품 조회용 뷰 (View)
-- OrderApp, g-manager 등에서 별도 연산 없이 바로 단가를 조회할 때 사용
CREATE OR REPLACE VIEW public.items_with_pricing AS
SELECT 
    i.*,
    public.get_item_effective_price(i.uom, i.unit_price, i.pack_price, i.box_price) AS effective_price
FROM public.items i;

COMMENT ON VIEW public.items_with_pricing
IS '기존 items 테이블에 기본 UOM 기준의 유효 단가(effective_price)가 사전 계산되어 포함된 뷰';

-- 4. 뷰 및 함수 권한 부여
GRANT EXECUTE ON FUNCTION public.get_item_effective_price(TEXT, NUMERIC, NUMERIC, NUMERIC) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_effective_price_for_item(UUID, TEXT) TO anon, authenticated, service_role;
GRANT SELECT ON public.items_with_pricing TO anon, authenticated, service_role;
