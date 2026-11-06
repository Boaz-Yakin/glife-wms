-- ==============================================================================
-- Phase 4 - Week 1~2: Headless WMS Open REST API Gateway & Webhook Engine
-- Description: 외부 ERP(SAP/더존) 및 자체 이커머스 몰 연동용 Open API 키 관리 및
--              실시간 이벤트 Webhook 발송 엔진 스키마
-- Migration Date: 2026-11-05
-- ==============================================================================

-- 1. 테넌트별 Open API 인증 키 테이블
CREATE TABLE IF NOT EXISTS public.tenant_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_prefix VARCHAR(20) NOT NULL, -- e.g. 'wms_live_a1b2'
    hashed_secret TEXT NOT NULL,      -- SHA-256(raw_key)
    permissions JSONB NOT NULL DEFAULT '["read:inventory", "write:orders", "read:orders"]'::jsonb,
    rate_limit_per_minute INT NOT NULL DEFAULT 600,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.tenant_api_keys IS '테넌트별 Headless WMS Open REST API 연동 키 원장';

CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_lookup 
ON public.tenant_api_keys (hashed_secret) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_tenant 
ON public.tenant_api_keys (tenant_id, created_at DESC);

-- RLS 활성화
ALTER TABLE public.tenant_api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_api_keys_select" ON public.tenant_api_keys;
CREATE POLICY "tenant_api_keys_select"
ON public.tenant_api_keys
FOR SELECT
USING (
    tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    OR (SELECT role::text FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
);

DROP POLICY IF EXISTS "tenant_api_keys_manage" ON public.tenant_api_keys;
CREATE POLICY "tenant_api_keys_manage"
ON public.tenant_api_keys
FOR ALL
USING (
    tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    OR (SELECT role::text FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
);

-- 2. 테넌트 웹훅 등록 테이블
CREATE TABLE IF NOT EXISTS public.tenant_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    secret_key TEXT NOT NULL, -- HMAC-SHA256 서명 검증용 시크릿
    subscribed_events JSONB NOT NULL DEFAULT '["order.created", "order.fulfilled", "inventory.adjusted", "stock.low"]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_triggered_at TIMESTAMPTZ,
    last_status_code INT,
    failure_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.tenant_webhooks IS '테넌트별 실시간 이벤트 푸시 Webhook 수신처';

CREATE INDEX IF NOT EXISTS idx_tenant_webhooks_tenant 
ON public.tenant_webhooks (tenant_id, is_active);

-- RLS 활성화
ALTER TABLE public.tenant_webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_webhooks_select" ON public.tenant_webhooks;
CREATE POLICY "tenant_webhooks_select"
ON public.tenant_webhooks
FOR SELECT
USING (
    tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    OR (SELECT role::text FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
);

DROP POLICY IF EXISTS "tenant_webhooks_manage" ON public.tenant_webhooks;
CREATE POLICY "tenant_webhooks_manage"
ON public.tenant_webhooks
FOR ALL
USING (
    tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    OR (SELECT role::text FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
);

-- 3. Glife 초기 데모 API 키 시드 (개발자 콘솔 즉시 테스트용)
INSERT INTO public.tenant_api_keys (
    tenant_id,
    name,
    key_prefix,
    hashed_secret,
    permissions,
    rate_limit_per_minute,
    is_active
) VALUES (
    '9df4f04d-b4be-4256-bfa5-aa48c4fd5d13',
    'Glife 메인 ERP 연동 키',
    'wms_live_glife',
    -- SHA-256 for 'wms_live_glife_secret_key_demo_2026'
    '33a0b5a3eb3b207559a4bead7e704dd51bf3528b18ca07e6e58b14644a8080f5',
    '["read:inventory", "write:orders", "read:orders"]'::jsonb,
    1200,
    TRUE
)
ON CONFLICT DO NOTHING;
