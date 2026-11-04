-- ==============================================================================
-- Phase 3 - Week 1: SaaS Subscription Billing & Feature Gatekeeper DDL
-- Description: 토스페이먼츠/Stripe 정기 구독 결제, 요금제(STARTER, PRO, ENTERPRISE),
--              플랜별 기능 제한(Gatekeeper) 및 인보이스(Invoices) 원장 테이블
-- Migration Date: 2026-11-03
-- ==============================================================================

-- 1. 테넌트 구독 상태 및 결제 주기 테이블
CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    plan_tier VARCHAR(30) NOT NULL DEFAULT 'PRO' 
        CHECK (plan_tier IN ('STARTER', 'PRO', 'ENTERPRISE')),
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'MONTHLY'
        CHECK (billing_cycle IN ('MONTHLY', 'ANNUAL')),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'PAST_DUE', 'TRIALING', 'CANCELED')),
    payment_method VARCHAR(20) NOT NULL DEFAULT 'CARD'
        CHECK (payment_method IN ('CARD', 'BANK_TRANSFER', 'AUTO_DEBIT')),
    billing_key TEXT,                          -- PG사 정기결제 빌링키
    card_info JSONB DEFAULT '{}'::jsonb,        -- 카드사 마스킹 정보 e.g. {"card_company": "현대", "last4": "1234"}
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
    trial_end_at TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_tenant_subscription UNIQUE (tenant_id)
);

COMMENT ON TABLE public.tenant_subscriptions IS 'B2B SaaS 테넌트 정기 구독 플랜 및 결제 원장';
COMMENT ON COLUMN public.tenant_subscriptions.plan_tier IS '구독 등급: STARTER(19만), PRO(49만), ENTERPRISE(120만)';
COMMENT ON COLUMN public.tenant_subscriptions.status IS '구독 상태: ACTIVE, TRIALING, PAST_DUE, CANCELED';

-- 2. 월별 정기 청구 인보이스 및 영수증 테이블
CREATE TABLE IF NOT EXISTS public.billing_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    plan_tier VARCHAR(30) NOT NULL,
    base_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    usage_amount NUMERIC(10,2) NOT NULL DEFAULT 0,      -- 추가 사용량 (알림톡, 추가 좌석 등)
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(30) NOT NULL DEFAULT 'PAID'
        CHECK (payment_status IN ('PAID', 'PENDING', 'FAILED')),
    payment_method VARCHAR(20) DEFAULT 'CARD',
    paid_at TIMESTAMPTZ,
    receipt_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.billing_invoices IS '테넌트 정기 구독 결제 및 종량제 합산 청구서 원장';

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant ON public.tenant_subscriptions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_tenant ON public.billing_invoices(tenant_id, created_at DESC);

-- 4. Supabase Row-Level Security (RLS) 정책
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation tenant_subscriptions" ON public.tenant_subscriptions;
CREATE POLICY "Tenant Isolation tenant_subscriptions" ON public.tenant_subscriptions
FOR ALL USING (
    tenant_id = public.get_current_tenant_id()
    OR public.is_platform_super_admin()
)
WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    OR public.is_platform_super_admin()
);

DROP POLICY IF EXISTS "Tenant Isolation billing_invoices" ON public.billing_invoices;
CREATE POLICY "Tenant Isolation billing_invoices" ON public.billing_invoices
FOR ALL USING (
    tenant_id = public.get_current_tenant_id()
    OR public.is_platform_super_admin()
)
WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    OR public.is_platform_super_admin()
);

-- 5. 기존 등록된 테넌트 자동 구독 레코드 초기화 (Seeding)
INSERT INTO public.tenant_subscriptions (
    tenant_id,
    plan_tier,
    billing_cycle,
    status,
    payment_method,
    card_info,
    current_period_start,
    current_period_end
)
SELECT 
    t.id,
    CASE WHEN t.code = 'glife' THEN 'ENTERPRISE' ELSE 'PRO' END,
    'MONTHLY',
    'ACTIVE',
    'CARD',
    '{"card_company": "현대카드", "last4": "8821"}'::jsonb,
    NOW(),
    NOW() + INTERVAL '1 month'
FROM public.tenants t
ON CONFLICT (tenant_id) DO NOTHING;

-- 기본 초기 인보이스 1건 시딩 (glife / acme)
INSERT INTO public.billing_invoices (
    tenant_id,
    invoice_number,
    plan_tier,
    base_amount,
    usage_amount,
    discount_amount,
    total_amount,
    payment_status,
    paid_at
)
SELECT 
    t.id,
    format('INV-%s-%s', to_char(NOW(), 'YYYYMM'), upper(substr(md5(random()::text), 1, 6))),
    CASE WHEN t.code = 'glife' THEN 'ENTERPRISE' ELSE 'PRO' END,
    CASE WHEN t.code = 'glife' THEN 1200000 ELSE 490000 END,
    0,
    0,
    CASE WHEN t.code = 'glife' THEN 1200000 ELSE 490000 END,
    'PAID',
    NOW()
FROM public.tenants t
ON CONFLICT DO NOTHING;
