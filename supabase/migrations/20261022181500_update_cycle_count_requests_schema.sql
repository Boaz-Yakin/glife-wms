-- Align cycle_count_requests with mobile-app TRD-001 specification
ALTER TABLE public.cycle_count_requests
  ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES public.items(id),
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS reported_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- requested_by can be nullable if reported_by is used
ALTER TABLE public.cycle_count_requests
  ALTER COLUMN requested_by DROP NOT NULL;
