-- Enable RLS and add read/write policies for clients and stores

-- 1. Clients RLS policies
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read clients" ON public.clients;
CREATE POLICY "Allow authenticated read clients" 
ON public.clients FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow anon read clients" ON public.clients;
CREATE POLICY "Allow anon read clients" 
ON public.clients FOR SELECT 
TO anon 
USING (true);

-- 2. Stores RLS policies
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read stores" ON public.stores;
CREATE POLICY "Allow authenticated read stores" 
ON public.stores FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow authenticated modify stores" ON public.stores;
CREATE POLICY "Allow authenticated modify stores" 
ON public.stores FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
