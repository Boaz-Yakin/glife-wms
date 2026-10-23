-- Migration: 20261023001000_refine_fulfillment_logic.sql
-- Refine fulfillment and deallocation to leverage BEFORE DELETE trigger cleanly

CREATE OR REPLACE FUNCTION public.deallocate_order_stock(p_order_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Deleting allocations automatically decrements inventory.allocated_qty via trg_allocations_cleanup trigger
    DELETE FROM public.order_item_allocations
    WHERE order_item_id IN (SELECT id FROM public.order_items WHERE order_id = p_order_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.fulfill_order_stock(p_order_id UUID, p_operator_id UUID DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
    v_order_no TEXT;
    r_alloc RECORD;
    r_unalloc RECORD;
    v_prev_qty INT;
    v_new_qty INT;
    v_fulfilled_any BOOLEAN := FALSE;
BEGIN
    SELECT order_no INTO v_order_no FROM public.orders WHERE id = p_order_id;
    IF v_order_no IS NULL THEN
        v_order_no := p_order_id::TEXT;
    END IF;

    -- 1. Deduct on-hand stock for items that have tracked allocations
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

        -- Deduct on-hand stock (allocated_qty will be decremented by the DELETE trigger below)
        UPDATE public.inventory
        SET on_hand_qty = v_new_qty,
            updated_at = NOW()
        WHERE id = r_alloc.inventory_id;

        -- Log outbound adjustment
        INSERT INTO public.inventory_adjustments (
            inventory_id,
            adjusted_by,
            previous_qty,
            new_qty,
            reason
        ) VALUES (
            r_alloc.inventory_id,
            p_operator_id,
            v_prev_qty,
            v_new_qty,
            'OUTBOUND_SHIPPED: Order ' || v_order_no || ' (' || r_alloc.allocated_qty || ' deducted)'
        );
    END LOOP;

    -- 2. Clean up allocations (this automatically decrements inventory.allocated_qty via trigger!)
    DELETE FROM public.order_item_allocations
    WHERE order_item_id IN (SELECT id FROM public.order_items WHERE order_id = p_order_id);

    -- 3. Fallback for legacy unallocated items
    IF NOT v_fulfilled_any THEN
        FOR r_unalloc IN
            SELECT oi.id, oi.item_id, oi.qty
            FROM public.order_items oi
            WHERE oi.order_id = p_order_id
        LOOP
            SELECT id, on_hand_qty INTO r_alloc
            FROM public.inventory
            WHERE item_id = r_unalloc.item_id AND on_hand_qty > 0
            ORDER BY on_hand_qty DESC
            LIMIT 1;

            IF r_alloc.id IS NOT NULL THEN
                v_prev_qty := r_alloc.on_hand_qty;
                v_new_qty := GREATEST(0, v_prev_qty - r_unalloc.qty);

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
                    p_operator_id,
                    v_prev_qty,
                    v_new_qty,
                    'OUTBOUND_SHIPPED_DIRECT: Order ' || v_order_no || ' (' || r_unalloc.qty || ' deducted)'
                );
            END IF;
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
