-- Migration: 20261023000000_integrated_inventory_lifecycle.sql
-- Multi-App Unified Inventory Lifecycle Engine
-- Coordinates: OrderAPP, G-manager, WMS Web-App, WMS Mobile-App

-- 1. Table for tracking allocated stock per order item to specific inventory location
CREATE TABLE IF NOT EXISTS public.order_item_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE RESTRICT,
    allocated_qty INT NOT NULL CHECK (allocated_qty > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_order_item_inventory UNIQUE (order_item_id, inventory_id)
);

CREATE INDEX IF NOT EXISTS idx_allocations_order_item ON public.order_item_allocations(order_item_id);
CREATE INDEX IF NOT EXISTS idx_allocations_inventory ON public.order_item_allocations(inventory_id);

-- Enable RLS
ALTER TABLE public.order_item_allocations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_item_allocations' AND policyname = 'Allow public read allocations') THEN
        CREATE POLICY "Allow public read allocations" ON public.order_item_allocations FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_item_allocations' AND policyname = 'Allow service write allocations') THEN
        CREATE POLICY "Allow service write allocations" ON public.order_item_allocations FOR ALL USING (true);
    END IF;
END $$;


-- 2. Function: Allocate stock for a single order item
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
        -- Find inventory locations with available stock
        FOR r_inv IN
            SELECT id, on_hand_qty, allocated_qty, (on_hand_qty - allocated_qty) AS avail
            FROM public.inventory
            WHERE item_id = v_item_id
              AND (on_hand_qty - allocated_qty) > 0
            ORDER BY (on_hand_qty - allocated_qty) DESC, created_at ASC
        LOOP
            v_alloc := LEAST(v_needed_qty, r_inv.avail);
            IF v_alloc > 0 THEN
                -- 1. Increase inventory.allocated_qty
                UPDATE public.inventory
                SET allocated_qty = allocated_qty + v_alloc,
                    updated_at = NOW()
                WHERE id = r_inv.id;

                -- 2. Upsert allocation record
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
                -- 1. Decrease inventory.allocated_qty
                UPDATE public.inventory
                SET allocated_qty = GREATEST(0, allocated_qty - v_reduce_step),
                    updated_at = NOW()
                WHERE id = r_alloc.inventory_id;

                -- 2. Update or delete allocation record
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


-- 3. Function: Allocate all items for a whole order
CREATE OR REPLACE FUNCTION public.allocate_order_stock(p_order_id UUID)
RETURNS INT AS $$
DECLARE
    r_item RECORD;
    v_total INT := 0;
    v_sub INT;
BEGIN
    FOR r_item IN SELECT id FROM public.order_items WHERE order_id = p_order_id
    LOOP
        v_sub := public.allocate_single_order_item(r_item.id);
        v_total := v_total + v_sub;
    END LOOP;
    RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Function: Deallocate/release all stock for an order (e.g. Canceled)
CREATE OR REPLACE FUNCTION public.deallocate_order_stock(p_order_id UUID)
RETURNS VOID AS $$
DECLARE
    r_alloc RECORD;
