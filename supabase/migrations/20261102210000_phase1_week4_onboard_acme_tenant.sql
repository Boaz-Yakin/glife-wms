-- ==============================================================================
-- Phase 1 - Week 4: Onboard 2nd Tenant 'Acme Food Logistics' (Simulation Seed)
-- Description: 가상 2호 테넌트 Acme Food 온보딩 시뮬레이션 데이터 셋업
-- Target: tenants, tenant_settings, clients, stores, partners, locations, 
--         items, item_conversions, inventory
-- ==============================================================================

-- 0. zone_type ENUM에 'S' (Staging 구역) 안전 추가
ALTER TYPE public.zone_type ADD VALUE IF NOT EXISTS 'S';

DO $$
DECLARE
    v_acme_tenant_id UUID := 'a0000000-0000-0000-0000-000000000001';
    v_acme_client_id UUID := 'a0000000-0000-0000-0000-000000000002';
    v_acme_store_id  UUID := 'a0000000-0000-0000-0000-000000000003';
    v_acme_partner_id UUID := 'a0000000-0000-0000-0000-000000000004';
    
    v_loc_box UUID;
    v_loc_ea UUID;
    v_loc_dekit UUID;
    
    v_item_coke_box UUID;
    v_item_coke_can UUID;
    v_item_chip UUID;
