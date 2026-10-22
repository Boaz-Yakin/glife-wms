-- TRD-002: mobile-app worker auth (Phase 31.2)

-- 1) Force PIN change after an ADMIN issues a temporary PIN
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS must_change_pin BOOLEAN NOT NULL DEFAULT false;

-- 2) Login failure counter (service_role only: RLS on, no policies)
CREATE TABLE IF NOT EXISTS public.auth_login_attempts (
  phone         VARCHAR(20) PRIMARY KEY,
  failed_count  INT NOT NULL DEFAULT 0,
  locked_until  TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.auth_login_attempts ENABLE ROW LEVEL SECURITY;

-- 3) Atomic failure recording: 5 consecutive failures -> 15 minute lock.
--    Returns locked_until (NULL if not locked).
CREATE OR REPLACE FUNCTION public.record_login_failure(p_phone TEXT)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_locked TIMESTAMPTZ;
BEGIN
  INSERT INTO public.auth_login_attempts AS a (phone, failed_count, updated_at)
  VALUES (p_phone, 1, NOW())
  ON CONFLICT (phone) DO UPDATE
    SET failed_count = CASE
          -- an expired lock starts a fresh window
          WHEN a.locked_until IS NOT NULL AND a.locked_until <= NOW() THEN 1
          ELSE a.failed_count + 1
        END,
        locked_until = CASE
          WHEN a.locked_until IS NOT NULL AND a.locked_until <= NOW() THEN NULL
          ELSE a.locked_until
        END,
        updated_at = NOW();

  UPDATE public.auth_login_attempts
     SET locked_until = NOW() + INTERVAL '15 minutes'
   WHERE phone = p_phone AND failed_count >= 5 AND locked_until IS NULL
  RETURNING locked_until INTO v_locked;

  IF v_locked IS NULL THEN
    SELECT locked_until INTO v_locked
      FROM public.auth_login_attempts
     WHERE phone = p_phone AND locked_until > NOW();
  END IF;

  RETURN v_locked;
END;
$$;

REVOKE ALL ON FUNCTION public.record_login_failure(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_login_failure(TEXT) TO service_role;
