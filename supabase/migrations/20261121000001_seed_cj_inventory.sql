-- ==============================================================================
-- CJ-Inv: Step 1 Initial Inventory Seed from docs/cj_inventory.csv
-- Description: 768개 창고 슬롯 중 현재 보관 중인 287개 CJ 팔렛 초기 재고 적재
-- ==============================================================================

DO $$
DECLARE
    v_tenant_id UUID;
    v_client_id UUID;
    v_loc_id UUID;
    v_pallet_id UUID;
BEGIN
    -- 1. 테넌트 및 CJ 고객사 ID 획득
    SELECT COALESCE(
        (SELECT tenant_id FROM public.locations WHERE tenant_id IS NOT NULL LIMIT 1),
        (SELECT id FROM public.tenants WHERE code = 'glife'),
        (SELECT id FROM public.tenants LIMIT 1)
    ) INTO v_tenant_id;
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION '테넌트를 찾을 수 없습니다.';
    END IF;

    SELECT id INTO v_client_id FROM public.clients WHERE code = 'CLIENT-CJ' AND tenant_id = v_tenant_id;
    IF v_client_id IS NULL THEN
        -- 혹시 없을 경우 생성
        INSERT INTO public.clients (tenant_id, code, name, is_active)
        VALUES (v_tenant_id, 'CLIENT-CJ', 'CJ', true)
        RETURNING id INTO v_client_id;
    END IF;

    -- [1/287] Batch: 217, Pallet: 4, Loc: 1-L-01-FLOOR
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-01-FLOOR';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '217', '4', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-01-FLOOR' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-01-FLOOR)', NOW()
            );
        END IF;
    END IF;

    -- [2/287] Batch: 217, Pallet: 8, Loc: 1-L-01-FLOOR
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-01-FLOOR';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '217', '8', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-01-FLOOR' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-01-FLOOR)', NOW()
            );
        END IF;
    END IF;

    -- [3/287] Batch: 216, Pallet: 17, Loc: 1-L-01-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-01-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '216', '17', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-01-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-01-C)', NOW()
            );
        END IF;
    END IF;

    -- [4/287] Batch: 208, Pallet: 4, Loc: 1-L-02-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-02-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '208', '4', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-02-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-02-B)', NOW()
            );
        END IF;
    END IF;

    -- [5/287] Batch: 216, Pallet: 8, Loc: 1-L-02-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-02-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '216', '8', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-02-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-02-C)', NOW()
            );
        END IF;
    END IF;

    -- [6/287] Batch: 199, Pallet: 7, Loc: 1-L-03-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-03-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '199', '7', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-03-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-03-B)', NOW()
            );
        END IF;
    END IF;

    -- [7/287] Batch: 208, Pallet: 20, Loc: 1-L-03-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-03-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '208', '20', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-03-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-03-C)', NOW()
            );
        END IF;
    END IF;

    -- [8/287] Batch: 199, Pallet: 15, Loc: 1-L-04-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-04-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '199', '15', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-04-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-04-B)', NOW()
            );
        END IF;
    END IF;

    -- [9/287] Batch: 208, Pallet: 9, Loc: 1-L-04-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-04-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '208', '9', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-04-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-04-C)', NOW()
            );
        END IF;
    END IF;

    -- [10/287] Batch: 215, Pallet: 18, Loc: 1-L-05-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-05-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '215', '18', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-05-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-05-B)', NOW()
            );
        END IF;
    END IF;

    -- [11/287] Batch: 207, Pallet: 1, Loc: 1-L-06-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-06-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '207', '1', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-06-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-06-B)', NOW()
            );
        END IF;
    END IF;

    -- [12/287] Batch: 208, Pallet: 18, Loc: 1-L-06-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-06-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '208', '18', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-06-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-06-C)', NOW()
            );
        END IF;
    END IF;

    -- [13/287] Batch: 204, Pallet: 1, Loc: 1-L-07-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-07-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '204', '1', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-07-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-07-B)', NOW()
            );
        END IF;
    END IF;

    -- [14/287] Batch: 208, Pallet: 17, Loc: 1-L-07-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-07-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '208', '17', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-07-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-07-C)', NOW()
            );
        END IF;
    END IF;

    -- [15/287] Batch: 201, Pallet: 2, Loc: 1-L-08-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-08-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '201', '2', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-08-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-08-B)', NOW()
            );
        END IF;
    END IF;

    -- [16/287] Batch: 208, Pallet: 15, Loc: 1-L-08-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-08-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '208', '15', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-08-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-08-C)', NOW()
            );
        END IF;
    END IF;

    -- [17/287] Batch: 200, Pallet: 7, Loc: 1-L-09-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-09-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '200', '7', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-09-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-09-B)', NOW()
            );
        END IF;
    END IF;

    -- [18/287] Batch: 208, Pallet: 16, Loc: 1-L-09-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-09-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '208', '16', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-09-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-09-C)', NOW()
            );
        END IF;
    END IF;

    -- [19/287] Batch: 208, Pallet: 14, Loc: 1-L-10-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-10-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '208', '14', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-10-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-10-C)', NOW()
            );
        END IF;
    END IF;

    -- [20/287] Batch: 218, Pallet: 3, Loc: 1-L-11-FLOOR
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-11-FLOOR';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '218', '3', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-11-FLOOR' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-11-FLOOR)', NOW()
            );
        END IF;
    END IF;

    -- [21/287] Batch: 206, Pallet: 14, Loc: 1-L-11-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-11-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '206', '14', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-11-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-11-B)', NOW()
            );
        END IF;
    END IF;

    -- [22/287] Batch: 212, Pallet: 16, Loc: 1-L-11-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-11-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '212', '16', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-11-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-11-C)', NOW()
            );
        END IF;
    END IF;

    -- [23/287] Batch: 218, Pallet: 4, Loc: 1-L-12-FLOOR
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-12-FLOOR';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '218', '4', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-12-FLOOR' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-12-FLOOR)', NOW()
            );
        END IF;
    END IF;

    -- [24/287] Batch: 206, Pallet: 8, Loc: 1-L-12-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-12-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '206', '8', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-12-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-12-B)', NOW()
            );
        END IF;
    END IF;

    -- [25/287] Batch: 216, Pallet: 12, Loc: 1-L-12-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-12-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '216', '12', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-12-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-12-C)', NOW()
            );
        END IF;
    END IF;

    -- [26/287] Batch: 218, Pallet: 2, Loc: 1-L-13-FLOOR
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-13-FLOOR';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '218', '2', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-13-FLOOR' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-13-FLOOR)', NOW()
            );
        END IF;
    END IF;

    -- [27/287] Batch: 216, Pallet: 18, Loc: 1-L-13-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-13-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '216', '18', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-13-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-13-C)', NOW()
            );
        END IF;
    END IF;

    -- [28/287] Batch: 216, Pallet: 6, Loc: 1-L-14-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-14-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '216', '6', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-14-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-14-C)', NOW()
            );
        END IF;
    END IF;

    -- [29/287] Batch: 220, Pallet: 3, Loc: 2-L-08-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-08-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '220', '3', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-08-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-08-B)', NOW()
            );
        END IF;
    END IF;

    -- [30/287] Batch: 206, Pallet: 19, Loc: 1-L-15-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-15-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '206', '19', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-15-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-15-B)', NOW()
            );
        END IF;
    END IF;

    -- [31/287] Batch: 194, Pallet: 3, Loc: 1-L-15-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-15-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '194', '3', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-15-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-15-C)', NOW()
            );
        END IF;
    END IF;

    -- [32/287] Batch: 205, Pallet: 15, Loc: 1-L-16-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-16-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '205', '15', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-16-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-16-B)', NOW()
            );
        END IF;
    END IF;

    -- [33/287] Batch: 205, Pallet: 4, Loc: 1-L-17-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-17-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '205', '4', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-17-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-17-B)', NOW()
            );
        END IF;
    END IF;

    -- [34/287] Batch: 216, Pallet: 7, Loc: 1-L-17-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-17-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '216', '7', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-17-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-17-C)', NOW()
            );
        END IF;
    END IF;

    -- [35/287] Batch: 205, Pallet: 13, Loc: 1-L-18-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-18-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '205', '13', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-18-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-18-B)', NOW()
            );
        END IF;
    END IF;

    -- [36/287] Batch: 205, Pallet: 12, Loc: 1-L-18-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-18-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '205', '12', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-18-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-18-C)', NOW()
            );
        END IF;
    END IF;

    -- [37/287] Batch: 220, Pallet: 11, Loc: 1-L-15-FLOOR
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-15-FLOOR';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '220', '11', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-15-FLOOR' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-15-FLOOR)', NOW()
            );
        END IF;
    END IF;

    -- [38/287] Batch: 4731, Pallet: 1, Loc: 1-L-19-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-19-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '4731', '1', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-19-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-19-A)', NOW()
            );
        END IF;
    END IF;

    -- [39/287] Batch: 220, Pallet: 12, Loc: 2-R-22-FLOOR
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-22-FLOOR';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '220', '12', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-22-FLOOR' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-22-FLOOR)', NOW()
            );
        END IF;
    END IF;

    -- [40/287] Batch: 207, Pallet: 7, Loc: 1-L-21-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-21-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '207', '7', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-21-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-21-C)', NOW()
            );
        END IF;
    END IF;

    -- [41/287] Batch: 207, Pallet: 5, Loc: 1-L-22-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-22-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '207', '5', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-22-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-22-C)', NOW()
            );
        END IF;
    END IF;

    -- [42/287] Batch: 207, Pallet: 4, Loc: 1-L-23-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-23-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '207', '4', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-23-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-23-C)', NOW()
            );
        END IF;
    END IF;

    -- [43/287] Batch: 207, Pallet: 6, Loc: 1-L-24-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-24-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '207', '6', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-24-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-24-C)', NOW()
            );
        END IF;
    END IF;

    -- [44/287] Batch: 215, Pallet: 13, Loc: 1-L-25-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-25-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '215', '13', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-25-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-25-A)', NOW()
            );
        END IF;
    END IF;

    -- [45/287] Batch: 216, Pallet: 4, Loc: 1-L-25-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-25-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '216', '4', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-25-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-25-C)', NOW()
            );
        END IF;
    END IF;

    -- [46/287] Batch: 215, Pallet: 16, Loc: 1-L-26-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-26-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '215', '16', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-26-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-26-A)', NOW()
            );
        END IF;
    END IF;

    -- [47/287] Batch: 204, Pallet: 14, Loc: 1-L-26-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-26-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '204', '14', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-26-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-26-C)', NOW()
            );
        END IF;
    END IF;

    -- [48/287] Batch: 215, Pallet: 14, Loc: 1-L-27-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-27-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '215', '14', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-27-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-27-A)', NOW()
            );
        END IF;
    END IF;

    -- [49/287] Batch: 196, Pallet: 15, Loc: 1-L-27-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-27-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '196', '15', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-27-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-27-C)', NOW()
            );
        END IF;
    END IF;

    -- [50/287] Batch: 215, Pallet: 6, Loc: 1-L-28-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-28-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '215', '6', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-28-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-28-A)', NOW()
            );
        END IF;
    END IF;

    -- [51/287] Batch: 215, Pallet: 2, Loc: 1-L-28-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-28-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '215', '2', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-28-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-28-B)', NOW()
            );
        END IF;
    END IF;

    -- [52/287] Batch: 216, Pallet: 11, Loc: 1-L-28-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-28-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '216', '11', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-28-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-28-C)', NOW()
            );
        END IF;
    END IF;

    -- [53/287] Batch: 215, Pallet: 19, Loc: 1-L-29-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-29-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '215', '19', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-29-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-29-B)', NOW()
            );
        END IF;
    END IF;

    -- [54/287] Batch: 215, Pallet: 17, Loc: 1-L-30-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-30-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '215', '17', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-30-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-30-B)', NOW()
            );
        END IF;
    END IF;

    -- [55/287] Batch: 202, Pallet: 11, Loc: 1-R-03-FLOOR
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-03-FLOOR';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '202', '11', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-03-FLOOR' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-03-FLOOR)', NOW()
            );
        END IF;
    END IF;

    -- [56/287] Batch: 208, Pallet: 11, Loc: 1-R-03-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-03-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '208', '11', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-03-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-03-A)', NOW()
            );
        END IF;
    END IF;

    -- [57/287] Batch: 206, Pallet: 9, Loc: 1-R-03-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-03-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '206', '9', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-03-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-03-C)', NOW()
            );
        END IF;
    END IF;

    -- [58/287] Batch: 202, Pallet: 10, Loc: 1-R-04-FLOOR
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-04-FLOOR';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '202', '10', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-04-FLOOR' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-04-FLOOR)', NOW()
            );
        END IF;
    END IF;

    -- [59/287] Batch: 208, Pallet: 10, Loc: 1-R-04-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-04-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '208', '10', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-04-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-04-A)', NOW()
            );
        END IF;
    END IF;

    -- [60/287] Batch: 217, Pallet: 13, Loc: 1-R-04-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-04-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '217', '13', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-04-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-04-B)', NOW()
            );
        END IF;
    END IF;

    -- [61/287] Batch: 202, Pallet: 12, Loc: 1-R-05-FLOOR
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-05-FLOOR';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '202', '12', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-05-FLOOR' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-05-FLOOR)', NOW()
            );
        END IF;
    END IF;

    -- [62/287] Batch: 206, Pallet: 11, Loc: 1-R-05-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-05-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '206', '11', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-05-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-05-A)', NOW()
            );
        END IF;
    END IF;

    -- [63/287] Batch: 217, Pallet: 20, Loc: 1-R-05-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-05-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '217', '20', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-05-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-05-B)', NOW()
            );
        END IF;
    END IF;

    -- [64/287] Batch: 219, Pallet: 5, Loc: 1-R-04-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-04-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '219', '5', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-04-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-04-C)', NOW()
            );
        END IF;
    END IF;

    -- [65/287] Batch: 206, Pallet: 13, Loc: 1-R-06-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-06-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '206', '13', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-06-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-06-A)', NOW()
            );
        END IF;
    END IF;

    -- [66/287] Batch: 205, Pallet: 20, Loc: 1-R-06-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-06-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '205', '20', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-06-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-06-B)', NOW()
            );
        END IF;
    END IF;

    -- [67/287] Batch: 219, Pallet: 6, Loc: 1-R-06-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-06-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '219', '6', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-06-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-06-C)', NOW()
            );
        END IF;
    END IF;

    -- [68/287] Batch: 191, Pallet: 4, Loc: 1-R-07-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-07-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '191', '4', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-07-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-07-A)', NOW()
            );
        END IF;
    END IF;

    -- [69/287] Batch: 219, Pallet: 7, Loc: 1-R-07-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-07-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '219', '7', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-07-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-07-C)', NOW()
            );
        END IF;
    END IF;

    -- [70/287] Batch: 198, Pallet: 14, Loc: 1-R-08-FLOOR
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-08-FLOOR';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '198', '14', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-08-FLOOR' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-08-FLOOR)', NOW()
            );
        END IF;
    END IF;

    -- [71/287] Batch: 191, Pallet: 3, Loc: 1-R-08-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-08-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '191', '3', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-08-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-08-A)', NOW()
            );
        END IF;
    END IF;

    -- [72/287] Batch: 216, Pallet: 15, Loc: 1-R-08-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-08-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '216', '15', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-08-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-08-B)', NOW()
            );
        END IF;
    END IF;

    -- [73/287] Batch: 219, Pallet: 8, Loc: 1-R-18-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-18-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '219', '8', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-18-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-18-C)', NOW()
            );
        END IF;
    END IF;

    -- [74/287] Batch: 217, Pallet: 19, Loc: 1-R-09-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-09-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '217', '19', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-09-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-09-B)', NOW()
            );
        END IF;
    END IF;

    -- [75/287] Batch: 219, Pallet: 9, Loc: 1-R-03-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-03-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '219', '9', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-03-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-03-B)', NOW()
            );
        END IF;
    END IF;

    -- [76/287] Batch: 198, Pallet: 15, Loc: 1-R-10-FLOOR
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-10-FLOOR';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '198', '15', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-10-FLOOR' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-10-FLOOR)', NOW()
            );
        END IF;
    END IF;

    -- [77/287] Batch: 191, Pallet: 15, Loc: 1-R-10-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-10-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '191', '15', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-10-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-10-B)', NOW()
            );
        END IF;
    END IF;

    -- [78/287] Batch: 205, Pallet: 10, Loc: 1-R-12-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-12-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '205', '10', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-12-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-12-B)', NOW()
            );
        END IF;
    END IF;

    -- [79/287] Batch: 219, Pallet: 13, Loc: 1-R-09-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-09-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '219', '13', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-09-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-09-C)', NOW()
            );
        END IF;
    END IF;

    -- [80/287] Batch: 212, Pallet: 3, Loc: 1-R-15-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-15-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '212', '3', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-15-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-15-B)', NOW()
            );
        END IF;
    END IF;

    -- [81/287] Batch: 219, Pallet: 14, Loc: 1-R-20-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-20-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '219', '14', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-20-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-20-C)', NOW()
            );
        END IF;
    END IF;

    -- [82/287] Batch: 212, Pallet: 6, Loc: 1-R-16-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-16-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '212', '6', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-16-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-16-B)', NOW()
            );
        END IF;
    END IF;

    -- [83/287] Batch: 219, Pallet: 15, Loc: 1-R-05-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-05-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '219', '15', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-05-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-05-C)', NOW()
            );
        END IF;
    END IF;

    -- [84/287] Batch: 212, Pallet: 8, Loc: 1-R-17-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-17-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '212', '8', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-17-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-17-B)', NOW()
            );
        END IF;
    END IF;

    -- [85/287] Batch: 219, Pallet: 16, Loc: 1-L-20-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-20-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '219', '16', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-20-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-20-C)', NOW()
            );
        END IF;
    END IF;

    -- [86/287] Batch: 212, Pallet: 2, Loc: 1-R-18-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-18-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '212', '2', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-18-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-18-B)', NOW()
            );
        END IF;
    END IF;

    -- [87/287] Batch: 219, Pallet: 17, Loc: 1-R-17-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-17-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '219', '17', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-17-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-17-C)', NOW()
            );
        END IF;
    END IF;

    -- [88/287] Batch: 220, Pallet: 16, Loc: 1-L-22-FLOOR
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-L-22-FLOOR';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '220', '16', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-L-22-FLOOR' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-L-22-FLOOR)', NOW()
            );
        END IF;
    END IF;

    -- [89/287] Batch: 212, Pallet: 5, Loc: 1-R-19-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-19-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '212', '5', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-19-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-19-B)', NOW()
            );
        END IF;
    END IF;

    -- [90/287] Batch: 212, Pallet: 19, Loc: 1-R-20-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-20-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '212', '19', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-20-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-20-B)', NOW()
            );
        END IF;
    END IF;

    -- [91/287] Batch: 219, Pallet: 19, Loc: 1-R-10-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-10-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '219', '19', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-10-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-10-C)', NOW()
            );
        END IF;
    END IF;

    -- [92/287] Batch: 207, Pallet: 18, Loc: 1-R-21-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-21-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '207', '18', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-21-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-21-A)', NOW()
            );
        END IF;
    END IF;

    -- [93/287] Batch: 196, Pallet: 18, Loc: 1-R-21-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-21-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '196', '18', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-21-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-21-B)', NOW()
            );
        END IF;
    END IF;

    -- [94/287] Batch: 214, Pallet: 2, Loc: 3-L-19-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-19-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '214', '2', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-19-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-19-C)', NOW()
            );
        END IF;
    END IF;

    -- [95/287] Batch: 205, Pallet: 3, Loc: 1-R-22-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-22-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '205', '3', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-22-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-22-C)', NOW()
            );
        END IF;
    END IF;

    -- [96/287] Batch: 214, Pallet: 3, Loc: 2-R-19-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-19-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '214', '3', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-19-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-19-C)', NOW()
            );
        END IF;
    END IF;

    -- [97/287] Batch: 205, Pallet: 2, Loc: 1-R-23-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-23-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '205', '2', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-23-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-23-C)', NOW()
            );
        END IF;
    END IF;

    -- [98/287] Batch: 214, Pallet: 4, Loc: 2-R-20-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-20-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '214', '4', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-20-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-20-C)', NOW()
            );
        END IF;
    END IF;

    -- [99/287] Batch: 196, Pallet: 3, Loc: 1-R-24-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-24-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '196', '3', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-24-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-24-B)', NOW()
            );
        END IF;
    END IF;

    -- [100/287] Batch: 205, Pallet: 17, Loc: 1-R-24-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-24-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '205', '17', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-24-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-24-C)', NOW()
            );
        END IF;
    END IF;

    -- [101/287] Batch: 216, Pallet: 10, Loc: 1-R-25-FLOOR
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-25-FLOOR';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '216', '10', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-25-FLOOR' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-25-FLOOR)', NOW()
            );
        END IF;
    END IF;

    -- [102/287] Batch: 204, Pallet: 20, Loc: 1-R-25-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-25-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '204', '20', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-25-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-25-A)', NOW()
            );
        END IF;
    END IF;

    -- [103/287] Batch: 205, Pallet: 9, Loc: 1-R-25-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-25-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '205', '9', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-25-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-25-C)', NOW()
            );
        END IF;
    END IF;

    -- [104/287] Batch: 204, Pallet: 15, Loc: 1-R-26-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-26-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '204', '15', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-26-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-26-A)', NOW()
            );
        END IF;
    END IF;

    -- [105/287] Batch: 204, Pallet: 17, Loc: 1-R-26-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-26-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '204', '17', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-26-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-26-B)', NOW()
            );
        END IF;
    END IF;

    -- [106/287] Batch: 205, Pallet: 5, Loc: 1-R-26-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-26-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '205', '5', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-26-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-26-C)', NOW()
            );
        END IF;
    END IF;

    -- [107/287] Batch: 205, Pallet: 16, Loc: 1-R-27-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-27-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '205', '16', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-27-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-27-A)', NOW()
            );
        END IF;
    END IF;

    -- [108/287] Batch: 205, Pallet: 14, Loc: 1-R-27-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-27-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '205', '14', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-27-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-27-C)', NOW()
            );
        END IF;
    END IF;

    -- [109/287] Batch: 216, Pallet: 2, Loc: 1-R-28-FLOOR
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-28-FLOOR';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '216', '2', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-28-FLOOR' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-28-FLOOR)', NOW()
            );
        END IF;
    END IF;

    -- [110/287] Batch: 196, Pallet: 5, Loc: 1-R-28-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-28-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '196', '5', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-28-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-28-A)', NOW()
            );
        END IF;
    END IF;

    -- [111/287] Batch: 215, Pallet: 7, Loc: 1-R-28-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-28-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '215', '7', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-28-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-28-B)', NOW()
            );
        END IF;
    END IF;

    -- [112/287] Batch: 205, Pallet: 6, Loc: 1-R-28-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-28-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '205', '6', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-28-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-28-C)', NOW()
            );
        END IF;
    END IF;

    -- [113/287] Batch: 216, Pallet: 1, Loc: 1-R-29-FLOOR
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-29-FLOOR';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '216', '1', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-29-FLOOR' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-29-FLOOR)', NOW()
            );
        END IF;
    END IF;

    -- [114/287] Batch: 205, Pallet: 8, Loc: 1-R-29-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-29-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '205', '8', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-29-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-29-A)', NOW()
            );
        END IF;
    END IF;

    -- [115/287] Batch: 205, Pallet: 19, Loc: 1-R-30-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-30-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '205', '19', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-30-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-30-A)', NOW()
            );
        END IF;
    END IF;

    -- [116/287] Batch: 217, Pallet: 5, Loc: 2-L-03-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-03-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '217', '5', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-03-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-03-A)', NOW()
            );
        END IF;
    END IF;

    -- [117/287] Batch: 216, Pallet: 3, Loc: 2-L-03-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-03-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '216', '3', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-03-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-03-C)', NOW()
            );
        END IF;
    END IF;

    -- [118/287] Batch: 197, Pallet: 18, Loc: 2-L-04-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-04-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '197', '18', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-04-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-04-A)', NOW()
            );
        END IF;
    END IF;

    -- [119/287] Batch: 197, Pallet: 7, Loc: 2-L-04-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-04-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '197', '7', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-04-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-04-B)', NOW()
            );
        END IF;
    END IF;

    -- [120/287] Batch: 197, Pallet: 19, Loc: 2-L-05-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-05-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '197', '19', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-05-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-05-A)', NOW()
            );
        END IF;
    END IF;

    -- [121/287] Batch: 217, Pallet: 7, Loc: 2-L-06-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-06-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '217', '7', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-06-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-06-A)', NOW()
            );
        END IF;
    END IF;

    -- [122/287] Batch: 198, Pallet: 18, Loc: 2-L-06-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-06-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '198', '18', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-06-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-06-B)', NOW()
            );
        END IF;
    END IF;

    -- [123/287] Batch: 216, Pallet: 9, Loc: 2-L-06-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-06-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '216', '9', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-06-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-06-C)', NOW()
            );
        END IF;
    END IF;

    -- [124/287] Batch: 217, Pallet: 4, Loc: 2-L-07-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-07-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '217', '4', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-07-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-07-A)', NOW()
            );
        END IF;
    END IF;

    -- [125/287] Batch: 217, Pallet: 18, Loc: 2-L-07-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-07-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '217', '18', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-07-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-07-C)', NOW()
            );
        END IF;
    END IF;

    -- [126/287] Batch: 198, Pallet: 10, Loc: 2-L-08-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-08-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '198', '10', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-08-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-08-A)', NOW()
            );
        END IF;
    END IF;

    -- [127/287] Batch: 217, Pallet: 10, Loc: 2-L-08-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-08-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '217', '10', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-08-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-08-C)', NOW()
            );
        END IF;
    END IF;

    -- [128/287] Batch: 217, Pallet: 6, Loc: 2-L-09-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-09-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '217', '6', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-09-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-09-A)', NOW()
            );
        END IF;
    END IF;

    -- [129/287] Batch: 210, Pallet: 14, Loc: 2-L-09-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-09-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '210', '14', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-09-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-09-B)', NOW()
            );
        END IF;
    END IF;

    -- [130/287] Batch: 217, Pallet: 11, Loc: 2-L-10-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-10-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '217', '11', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-10-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-10-A)', NOW()
            );
        END IF;
    END IF;

    -- [131/287] Batch: 217, Pallet: 15, Loc: 2-L-10-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-10-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '217', '15', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-10-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-10-B)', NOW()
            );
        END IF;
    END IF;

    -- [132/287] Batch: 215, Pallet: 10, Loc: 2-L-10-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-10-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '215', '10', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-10-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-10-C)', NOW()
            );
        END IF;
    END IF;

    -- [133/287] Batch: 199, Pallet: 20, Loc: 2-L-11-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-11-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '199', '20', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-11-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-11-A)', NOW()
            );
        END IF;
    END IF;

    -- [134/287] Batch: 199, Pallet: 9, Loc: 2-L-11-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-11-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '199', '9', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-11-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-11-B)', NOW()
            );
        END IF;
    END IF;

    -- [135/287] Batch: 215, Pallet: 9, Loc: 2-L-11-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-11-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '215', '9', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-11-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-11-C)', NOW()
            );
        END IF;
    END IF;

    -- [136/287] Batch: 201, Pallet: 17, Loc: 2-L-12-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-12-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '201', '17', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-12-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-12-A)', NOW()
            );
        END IF;
    END IF;

    -- [137/287] Batch: 199, Pallet: 11, Loc: 2-L-12-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-12-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '199', '11', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-12-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-12-B)', NOW()
            );
        END IF;
    END IF;

    -- [138/287] Batch: 215, Pallet: 11, Loc: 2-L-12-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-12-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '215', '11', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-12-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-12-C)', NOW()
            );
        END IF;
    END IF;

    -- [139/287] Batch: 203, Pallet: 1, Loc: 2-L-15-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-15-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '203', '1', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-15-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-15-B)', NOW()
            );
        END IF;
    END IF;

    -- [140/287] Batch: 217, Pallet: 8, Loc: 2-L-15-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-15-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '217', '8', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-15-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-15-C)', NOW()
            );
        END IF;
    END IF;

    -- [141/287] Batch: 201, Pallet: 18, Loc: 2-L-16-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-16-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '201', '18', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-16-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-16-A)', NOW()
            );
        END IF;
    END IF;

    -- [142/287] Batch: 217, Pallet: 16, Loc: 2-L-16-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-16-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '217', '16', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-16-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-16-B)', NOW()
            );
        END IF;
    END IF;

    -- [143/287] Batch: 201, Pallet: 19, Loc: 2-L-16-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-16-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '201', '19', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-16-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-16-C)', NOW()
            );
        END IF;
    END IF;

    -- [144/287] Batch: 201, Pallet: 1, Loc: 2-L-17-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-17-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '201', '1', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-17-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-17-A)', NOW()
            );
        END IF;
    END IF;

    -- [145/287] Batch: 217, Pallet: 14, Loc: 2-L-17-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-17-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '217', '14', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-17-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-17-B)', NOW()
            );
        END IF;
    END IF;

    -- [146/287] Batch: 202, Pallet: 13, Loc: 2-L-17-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-17-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '202', '13', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-17-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-17-C)', NOW()
            );
        END IF;
    END IF;

    -- [147/287] Batch: 212, Pallet: 13, Loc: 2-L-18-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-18-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '212', '13', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-18-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-18-B)', NOW()
            );
        END IF;
    END IF;

    -- [148/287] Batch: 201, Pallet: 16, Loc: 2-L-18-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-18-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '201', '16', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-18-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-18-C)', NOW()
            );
        END IF;
    END IF;

    -- [149/287] Batch: 200, Pallet: 13, Loc: 2-L-19-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-19-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '200', '13', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-19-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-19-A)', NOW()
            );
        END IF;
    END IF;

    -- [150/287] Batch: 202, Pallet: 2, Loc: 2-L-19-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-19-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '202', '2', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-19-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-19-C)', NOW()
            );
        END IF;
    END IF;

    -- [151/287] Batch: 202, Pallet: 9, Loc: 2-L-20-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-20-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '202', '9', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-20-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-20-A)', NOW()
            );
        END IF;
    END IF;

    -- [152/287] Batch: 217, Pallet: 12, Loc: 2-L-20-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-20-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '217', '12', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-20-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-20-B)', NOW()
            );
        END IF;
    END IF;

    -- [153/287] Batch: 216, Pallet: 13, Loc: 2-L-20-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-20-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '216', '13', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-20-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-20-C)', NOW()
            );
        END IF;
    END IF;

    -- [154/287] Batch: 200, Pallet: 14, Loc: 2-L-21-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-21-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '200', '14', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-21-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-21-A)', NOW()
            );
        END IF;
    END IF;

    -- [155/287] Batch: 211, Pallet: 20, Loc: 2-L-21-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-21-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '211', '20', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-21-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-21-B)', NOW()
            );
        END IF;
    END IF;

    -- [156/287] Batch: 216, Pallet: 5, Loc: 2-L-21-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-21-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '216', '5', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-21-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-21-C)', NOW()
            );
        END IF;
    END IF;

    -- [157/287] Batch: 200, Pallet: 11, Loc: 2-L-22-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-22-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '200', '11', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-22-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-22-A)', NOW()
            );
        END IF;
    END IF;

    -- [158/287] Batch: 218, Pallet: 10, Loc: 2-L-22-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-22-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '218', '10', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-22-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-22-B)', NOW()
            );
        END IF;
    END IF;

    -- [159/287] Batch: 200, Pallet: 17, Loc: 2-L-22-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-22-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '200', '17', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-22-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-22-C)', NOW()
            );
        END IF;
    END IF;

    -- [160/287] Batch: 200, Pallet: 15, Loc: 2-L-23-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-23-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '200', '15', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-23-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-23-A)', NOW()
            );
        END IF;
    END IF;

    -- [161/287] Batch: 218, Pallet: 15, Loc: 2-L-23-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-23-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '218', '15', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-23-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-23-B)', NOW()
            );
        END IF;
    END IF;

    -- [162/287] Batch: 200, Pallet: 16, Loc: 2-L-23-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-23-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '200', '16', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-23-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-23-C)', NOW()
            );
        END IF;
    END IF;

    -- [163/287] Batch: 200, Pallet: 18, Loc: 2-L-24-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-24-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '200', '18', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-24-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-24-A)', NOW()
            );
        END IF;
    END IF;

    -- [164/287] Batch: 203, Pallet: 14, Loc: 2-L-24-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-24-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '203', '14', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-24-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-24-B)', NOW()
            );
        END IF;
    END IF;

    -- [165/287] Batch: 200, Pallet: 12, Loc: 2-L-24-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-24-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '200', '12', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-24-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-24-C)', NOW()
            );
        END IF;
    END IF;

    -- [166/287] Batch: 202, Pallet: 8, Loc: 2-L-25-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-25-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '202', '8', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-25-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-25-A)', NOW()
            );
        END IF;
    END IF;

    -- [167/287] Batch: 203, Pallet: 2, Loc: 2-L-25-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-25-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '203', '2', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-25-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-25-B)', NOW()
            );
        END IF;
    END IF;

    -- [168/287] Batch: 200, Pallet: 9, Loc: 2-L-25-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-25-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '200', '9', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-25-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-25-C)', NOW()
            );
        END IF;
    END IF;

    -- [169/287] Batch: 203, Pallet: 8, Loc: 2-L-26-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-26-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '203', '8', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-26-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-26-A)', NOW()
            );
        END IF;
    END IF;

    -- [170/287] Batch: 203, Pallet: 15, Loc: 2-L-26-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-26-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '203', '15', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-26-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-26-B)', NOW()
            );
        END IF;
    END IF;

    -- [171/287] Batch: 200, Pallet: 10, Loc: 2-L-26-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-26-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '200', '10', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-26-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-26-C)', NOW()
            );
        END IF;
    END IF;

    -- [172/287] Batch: 203, Pallet: 11, Loc: 2-L-27-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-27-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '203', '11', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-27-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-27-A)', NOW()
            );
        END IF;
    END IF;

    -- [173/287] Batch: 203, Pallet: 13, Loc: 2-L-27-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-27-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '203', '13', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-27-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-27-B)', NOW()
            );
        END IF;
    END IF;

    -- [174/287] Batch: 203, Pallet: 7, Loc: 2-L-27-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-27-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '203', '7', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-27-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-27-C)', NOW()
            );
        END IF;
    END IF;

    -- [175/287] Batch: 203, Pallet: 12, Loc: 2-L-28-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-28-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '203', '12', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-28-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-28-A)', NOW()
            );
        END IF;
    END IF;

    -- [176/287] Batch: 218, Pallet: 18, Loc: 2-L-28-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-28-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '218', '18', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-28-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-28-B)', NOW()
            );
        END IF;
    END IF;

    -- [177/287] Batch: 200, Pallet: 10, Loc: 2-L-28-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-28-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '200', '10', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-28-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-28-C)', NOW()
            );
        END IF;
    END IF;

    -- [178/287] Batch: 218, Pallet: 12, Loc: 2-L-29-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-29-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '218', '12', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-29-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-29-B)', NOW()
            );
        END IF;
    END IF;

    -- [179/287] Batch: 218, Pallet: 6, Loc: 2-L-29-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-29-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '218', '6', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-29-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-29-C)', NOW()
            );
        END IF;
    END IF;

    -- [180/287] Batch: 203, Pallet: 19, Loc: 2-L-30-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-30-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '203', '19', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-30-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-30-A)', NOW()
            );
        END IF;
    END IF;

    -- [181/287] Batch: 218, Pallet: 20, Loc: 2-L-30-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-30-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '218', '20', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-30-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-30-B)', NOW()
            );
        END IF;
    END IF;

    -- [182/287] Batch: 218, Pallet: 5, Loc: 2-L-30-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-30-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '218', '5', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-30-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-30-C)', NOW()
            );
        END IF;
    END IF;

    -- [183/287] Batch: 203, Pallet: 16, Loc: 2-L-31-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-31-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '203', '16', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-31-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-31-A)', NOW()
            );
        END IF;
    END IF;

    -- [184/287] Batch: 218, Pallet: 14, Loc: 2-L-31-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-31-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '218', '14', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-31-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-31-B)', NOW()
            );
        END IF;
    END IF;

    -- [185/287] Batch: 203, Pallet: 9, Loc: 2-L-31-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-31-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '203', '9', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-31-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-31-C)', NOW()
            );
        END IF;
    END IF;

    -- [186/287] Batch: 218, Pallet: 11, Loc: 2-L-32-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-32-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '218', '11', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-32-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-32-B)', NOW()
            );
        END IF;
    END IF;

    -- [187/287] Batch: 203, Pallet: 18, Loc: 2-L-32-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-L-32-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '203', '18', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-L-32-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-L-32-C)', NOW()
            );
        END IF;
    END IF;

    -- [188/287] Batch: 212, Pallet: 4, Loc: 2-R-03-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-03-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '212', '4', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-03-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-03-A)', NOW()
            );
        END IF;
    END IF;

    -- [189/287] Batch: 213, Pallet: 20, Loc: 2-R-03-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-03-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '213', '20', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-03-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-03-B)', NOW()
            );
        END IF;
    END IF;

    -- [190/287] Batch: 213, Pallet: 4, Loc: 2-R-03-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-03-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '213', '4', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-03-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-03-C)', NOW()
            );
        END IF;
    END IF;

    -- [191/287] Batch: 212, Pallet: 7, Loc: 2-R-04-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-04-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '212', '7', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-04-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-04-A)', NOW()
            );
        END IF;
    END IF;

    -- [192/287] Batch: 213, Pallet: 7, Loc: 2-R-04-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-04-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '213', '7', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-04-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-04-C)', NOW()
            );
        END IF;
    END IF;

    -- [193/287] Batch: 212, Pallet: 14, Loc: 2-R-05-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-05-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '212', '14', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-05-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-05-A)', NOW()
            );
        END IF;
    END IF;

    -- [194/287] Batch: 212, Pallet: 12, Loc: 2-R-06-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-06-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '212', '12', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-06-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-06-A)', NOW()
            );
        END IF;
    END IF;

    -- [195/287] Batch: 213, Pallet: 2, Loc: 2-R-06-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-06-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '213', '2', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-06-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-06-B)', NOW()
            );
        END IF;
    END IF;

    -- [196/287] Batch: 213, Pallet: 5, Loc: 2-R-06-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-06-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '213', '5', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-06-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-06-C)', NOW()
            );
        END IF;
    END IF;

    -- [197/287] Batch: 203, Pallet: 20, Loc: 2-R-07-FLOOR
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-07-FLOOR';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '203', '20', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-07-FLOOR' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-07-FLOOR)', NOW()
            );
        END IF;
    END IF;

    -- [198/287] Batch: 212, Pallet: 15, Loc: 2-R-07-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-07-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '212', '15', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-07-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-07-A)', NOW()
            );
        END IF;
    END IF;

    -- [199/287] Batch: 213, Pallet: 1, Loc: 2-R-07-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-07-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '213', '1', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-07-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-07-B)', NOW()
            );
        END IF;
    END IF;

    -- [200/287] Batch: 213, Pallet: 3, Loc: 2-R-07-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-07-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '213', '3', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-07-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-07-C)', NOW()
            );
        END IF;
    END IF;

    -- [201/287] Batch: 212, Pallet: 10, Loc: 2-R-08-FLOOR
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-08-FLOOR';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '212', '10', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-08-FLOOR' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-08-FLOOR)', NOW()
            );
        END IF;
    END IF;

    -- [202/287] Batch: 217, Pallet: 2, Loc: 2-R-08-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-08-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '217', '2', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-08-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-08-A)', NOW()
            );
        END IF;
    END IF;

    -- [203/287] Batch: 217, Pallet: 17, Loc: 2-R-08-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-08-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '217', '17', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-08-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-08-B)', NOW()
            );
        END IF;
    END IF;

    -- [204/287] Batch: 213, Pallet: 6, Loc: 2-R-08-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-08-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '213', '6', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-08-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-08-C)', NOW()
            );
        END IF;
    END IF;

    -- [205/287] Batch: 212, Pallet: 11, Loc: 2-R-09-FLOOR
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-09-FLOOR';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '212', '11', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-09-FLOOR' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-09-FLOOR)', NOW()
            );
        END IF;
    END IF;

    -- [206/287] Batch: 212, Pallet: 9, Loc: 2-R-09-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-09-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '212', '9', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-09-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-09-A)', NOW()
            );
        END IF;
    END IF;

    -- [207/287] Batch: 212, Pallet: 18, Loc: 2-R-09-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-09-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '212', '18', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-09-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-09-B)', NOW()
            );
        END IF;
    END IF;

    -- [208/287] Batch: 209, Pallet: 8, Loc: 2-R-09-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-09-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '209', '8', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-09-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-09-C)', NOW()
            );
        END IF;
    END IF;

    -- [209/287] Batch: 213, Pallet: 14, Loc: 2-R-10-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-10-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '213', '14', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-10-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-10-A)', NOW()
            );
        END IF;
    END IF;

    -- [210/287] Batch: 209, Pallet: 19, Loc: 2-R-10-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-10-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '209', '19', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-10-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-10-B)', NOW()
            );
        END IF;
    END IF;

    -- [211/287] Batch: 209, Pallet: 14, Loc: 2-R-10-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-10-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '209', '14', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-10-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-10-C)', NOW()
            );
        END IF;
    END IF;

    -- [212/287] Batch: 213, Pallet: 15, Loc: 2-R-11-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-11-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '213', '15', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-11-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-11-A)', NOW()
            );
        END IF;
    END IF;

    -- [213/287] Batch: 209, Pallet: 6, Loc: 2-R-11-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-11-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '209', '6', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-11-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-11-B)', NOW()
            );
        END IF;
    END IF;

    -- [214/287] Batch: 209, Pallet: 7, Loc: 2-R-11-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-11-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '209', '7', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-11-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-11-C)', NOW()
            );
        END IF;
    END IF;

    -- [215/287] Batch: 209, Pallet: 11, Loc: 2-R-12-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-12-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '209', '11', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-12-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-12-B)', NOW()
            );
        END IF;
    END IF;

    -- [216/287] Batch: 214, Pallet: 6, Loc: 1-R-24-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-24-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '214', '6', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-24-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-24-A)', NOW()
            );
        END IF;
    END IF;

    -- [217/287] Batch: 214, Pallet: 7, Loc: 2-R-13-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-13-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '214', '7', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-13-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-13-C)', NOW()
            );
        END IF;
    END IF;

    -- [218/287] Batch: 210, Pallet: 15, Loc: 2-R-14-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-14-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '210', '15', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-14-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-14-C)', NOW()
            );
        END IF;
    END IF;

    -- [219/287] Batch: 209, Pallet: 10, Loc: 2-R-15-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-15-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '209', '10', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-15-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-15-B)', NOW()
            );
        END IF;
    END IF;

    -- [220/287] Batch: 216, Pallet: 16, Loc: 2-R-15-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-15-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '216', '16', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-15-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-15-C)', NOW()
            );
        END IF;
    END IF;

    -- [221/287] Batch: 213, Pallet: 16, Loc: 2-R-16-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-16-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '213', '16', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-16-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-16-A)', NOW()
            );
        END IF;
    END IF;

    -- [222/287] Batch: 210, Pallet: 16, Loc: 2-R-16-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-16-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '210', '16', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-16-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-16-B)', NOW()
            );
        END IF;
    END IF;

    -- [223/287] Batch: 210, Pallet: 11, Loc: 2-R-16-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-16-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '210', '11', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-16-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-16-C)', NOW()
            );
        END IF;
    END IF;

    -- [224/287] Batch: 213, Pallet: 11, Loc: 2-R-17-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-17-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '213', '11', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-17-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-17-A)', NOW()
            );
        END IF;
    END IF;

    -- [225/287] Batch: 210, Pallet: 9, Loc: 2-R-17-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-17-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '210', '9', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-17-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-17-B)', NOW()
            );
        END IF;
    END IF;

    -- [226/287] Batch: 210, Pallet: 12, Loc: 2-R-17-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-17-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '210', '12', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-17-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-17-C)', NOW()
            );
        END IF;
    END IF;

    -- [227/287] Batch: 213, Pallet: 12, Loc: 2-R-18-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-18-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '213', '12', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-18-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-18-A)', NOW()
            );
        END IF;
    END IF;

    -- [228/287] Batch: 210, Pallet: 1, Loc: 2-R-18-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-18-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '210', '1', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-18-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-18-B)', NOW()
            );
        END IF;
    END IF;

    -- [229/287] Batch: 213, Pallet: 13, Loc: 2-R-19-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-19-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '213', '13', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-19-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-19-A)', NOW()
            );
        END IF;
    END IF;

    -- [230/287] Batch: 210, Pallet: 13, Loc: 2-R-19-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-19-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '210', '13', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-19-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-19-B)', NOW()
            );
        END IF;
    END IF;

    -- [231/287] Batch: 218, Pallet: 9, Loc: 2-R-20-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-20-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '218', '9', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-20-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-20-A)', NOW()
            );
        END IF;
    END IF;

    -- [232/287] Batch: 210, Pallet: 8, Loc: 2-R-20-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-20-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '210', '8', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-20-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-20-B)', NOW()
            );
        END IF;
    END IF;

    -- [233/287] Batch: 214, Pallet: 9, Loc: 2-R-12-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-12-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '214', '9', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-12-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-12-C)', NOW()
            );
        END IF;
    END IF;

    -- [234/287] Batch: 209, Pallet: 12, Loc: 2-R-21-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-21-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '209', '12', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-21-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-21-A)', NOW()
            );
        END IF;
    END IF;

    -- [235/287] Batch: 210, Pallet: 7, Loc: 2-R-21-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-21-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '210', '7', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-21-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-21-B)', NOW()
            );
        END IF;
    END IF;

    -- [236/287] Batch: 215, Pallet: 4, Loc: 2-R-21-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-21-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '215', '4', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-21-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-21-C)', NOW()
            );
        END IF;
    END IF;

    -- [237/287] Batch: 209, Pallet: 3, Loc: 2-R-22-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-22-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '209', '3', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-22-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-22-A)', NOW()
            );
        END IF;
    END IF;

    -- [238/287] Batch: 210, Pallet: 20, Loc: 2-R-22-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-22-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '210', '20', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-22-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-22-B)', NOW()
            );
        END IF;
    END IF;

    -- [239/287] Batch: 215, Pallet: 3, Loc: 2-R-22-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-22-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '215', '3', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-22-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-22-C)', NOW()
            );
        END IF;
    END IF;

    -- [240/287] Batch: 218, Pallet: 17.8.7.13, Loc: 2-R-23-FLOOR
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '2-R-23-FLOOR';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '218', '17.8.7.13', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '2-R-23-FLOOR' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (2-R-23-FLOOR)', NOW()
            );
        END IF;
    END IF;

    -- [241/287] Batch: 209, Pallet: 16, Loc: 3-L-03-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-03-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '209', '16', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-03-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-03-A)', NOW()
            );
        END IF;
    END IF;

    -- [242/287] Batch: 211, Pallet: 8, Loc: 3-L-03-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-03-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '211', '8', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-03-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-03-B)', NOW()
            );
        END IF;
    END IF;

    -- [243/287] Batch: 211, Pallet: 7, Loc: 3-L-03-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-03-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '211', '7', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-03-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-03-C)', NOW()
            );
        END IF;
    END IF;

    -- [244/287] Batch: 209, Pallet: 5, Loc: 3-L-04-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-04-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '209', '5', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-04-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-04-A)', NOW()
            );
        END IF;
    END IF;

    -- [245/287] Batch: 211, Pallet: 3, Loc: 3-L-04-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-04-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '211', '3', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-04-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-04-B)', NOW()
            );
        END IF;
    END IF;

    -- [246/287] Batch: 211, Pallet: 12, Loc: 3-L-04-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-04-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '211', '12', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-04-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-04-C)', NOW()
            );
        END IF;
    END IF;

    -- [247/287] Batch: 209, Pallet: 18, Loc: 3-L-05-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-05-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '209', '18', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-05-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-05-A)', NOW()
            );
        END IF;
    END IF;

    -- [248/287] Batch: 211, Pallet: 11, Loc: 3-L-05-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-05-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '211', '11', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-05-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-05-B)', NOW()
            );
        END IF;
    END IF;

    -- [249/287] Batch: 211, Pallet: 2, Loc: 3-L-05-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-05-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '211', '2', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-05-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-05-C)', NOW()
            );
        END IF;
    END IF;

    -- [250/287] Batch: 209, Pallet: 17, Loc: 3-L-06-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-06-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '209', '17', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-06-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-06-A)', NOW()
            );
        END IF;
    END IF;

    -- [251/287] Batch: 211, Pallet: 1, Loc: 3-L-06-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-06-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '211', '1', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-06-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-06-B)', NOW()
            );
        END IF;
    END IF;

    -- [252/287] Batch: 211, Pallet: 16, Loc: 3-L-06-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-06-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '211', '16', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-06-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-06-C)', NOW()
            );
        END IF;
    END IF;

    -- [253/287] Batch: 209, Pallet: 15, Loc: 3-L-07-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-07-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '209', '15', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-07-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-07-A)', NOW()
            );
        END IF;
    END IF;

    -- [254/287] Batch: 271, Pallet: 15, Loc: 3-L-07-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-07-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '271', '15', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-07-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-07-C)', NOW()
            );
        END IF;
    END IF;

    -- [255/287] Batch: 209, Pallet: 13, Loc: 3-L-08-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-08-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '209', '13', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-08-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-08-A)', NOW()
            );
        END IF;
    END IF;

    -- [256/287] Batch: 211, Pallet: 14, Loc: 3-L-08-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-08-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '211', '14', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-08-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-08-C)', NOW()
            );
        END IF;
    END IF;

    -- [257/287] Batch: 211, Pallet: 19, Loc: 3-L-09-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-09-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '211', '19', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-09-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-09-C)', NOW()
            );
        END IF;
    END IF;

    -- [258/287] Batch: 216, Pallet: 19, Loc: 3-L-10-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-10-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '216', '19', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-10-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-10-B)', NOW()
            );
        END IF;
    END IF;

    -- [259/287] Batch: 211, Pallet: 18, Loc: 3-L-10-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-10-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '211', '18', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-10-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-10-C)', NOW()
            );
        END IF;
    END IF;

    -- [260/287] Batch: 210, Pallet: 18, Loc: 3-L-11-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-11-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '210', '18', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-11-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-11-A)', NOW()
            );
        END IF;
    END IF;

    -- [261/287] Batch: 216, Pallet: 20, Loc: 3-L-11-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-11-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '216', '20', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-11-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-11-B)', NOW()
            );
        END IF;
    END IF;

    -- [262/287] Batch: 211, Pallet: 17, Loc: 3-L-11-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-11-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '211', '17', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-11-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-11-C)', NOW()
            );
        END IF;
    END IF;

    -- [263/287] Batch: 210, Pallet: 19, Loc: 3-L-12-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-12-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '210', '19', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-12-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-12-A)', NOW()
            );
        END IF;
    END IF;

    -- [264/287] Batch: 216, Pallet: 14, Loc: 3-L-12-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-12-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '216', '14', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-12-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-12-B)', NOW()
            );
        END IF;
    END IF;

    -- [265/287] Batch: 214, Pallet: 10, Loc: 3-L-15-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-15-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '214', '10', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-15-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-15-C)', NOW()
            );
        END IF;
    END IF;

    -- [266/287] Batch: 210, Pallet: 5, Loc: 3-L-15-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-15-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '210', '5', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-15-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-15-A)', NOW()
            );
        END IF;
    END IF;

    -- [267/287] Batch: 214, Pallet: 11, Loc: 1-R-23-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-23-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '214', '11', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-23-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-23-A)', NOW()
            );
        END IF;
    END IF;

    -- [268/287] Batch: 214, Pallet: 13, Loc: 3-L-18-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-18-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '214', '13', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-18-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-18-C)', NOW()
            );
        END IF;
    END IF;

    -- [269/287] Batch: 210, Pallet: 10, Loc: 3-L-16-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-16-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '210', '10', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-16-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-16-A)', NOW()
            );
        END IF;
    END IF;

    -- [270/287] Batch: 214, Pallet: 14, Loc: 3-L-15-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-15-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '214', '14', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-15-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-15-B)', NOW()
            );
        END IF;
    END IF;

    -- [271/287] Batch: 210, Pallet: 6, Loc: 3-L-17-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-17-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '210', '6', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-17-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-17-A)', NOW()
            );
        END IF;
    END IF;

    -- [272/287] Batch: 214, Pallet: 17, Loc: 3-L-17-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-17-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '214', '17', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-17-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-17-C)', NOW()
            );
        END IF;
    END IF;

    -- [273/287] Batch: 214, Pallet: 18, Loc: 3-L-16-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-16-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '214', '18', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-16-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-16-B)', NOW()
            );
        END IF;
    END IF;

    -- [274/287] Batch: 211, Pallet: 13, Loc: 3-L-18-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-18-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '211', '13', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-18-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-18-A)', NOW()
            );
        END IF;
    END IF;

    -- [275/287] Batch: 214, Pallet: 19, Loc: 3-L-16-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-16-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '214', '19', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-16-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-16-C)', NOW()
            );
        END IF;
    END IF;

    -- [276/287] Batch: 211, Pallet: 10, Loc: 3-L-19-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-19-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '211', '10', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-19-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-19-A)', NOW()
            );
        END IF;
    END IF;

    -- [277/287] Batch: 215, Pallet: 5, Loc: 3-L-19-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-19-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '215', '5', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-19-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-19-B)', NOW()
            );
        END IF;
    END IF;

    -- [278/287] Batch: 214, Pallet: 20, Loc: 3-L-21-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-21-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '214', '20', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-21-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-21-B)', NOW()
            );
        END IF;
    END IF;

    -- [279/287] Batch: 211, Pallet: 4, Loc: 3-L-20-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-20-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '211', '4', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-20-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-20-A)', NOW()
            );
        END IF;
    END IF;

    -- [280/287] Batch: 210, Pallet: 17, Loc: 3-L-20-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-20-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '210', '17', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-20-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-20-B)', NOW()
            );
        END IF;
    END IF;

    -- [281/287] Batch: 215, Pallet: 15, Loc: 3-L-20-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-20-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '215', '15', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-20-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-20-C)', NOW()
            );
        END IF;
    END IF;

    -- [282/287] Batch: 211, Pallet: 5, Loc: 3-L-21-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-21-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '211', '5', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-21-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-21-A)', NOW()
            );
        END IF;
    END IF;

    -- [283/287] Batch: 214, Pallet: 60, Loc: 1-R-32-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '1-R-32-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '214', '60', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '1-R-32-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (1-R-32-A)', NOW()
            );
        END IF;
    END IF;

    -- [284/287] Batch: 215, Pallet: 8, Loc: 3-L-21-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-21-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '215', '8', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-21-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-21-C)', NOW()
            );
        END IF;
    END IF;

    -- [285/287] Batch: 211, Pallet: 9, Loc: 3-L-22-A
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-22-A';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '211', '9', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-22-A' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-22-A)', NOW()
            );
        END IF;
    END IF;

    -- [286/287] Batch: 210, Pallet: 3, Loc: 3-L-22-B
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-22-B';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '210', '3', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-22-B' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-22-B)', NOW()
            );
        END IF;
    END IF;

    -- [287/287] Batch: 215, Pallet: 12, Loc: 3-L-22-C
    SELECT id INTO v_loc_id FROM public.locations WHERE code = '3-L-22-C';
    IF v_loc_id IS NOT NULL THEN
        INSERT INTO public.pallets (
            tenant_id, client_id, batch_no, pallet_no, location_id, status, operator_name, notes, created_at, updated_at
        )
        VALUES (
            v_tenant_id, v_client_id, '215', '12', v_loc_id, 'STORED', '시스템 초기적재', 'Google Sheet 초기 데이터 이관', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, client_id, UPPER(TRIM(batch_no)), UPPER(TRIM(pallet_no))) WHERE status = 'STORED'
        DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            notes = EXCLUDED.notes || ' (중복 로케이션 갱신: ' || '3-L-22-C' || ')',
            updated_at = NOW()
        RETURNING id INTO v_pallet_id;

        IF v_pallet_id IS NOT NULL THEN
            INSERT INTO public.pallet_histories (
                pallet_id, action_type, from_location_id, to_location_id, operator_name, notes, created_at
            )
            VALUES (
                v_pallet_id, 'REGISTER', NULL, v_loc_id, '시스템 초기적재', 'CSV 초기 데이터 적재 (3-L-22-C)', NOW()
            );
        END IF;
    END IF;

    RAISE NOTICE 'CJ 초기 재고 287개 처리 완료.';
END $$;
