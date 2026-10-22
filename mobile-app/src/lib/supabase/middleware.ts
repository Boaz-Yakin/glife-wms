import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_OPTIONS } from './server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: SESSION_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;

  // Do not require auth for static assets or api auth callbacks
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return supabaseResponse;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();

  // 1. Not logged in
  if (!user) {
    if (!pathname.startsWith('/login')) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // 2. Fetch user's profile to verify active status & role
  const { data: profile } = await supabase
    .from('users')
    .select('role, status, must_change_pin')
    .eq('id', user.id)
    .maybeSingle();

  // If user account is inactive or profile doesn't exist, sign out / redirect to login
  if (!profile || profile.status !== 'ACTIVE') {
    if (!pathname.startsWith('/login')) {
      url.pathname = '/login';
      url.searchParams.set('error', 'inactive');
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const role = profile.role;
  const mustChangePin = profile.must_change_pin === true;

  // 3. Forced PIN change guard
  if (mustChangePin) {
    if (pathname !== '/login/change-pin') {
      url.pathname = '/login/change-pin';
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // If on change-pin but doesn't need to change PIN
  if (pathname === '/login/change-pin' && !mustChangePin) {
    url.pathname = role === 'PICKER' ? '/picking' : (role === 'INSPECTOR' ? '/inventory' : '/mode');
    return NextResponse.redirect(url);
  }

  // 4. If logged in and visits /login or /
  if (pathname === '/login' || pathname === '/') {
    url.pathname = role === 'PICKER' ? '/picking' : (role === 'INSPECTOR' ? '/inventory' : '/mode');
    return NextResponse.redirect(url);
  }

  // 5. Role-based routing guards (TRD-002)
  if (role === 'PICKER') {
    // PICKER cannot access /inventory or /mode
    if (pathname.startsWith('/inventory') || pathname.startsWith('/mode')) {
      url.pathname = '/picking';
      return NextResponse.redirect(url);
    }
  } else if (role === 'INSPECTOR') {
    // INSPECTOR cannot access /picking or /mode
    if (pathname.startsWith('/picking') || pathname.startsWith('/mode')) {
      url.pathname = '/inventory';
      return NextResponse.redirect(url);
    }
  } else if (role === 'ADMIN' || role === 'SUPERVISOR') {
    // Managers can access everything (/mode, /picking, /inventory)
  }

  return supabaseResponse;
}
