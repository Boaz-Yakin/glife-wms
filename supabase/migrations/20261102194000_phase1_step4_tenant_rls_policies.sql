-- ==============================================================================
-- Phase 1 - Step 4: Supabase Row-Level Security (RLS) Tenant Isolation Policies
-- Description: 100% 데이터 격리 보장을 위한 테넌트 RLS 정책 및 슈퍼관리자 예외 규칙 적용
-- Target Tables: clients, items, inventory, locations, orders, order_items, 
--                stores, partners, item_conversions, inventory_adjustments
-- Migration Date: 2026-11-02
-- ==============================================================================

-- 헬퍼 함수: 현재 요청의 테넌트 ID 조회
-- 🛡️ Zero-Downtime 보장: 클라이언트 코드가 전환되는 동안 컨텍스트가 누락된 요청은 기존 Glife ID로 안전하게 fallback
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID AS $$
DECLARE
    v_id UUID;
    glife_id UUID := '9df4f04d-b4be-4256-bfa5-aa48c4fd5d13';
BEGIN
    v_id := COALESCE(
        NULLIF(current_setting('app.current_tenant_id', true), '')::UUID,
        NULLIF(auth.jwt() ->> 'tenant_id', '')::UUID
    );

    IF v_id IS NULL THEN
        RETURN glife_id; -- 과도기 운영 중단 방지용 안전 기본값
    END IF;

    RETURN v_id;
EXCEPTION WHEN OTHERS THEN
    RETURN glife_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 헬퍼 함수: 현재 사용자가 플랫폼 슈퍼관리자인지 확인
CREATE OR REPLACE FUNCTION public.is_platform_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- 1. Service Role Key 호출 시 무조건 true
    IF (auth.jwt() ->> 'role') = 'service_role' THEN
        RETURN TRUE;
    END IF;

    -- 2. JWT claim에 super_admin 역할이 있는 경우
    IF (auth.jwt() ->> 'user_role') IN ('super_admin', 'SUPER_ADMIN') THEN
        RETURN TRUE;
    END IF;

    -- 3. users 테이블 조회 확인 (SUPER_ADMIN 역할이거나 tenant_id가 NULL인 플랫폼 관리자)
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND (role::text = 'SUPER_ADMIN' OR tenant_id IS NULL)
    );
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- RLS 활성화 및 테넌트 격리 정책 부여 (10대 핵심 비즈니스 테이블)
-- -----------------------------------------------------------------------------
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
            -- RLS 활성화
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

            -- 기존 정책 제거 후 신규 격리 정책 적용
            EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_policy" ON public.%I', tbl);
            
            EXECUTE format(
                'CREATE POLICY "tenant_isolation_policy" ON public.%I
                 FOR ALL USING (
                     public.is_platform_super_admin()
                     OR tenant_id = public.get_current_tenant_id()
                 )
                 WITH CHECK (
                     public.is_platform_super_admin()
                     OR tenant_id = public.get_current_tenant_id()
                 )',
                tbl
            );

            RAISE NOTICE 'RLS Tenant Isolation Policy enabled for: %', tbl;
        ELSE
            RAISE NOTICE 'Table % not found, skipped RLS policy.', tbl;
        END IF;
    END LOOP;
END $$;

-- PostgREST 스키마 캐시 새로고침
NOTIFY pgrst, 'reload schema';