BEGIN
    FOR r_alloc IN
        SELECT oia.id, oia.inventory_id, oia.allocated_qty
        FROM public.order_item_allocations oia
        JOIN public.order_items oi ON oi.id = oia.order_item_id
        WHERE oi.order_id = p_order_id
    LOOP
        -- Revert inventory allocated_qty
        UPDATE public.inventory
        SET allocated_qty = GREATEST(0, allocated_qty - r_alloc.allocated_qty),
            updated_at = NOW()
        WHERE id = r_alloc.inventory_id;
    END LOOP;

    -- Delete all allocation rows for this order
    DELETE FROM public.order_item_allocations
    WHERE order_item_id IN (SELECT id FROM public.order_items WHERE order_id = p_order_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. Function: Fulfill/Ship order stock (Deduct On-Hand and Release Allocation)
CREATE OR REPLACE FUNCTION public.fulfill_order_stock(p_order_id UUID, p_operator_id UUID DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
    v_order_no TEXT;
    r_alloc RECORD;
    r_unalloc RECORD;
    v_prev_qty INT;
    v_new_qty INT;
    v_loc_code TEXT;
    v_loc_id UUID;
BEGIN
    SELECT order_no INTO v_order_no FROM public.orders WHERE id = p_order_id;
    IF v_order_no IS NULL THEN
        v_order_no := p_order_id::TEXT;
    END IF;

    -- 1. Deduct allocated stock tracked in order_item_allocations
    FOR r_alloc IN
        SELECT oia.id, oia.inventory_id, oia.allocated_qty, i.on_hand_qty, i.location_id
        FROM public.order_item_allocations oia
        JOIN public.order_items oi ON oi.id = oia.order_item_id
        JOIN public.inventory i ON i.id = oia.inventory_id
        WHERE oi.order_id = p_order_id
    LOOP
        v_prev_qty := r_alloc.on_hand_qty;
        v_new_qty := GREATEST(0, v_prev_qty - r_alloc.allocated_qty);

        -- Update inventory (deduct both on_hand and allocated)
        UPDATE public.inventory
        SET on_hand_qty = v_new_qty,
            allocated_qty = GREATEST(0, allocated_qty - r_alloc.allocated_qty),
            updated_at = NOW()
        WHERE id = r_alloc.inventory_id;

        -- Log adjustment
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

    -- Clean up fulfilled allocations
    DELETE FROM public.order_item_allocations
    WHERE order_item_id IN (SELECT id FROM public.order_items WHERE order_id = p_order_id);

    -- 2. Fallback for unallocated items in legacy orders: directly deduct on-hand if found
    FOR r_unalloc IN
        SELECT oi.id, oi.item_id, oi.qty
        FROM public.order_items oi
        WHERE oi.order_id = p_order_id
          AND oi.id NOT IN (SELECT order_item_id FROM public.order_item_allocations)
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. Database Triggers for Automatic Sync
-- 6.1 Order Status Changes
CREATE OR REPLACE FUNCTION public.trg_order_status_sync()
RETURNS TRIGGER AS $$
BEGIN
    -- If status changed to SHIPPED
    IF NEW.status = 'SHIPPED' AND (OLD.status IS DISTINCT FROM 'SHIPPED') THEN
        PERFORM public.fulfill_order_stock(NEW.id);

    -- If status changed to CANCELED
    ELSIF NEW.status = 'CANCELED' AND (OLD.status IS DISTINCT FROM 'CANCELED') THEN
        PERFORM public.deallocate_order_stock(NEW.id);

    -- If un-canceled back to active
    ELSIF (OLD.status = 'CANCELED') AND (NEW.status IN ('PENDING', 'PICKING', 'ALLOCATED', 'PACKED', 'INVOICED')) THEN
        PERFORM public.allocate_order_stock(NEW.id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_orders_inventory_sync ON public.orders;
CREATE TRIGGER trg_orders_inventory_sync
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.trg_order_status_sync();


-- 6.2 Order Items Insert/Update/Delete Trigger
CREATE OR REPLACE FUNCTION public.trg_order_items_sync()
RETURNS TRIGGER AS $$
DECLARE
    r_order RECORD;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        SELECT status INTO r_order FROM public.orders WHERE id = NEW.order_id;
        IF r_order.status IN ('PENDING', 'PICKING', 'ALLOCATED', 'PACKED', 'INVOICED') THEN
            PERFORM public.allocate_single_order_item(NEW.id);
        END IF;
        RETURN NEW;

    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.qty IS DISTINCT FROM NEW.qty) OR (OLD.item_id IS DISTINCT FROM NEW.item_id) THEN
            SELECT status INTO r_order FROM public.orders WHERE id = NEW.order_id;
            IF r_order.status IN ('PENDING', 'PICKING', 'ALLOCATED', 'PACKED', 'INVOICED') THEN
                PERFORM public.allocate_single_order_item(NEW.id);
            END IF;
        END IF;
        RETURN NEW;

    ELSIF (TG_OP = 'DELETE') THEN
        -- Revert allocation for deleted item
        DECLARE
            r_alloc RECORD;
        BEGIN
            FOR r_alloc IN SELECT inventory_id, allocated_qty FROM public.order_item_allocations WHERE order_item_id = OLD.id
            LOOP
                UPDATE public.inventory
                SET allocated_qty = GREATEST(0, allocated_qty - r_alloc.allocated_qty),
                    updated_at = NOW()
                WHERE id = r_alloc.inventory_id;
            END LOOP;
            DELETE FROM public.order_item_allocations WHERE order_item_id = OLD.id;
        END;
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_order_items_inventory_sync ON public.order_items;
CREATE TRIGGER trg_order_items_inventory_sync
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.trg_order_items_sync();


-- 7. Batch sync function for existing pending orders
CREATE OR REPLACE FUNCTION public.sync_all_active_order_allocations()
RETURNS INT AS $$
DECLARE
    r_order RECORD;
    v_count INT := 0;
BEGIN
    FOR r_order IN
        SELECT id FROM public.orders
        WHERE status IN ('PENDING', 'PICKING', 'ALLOCATED', 'PACKED', 'INVOICED')
        ORDER BY created_at ASC
    LOOP
        PERFORM public.allocate_order_stock(r_order.id);
        v_count := v_count + 1;
    END LOOP;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
