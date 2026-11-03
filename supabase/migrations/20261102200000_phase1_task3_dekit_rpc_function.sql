-- ==============================================================================
-- Phase 1 - Task 3.2: Universal De-kitting PostgreSQL RPC Function
-- Description: 임의의 부모 번들/박스 품목을 자식 낱개 품목으로 실시간 해체하는 원자적 RPC 함수
-- Function: public.dekit_bundle_item(...)
-- Migration Date: 2026-11-02
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.dekit_bundle_item(
    p_tenant_id UUID,
    p_parent_item_id UUID,
    p_parent_qty INT,
    p_operator_id UUID DEFAULT NULL,
    p_from_location_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_conversion RECORD;
    v_target_loc_id UUID;
    v_ratio INT;
    v_child_id UUID;
    v_child_added INT;
    v_parent_remaining INT := p_parent_qty;
    v_inv RECORD;
    v_child_inv RECORD;
    v_deduct_qty INT;
    v_operator UUID;
    v_new_child_inv_id UUID;
BEGIN
    IF p_parent_qty <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', '해체할 수량은 1 이상이어야 합니다.');
    END IF;

    -- 1. 테넌트 격리 하에서 변환 설정 조회
    SELECT * INTO v_conversion
    FROM public.item_conversions
    WHERE tenant_id = p_tenant_id AND parent_item_id = p_parent_item_id
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', '해당 품목의 번들 해체(변환) 규칙이 등록되어 있지 않습니다.');
    END IF;

    v_ratio := v_conversion.conversion_ratio;
    v_child_id := v_conversion.child_item_id;
    v_target_loc_id := COALESCE(v_conversion.target_location_id, p_from_location_id);
    v_child_added := p_parent_qty * v_ratio;

    IF v_target_loc_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', '해체 입고 대상 로케이션(Target Bin)이 지정되지 않았습니다.');
    END IF;

    -- 작업자 ID 보정 (전달되지 않은 경우 해당 테넌트 관리자 또는 시스템 계정)
    v_operator := p_operator_id;
    IF v_operator IS NULL THEN
        SELECT id INTO v_operator FROM public.users WHERE tenant_id = p_tenant_id LIMIT 1;
        IF v_operator IS NULL THEN
            SELECT id INTO v_operator FROM public.users LIMIT 1;
        END IF;
    END IF;

    -- 2. 부모 품목 재고 차감 (지정 로케이션 우선 or FIFO 기준)
    FOR v_inv IN 
        SELECT id, location_id, on_hand_qty 
        FROM public.inventory 
        WHERE tenant_id = p_tenant_id 
          AND item_id = p_parent_item_id 
          AND on_hand_qty > 0
          AND (p_from_location_id IS NULL OR location_id = p_from_location_id)
        ORDER BY created_at ASC
        FOR UPDATE
    LOOP
        EXIT WHEN v_parent_remaining <= 0;

        v_deduct_qty := LEAST(v_inv.on_hand_qty, v_parent_remaining);

        -- 재고 차감
        UPDATE public.inventory 
        SET on_hand_qty = on_hand_qty - v_deduct_qty,
            updated_at = NOW()
        WHERE id = v_inv.id;

        -- 부모 재고 조정 로그 기록
        IF v_operator IS NOT NULL THEN
            INSERT INTO public.inventory_adjustments (
                tenant_id, inventory_id, adjusted_by, previous_qty, new_qty, reason, created_at
            ) VALUES (
                p_tenant_id, v_inv.id, v_operator, v_inv.on_hand_qty, v_inv.on_hand_qty - v_deduct_qty,
                format('De-kit Bundle: -%s converted to Single', v_deduct_qty), NOW()
            );
        END IF;

        v_parent_remaining := v_parent_remaining - v_deduct_qty;
    END LOOP;

    IF v_parent_remaining > 0 THEN
        RETURN jsonb_build_object('success', false, 'error', format('부모 품목 재고가 부족합니다 (부족 수량: %s개).', v_parent_remaining));
    END IF;

    -- 3. 자식 낱개 품목 재고 증액 (v_target_loc_id)
    SELECT id, on_hand_qty INTO v_child_inv
    FROM public.inventory
    WHERE tenant_id = p_tenant_id AND item_id = v_child_id AND location_id = v_target_loc_id
    FOR UPDATE;

    IF FOUND THEN
        UPDATE public.inventory
        SET on_hand_qty = on_hand_qty + v_child_added,
            updated_at = NOW()
        WHERE id = v_child_inv.id;

        IF v_operator IS NOT NULL THEN
            INSERT INTO public.inventory_adjustments (
                tenant_id, inventory_id, adjusted_by, previous_qty, new_qty, reason, created_at
            ) VALUES (
                p_tenant_id, v_child_inv.id, v_operator, v_child_inv.on_hand_qty, v_child_inv.on_hand_qty + v_child_added,
                format('De-kit Bundle: +%s Single added from conversion', v_child_added), NOW()
            );
        END IF;
    ELSE
        INSERT INTO public.inventory (
            tenant_id, item_id, location_id, on_hand_qty, allocated_qty, created_at, updated_at
        ) VALUES (
            p_tenant_id, v_child_id, v_target_loc_id, v_child_added, 0, NOW(), NOW()
        ) RETURNING id INTO v_new_child_inv_id;

        IF v_operator IS NOT NULL THEN
            INSERT INTO public.inventory_adjustments (
                tenant_id, inventory_id, adjusted_by, previous_qty, new_qty, reason, created_at
            ) VALUES (
                p_tenant_id, v_new_child_inv_id, v_operator, 0, v_child_added,
                format('De-kit Bundle: +%s Single added from conversion', v_child_added), NOW()
            );
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'parent_deducted', p_parent_qty,
        'child_added', v_child_added,
        'target_location_id', v_target_loc_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PostgREST 스키마 캐시 새로고침
NOTIFY pgrst, 'reload schema';

