-- ==============================================================================
-- Phase 1 - Week 4: RLS Penetration Diagnostic (Returns Table Results)
-- Description: 6개 테스트의 개별 결과와 카운트를 명확하게 테이블로 출력
-- ==============================================================================

DO $$
BEGIN
    -- 1. FORCE ROW LEVEL SECURITY 적용
    FOR tbl IN SELECT unnest(ARRAY[
        'clients', 'items', 'inventory', 'locations', 'orders',
        'order_items', 'stores', 'partners', 'item_conversions', 'inventory_adjustments'
    ])
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', tbl);
        END IF;
    END LOOP;
END $$;

-- 2. 테스트 결과 테이블 생성 및 진단 수행
CREATE TEMP TABLE IF NOT EXISTS temp_audit_results (
    test_id INT,
    test_name TEXT,
    status TEXT,
    details TEXT
);
TRUNCATE temp_audit_results;

DO $$
DECLARE
    v_glife_tenant_id UUID := '9df4f04d-b4be-4256-bfa5-aa48c4fd5d13';
    v_acme_tenant_id  UUID := 'a0000000-0000-0000-0000-000000000001';
    v_count INT;
    v_updated INT;
BEGIN
    SET LOCAL ROLE authenticated;

    -- TEST 1
    PERFORM set_config('app.current_tenant_id', v_glife_tenant_id::TEXT, true);
    SELECT COUNT(*) INTO v_count FROM public.items WHERE tenant_id = v_acme_tenant_id;
    IF v_count = 0 THEN
        INSERT INTO temp_audit_results VALUES (1, 'Glife cannot see Acme items', 'PASS', 'Count: 0');
    ELSE
        INSERT INTO temp_audit_results VALUES (1, 'Glife cannot see Acme items', 'FAIL', 'Leaked items: ' || v_count);
    END IF;

    -- TEST 2
    PERFORM set_config('app.current_tenant_id', v_glife_tenant_id::TEXT, true);
    WITH attempt_update AS (
        UPDATE public.inventory SET on_hand_qty = 9999 WHERE tenant_id = v_acme_tenant_id RETURNING id
    )
    SELECT COUNT(*) INTO v_updated FROM attempt_update;
    IF v_updated = 0 THEN
        INSERT INTO temp_audit_results VALUES (2, 'Glife blocked from updating Acme inventory', 'PASS', 'Updated: 0');
    ELSE
        INSERT INTO temp_audit_results VALUES (2, 'Glife blocked from updating Acme inventory', 'FAIL', 'Updated records: ' || v_updated);
    END IF;

    -- TEST 3
    PERFORM set_config('app.current_tenant_id', v_acme_tenant_id::TEXT, true);
    SELECT COUNT(*) INTO v_count FROM public.items WHERE tenant_id = v_glife_tenant_id;
    IF v_count = 0 THEN
        INSERT INTO temp_audit_results VALUES (3, 'Acme cannot see Glife items', 'PASS', 'Count: 0');
    ELSE
        INSERT INTO temp_audit_results VALUES (3, 'Acme cannot see Glife items', 'FAIL', 'Leaked items: ' || v_count);
    END IF;

    -- TEST 4
    PERFORM set_config('app.current_tenant_id', v_acme_tenant_id::TEXT, true);
    SELECT COUNT(*) INTO v_count FROM public.items WHERE sku IN ('ACME-COKE-BOX', 'ACME-COKE-CAN', 'ACME-CHIP-60G');
    IF v_count >= 3 THEN
        INSERT INTO temp_audit_results VALUES (4, 'Acme sees its own 3 items', 'PASS', 'Found: ' || v_count);
    ELSE
        INSERT INTO temp_audit_results VALUES (4, 'Acme sees its own 3 items', 'FAIL', 'Found only: ' || v_count);
    END IF;

    -- TEST 5
    PERFORM set_config('app.current_tenant_id', v_glife_tenant_id::TEXT, true);
    SELECT COUNT(*) INTO v_count FROM public.item_conversions WHERE tenant_id = v_acme_tenant_id;
    IF v_count = 0 THEN
        INSERT INTO temp_audit_results VALUES (5, 'Glife cannot see Acme conversions', 'PASS', 'Count: 0');
    ELSE
        INSERT INTO temp_audit_results VALUES (5, 'Glife cannot see Acme conversions', 'FAIL', 'Leaked rules: ' || v_count);
    END IF;

    -- TEST 6
    PERFORM set_config('app.current_tenant_id', v_acme_tenant_id::TEXT, true);
    SELECT COUNT(*) INTO v_count FROM public.tenant_settings 
    WHERE tenant_id = v_acme_tenant_id AND primary_color = '#0284c7' AND currency = 'USD' AND stock_policy = 'HARD_LIMIT';
    IF v_count > 0 THEN
        INSERT INTO temp_audit_results VALUES (6, 'Acme tenant settings loaded', 'PASS', 'Matched settings: ' || v_count);
    ELSE
        INSERT INTO temp_audit_results VALUES (6, 'Acme tenant settings loaded', 'FAIL', 'Missing settings');
    END IF;
END $$;

-- 결과 테이블 표출
SELECT * FROM temp_audit_results ORDER BY test_id;
