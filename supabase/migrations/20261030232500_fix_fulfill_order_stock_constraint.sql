-- Migration: 20261030232500_fix_fulfill_order_stock_constraint.sql
-- Fix inventory_check constraint violation (on_hand_qty >= allocated_qty) in fulfill_order_stock
-- Deletes order_item_allocations FIRST (which decrements allocated_qty via trigger) BEFORE decrementing on_hand_qty

CREATE OR REPLACE FUNCTION public.fulfill_order_stock(p_order_id UUID, p_operator_id UUID DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
    v_order_no TEXT;
    v_effective_operator UUID;
    r_alloc RECORD;
    r_unalloc RECORD;
    v_prev_qty INT;
    v_new_qty INT;
    v_fulfilled_any BOOLEAN := FALSE;
BEGIN
    SELECT order_no, user_id INTO v_order_no, v_effective_operator
    FROM public.orders
    WHERE id = p_order_id;

    IF v_order_no IS NULL THEN
        v_order_no := p_order_id::TEXT;
    END IF;

    -- Determine effective operator for adjustment logging (adjusted_by is NOT NULL)
    v_effective_operator := COALESCE(
        p_operator_id,
        v_effective_operator,
        (SELECT id FROM public.users WHERE role = 'ADMIN' AND status = 'ACTIVE' LIMIT 1),
        (SELECT id FROM public.users WHERE status = 'ACTIVE' LIMIT 1),
        (SELECT id FROM public.users LIMIT 1)
    );

    -- 1. Process tracked allocations
    FOR r_alloc IN
        SELECT oia.id, oia.inventory_id, oia.allocated_qty, i.on_hand_qty
        FROM public.order_item_allocations oia
        JOIN public.order_items oi ON oi.id = oia.order_item_id
        JOIN public.inventory i ON i.id = oia.inventory_id
        WHERE oi.order_id = p_order_id
    LOOP
        v_fulfilled_any := TRUE;
        v_prev_qty := r_alloc.on_hand_qty;
        v_new_qty := GREATEST(0, v_prev_qty - r_alloc.allocated_qty);

        -- 1.1 Delete the allocation first.
        -- trg_allocations_cleanup (BEFORE DELETE) automatically decrements inventory.allocated_qty!
        -- This guarantees allocated_qty drops before on_hand_qty drops, satisfying CHECK (on_hand_qty >= allocated_qty).
        DELETE FROM public.order_item_allocations WHERE id = r_alloc.id;

        -- 1.2 Now safely deduct on-hand stock
        UPDATE public.inventory
        SET on_hand_qty = v_new_qty,
            updated_at = NOW()
        WHERE id = r_alloc.inventory_id;

        -- 1.3 Log outbound adjustment
        INSERT INTO public.inventory_adjustments (
            inventory_id,
            adjusted_by,
            previous_qty,
            new_qty,
            reason
        ) VALUES (
            r_alloc.inventory_id,
            v_effective_operator,
            v_prev_qty,
            v_new_qty,
            'OUTBOUND_SHIPPED: Order ' || v_order_no || ' (' || r_alloc.allocated_qty || ' deducted)'
        );
    END LOOP;

    -- 2. Safety cleanup of any remaining allocations for this order
    DELETE FROM public.order_item_allocations
    WHERE order_item_id IN (SELECT id FROM public.order_items WHERE order_id = p_order_id);

    -- 3. Fallback for legacy unallocated items
    IF NOT v_fulfilled_any THEN
        FOR r_unalloc IN
            SELECT oi.id, oi.item_id, oi.qty
            FROM public.order_items oi
            WHERE oi.order_id = p_order_id
        LOOP
            SELECT id, on_hand_qty, allocated_qty INTO r_alloc
            FROM public.inventory
            WHERE item_id = r_unalloc.item_id AND (on_hand_qty - allocated_qty) > 0
            ORDER BY (on_hand_qty - allocated_qty) DESC
            LIMIT 1;

            IF r_alloc.id IS NOT NULL THEN
                v_prev_qty := r_alloc.on_hand_qty;
                v_new_qty := GREATEST(r_alloc.allocated_qty, v_prev_qty - r_unalloc.qty);

                UPDATE public.inventory
                SET on_hand_qty = v_new_qty,
                    updated_at = NOW()
                WHERE id = r_alloc.id;

                INSERT INTO public.inventory_adjustments (
                    inventory_id,
                    adjusted_by,
                    previous_qty,
                    new_qty,
                    reason
                ) VALUES (
                    r_alloc.id,
                    v_effective_operator,
                    v_prev_qty,
                    v_new_qty,
                    'OUTBOUND_SHIPPED_DIRECT: Order ' || v_order_no || ' (' || r_unalloc.qty || ' deducted)'
                );
            END IF;
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
