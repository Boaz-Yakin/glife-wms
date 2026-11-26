-- ==============================================================================
-- WMS-G: 1R-01/02 & 2L-01/02 & 2R-01/02 슬롯 전용 예약(RESERVED) 설정 마이그레이션
-- Target: Supabase PostgreSQL (WMS Shared DB)
-- Migration Date: 2026-11-25
-- ==============================================================================

-- 1. v_warehouse_summary 뷰 갱신: 'RESERVED' 상태 팔렛 또는 예약 슬롯을 '예약'으로 표시
CREATE OR REPLACE VIEW public.v_warehouse_summary AS
SELECT 
    l.id AS location_id,
    l.code AS location_code,
    l.zone_type,
    COUNT(CASE WHEN p.status = 'STORED' THEN p.id END) AS stored_pallet_count,
    CASE 
        WHEN BOOL_OR(p.status = 'RESERVED') OR l.code IN (
            '1-R-01-FLOOR', '1-R-01-A', '1-R-01-B', '1-R-01-C',
            '1-R-02-FLOOR', '1-R-02-A', '1-R-02-B', '1-R-02-C',
            '2-L-01-FLOOR', '2-L-01-A', '2-L-01-B', '2-L-01-C',
            '2-L-02-FLOOR', '2-L-02-A', '2-L-02-B', '2-L-02-C',
            '2-R-01-FLOOR', '2-R-01-A', '2-R-01-B', '2-R-01-C',
            '2-R-02-FLOOR', '2-R-02-A', '2-R-02-B', '2-R-02-C'
        ) THEN '예약'
        WHEN COUNT(CASE WHEN p.status = 'STORED' THEN p.id END) > 0 THEN '보관중' 
        ELSE '빈자리' 
    END AS slot_status,
    STRING_AGG(DISTINCT CASE WHEN p.status = 'STORED' THEN p.batch_no WHEN p.status = 'RESERVED' THEN 'RESERVED' END, ', ') AS batch_list,
    STRING_AGG(CASE WHEN p.status = 'STORED' THEN p.pallet_no WHEN p.status = 'RESERVED' THEN '예약' END, ', ' ORDER BY p.pallet_no) AS pallet_list
FROM public.locations l
LEFT JOIN public.pallets p 
    ON l.id = p.location_id AND p.status IN ('STORED', 'RESERVED')
GROUP BY l.id, l.code, l.zone_type;

-- 2. 1R-01/02 & 2L-01/02 & 2R-01/02 총 24개 슬롯에 대해 예약(RESERVED) 레코드 등록
DO $$
DECLARE
    v_tenant_id UUID;
    v_client_id UUID;
    v_loc_id UUID;
    v_pallet_id UUID;
    v_target_codes TEXT[] := ARRAY[
        '1-R-01-FLOOR', '1-R-01-A', '1-R-01-B', '1-R-01-C',
        '1-R-02-FLOOR', '1-R-02-A', '1-R-02-B', '1-R-02-C',
        '2-L-01-FLOOR', '2-L-01-A', '2-L-01-B', '2-L-01-C',
        '2-L-02-FLOOR', '2-L-02-A', '2-L-02-B', '2-L-02-C',
        '2-R-01-FLOOR', '2-R-01-A', '2-R-01-B', '2-R-01-C',
        '2-R-02-FLOOR', '2-R-02-A', '2-R-02-B', '2-R-02-C'
    ];
    v_code TEXT;
BEGIN
    -- 활성 테넌트 조회
    SELECT COALESCE(
        (SELECT tenant_id FROM public.locations WHERE tenant_id IS NOT NULL LIMIT 1),
        (SELECT id FROM public.tenants WHERE code = 'glife'),
        (SELECT id FROM public.tenants LIMIT 1)
    ) INTO v_tenant_id;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION '테넌트를 찾을 수 없습니다.';
    END IF;

    -- 화주사(CLIENT-CJ) 조회
    SELECT id INTO v_client_id FROM public.clients WHERE code = 'CLIENT-CJ' AND tenant_id = v_tenant_id;
    IF v_client_id IS NULL THEN
        SELECT id INTO v_client_id FROM public.clients WHERE tenant_id = v_tenant_id LIMIT 1;
    END IF;

    -- 24개 슬롯 예약 처리
    FOREACH v_code IN ARRAY v_target_codes LOOP
        -- 로케이션 확인 또는 생성
        SELECT id INTO v_loc_id FROM public.locations WHERE code = v_code;
        IF v_loc_id IS NULL THEN
            INSERT INTO public.locations (code, zone_type, tenant_id)
            VALUES (v_code, 'A', v_tenant_id)
            RETURNING id INTO v_loc_id;
        END IF;

        -- 기존 동일 슬롯의 예약 레코드 확인 및 삽입
        IF NOT EXISTS (
            SELECT 1 FROM public.pallets WHERE location_id = v_loc_id AND status = 'RESERVED'
        ) THEN
            INSERT INTO public.pallets (
                tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
            )
            VALUES (
                v_tenant_id, v_client_id, 'RESERVED', 'SLOT-HOLD', v_loc_id, 'RESERVED', '시스템 관리자', '전용 슬롯 사전 예약 배정', NOW(), NOW()
            )
            RETURNING id INTO v_pallet_id;

            IF v_pallet_id IS NOT NULL THEN
                INSERT INTO public.pallet_histories (
                    pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
                )
                VALUES (
                    v_pallet_id, 'RESERVE', NULL, v_loc_id, '시스템 관리자', '전용 슬롯 사전 예약 지정', NOW()
                );
            END IF;
        END IF;
    END LOOP;
END $$;
