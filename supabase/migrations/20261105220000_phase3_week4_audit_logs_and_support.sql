-- ==============================================================================
-- Phase 3 - Week 4: Enterprise Audit Logs & Tenant Support Ticketing
-- Description: 전사 보안 감사 로그(불변 감사 원장) 및 인앱 1:1 고객지원 티켓 스키마
-- Migration Date: 2026-11-05
-- ==============================================================================

-- 1. 전사 보안 감사 로그 테이블 (Audit Logs - Append Only)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    actor_name VARCHAR(100),
    actor_role VARCHAR(50),
    action_type VARCHAR(50) NOT NULL, -- 'INVENTORY_ADJUST', 'ORDER_STATUS_CHANGE', 'STORE_DELETE', 'ITEM_PRICE_UPDATE', 'PLAN_CHANGE', 'DATA_EXPORT', 'USER_ROLE_CHANGE'
    entity_type VARCHAR(50) NOT NULL, -- 'INVENTORY', 'ORDER', 'STORE', 'ITEM', 'SUBSCRIPTION', 'USER', 'SYSTEM'
    entity_id TEXT,
    description TEXT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    diff_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.audit_logs IS 'ISO-27001 및 정보보안 규정 준수용 테넌트 불변(Append-Only) 감사 로그';
COMMENT ON COLUMN public.audit_logs.action_type IS '수행된 행위 유형';
COMMENT ON COLUMN public.audit_logs.diff_data IS '변경 전/후 JSON 스냅샷';

-- 감사 로그 인덱스 (테넌트별, 일시 역순, 엔티티별)
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created 
ON public.audit_logs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity 
ON public.audit_logs (tenant_id, entity_type, action_type);

-- RLS 활성화 및 불변성(Immutable) 보장
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_select_policy"
ON public.audit_logs
FOR SELECT
USING (
    tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    OR (SELECT role::text FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
);

-- 감사 로그는 원칙적으로 수정/삭제 불가 (Append-Only)
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_policy"
ON public.audit_logs
FOR INSERT
WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    OR (SELECT role::text FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    OR auth.role() = 'service_role'
);

-- 2. 인앱 1:1 고객지원 티켓 테이블 (Support Tickets)
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'QUESTION', -- 'QUESTION', 'BUG', 'FEATURE_REQUEST', 'BILLING', 'HARDWARE'
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',   -- 'LOW', 'NORMAL', 'URGENT'
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',       -- 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.support_tickets IS '인앱 헬프센터 1:1 기술 지원 및 문의 티켓';

-- 티켓 인덱스
CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_created
ON public.support_tickets (tenant_id, created_at DESC);

-- RLS 활성화
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_tickets_select_policy" ON public.support_tickets;
CREATE POLICY "support_tickets_select_policy"
ON public.support_tickets
FOR SELECT
USING (
    tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    OR (SELECT role::text FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
);

DROP POLICY IF EXISTS "support_tickets_insert_policy" ON public.support_tickets;
CREATE POLICY "support_tickets_insert_policy"
ON public.support_tickets
FOR INSERT
WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    OR (SELECT role::text FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS "support_tickets_update_policy" ON public.support_tickets;
CREATE POLICY "support_tickets_update_policy"
ON public.support_tickets
FOR UPDATE
USING (
    tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    OR (SELECT role::text FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
);

-- 3. 초기 감사 로그 시드 (Glife 및 Acme 샘플)
INSERT INTO public.audit_logs (
    tenant_id,
    actor_name,
    actor_role,
    action_type,
    entity_type,
    entity_id,
    description,
    diff_data
) VALUES 
(
    '9df4f04d-b4be-4256-bfa5-aa48c4fd5d13',
    '시스템 관리자 (Paul Lim)',
    'SUPER_ADMIN',
    'PLAN_CHANGE',
    'SUBSCRIPTION',
    'SUB-20261103-01',
    'SaaS 구독 플랜 갱신 및 Enterprise 보안 게이트 활성화',
    '{"old_plan": "STARTER", "new_plan": "ENTERPRISE", "billing_cycle": "ANNUAL"}'::jsonb
),
(
    '9df4f04d-b4be-4256-bfa5-aa48c4fd5d13',
    'Paul Lim',
    'SUPER_ADMIN',
    'USER_ROLE_CHANGE',
    'USER',
    '4089170153',
    '슈퍼관리자 권한 승격 완료 (is_platform_super_admin: true)',
    '{"old_role": "ADMIN", "new_role": "SUPER_ADMIN"}'::jsonb
),
(
    '9df4f04d-b4be-4256-bfa5-aa48c4fd5d13',
    '현장 검수자 (Inspector 1)',
    'INSPECTOR',
    'INVENTORY_ADJUST',
    'INVENTORY',
    'LOC-A01A',
    '정기 순환실사 오차 일치 보정 (수량: 120 -> 125)',
    '{"location": "LOC-A01A", "sku": "JEL-001", "before_qty": 120, "after_qty": 125, "reason": "CYCLE_COUNT"}'::jsonb
)
ON CONFLICT DO NOTHING;
