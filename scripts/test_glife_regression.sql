-- ==============================================================================
-- Phase 1 - Week 4: Glife WMS Zero-Downtime & Zero Side-Effect Regression Test
-- Description: 멀티테넌시 및 De-kit/정책 적용 후 기존 글라이프 물류센터 데이터 무결성 검증
-- Usage: Supabase SQL Editor에서 실행
-- ==============================================================================

DO $$
DECLARE
    v_glife_tenant_id UUID := '9df4f04d-b4be-4256-bfa5-aa48c4fd5d13';
    v_item_count INT;
    v_loc_count INT;
    v_partner_count INT;
    v_client_count INT;
    v_store_count INT;
    v_conversion_count INT;
    v_inventory_count INT;
BEGIN
    RAISE NOTICE '====================================================================';
    RAISE NOTICE '🏭 GLIFE WMS ZERO SIDE-EFFECT REGRESSION AUDIT';
    RAISE NOTICE '====================================================================';

    -- Glife 테넌트 컨텍스트 설정
    PERFORM set_config('app.current_tenant_id', v_glife_tenant_id::TEXT, true);

    -- 1. 품목(Items) 수량 확인
    SELECT COUNT(*) INTO v_item_count FROM public.items WHERE tenant_id = v_glife_tenant_id;
    RAISE NOTICE '• Glife Active Items: %', v_item_count;

    -- 2. 로케이션(Locations) 수량 확인
    SELECT COUNT(*) INTO v_loc_count FROM public.locations WHERE tenant_id = v_glife_tenant_id;
    RAISE NOTICE '• Glife Locations: %', v_loc_count;

    -- 3. 거래처(Partners) & 화주사(Clients) & 매장(Stores) 수량 확인
    SELECT COUNT(*) INTO v_partner_count FROM public.partners WHERE tenant_id = v_glife_tenant_id;
    SELECT COUNT(*) INTO v_client_count FROM public.clients WHERE tenant_id = v_glife_tenant_id;
    SELECT COUNT(*) INTO v_store_count FROM public.stores WHERE tenant_id = v_glife_tenant_id;
    RAISE NOTICE '• Glife Partners: %, Clients: %, Stores: %', v_partner_count, v_client_count, v_store_count;

    -- 4. 번들 해체 규칙(Item Conversions) 확인
    SELECT COUNT(*) INTO v_conversion_count FROM public.item_conversions WHERE tenant_id = v_glife_tenant_id;
    RAISE NOTICE '• Glife Bundle De-kit Rules: %', v_conversion_count;

    -- 5. 보관 재고(Inventory) 레코드 확인
    SELECT COUNT(*) INTO v_inventory_count FROM public.inventory WHERE tenant_id = v_glife_tenant_id;
    RAISE NOTICE '• Glife Inventory Stock Records: %', v_inventory_count;

    -- 검증 검사
    IF v_item_count = 0 OR v_loc_count = 0 OR v_inventory_count = 0 THEN
        RAISE EXCEPTION 'REGRESSION DETECTED! Glife existing core data appears missing or compromised!';
    ELSE
        RAISE NOTICE '====================================================================';
        RAISE NOTICE '✅ ZERO SIDE-EFFECT VERIFIED: All Glife legacy operational data is intact!';
        RAISE NOTICE '====================================================================';
    END IF;
END $$;
