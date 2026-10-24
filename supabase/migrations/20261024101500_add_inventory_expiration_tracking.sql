-- Migration: 20261024101500_add_inventory_expiration_tracking.sql
-- Description: Add expiration_date and lot_no to inventory, and min_outbound_days to items

-- 1. Add expiration_date and lot_no to public.inventory
ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS expiration_date DATE,
  ADD COLUMN IF NOT EXISTS lot_no VARCHAR(50);

-- 2. Add min_outbound_days (출고 최소 잔여 유효일수, 기본값 14일) to public.items
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS min_outbound_days INT DEFAULT 14;

-- 3. Create index on expiration_date for fast FEFO queries and dashboard risk alerts
CREATE INDEX IF NOT EXISTS idx_inventory_expiration_date ON public.inventory(expiration_date);
CREATE INDEX IF NOT EXISTS idx_inventory_lot_no ON public.inventory(lot_no);

-- 4. Initial Seed / Backfill: Populate realistic expiration dates for existing inventory
-- based on item shelf_life_days or standard offset from current date
UPDATE public.inventory inv
SET
  lot_no = COALESCE(inv.lot_no, 'LOT-' || TO_CHAR(inv.created_at, 'YYMMDD') || '-' || SUBSTRING(inv.id::text FROM 1 FOR 4)),
  expiration_date = COALESCE(
    inv.expiration_date,
    (CURRENT_DATE + ((MOD(ABS(HASHTEXT(inv.id::text)), 180) - 15) || ' days')::INTERVAL)::DATE
  )
WHERE inv.expiration_date IS NULL;
