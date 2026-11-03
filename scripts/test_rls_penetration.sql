-- ==============================================================================
-- Phase 1 - Week 4: Multi-Tenant RLS Penetration & Cross-Leak Security Audit
-- Description: Glife vs Acme 간 PostgreSQL Row-Level Security 침투 및 데이터 누출 방어 검증
-- ==============================================================================

-- 1. 10대 비즈니스 테이블에 FORCE ROW LEVEL SECURITY 적용 (테이블 소유자도 RLS 적용)
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'clients',
        'items',
        'inventory',
        'locations',
        'orders',
        'order_items',
        'stores',
        'partners',
        'item_conversions',
        'inventory_adjustments'
    ])
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', tbl);
        END IF;
    END LOOP;
END $$;

-- 2. authenticated 역할(실제 앱 접속자 롤)로 RLS 침투 테스트 수행
DO $$
DECLARE
    v_glife_tenant_id UUID := '9df4f04d-b4be-4256-bfa5-aa48c4fd5d13';
    v_acme_tenant_id  UUID := 'a0000000-0000-0000-0000-000000000001';
    
    v_leak_count INT;
    v_updated_count INT;
    v_test_no INT := 0;
    v_passed INT := 0;
    v_failed INT := 0;
BEGIN
    -- 중요: postgres 슈퍼유저는 RLS를 자동 bypass하므로, 실제 웹/모바일 앱 역할인 'authenticated'로 전환
    SET LOCAL ROLE authenticated;

    RAISE NOTICE '====================================================================';
    RAISE NOTICE '🛡️ MULTI-TENANT RLS PENETRATION & ISOLATION SECURITY AUDIT';
    RAISE NOTICE '   Role: authenticated (Simulating real application traffic)';
    RAISE NOTICE '====================================================================';

    -- --------------------------------------------------------------------------
    -- TEST 1: Glife 세션에서 Acme 테넌트의 품목(items) 조회 차단 검증
    -- --------------------------------------------------------------------------
    v_test_no := v_test_no + 1;
    PERFORM set_config('app.current_tenant_id', v_glife_tenant_id::TEXT, true);
    
    SELECT COUNT(*) INTO v_leak_count 
    FROM public.items 
    WHERE tenant_id = v_acme_tenant_id;

    IF v_leak_count = 0 THEN
        v_passed := v_passed + 1;
        RAISE NOTICE '[TEST 1: PASS] Glife context cannot see Acme items (Count: 0)';
    ELSE
        v_failed := v_failed + 1;
        RAISE WARNING '[TEST 1: FAIL] LEAK DETECTED! Glife saw % Acme items', v_leak_count;
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 2: Glife 세션에서 Acme 재고(inventory) 임의 변조(UPDATE) 차단 검증
    -- --------------------------------------------------------------------------
    v_test_no := v_test_no + 1;
    PERFORM set_config('app.current_tenant_id', v_glife_tenant_id::TEXT, true);

    -- Glife 세션에서 Acme 품목의 재고를 9999로 조작 시도
    WITH attempt_update AS (
        UPDATE public.inventory
        SET on_hand_qty = 9999
        WHERE tenant_id = v_acme_tenant_id
        RETURNING id
    )
    SELECT COUNT(*) INTO v_updated_count FROM attempt_update;

    IF v_updated_count = 0 THEN
        v_passed := v_passed + 1;
        RAISE NOTICE '[TEST 2: PASS] Glife context blocked from updating Acme inventory (Updated: 0)';
    ELSE
        v_failed := v_failed + 1;
        RAISE WARNING '[TEST 2: FAIL] SECURITY BREACH! Glife modified % Acme inventory records', v_updated_count;
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 3: Acme 세션에서 Glife 핵심 품목(Buldak 라면 등) 조회 차단 검증
    -- --------------------------------------------------------------------------
    v_test_no := v_test_no + 1;
    PERFORM set_config('app.current_tenant_id', v_acme_tenant_id::TEXT, true);

    SELECT COUNT(*) INTO v_leak_count 
    FROM public.items 
    WHERE tenant_id = v_glife_tenant_id;

    IF v_leak_count = 0 THEN
        v_passed := v_passed + 1;
        RAISE NOTICE '[TEST 3: PASS] Acme context cannot see Glife items (Count: 0)';
    ELSE
        v_failed := v_failed + 1;
        RAISE WARNING '[TEST 3: FAIL] LEAK DETECTED! Acme saw % Glife items', v_leak_count;
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 4: Acme 세션에서 본인 데이터(코카콜라, 감자칩)만 정상 조회되는지 검증
    -- --------------------------------------------------------------------------
    v_test_no := v_test_no + 1;
    PERFORM set_config('app.current_tenant_id', v_acme_tenant_id::TEXT, true);

    SELECT COUNT(*) INTO v_leak_count 
    FROM public.items 
    WHERE sku IN ('ACME-COKE-BOX', 'ACME-COKE-CAN', 'ACME-CHIP-60G');

    IF v_leak_count >= 3 THEN
        v_passed := v_passed + 1;
        RAISE NOTICE '[TEST 4: PASS] Acme context sees its own 3 onboarded items';
    ELSE
        v_failed := v_failed + 1;
        RAISE WARNING '[TEST 4: FAIL] Acme cannot see its own items (Found: %)', v_leak_count;
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 5: 테넌트 간 번들 해체 규칙(item_conversions) 격리 검증
    -- --------------------------------------------------------------------------
    v_test_no := v_test_no + 1;
    PERFORM set_config('app.current_tenant_id', v_glife_tenant_id::TEXT, true);

    SELECT COUNT(*) INTO v_leak_count 
    FROM public.item_conversions 
    WHERE tenant_id = v_acme_tenant_id;

    IF v_leak_count = 0 THEN
        v_passed := v_passed + 1;
        RAISE NOTICE '[TEST 5: PASS] Glife context cannot see Acme de-kit conversions (Count: 0)';
    ELSE
        v_failed := v_failed + 1;
        RAISE WARNING '[TEST 5: FAIL] LEAK DETECTED! Glife saw % Acme conversion rules', v_leak_count;
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 6: 테넌트별 운영 정책(tenant_settings) 격리 검증
    -- --------------------------------------------------------------------------
    v_test_no := v_test_no + 1;
    PERFORM set_config('app.current_tenant_id', v_acme_tenant_id::TEXT, true);

    IF EXISTS (
        SELECT 1 FROM public.tenant_settings 
        WHERE tenant_id = v_acme_tenant_id 
          AND primary_color = '#0284c7' 
          AND currency = 'USD'
          AND stock_policy = 'HARD_LIMIT'
    ) THEN
        v_passed := v_passed + 1;
        RAISE NOTICE '[TEST 6: PASS] Acme tenant_settings correctly loaded (Color: #0284c7, USD, HARD_LIMIT)';
    ELSE
        v_failed := v_failed + 1;
        RAISE WARNING '[TEST 6: FAIL] Acme tenant_settings missing or mismatched';
    END IF;

    RAISE NOTICE '====================================================================';
    RAISE NOTICE '🏁 AUDIT RESULT: % of % TESTS PASSED (Failed: %)', v_passed, v_test_no, v_failed;
    RAISE NOTICE '====================================================================';

    IF v_failed > 0 THEN
        RAISE EXCEPTION 'RLS Penetration Audit Failed with % leak(s)!', v_failed;
    END IF;
END $$;
