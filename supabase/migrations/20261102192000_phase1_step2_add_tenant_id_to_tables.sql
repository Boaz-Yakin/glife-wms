-- ==============================================================================
-- Phase 1 - Step 2: Add tenant_id to 11 Core Business Tables & Backfill Glife Data
-- Description: 11대 핵심 비즈니스 테이블에 tenant_id 컬럼 추가, Glife 테넌트 ID 백필, 기본값(DEFAULT) 제약 설정
-- Target Tables: clients, items, inventory, locations, orders, order_items, 
--                users, stores, partners, item_conversions, inventory_adjustments
-- ==============================================================================

-- 0. 플랫폼 슈퍼관리자(SUPER_ADMIN) 역할을 user_role ENUM에 추가
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

DO $$
DECLARE
    glife_id UUID := '9df4f04d-b4be-4256-bfa5-aa48c4fd5d13';
    tbl TEXT;
BEGIN
    -- 1. item_conversions(번들 해체 규칙) 테이블이 아직 없다면 사전 생성
    CREATE TABLE IF NOT EXISTS public.item_conversions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        parent_item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
        child_item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
        conversion_ratio INT NOT NULL CHECK (conversion_ratio > 0),
        target_location_id UUID REFERENCES public.locations(id) ON DELETE RESTRICT,
        auto_dekit_on_order BOOLEAN NOT NULL DEFAULT TRUE,
        note TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_parent_child_conversion UNIQUE (parent_item_id, child_item_id)
    );

    -- 2. 비즈니스 10개 테이블 (존재 여부 확인 후 안전하게 tenant_id 추가 및 Glife DEFAULT 적용)
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
        -- 실제 존재하는 테이블인지 안전하게 확인
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            -- 컬럼이 존재하지 않으면 추가 (외래키 제약 포함)
            EXECUTE format(
                'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE',
                tbl
            );

            -- 기존 레코드에 Glife 테넌트 ID 무손실 백필
            EXECUTE format(
                'UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL',
                tbl, glife_id
            );

            -- 신규 삽입 시 Glife 기본값(DEFAULT) 부여 (점진적 전환 중 무결성 보장)
            EXECUTE format(
                'ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT %L',
                tbl, glife_id
            );

            RAISE NOTICE 'Table %: tenant_id column added, backfilled, and default set.', tbl;
        ELSE
            RAISE NOTICE 'Table %: not found in public schema, skipped.', tbl;
        END IF;
    END LOOP;

    -- 3. users 테이블: 플랫폼 슈퍼관리자(Platform SuperAdmin)는 tenant_id IS NULL을 허용하므로 개별 처리
    ALTER TABLE public.users 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;

    -- 기존 등록된 모든 사용자는 Glife 테넌트 소속으로 백필
    UPDATE public.users 
    SET tenant_id = glife_id 
    WHERE tenant_id IS NULL;

    -- users 테이블에도 일반 생성 시 Glife 기본값 부여 (동적 SQL로 안전하게 리터럴 바인딩)
    EXECUTE format('ALTER TABLE public.users ALTER COLUMN tenant_id SET DEFAULT %L', glife_id);

    RAISE NOTICE 'Table users: tenant_id column added with super_admin nullable support.';
END $$;

-- 4. PostgREST 스키마 캐시 새로고침
NOTIFY pgrst, 'reload schema';
