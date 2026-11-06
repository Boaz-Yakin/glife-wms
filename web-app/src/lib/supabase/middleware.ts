import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { resolveTenantFromHost } from '@/lib/tenant/resolver'

export async function updateSession(request: NextRequest) {
  // 테넌트 호스트네임 식별 및 컨텍스트 주입
  const host = request.headers.get('host') || 'localhost'
  const tenant = await resolveTenantFromHost(host)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-tenant-id', tenant.tenantId)
  requestHeaders.set('x-tenant-code', tenant.code)

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  supabaseResponse.headers.set('x-tenant-id', tenant.tenantId)
  supabaseResponse.headers.set('x-tenant-code', tenant.code)
  supabaseResponse.cookies.set('wms_tenant_code', tenant.code, { path: '/' })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not require auth for static assets or api auth callbacks
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api/auth') ||
    request.nextUrl.pathname.includes('.')
  ) {
    return supabaseResponse
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()

  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    const requiresPasswordChange = user.user_metadata?.requires_password_change === true

    if (requiresPasswordChange && request.nextUrl.pathname !== '/change-password') {
      url.pathname = '/change-password'
      return NextResponse.redirect(url)
    }

    if (!requiresPasswordChange && request.nextUrl.pathname === '/change-password') {
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
    const role = (
      user.app_metadata?.role ||
      user.app_metadata?.user_role ||
      user.user_metadata?.role ||
      user.user_metadata?.user_role
    ) as string | undefined

    if (role === 'PICKER' || role === 'INSPECTOR') {
      // Not allowed in web-app
      // In a real app, you might want to redirect them to a specific error page,
      // but for now redirecting to login will force them out if they try to access.
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // MFA Level Check (Google Authenticator / TOTP)
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    const isMfaPending = aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2'

    if (isMfaPending) {
      // User must verify OTP before accessing any protected pages
      if (request.nextUrl.pathname !== '/login') {
        url.pathname = '/login'
        return NextResponse.redirect(url)
      }
      return supabaseResponse
    }

    if (role === 'SUPERVISOR') {
      if (
        request.nextUrl.pathname.startsWith('/master') ||
        request.nextUrl.pathname.startsWith('/settings/users')
      ) {
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }

    // 온보딩 미완료 테넌트의 관리자 접근 시 온보딩 마법사로 자동 유도
    if (
      tenant.settings.onboarding_completed === false &&
      (role === 'ADMIN' || role === 'SUPER_ADMIN') &&
      !request.nextUrl.pathname.startsWith('/onboarding') &&
      !request.nextUrl.pathname.startsWith('/settings') &&
      !request.nextUrl.pathname.startsWith('/api')
    ) {
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }

    if (request.nextUrl.pathname === '/') {
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
    
    if (request.nextUrl.pathname === '/login') {
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
