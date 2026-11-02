-- Add box_barcode column to items table
-- Allows scanning outer packaging (ITF-14 / GTIN-14) during Inbound, Put-away, and Box-level Picking

ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS box_barcode VARCHAR(50) DEFAULT NULL;

-- Create index for high-speed scanning lookup
CREATE INDEX IF NOT EXISTS idx_items_box_barcode 
ON public.items(box_barcode);

COMMENT ON COLUMN public.items.box_barcode IS 'Outer carton / box barcode (e.g. ITF-14, GTIN-14, Code 128) for case-level warehouse scanning';
