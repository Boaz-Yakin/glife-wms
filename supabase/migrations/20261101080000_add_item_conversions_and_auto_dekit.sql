-- Migration: 20261101080000_add_item_conversions_and_auto_dekit.sql
-- Multi 5pk to Single De-kitting and Virtual Available Stock Engine

-- 1. Create item_conversions table
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

CREATE INDEX IF NOT EXISTS idx_item_conversions_parent ON public.item_conversions(parent_item_id);
CREATE INDEX IF NOT EXISTS idx_item_conversions_child ON public.item_conversions(child_item_id);

-- Enable RLS
ALTER TABLE public.item_conversions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'item_conversions' AND policyname = 'Allow read item_conversions') THEN
        CREATE POLICY "Allow read item_conversions" ON public.item_conversions FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'item_conversions' AND policyname = 'Allow service write item_conversions') THEN
        CREATE POLICY "Allow service write item_conversions" ON public.item_conversions FOR ALL USING (true);
    END IF;
END $$;


-- 2. Seed Buldak 8 Flavours Multi <-> Single Mapping
DO $$
DECLARE
    v_target_loc_id UUID;
    r_multi RECORD;
    v_single_id UUID;
    v_flavour TEXT;
BEGIN
    SELECT id INTO v_target_loc_id FROM public.locations WHERE code = 'LOC-S0105A01' LIMIT 1;

    FOR r_multi IN 
        SELECT id, sku, desc_en 
        FROM public.items 
        WHERE name_en ILIKE 'Buldak Ramyeon [Multi 5pk]'
    LOOP
        v_flavour := TRIM(r_multi.desc_en);

        SELECT id INTO v_single_id
        FROM public.items
        WHERE name_en ILIKE 'Buldak Ramyeon [Single]'
          AND (
            TRIM(desc_en) = v_flavour 
            OR (v_flavour = 'Habanero' AND desc_en ILIKE '%Habanero%')
          )
        LIMIT 1;

        IF v_single_id IS NOT NULL THEN
            INSERT INTO public.item_conversions (
                parent_item_id,
                child_item_id,
                conversion_ratio,
                target_location_id,
                auto_dekit_on_order,
                note
            ) VALUES (
                r_multi.id,
                v_single_id,
                5,
                v_target_loc_id,
                true,
                'Buldak Ramyeon ' || v_flavour || ' Multi 5pk to Single'
            )
            ON CONFLICT (parent_item_id, child_item_id) DO UPDATE 
            SET conversion_ratio = 5,
                target_location_id = v_target_loc_id,
                auto_dekit_on_order = true;
        END IF;
    END LOOP;
END $$;


