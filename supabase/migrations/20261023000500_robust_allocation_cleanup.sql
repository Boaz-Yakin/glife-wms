-- Migration: 20261023000500_robust_allocation_cleanup.sql
-- Ensure atomic cleanup of inventory.allocated_qty upon allocation deletion

-- 1. Trigger function on order_item_allocations BEFORE DELETE
CREATE OR REPLACE FUNCTION public.trg_order_item_allocations_before_delete()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.inventory
    SET allocated_qty = GREATEST(0, allocated_qty - OLD.allocated_qty),
        updated_at = NOW()
    WHERE id = OLD.inventory_id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_allocations_cleanup ON public.order_item_allocations;
CREATE TRIGGER trg_allocations_cleanup
BEFORE DELETE ON public.order_item_allocations
FOR EACH ROW
EXECUTE FUNCTION public.trg_order_item_allocations_before_delete();

-- 2. Clean up trg_order_items_sync for DELETE (since CASCADE to allocations will now auto-decrement via the trigger above)
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
        -- When order_items is deleted, CASCADE deletes order_item_allocations,
        -- which in turn fires trg_allocations_cleanup to deduct inventory.allocated_qty!
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
