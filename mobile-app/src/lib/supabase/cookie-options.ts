import type { CookieOptions } from '@supabase/ssr';

/** TRD-002 Q2: personal phones keep the session for 30 days. */
export const SESSION_COOKIE_OPTIONS: CookieOptions = {
  maxAge: 60 * 60 * 24 * 30,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};
