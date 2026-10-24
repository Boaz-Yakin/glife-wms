-- Migration: 20261024134000_cascade_user_deletion.sql
-- Description: Allow safe user deletion by setting foreign keys to ON DELETE SET NULL

-- 1. orders.user_id -> ON DELETE SET NULL
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_user_id_fkey,
  ADD CONSTRAINT orders_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- 2. inventory_adjustments.adjusted_by -> Drop NOT NULL and ON DELETE SET NULL
ALTER TABLE public.inventory_adjustments
  ALTER COLUMN adjusted_by DROP NOT NULL;

ALTER TABLE public.inventory_adjustments
  DROP CONSTRAINT IF EXISTS inventory_adjustments_adjusted_by_fkey,
  ADD CONSTRAINT inventory_adjustments_adjusted_by_fkey
    FOREIGN KEY (adjusted_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- 3. cycle_count_requests -> Drop NOT NULL on requested_by and ON DELETE SET NULL on all user FKs
ALTER TABLE public.cycle_count_requests
  ALTER COLUMN requested_by DROP NOT NULL;

ALTER TABLE public.cycle_count_requests
  DROP CONSTRAINT IF EXISTS cycle_count_requests_requested_by_fkey,
  DROP CONSTRAINT IF EXISTS cycle_count_requests_reported_by_fkey,
  DROP CONSTRAINT IF EXISTS cycle_count_requests_completed_by_fkey;

ALTER TABLE public.cycle_count_requests
  ADD CONSTRAINT cycle_count_requests_requested_by_fkey
    FOREIGN KEY (requested_by) REFERENCES public.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT cycle_count_requests_reported_by_fkey
    FOREIGN KEY (reported_by) REFERENCES public.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT cycle_count_requests_completed_by_fkey
    FOREIGN KEY (completed_by) REFERENCES public.users(id) ON DELETE SET NULL;
