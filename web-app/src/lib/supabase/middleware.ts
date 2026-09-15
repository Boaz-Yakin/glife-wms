import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

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
    const role = user.user_metadata?.role as string | undefined

    if (role === 'PICKER' || role === 'INSPECTOR') {
      // Not allowed in web-app
      // In a real app, you might want to redirect them to a specific error page,
      // but for now redirecting to login will force them out if they try to access.
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (role === 'SUPERVISOR') {
      if (
        request.nextUrl.pathname.startsWith('/master') ||
        request.nextUrl.pathname.startsWith('/settings')
      ) {
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
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
