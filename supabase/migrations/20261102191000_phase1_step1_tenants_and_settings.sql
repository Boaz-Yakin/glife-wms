-- ==============================================================================
-- Phase 1 - Step 1: Tenants & Tenant Settings Table Creation
-- Description: 멀티테넌트 SaaS 코어 구축을 위한 최상위 테넌트 마스터 및 브랜딩/설정 테이블 생성
-- Target: tenants, tenant_settings
-- Migration Date: 2026-11-02
-- ==============================================================================

-- 1. 테넌트(고객사 물류기업) 마스터 테이블
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,                   -- e.g. 'glife', 'acme' (URL 서브도메인 매핑용)
    company_name VARCHAR(100) NOT NULL,                 -- 기업 상호명
    business_number VARCHAR(50),                        -- 사업자 등록번호
    contact_email VARCHAR(100),                         -- 대표 담당자 이메일
    contact_phone VARCHAR(50),                          -- 대표 연락처
    custom_domain VARCHAR(100) UNIQUE,                  -- 커스텀 도메인 (e.g. 'wms.acmefood.com')
    subscription_plan VARCHAR(30) DEFAULT 'STARTER',    -- STARTER, PRO, ENTERPRISE
    subscription_status VARCHAR(30) DEFAULT 'ACTIVE',   -- ACTIVE, PAST_DUE, CANCELED
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스: 도메인 및 코드 조회 가속화
CREATE INDEX IF NOT EXISTS idx_tenants_code ON public.tenants(code);
CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain ON public.tenants(custom_domain);

-- 2. 테넌트별 환경설정 및 브랜딩(White-Labeling) 테이블
CREATE TABLE IF NOT EXISTS public.tenant_settings (
    tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    logo_url TEXT,                                      -- 테넌트 로고 이미지 URL
    favicon_url TEXT,                                   -- 파비콘 URL
    primary_color VARCHAR(20) DEFAULT '#059669',        -- 브랜드 대표 테마 컬러 (HEX)
    currency VARCHAR(10) DEFAULT 'KRW',                 -- 통화 코드 (KRW, USD 등)
    currency_symbol VARCHAR(5) DEFAULT '₩',             -- 통화 기호 (₩, $, etc.)
    timezone VARCHAR(50) DEFAULT 'Asia/Seoul',          -- 표준 시간대
    stock_policy VARCHAR(30) DEFAULT 'HARD_LIMIT',      -- HARD_LIMIT (재고부족시 발주제한) vs BACKORDER (음수재고 허용)
    perishable_mode BOOLEAN DEFAULT TRUE,               -- 유통기한/FEFO(선석출) 모드 활성화 여부
    auto_dekit_enabled BOOLEAN DEFAULT TRUE,            -- 번들/멀티팩 자동 해체 활성화 여부
    default_dekit_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL, -- 해체 입고 기본 로케이션
    kakao_notification_enabled BOOLEAN DEFAULT FALSE,   -- 카카오 알림톡 연동 활성화 여부
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.1 RLS 보안 활성화 (Supabase 보안 권고 준수)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

-- 누구나 본인의 테넌트 기본 정보/브랜딩(로고, 색상 등)을 조회할 수 있도록 SELECT 정책 허용
DROP POLICY IF EXISTS "Allow read tenants" ON public.tenants;
CREATE POLICY "Allow read tenants" ON public.tenants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow read tenant_settings" ON public.tenant_settings;
CREATE POLICY "Allow read tenant_settings" ON public.tenant_settings FOR SELECT USING (true);

-- 수정/삭제/삽입은 Service Role 및 플랫폼 슈퍼관리자만 가능하도록 제한
DROP POLICY IF EXISTS "Admin manage tenants" ON public.tenants;
CREATE POLICY "Admin manage tenants" ON public.tenants 
FOR ALL USING (
    (auth.jwt() ->> 'role') = 'service_role' 
    OR (auth.jwt() ->> 'user_role') = 'super_admin'
);

DROP POLICY IF EXISTS "Admin manage tenant_settings" ON public.tenant_settings;
CREATE POLICY "Admin manage tenant_settings" ON public.tenant_settings 
FOR ALL USING (
    (auth.jwt() ->> 'role') = 'service_role' 
    OR (auth.jwt() ->> 'user_role') = 'super_admin'
);

-- 3. 1호 테넌트 Glife 자동 등록 (기존 Glife Client ID 영구 보존)
INSERT INTO public.tenants (
    id, 
    code, 
    company_name, 
    subscription_plan, 
    subscription_status
) VALUES (
    '9df4f04d-b4be-4256-bfa5-aa48c4fd5d13', 
    'glife', 
    'Glife Co., Ltd.', 
    'ENTERPRISE', 
    'ACTIVE'
) ON CONFLICT (id) DO UPDATE SET
    code = EXCLUDED.code,
    company_name = EXCLUDED.company_name,
    subscription_plan = EXCLUDED.subscription_plan,
    updated_at = NOW();

-- 4. Glife 1호 테넌트 기본 설정 및 브랜딩 등록
INSERT INTO public.tenant_settings (
    tenant_id, 
    logo_url, 
    primary_color, 
    currency, 
    currency_symbol,
    stock_policy, 
    perishable_mode, 
    auto_dekit_enabled,
    default_dekit_location_id
) VALUES (
    '9df4f04d-b4be-4256-bfa5-aa48c4fd5d13',
    '/logo.png',
    '#059669',
    'KRW',
    '₩',
    'HARD_LIMIT',
    TRUE,
    TRUE,
    '31b632f2-e408-4d5a-bf11-47b52b8db673' -- Glife LOC-S0105A01
) ON CONFLICT (tenant_id) DO UPDATE SET
    logo_url = EXCLUDED.logo_url,
    primary_color = EXCLUDED.primary_color,
    stock_policy = EXCLUDED.stock_policy,
    perishable_mode = EXCLUDED.perishable_mode,
    auto_dekit_enabled = EXCLUDED.auto_dekit_enabled,
    default_dekit_location_id = EXCLUDED.default_dekit_location_id,
    updated_at = NOW();

-- 5. PostgREST 스키마 캐시 즉시 갱신
NOTIFY pgrst, 'reload schema';
