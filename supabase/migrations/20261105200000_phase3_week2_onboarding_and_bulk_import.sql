-- ==============================================================================
-- Phase 3 - Week 2: 30-Minute Self-Onboarding Wizard & Bulk Master DDL
-- Description: 신규 SaaS 테넌트의 셀프 온보딩 진행 상태(onboarding_completed, step) 추적,
--              창고 간이 로케이션 자동 생성 및 엑셀 일괄 등록 지원 함수
-- Migration Date: 2026-11-05
-- ==============================================================================

-- 1. tenant_settings 테이블에 온보딩 추적 컬럼 추가
ALTER TABLE public.tenant_settings
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_step INT NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.tenant_settings.onboarding_completed IS '테넌트 30분 셀프 온보딩 완료 여부';
COMMENT ON COLUMN public.tenant_settings.onboarding_step IS '현재 진행 중인 온보딩 단계 (1: 브랜딩, 2: 품목, 3: 창고, 4: 매장, 5: 완료)';

-- 2. 기존 운영 중인 테넌트(glife, acme)는 온보딩 완료 처리
UPDATE public.tenant_settings
SET 
    onboarding_completed = TRUE,
    onboarding_step = 5,
    updated_at = NOW()
WHERE tenant_id IN (
    '9df4f04d-b4be-4256-bfa5-aa48c4fd5d13', -- Glife
    'a0000000-0000-0000-0000-000000000001'  -- Acme
);

-- 3. 온보딩 완료 처리 RPC 함수
CREATE OR REPLACE FUNCTION public.complete_tenant_onboarding(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.tenant_settings
    SET 
        onboarding_completed = TRUE,
        onboarding_step = 5,
        updated_at = NOW()
    WHERE tenant_id = p_tenant_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tenant settings not found');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 4. 간이 창고 로케이션 일괄 생성 RPC 함수
CREATE OR REPLACE FUNCTION public.auto_generate_warehouse_locations(
    p_tenant_id UUID,
    p_zone_codes TEXT[],      -- e.g. ARRAY['A', 'B']
    p_temp_zones TEXT[],      -- e.g. ARRAY['ROOM', 'CHILLED']
    p_racks_per_zone INT,     -- e.g. 4
    p_levels_per_rack INT     -- e.g. 2 (A, B단)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_zone TEXT;
    v_temp TEXT;
    v_zone_idx INT;
    v_rack INT;
    v_lvl INT;
    v_lvl_char TEXT;
    v_loc_code TEXT;
    v_inserted_count INT := 0;
BEGIN
    -- 유효성 검사
    IF p_racks_per_zone <= 0 OR p_racks_per_zone > 50 THEN
        p_racks_per_zone := 4;
    END IF;
    IF p_levels_per_rack <= 0 OR p_levels_per_rack > 5 THEN
        p_levels_per_rack := 2;
    END IF;

    FOR v_zone_idx IN 1..array_length(p_zone_codes, 1) LOOP
        v_zone := p_zone_codes[v_zone_idx];
        v_temp := COALESCE(p_temp_zones[v_zone_idx], 'ROOM');

        FOR v_rack IN 1..p_racks_per_zone LOOP
            FOR v_lvl IN 1..p_levels_per_rack LOOP
                v_lvl_char := chr(64 + v_lvl); -- 1->'A', 2->'B', 3->'C'
                v_loc_code := format('LOC-%s%s%s', v_zone, to_char(v_rack, 'FM00'), v_lvl_char);

                INSERT INTO public.locations (
                    tenant_id,
                    location_code,
                    zone,
                    temperature_zone,
                    status,
                    pos_x,
                    pos_y,
                    rotation
                ) VALUES (
                    p_tenant_id,
                    v_loc_code,
                    v_zone,
                    v_temp,
                    'AVAILABLE',
                    (v_rack * 3)::numeric,
                    (v_zone_idx * 5)::numeric,
                    0
                )
                ON CONFLICT (location_code) DO NOTHING;

                v_inserted_count := v_inserted_count + 1;
            END LOOP;
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'inserted_locations', v_inserted_count
    );
END;
$$;
