-- ==============================================================================
-- Migration: Cleanup Legacy Permissive RLS Policies & Enforce Strict Tenant Isolation
-- Description: 과거 단일 테넌트 시절의 'USING (true)' 레거시 정책을 제거하고 
--              tenant_isolation_policy 단일 엄격 정책으로 일원화
-- ==============================================================================

DO $$
DECLARE
    pol RECORD;
    tbl TEXT;
BEGIN
    -- 1. 10대 비즈니스 테이블에서 'tenant_isolation_policy'를 제외한 모든 레거시 정책 일괄 제거
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
        FOR pol IN (
            SELECT policyname 
            FROM pg_policies 
            WHERE schemaname = 'public' 
              AND tablename = tbl 
              AND policyname != 'tenant_isolation_policy'
        )
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
            RAISE NOTICE 'Dropped legacy permissive policy % from table %', pol.policyname, tbl;
        END LOOP;
        
        -- FORCE ROW LEVEL SECURITY 재확인
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', tbl);
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