-- 3. Function: Manual De-kitting (방법 1: 1클릭 번들 해체)
CREATE OR REPLACE FUNCTION public.dekit_multi_to_single(
    p_parent_item_id UUID,
    p_parent_qty INT,
    p_operator_id UUID DEFAULT NULL,
    p_from_location_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_conversion RECORD;
    v_effective_operator UUID;
    v_total_avail INT;
    v_needed_parent INT := p_parent_qty;
    v_to_deduct INT;
    r_inv RECORD;
    v_target_loc_id UUID;
    v_child_target_inv_id UUID;
    v_child_added_qty INT;
    v_prev_qty INT;
    v_parent_sku TEXT;
    v_child_sku TEXT;
    v_parent_name TEXT;
    v_client_id UUID;
BEGIN
    IF p_parent_qty <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Quantity must be greater than zero.');
    END IF;

    -- 1. Find conversion configuration
    SELECT * INTO v_conversion
    FROM public.item_conversions
    WHERE parent_item_id = p_parent_item_id
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'No conversion mapping found for this item.');
    END IF;

    SELECT sku, name_en, client_id INTO v_parent_sku, v_parent_name, v_client_id
    FROM public.items WHERE id = p_parent_item_id;

    SELECT sku INTO v_child_sku
    FROM public.items WHERE id = v_conversion.child_item_id;

    v_target_loc_id := v_conversion.target_location_id;
    IF v_target_loc_id IS NULL THEN
        SELECT id INTO v_target_loc_id FROM public.locations WHERE code = 'LOC-S0105A01' LIMIT 1;
    END IF;

    -- Operator fallback
    v_effective_operator := COALESCE(
        p_operator_id,
        (SELECT id FROM public.users WHERE role = 'ADMIN' AND status = 'ACTIVE' LIMIT 1),
        (SELECT id FROM public.users WHERE status = 'ACTIVE' LIMIT 1),
        (SELECT id FROM public.users LIMIT 1)
    );

    -- 2. Check total available parent stock
    IF p_from_location_id IS NOT NULL THEN
        SELECT COALESCE(SUM(on_hand_qty - allocated_qty), 0) INTO v_total_avail
        FROM public.inventory
        WHERE item_id = p_parent_item_id AND location_id = p_from_location_id;
    ELSE
        SELECT COALESCE(SUM(on_hand_qty - allocated_qty), 0) INTO v_total_avail
        FROM public.inventory
        WHERE item_id = p_parent_item_id;
    END IF;

    IF v_total_avail < p_parent_qty THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Insufficient available parent stock. Available: ' || v_total_avail || ', Requested: ' || p_parent_qty
        );
    END IF;

    -- 3. Deduct parent inventory
    FOR r_inv IN
        SELECT id, location_id, on_hand_qty, allocated_qty, (on_hand_qty - allocated_qty) AS avail
        FROM public.inventory
        WHERE item_id = p_parent_item_id
          AND (p_from_location_id IS NULL OR location_id = p_from_location_id)
          AND (on_hand_qty - allocated_qty) > 0
        ORDER BY (on_hand_qty - allocated_qty) DESC, created_at ASC
    LOOP
        v_to_deduct := LEAST(v_needed_parent, r_inv.avail);
        IF v_to_deduct > 0 THEN
            v_prev_qty := r_inv.on_hand_qty;

            UPDATE public.inventory
            SET on_hand_qty = on_hand_qty - v_to_deduct,
                updated_at = NOW()
            WHERE id = r_inv.id;

            INSERT INTO public.inventory_adjustments (
                inventory_id,
                adjusted_by,
                previous_qty,
                new_qty,
                reason
            ) VALUES (
                r_inv.id,
                v_effective_operator,
                v_prev_qty,
                v_prev_qty - v_to_deduct,
                'DE-KITTING: Converted ' || v_to_deduct || 'x ' || v_parent_sku || ' to ' || v_child_sku
            );

            v_needed_parent := v_needed_parent - v_to_deduct;
            EXIT WHEN v_needed_parent <= 0;
        END IF;
    END LOOP;

    -- 4. Add child inventory to target location (LOC-S0105A01)
    v_child_added_qty := p_parent_qty * v_conversion.conversion_ratio;

    SELECT id, on_hand_qty INTO r_inv
    FROM public.inventory
    WHERE item_id = v_conversion.child_item_id AND location_id = v_target_loc_id
    LIMIT 1;

    IF r_inv.id IS NOT NULL THEN
        v_prev_qty := r_inv.on_hand_qty;
        UPDATE public.inventory
        SET on_hand_qty = on_hand_qty + v_child_added_qty,
            updated_at = NOW()
        WHERE id = r_inv.id;
        v_child_target_inv_id := r_inv.id;
    ELSE
        v_prev_qty := 0;
        INSERT INTO public.inventory (
            item_id,
            location_id,
            client_id,
            on_hand_qty,
            allocated_qty
        ) VALUES (
            v_conversion.child_item_id,
            v_target_loc_id,
            v_client_id,
            v_child_added_qty,
            0
        )
        RETURNING id INTO v_child_target_inv_id;
    END IF;

    -- Log child addition
    INSERT INTO public.inventory_adjustments (
        inventory_id,
        adjusted_by,
        previous_qty,
        new_qty,
        reason
    ) VALUES (
        v_child_target_inv_id,
        v_effective_operator,
        v_prev_qty,
        v_prev_qty + v_child_added_qty,
        'DE-KITTING: Produced +' || v_child_added_qty || 'x ' || v_child_sku || ' from ' || v_parent_sku
    );

    RETURN jsonb_build_object(
        'success', true,
        'parent_sku', v_parent_sku,
        'child_sku', v_child_sku,
        'parent_deducted', p_parent_qty,
        'child_added', v_child_added_qty,
        'target_location', 'LOC-S0105A01'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Function: Allocate stock for a single order item with Auto De-kitting (방법 2)
CREATE OR REPLACE FUNCTION public.allocate_single_order_item(p_order_item_id UUID)
RETURNS INT AS $$
DECLARE
    v_order_id UUID;
    v_item_id UUID;
    v_order_status TEXT;
    v_target_qty INT;
    v_current_alloc_sum INT;
    v_needed_qty INT;
    v_allocated_total INT := 0;
    r_inv RECORD;
    v_alloc INT;
    r_alloc RECORD;
    v_to_reduce INT;
    v_reduce_step INT;

    -- Auto de-kit variables
    v_conv RECORD;
    v_multi_avail INT;
    v_packs_needed INT;
    v_packs_to_dekit INT;
    v_dekit_res JSONB;
BEGIN
    -- Get order item details & order status
    SELECT oi.order_id, oi.item_id, oi.qty, o.status
    INTO v_order_id, v_item_id, v_target_qty, v_order_status
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.id = p_order_item_id;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Only allocate for active orders (not SHIPPED or CANCELED)
    IF v_order_status IN ('SHIPPED', 'CANCELED', 'DELIVERED') THEN
        RETURN 0;
    END IF;

    -- Calculate current allocated sum
    SELECT COALESCE(SUM(allocated_qty), 0)
    INTO v_current_alloc_sum
    FROM public.order_item_allocations
    WHERE order_item_id = p_order_item_id;

    v_needed_qty := v_target_qty - v_current_alloc_sum;

    -- CASE 1: Need more allocation
    IF v_needed_qty > 0 THEN
        -- 1.1 First try allocating from existing on-hand stock
        FOR r_inv IN
            SELECT id, on_hand_qty, allocated_qty, (on_hand_qty - allocated_qty) AS avail
            FROM public.inventory
            WHERE item_id = v_item_id
              AND (on_hand_qty - allocated_qty) > 0
            ORDER BY (on_hand_qty - allocated_qty) DESC, created_at ASC
        LOOP
            v_alloc := LEAST(v_needed_qty, r_inv.avail);
            IF v_alloc > 0 THEN
                UPDATE public.inventory
                SET allocated_qty = allocated_qty + v_alloc,
                    updated_at = NOW()
                WHERE id = r_inv.id;

                INSERT INTO public.order_item_allocations (order_item_id, inventory_id, allocated_qty)
                VALUES (p_order_item_id, r_inv.id, v_alloc)
                ON CONFLICT (order_item_id, inventory_id)
                DO UPDATE SET allocated_qty = public.order_item_allocations.allocated_qty + v_alloc,
                              updated_at = NOW();

                v_needed_qty := v_needed_qty - v_alloc;
                v_allocated_total := v_allocated_total + v_alloc;
                EXIT WHEN v_needed_qty <= 0;
            END IF;
        END LOOP;

        -- 1.2 AUTO DE-KIT: If still deficit and this item is a bundle child (Single)
        IF v_needed_qty > 0 THEN
            SELECT * INTO v_conv
            FROM public.item_conversions
            WHERE child_item_id = v_item_id
              AND auto_dekit_on_order = TRUE
            LIMIT 1;

            IF FOUND THEN
                -- Calculate how many Multi packs needed
                v_packs_needed := CEIL(v_needed_qty::NUMERIC / v_conv.conversion_ratio::NUMERIC);

                -- Check available parent Multi stock
                SELECT COALESCE(SUM(on_hand_qty - allocated_qty), 0) INTO v_multi_avail
                FROM public.inventory
                WHERE item_id = v_conv.parent_item_id;

                v_packs_to_dekit := LEAST(v_packs_needed, v_multi_avail);

                IF v_packs_to_dekit > 0 THEN
                    -- Execute de-kitting into LOC-S0105A01
                    v_dekit_res := public.dekit_multi_to_single(
                        v_conv.parent_item_id,
                        v_packs_to_dekit,
                        NULL,
                        NULL
                    );

                    -- Now allocate from the newly created child inventory
                    FOR r_inv IN
                        SELECT id, on_hand_qty, allocated_qty, (on_hand_qty - allocated_qty) AS avail
                        FROM public.inventory
                        WHERE item_id = v_item_id
                          AND (on_hand_qty - allocated_qty) > 0
                        ORDER BY (on_hand_qty - allocated_qty) DESC, created_at ASC
                    LOOP
                        v_alloc := LEAST(v_needed_qty, r_inv.avail);
                        IF v_alloc > 0 THEN
                            UPDATE public.inventory
                            SET allocated_qty = allocated_qty + v_alloc,
                                updated_at = NOW()
                            WHERE id = r_inv.id;

                            INSERT INTO public.order_item_allocations (order_item_id, inventory_id, allocated_qty)
                            VALUES (p_order_item_id, r_inv.id, v_alloc)
                            ON CONFLICT (order_item_id, inventory_id)
                            DO UPDATE SET allocated_qty = public.order_item_allocations.allocated_qty + v_alloc,
                                          updated_at = NOW();

                            v_needed_qty := v_needed_qty - v_alloc;
                            v_allocated_total := v_allocated_total + v_alloc;
                            EXIT WHEN v_needed_qty <= 0;
                        END IF;
                    END LOOP;
                END IF;
            END IF;
        END IF;

    -- CASE 2: Reduced order item quantity, need to release excess allocation
    ELSIF v_needed_qty < 0 THEN
        v_to_reduce := -v_needed_qty;
        FOR r_alloc IN
            SELECT id, inventory_id, allocated_qty
            FROM public.order_item_allocations
            WHERE order_item_id = p_order_item_id
            ORDER BY created_at DESC
        LOOP
            v_reduce_step := LEAST(v_to_reduce, r_alloc.allocated_qty);
            IF v_reduce_step > 0 THEN
                UPDATE public.inventory
                SET allocated_qty = GREATEST(0, allocated_qty - v_reduce_step),
                    updated_at = NOW()
                WHERE id = r_alloc.inventory_id;

                IF r_alloc.allocated_qty = v_reduce_step THEN
                    DELETE FROM public.order_item_allocations WHERE id = r_alloc.id;
                ELSE
                    UPDATE public.order_item_allocations
                    SET allocated_qty = allocated_qty - v_reduce_step,
                        updated_at = NOW()
                    WHERE id = r_alloc.id;
                END IF;

                v_to_reduce := v_to_reduce - v_reduce_step;
                EXIT WHEN v_to_reduce <= 0;
            END IF;
        END LOOP;
    END IF;

    RETURN v_allocated_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. Function: Virtual Available Stock calculation (Single + Multi * ratio)
CREATE OR REPLACE FUNCTION public.get_item_virtual_available_stock(p_item_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_single_on_hand INT := 0;
    v_single_allocated INT := 0;
    v_single_avail INT := 0;
    v_multi_on_hand INT := 0;
    v_multi_allocated INT := 0;
    v_multi_avail INT := 0;
    v_ratio INT := 0;
    v_parent_id UUID;
    v_parent_sku TEXT;
    v_total_avail INT := 0;
BEGIN
    SELECT 
        COALESCE(SUM(on_hand_qty), 0),
        COALESCE(SUM(allocated_qty), 0),
        COALESCE(SUM(on_hand_qty - allocated_qty), 0)
    INTO v_single_on_hand, v_single_allocated, v_single_avail
    FROM public.inventory
    WHERE item_id = p_item_id;

    SELECT parent_item_id, conversion_ratio INTO v_parent_id, v_ratio
    FROM public.item_conversions
    WHERE child_item_id = p_item_id
    LIMIT 1;

    IF v_parent_id IS NOT NULL THEN
        SELECT sku INTO v_parent_sku FROM public.items WHERE id = v_parent_id;

        SELECT 
            COALESCE(SUM(on_hand_qty), 0),
            COALESCE(SUM(allocated_qty), 0),
            COALESCE(SUM(on_hand_qty - allocated_qty), 0)
        INTO v_multi_on_hand, v_multi_allocated, v_multi_avail
        FROM public.inventory
        WHERE item_id = v_parent_id;

        -- Formula: Single 재고 + Multi 재고 * ratio
        v_total_avail := v_single_avail + (v_multi_avail * v_ratio);

        RETURN jsonb_build_object(
            'item_id', p_item_id,
            'is_bundle_child', true,
            'parent_sku', v_parent_sku,
            'conversion_ratio', v_ratio,
            'single_on_hand', v_single_on_hand,
            'single_allocated', v_single_allocated,
            'single_available', v_single_avail,
            'multi_available', v_multi_avail,
            'multi_equivalent_units', v_multi_avail * v_ratio,
            'total_available', v_total_avail
        );
    ELSE
        RETURN jsonb_build_object(
            'item_id', p_item_id,
            'is_bundle_child', false,
            'single_on_hand', v_single_on_hand,
            'single_allocated', v_single_allocated,
            'single_available', v_single_avail,
            'total_available', v_single_avail
        );
    END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_conversions TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.dekit_multi_to_single TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.allocate_single_order_item TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_item_virtual_available_stock TO authenticated, service_role;