BEGIN
    -- 1. Acme Food 테넌트 등록
    INSERT INTO public.tenants (
        id, code, company_name, business_number, contact_email, contact_phone, 
        custom_domain, subscription_plan, subscription_status
    ) VALUES (
        v_acme_tenant_id,
        'acme',
        'Acme Food Logistics Inc.',
        '123-45-67890',
        'ops@acmefood.com',
        '+1-800-555-0199',
        'wms.acmefood.com',
        'PRO',
        'ACTIVE'
    )
    ON CONFLICT (id) DO UPDATE SET
        company_name = EXCLUDED.company_name,
        code = EXCLUDED.code,
        subscription_plan = EXCLUDED.subscription_plan;

    -- 2. Acme 창고 로케이션 사전 생성 (SaaS 격리 환경 검증용 전용 Aisle 09, Zone 'A')
    -- 2.1 박스 보관 랙 (LOC-A0901A01)
    INSERT INTO public.locations (code, zone_type, tenant_id)
    VALUES ('LOC-A0901A01', 'A', v_acme_tenant_id)
    ON CONFLICT (code) DO UPDATE SET tenant_id = EXCLUDED.tenant_id
    RETURNING id INTO v_loc_box;

    -- 2.2 낱개 보관 랙 (LOC-A0901A02)
    INSERT INTO public.locations (code, zone_type, tenant_id)
    VALUES ('LOC-A0901A02', 'A', v_acme_tenant_id)
    ON CONFLICT (code) DO UPDATE SET tenant_id = EXCLUDED.tenant_id
    RETURNING id INTO v_loc_ea;

    -- 2.3 De-kit 전용 로케이션 (LOC-A0901A03, Zone 'A' 보장)
    INSERT INTO public.locations (code, zone_type, tenant_id)
    VALUES ('LOC-A0901A03', 'A', v_acme_tenant_id)
    ON CONFLICT (code) DO UPDATE SET tenant_id = EXCLUDED.tenant_id
    RETURNING id INTO v_loc_dekit;

    -- 3. Acme 테넌트 브랜딩 및 운영 정책(Policy) 등록
    INSERT INTO public.tenant_settings (
        tenant_id, logo_url, favicon_url, primary_color, currency, currency_symbol,
        timezone, stock_policy, perishable_mode, auto_dekit_enabled, default_dekit_location_id
    ) VALUES (
        v_acme_tenant_id,
        'https://images.unsplash.com/photo-1542838132-92c53300491e?w=128&auto=format&fit=crop&q=80',
        '/favicon.ico',
        '#0284c7', -- Sky Blue (글라이프의 에메랄드 그린 #059669과 뚜렷이 대비)
        'USD',
        '$',
        'America/New_York',
        'HARD_LIMIT', -- 재고 부족 시 주문 엄격 차단
        TRUE,
        TRUE,
        v_loc_dekit
    )
    ON CONFLICT (tenant_id) DO UPDATE SET
        primary_color = EXCLUDED.primary_color,
        currency = EXCLUDED.currency,
        currency_symbol = EXCLUDED.currency_symbol,
        stock_policy = EXCLUDED.stock_policy,
        auto_dekit_enabled = EXCLUDED.auto_dekit_enabled,
        default_dekit_location_id = EXCLUDED.default_dekit_location_id;

    -- 4. Acme 파트너(공급처) 등록
    INSERT INTO public.partners (id, name, type, contact_person, phone, email, tenant_id)
    VALUES (
        v_acme_partner_id,
        'Acme Beverage Bottling Co.',
        'SUPPLIER',
        'John Smith',
        '+1-800-555-0122',
        'supplier@acmebottling.com',
        v_acme_tenant_id
    )
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, tenant_id = EXCLUDED.tenant_id;

    -- 5. Acme 화주사(Client) & 발주 매장(Store) 등록
    INSERT INTO public.clients (id, name, code, tenant_id)
    VALUES (
        v_acme_client_id,
        'Acme Retail Operations',
        'ACM-RET',
        v_acme_tenant_id
    )
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, tenant_id = EXCLUDED.tenant_id;

    INSERT INTO public.stores (id, name, store_no, client_id, tenant_id)
    VALUES (
        v_acme_store_id,
        'Acme Broadway Express #101',
        '101',
        v_acme_client_id,
        v_acme_tenant_id
    )
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, tenant_id = EXCLUDED.tenant_id;

    -- 6. Acme 품목 3종 등록 (번들 부모, 낱개 자식, 일반 품목)
    -- 6.1 Coca-Cola 355ml 24-Can Box (부모 품목)
    INSERT INTO public.items (
        sku, name_en, desc_en, category, uom, unit_price, units_per_box, zone_type, client_id, tenant_id
    ) VALUES (
        'ACME-COKE-BOX',
        'Coca-Cola 355ml (24 Cans Box)',
        'Coca-Cola 355ml 24-Can Master Box',
        'Beverage',
        'BOX',
        24.00,
        24,
        'A',
        v_acme_client_id,
        v_acme_tenant_id
    )
    ON CONFLICT (sku) DO UPDATE SET 
        name_en = EXCLUDED.name_en, 
        client_id = EXCLUDED.client_id, 
        tenant_id = EXCLUDED.tenant_id
    RETURNING id INTO v_item_coke_box;

    -- 6.2 Coca-Cola 355ml Single Can (자식 품목)
    INSERT INTO public.items (
        sku, name_en, desc_en, category, uom, unit_price, units_per_box, zone_type, client_id, tenant_id
    ) VALUES (
        'ACME-COKE-CAN',
        'Coca-Cola 355ml (Single Can)',
        'Coca-Cola 355ml Single Aluminum Can',
        'Beverage',
        'EA',
        1.25,
        1,
        'A',
        v_acme_client_id,
        v_acme_tenant_id
    )
    ON CONFLICT (sku) DO UPDATE SET 
        name_en = EXCLUDED.name_en, 
        client_id = EXCLUDED.client_id, 
        tenant_id = EXCLUDED.tenant_id
    RETURNING id INTO v_item_coke_can;

    -- 6.3 Acme Potato Chips 60g (단일 품목)
    INSERT INTO public.items (
        sku, name_en, desc_en, category, uom, unit_price, units_per_box, zone_type, client_id, tenant_id
    ) VALUES (
        'ACME-CHIP-60G',
        'Acme Potato Chips 60g',
        'Acme Crispy Original Potato Chips 60g',
        'Snack',
        'EA',
        2.00,
        1,
        'A',
        v_acme_client_id,
        v_acme_tenant_id
    )
    ON CONFLICT (sku) DO UPDATE SET 
        name_en = EXCLUDED.name_en, 
        client_id = EXCLUDED.client_id, 
        tenant_id = EXCLUDED.tenant_id
    RETURNING id INTO v_item_chip;

    -- 7. Acme 번들 해체(De-kitting) 규칙 등록 (24캔 박스 -> 낱개 캔, Ratio: 24)
    INSERT INTO public.item_conversions (
        parent_item_id, child_item_id, conversion_ratio, target_location_id, 
        auto_dekit_on_order, note, tenant_id
    ) VALUES (
        v_item_coke_box,
        v_item_coke_can,
        24,
        v_loc_dekit,
        TRUE,
        'Acme Food: Coke 24-can box de-kitting into single cans',
        v_acme_tenant_id
    )
    ON CONFLICT (parent_item_id, child_item_id) DO UPDATE SET
        conversion_ratio = EXCLUDED.conversion_ratio,
        target_location_id = EXCLUDED.target_location_id,
        auto_dekit_on_order = EXCLUDED.auto_dekit_on_order,
        tenant_id = EXCLUDED.tenant_id;

    -- 8. Acme 초기 재고 등록
    -- 8.1 코카콜라 박스 10박스 보관 (on_hand = 10)
    INSERT INTO public.inventory (
        item_id, location_id, on_hand, allocated, tenant_id
    ) VALUES (
        v_item_coke_box, v_loc_box, 10, 0, v_acme_tenant_id
    )
    ON CONFLICT (item_id, location_id) DO UPDATE SET
        on_hand = EXCLUDED.on_hand,
        tenant_id = EXCLUDED.tenant_id;

    -- 8.2 감자칩 50봉지 보관 (on_hand = 50)
    INSERT INTO public.inventory (
        item_id, location_id, on_hand, allocated, tenant_id
    ) VALUES (
        v_item_chip, v_loc_ea, 50, 0, v_acme_tenant_id
    )
    ON CONFLICT (item_id, location_id) DO UPDATE SET
        on_hand = EXCLUDED.on_hand,
        tenant_id = EXCLUDED.tenant_id;

    RAISE NOTICE 'Acme Food Logistics (tenant_id: %) onboarded successfully with initial items and stock!', v_acme_tenant_id;
END $$;

NOTIFY pgrst, 'reload schema';
