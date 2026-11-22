-- Create warehouse_operators table for CJ-Inv & WMS operator management
CREATE TABLE IF NOT EXISTS public.warehouse_operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  pin_code VARCHAR(4) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'OPERATOR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.warehouse_operators ENABLE ROW LEVEL SECURITY;

-- Allow anon & authenticated to select operators
DROP POLICY IF EXISTS "Allow select operators" ON public.warehouse_operators;
CREATE POLICY "Allow select operators"
  ON public.warehouse_operators
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow anon & authenticated to insert operators
DROP POLICY IF EXISTS "Allow insert operators" ON public.warehouse_operators;
CREATE POLICY "Allow insert operators"
  ON public.warehouse_operators
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow update operators
DROP POLICY IF EXISTS "Allow update operators" ON public.warehouse_operators;
CREATE POLICY "Allow update operators"
  ON public.warehouse_operators
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default admin if not exists
INSERT INTO public.warehouse_operators (name, pin_code, role, is_active)
VALUES ('관리자', '0000', 'ADMIN', true)
ON CONFLICT (name) DO NOTHING;
