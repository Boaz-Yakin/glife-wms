-- Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert dummy clients
INSERT INTO public.clients (name, code) VALUES 
('Cosmetics Co', 'CLIENT-COSMETICS'),
('Food Depot', 'CLIENT-FOOD')
ON CONFLICT (code) DO NOTHING;

-- Add client_id to items
ALTER TABLE public.items ADD COLUMN client_id UUID REFERENCES public.clients(id);

-- Assign existing items to 'Food Depot' by default
UPDATE public.items 
SET client_id = (SELECT id FROM public.clients WHERE code = 'CLIENT-FOOD')
WHERE client_id IS NULL;

-- Make client_id NOT NULL for items
ALTER TABLE public.items ALTER COLUMN client_id SET NOT NULL;

-- Add client_id to orders
ALTER TABLE public.orders ADD COLUMN client_id UUID REFERENCES public.clients(id);

-- Assign existing orders to 'Food Depot'
UPDATE public.orders 
SET client_id = (SELECT id FROM public.clients WHERE code = 'CLIENT-FOOD')
WHERE client_id IS NULL;

-- Add client_id to inventory for convenience
ALTER TABLE public.inventory ADD COLUMN client_id UUID REFERENCES public.clients(id);

-- Assign existing inventory to 'Food Depot'
UPDATE public.inventory 
SET client_id = (SELECT id FROM public.clients WHERE code = 'CLIENT-FOOD')
WHERE client_id IS NULL;

