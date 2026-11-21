-- ==============================================================================
-- CJ-Inv: CJ 팔렛 현장 관리 & 768 슬롯 창고 통합 마이그레이션
-- Target: Supabase PostgreSQL (WMS Shared DB)
-- Migration Date: 2026-11-21
-- ==============================================================================

-- 1. locations 테이블의 code 체크 제약조건 확장 (기존 LOC- 형식 + 현장 1-L-01-FLOOR 형식 수용)
ALTER TABLE public.locations DROP CONSTRAINT IF EXISTS locations_code_check;
ALTER TABLE public.locations 
ADD CONSTRAINT locations_code_check 
CHECK (
    code ~ '^LOC-[A-Z][0-9]{2}[0-9]{2}[A-D][0-9]{2}$' 
    OR code ~ '^[1-3]-[LR]-[0-3][0-9]-(FLOOR|A|B|C)$'
);

-- 2. 화주사(Clients) 마스터 등록 & 768개 슬롯 자동 생성
DO $$
DECLARE
    v_tenant_id UUID;
    v_aisle INT;
    v_side TEXT;
    v_rack INT;
    v_level TEXT;
    v_code TEXT;
    v_sides TEXT[] := ARRAY['L', 'R'];
    v_levels TEXT[] := ARRAY['FLOOR', 'A', 'B', 'C'];
BEGIN
    -- 현재 활성 테넌트 ID 조회 (기존 locations 및 G life 테넌트 우선)
    SELECT COALESCE(
        (SELECT tenant_id FROM public.locations WHERE tenant_id IS NOT NULL LIMIT 1),
        (SELECT id FROM public.tenants WHERE code = 'glife'),
        (SELECT id FROM public.tenants LIMIT 1)
    ) INTO v_tenant_id;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION '테넌트를 찾을 수 없습니다.';
    END IF;

    -- 화주사 등록
    INSERT INTO public.clients (tenant_id, name, code, is_active)
    VALUES 
        (v_tenant_id, 'CJ', 'CLIENT-CJ', true),
        (v_tenant_id, 'BBQ 치킨', 'CLIENT-BBQ', true)
    ON CONFLICT (code) DO NOTHING;

    -- 768개 슬롯 생성 루프
    FOR v_aisle IN 1..3 LOOP
        FOREACH v_side IN ARRAY v_sides LOOP
            FOR v_rack IN 1..32 LOOP
                FOREACH v_level IN ARRAY v_levels LOOP
                    v_code := v_aisle || '-' || v_side || '-' || LPAD(v_rack::TEXT, 2, '0') || '-' || v_level;
                    
                    INSERT INTO public.locations (code, zone_type, tenant_id)
                    VALUES (v_code, 'A', v_tenant_id)
                    ON CONFLICT (code) DO NOTHING;
                END LOOP;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

-- 4. 신규 테이블: 팔렛 마스터 (pallets)
CREATE TABLE IF NOT EXISTS public.pallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    batch_no VARCHAR(60) NOT NULL,                        -- CJ 차수 (예: 217, CJCPKG217)
    pallet_no VARCHAR(60) NOT NULL,                       -- 팔렛 번호 (예: 13)
    location_id UUID NOT NULL REFERENCES public.locations(id), -- 현재 보관 위치 (768 슬롯)
    status VARCHAR(20) NOT NULL DEFAULT 'STORED',         -- STORED(보관중), SHIPPED(출고완료), MOVING(이동중)
    operator_name VARCHAR(80) NOT NULL,                   -- 최종 작업자 이름
    notes TEXT,                                           -- 비고
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 보관 중인 상태에서 동일 차수/동일 팔렛 번호 중복 방지 (Partial Unique Index)
CREATE UNIQUE INDEX IF NOT EXISTS uk_active_batch_pallet
ON public.pallets (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no)))
WHERE status = 'STORED';

-- 검색 고속화 인덱스
CREATE INDEX IF NOT EXISTS idx_pallets_search 
ON public.pallets (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no)));

CREATE INDEX IF NOT EXISTS idx_pallets_location 
ON public.pallets (location_id, status);

-- 5. 신규 테이블: 팔렛 이동 및 입고 감사 로그 (pallet_histories)
CREATE TABLE IF NOT EXISTS public.pallet_histories (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pallet_id UUID NOT NULL REFERENCES public.pallets(id) ON DELETE CASCADE,
    action_type VARCHAR(30) NOT NULL,                     -- REGISTER(신규입고), MOVE(위치이동), SHIP(출고)
    from_location_id UUID REFERENCES public.locations(id), -- 이전 위치 (신규입고 시 NULL)
    to_location_id UUID NOT NULL REFERENCES public.locations(id), -- 이동 후 위치
    operator_name VARCHAR(80) NOT NULL,                   -- 작업자 이름
    notes TEXT,                                           -- 사유/메모
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pallet_histories_pallet ON public.pallet_histories(pallet_id);
CREATE INDEX IF NOT EXISTS idx_pallet_histories_created ON public.pallet_histories(created_at DESC);

-- 6. 실시간 768 슬롯 창고 현황 뷰 (구글 시트 현장 위치조사 탭 완전 대체)
CREATE OR REPLACE VIEW public.v_warehouse_summary AS
SELECT 
    l.id AS location_id,
    l.code AS location_code,
    l.zone_type,
    COUNT(p.id) AS stored_pallet_count,
    CASE WHEN COUNT(p.id) > 0 THEN '보관중' ELSE '빈자리' END AS slot_status,
    STRING_AGG(DISTINCT p.batch_no, ', ') AS batch_list,
    STRING_AGG(p.pallet_no, ', ' ORDER BY p.pallet_no) AS pallet_list
FROM public.locations l
LEFT JOIN public.pallets p 
    ON l.id = p.location_id AND p.status = 'STORED'
GROUP BY l.id, l.code, l.zone_type;

-- 7. Supabase RLS (Row Level Security) 설정
ALTER TABLE public.pallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pallet_histories ENABLE ROW LEVEL SECURITY;

-- 공용 서비스 키 및 인증 사용자 RLS 정책 (현장 작업자 접근 허용)
DROP POLICY IF EXISTS "Allow all for authenticated/anon on pallets" ON public.pallets;
CREATE POLICY "Allow all for authenticated/anon on pallets"
ON public.pallets FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated/anon on pallet_histories" ON public.pallet_histories;
CREATE POLICY "Allow all for authenticated/anon on pallet_histories"
ON public.pallet_histories FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);
