-- Migration: Add client_id, is_active, and contact/note fields to stores table

-- 1. Ensure client_id column exists
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'stores' AND column_name = 'client_id'
    ) THEN 
        ALTER TABLE public.stores ADD COLUMN client_id UUID; 
    END IF; 
END $$;

-- 2. Add Foreign Key to clients if not already added
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stores_client_id_fkey'
    ) THEN 
        ALTER TABLE public.stores ADD CONSTRAINT stores_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE; 
    END IF; 
END $$;

-- 3. Add is_active, phone, contact_person, and note columns
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS contact_person VARCHAR(100);
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS note TEXT;

-- 4. Update existing records with default client (Food Depot)
UPDATE public.stores 
SET client_id = (SELECT id FROM public.clients WHERE code = 'CLIENT-FOOD' LIMIT 1)
WHERE client_id IS NULL;

-- 5. Enforce NOT NULL on client_id
ALTER TABLE public.stores ALTER COLUMN client_id SET NOT NULL;

-- 6. Replace global store_no unique constraint with composite unique (client_id, store_no)
ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_store_no_key;
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stores_client_id_store_no_key'
    ) THEN 
        ALTER TABLE public.stores ADD CONSTRAINT stores_client_id_store_no_key UNIQUE (client_id, store_no); 
    END IF; 
END $$;
