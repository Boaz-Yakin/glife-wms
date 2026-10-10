-- 1. Drop Korean columns from items table
ALTER TABLE public.items DROP COLUMN IF EXISTS name_kr;
ALTER TABLE public.items DROP COLUMN IF EXISTS desc_kr;

-- 2. Fix RLS recursion on users and orders permanently using SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role::text FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$;

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
CREATE POLICY "Admins can view all profiles" ON public.users FOR SELECT USING (
  public.is_admin()
);

DROP POLICY IF EXISTS "Stores can view own orders" ON public.orders;
CREATE POLICY "Stores can view own orders" ON public.orders FOR SELECT USING (
  user_id = auth.uid() OR public.get_my_role() IN ('ADMIN', 'PICKER', 'INSPECTOR')
);

DROP POLICY IF EXISTS "Stores can view own order items" ON public.order_items;
CREATE POLICY "Stores can view own order items" ON public.order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND (orders.user_id = auth.uid() OR public.get_my_role() IN ('ADMIN', 'PICKER', 'INSPECTOR'))
  )
);
