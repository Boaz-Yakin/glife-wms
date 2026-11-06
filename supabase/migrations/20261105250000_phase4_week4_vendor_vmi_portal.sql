-- ==============================================================================
-- Phase 4 - Week 4: Vendor Managed Inventory (VMI) Portal & ASN Engine
-- Description: 공급사/제조사 위탁 재고 실시간 소진율 분석 및 사전 입고 예정 통지(ASN) 스키마
-- Migration Date: 2026-11-05
-- ==============================================================================

-- 1. user_role enum에 'VENDOR' 추가 (존재하지 않을 경우)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        WHERE t.typname = 'user_role' AND e.enumlabel = 'VENDOR'
    ) THEN
        ALTER TYPE public.user_role ADD VALUE 'VENDOR';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. users 테이블에 partner_id FK 추가 (공급사 계정 매핑용)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.users.partner_id IS '공급사(VENDOR) 계정에 연결된 협력업체/제조사 ID';

-- 3. 사전 입고 예정 통지 테이블 (ASN - Advanced Shipping Notice)
CREATE TABLE IF NOT EXISTS public.inbound_shipment_notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    asn_no VARCHAR(50) UNIQUE NOT NULL,
    expected_delivery_date DATE NOT NULL,
    carrier_name VARCHAR(100),
    tracking_number VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED', -- 'DRAFT', 'SUBMITTED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.inbound_shipment_notices IS '공급업체의 사전 입고 예정 통지(ASN) 헤더 원장';

CREATE INDEX IF NOT EXISTS idx_asn_tenant_partner 
ON public.inbound_shipment_notices (tenant_id, partner_id, expected_delivery_date DESC);

-- 4. ASN 품목 상세 테이블
CREATE TABLE IF NOT EXISTS public.inbound_shipment_notice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asn_id UUID NOT NULL REFERENCES public.inbound_shipment_notices(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    expected_qty INT NOT NULL CHECK (expected_qty > 0),
    received_qty INT NOT NULL DEFAULT 0,
    lot_no VARCHAR(50),
    expiration_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.inbound_shipment_notice_items IS '사전 입고 예정 품목 및 수량 상세';

CREATE INDEX IF NOT EXISTS idx_asn_items_asn 
ON public.inbound_shipment_notice_items (asn_id);

-- RLS 활성화
ALTER TABLE public.inbound_shipment_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbound_shipment_notice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "asn_tenant_policy" ON public.inbound_shipment_notices;
CREATE POLICY "asn_tenant_policy"
ON public.inbound_shipment_notices
FOR ALL
USING (
    tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    OR (SELECT role::text FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
);

DROP POLICY IF EXISTS "asn_items_policy" ON public.inbound_shipment_notice_items;
CREATE POLICY "asn_items_policy"
ON public.inbound_shipment_notice_items
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.inbound_shipment_notices asn
        WHERE asn.id = inbound_shipment_notice_items.asn_id
          AND (
              asn.tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
              OR (SELECT role::text FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
          )
    )
);

-- 5. 데모 파트너 연결 및 초기 샘플 ASN 데이터 시딩
DO $$
DECLARE
    v_glife_tenant UUID := '9df4f04d-b4be-4256-bfa5-aa48c4fd5d13';
    v_partner_id UUID;
    v_item_id UUID;
    v_asn_id UUID;
BEGIN
    -- 첫 번째 공급사(Partner) 찾기 또는 생성
    SELECT id INTO v_partner_id FROM public.partners WHERE tenant_id = v_glife_tenant LIMIT 1;

    IF v_partner_id IS NULL THEN
        INSERT INTO public.partners (tenant_id, name, type, contact_person, phone)
        VALUES (v_glife_tenant, '서울제과 유통사업부', 'SUPPLIER', '김공급 부장', '010-8888-9999')
        RETURNING id INTO v_partner_id;
    END IF;

    -- 품목 연결 (supplier_id가 NULL인 경우 업데이트)
    UPDATE public.items 
    SET supplier_id = v_partner_id 
    WHERE tenant_id = v_glife_tenant 
      AND supplier_id IS NULL 
      AND id IN (SELECT id FROM public.items WHERE tenant_id = v_glife_tenant LIMIT 5);

    -- 샘플 품목 1개 추출
    SELECT id INTO v_item_id FROM public.items WHERE tenant_id = v_glife_tenant AND supplier_id = v_partner_id LIMIT 1;

    IF v_item_id IS NOT NULL THEN
        -- 샘플 ASN 생성
        INSERT INTO public.inbound_shipment_notices (
            tenant_id, partner_id, asn_no, expected_delivery_date, carrier_name, tracking_number, status, note
        ) VALUES (
            v_glife_tenant, v_partner_id, 'ASN-20261105-001', CURRENT_DATE + 2, 'CJ대한통운', '5688-1294-8821', 'IN_TRANSIT', '정기 보충 입고 1차분'
        ) ON CONFLICT (asn_no) DO NOTHING
        RETURNING id INTO v_asn_id;

        IF v_asn_id IS NOT NULL THEN
            INSERT INTO public.inbound_shipment_notice_items (
                asn_id, item_id, expected_qty, lot_no, expiration_date
            ) VALUES (
                v_asn_id, v_item_id, 200, 'LOT-202611-A', CURRENT_DATE + 180
            );
        END IF;
    END IF;
END $$;
