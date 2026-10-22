import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/** TRD-002 Q2: personal phones keep the session for 30 days. */
export const SESSION_COOKIE_OPTIONS: CookieOptions = {
  maxAge: 60 * 60 * 24 * 30,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

/**
 * Cookie-bound Supabase client for Route Handlers / Server Components.
 * Queries run as the logged-in worker (auth.uid() is set, RLS applies).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: SESSION_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component; proxy.ts refreshes the session.
          }
        },
      },
    }
  );
}
