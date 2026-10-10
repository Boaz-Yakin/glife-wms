-- Add B2B Multi-Client Fields to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS shipping_address TEXT,
ADD COLUMN IF NOT EXISTS billing_address TEXT,
ADD COLUMN IF NOT EXISTS requested_delivery_date DATE,
ADD COLUMN IF NOT EXISTS shipping_method VARCHAR(100),
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0;

-- Add B2B Multi-Client Fields to order_items
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS requested_uom VARCHAR(20),
ADD COLUMN IF NOT EXISTS discount_rate DECIMAL(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_taxable BOOLEAN DEFAULT TRUE;
