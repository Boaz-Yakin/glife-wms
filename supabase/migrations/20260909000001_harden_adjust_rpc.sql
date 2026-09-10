-- ==========================================
-- Migration: Strengthen adjust_inventory_stock RPC
-- Adds allocated_qty guard to prevent adjusting below allocated quantity
-- ==========================================

CREATE OR REPLACE FUNCTION public.adjust_inventory_stock(
    p_inventory_id UUID,
    p_new_qty INT,
    p_user_id UUID,
    p_reason TEXT
) RETURNS VOID AS $$
DECLARE
    v_previous_qty  INT;
    v_allocated_qty INT;
BEGIN
    -- Lock the row for atomic update (prevents concurrent race conditions)
    SELECT on_hand_qty, allocated_qty
    INTO v_previous_qty, v_allocated_qty
    FROM public.inventory
    WHERE id = p_inventory_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Inventory record not found: %', p_inventory_id
            USING ERRCODE = 'P0002';
    END IF;

    -- Guard 1: Cannot go negative
    IF p_new_qty < 0 THEN
        RAISE EXCEPTION 'Cannot set inventory below zero (requested: %)', p_new_qty
            USING ERRCODE = 'P0001';
    END IF;

    -- Guard 2: Cannot go below currently allocated (picked-in-flight) quantity
    IF p_new_qty < v_allocated_qty THEN
        RAISE EXCEPTION 'Cannot adjust below allocated quantity (allocated: %, requested: %)',
            v_allocated_qty, p_new_qty
            USING ERRCODE = 'P0001';
    END IF;

    -- Atomic update
    UPDATE public.inventory
    SET on_hand_qty = p_new_qty,
        updated_at  = NOW()
    WHERE id = p_inventory_id;

    -- Audit log
    INSERT INTO public.inventory_adjustments
        (inventory_id, adjusted_by, previous_qty, new_qty, reason)
    VALUES
        (p_inventory_id, p_user_id, v_previous_qty, p_new_qty, p_reason);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Atomicity verification: Self-test queries
-- Run these in Supabase SQL Editor to verify constraints work correctly.
-- ==========================================
-- 
-- TEST 1: Verify CHECK constraint on on_hand_qty >= 0 exists
-- SELECT conname, consrc FROM pg_constraint
-- WHERE conrelid = 'public.inventory'::regclass AND contype = 'c';
-- Expected: on_hand_qty >= 0 and allocated_qty >= 0 and on_hand_qty >= allocated_qty
--
-- TEST 2: Verify FOR UPDATE lock is applied (check pg_locks during concurrent call)
-- SELECT pid, relation::regclass, mode, granted
-- FROM pg_locks WHERE relation = 'public.inventory'::regclass;
--
-- TEST 3: Manual negative test (should raise P0001)
-- SELECT adjust_inventory_stock('<valid-inventory-uuid>', -1, '<valid-user-uuid>', 'TEST');
-- Expected: ERROR P0001 - Cannot set inventory below zero
--
-- TEST 4: Below-allocated test (should raise P0001)
-- First set allocated_qty > 0, then try to adjust on_hand_qty below it.
-- SELECT adjust_inventory_stock('<valid-inventory-uuid>', 0, '<valid-user-uuid>', 'TEST');
-- (if allocated_qty = 5, setting on_hand_qty to 0 should fail)
