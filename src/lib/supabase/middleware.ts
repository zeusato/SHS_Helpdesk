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
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
          Object.entries(headers || {}).forEach(([name, value]) => supabaseResponse.headers.set(name, value))
        },
      },
    }
  )

  // Verify the signature/expiry with cached public keys. getClaims also refreshes
  // expiring sessions; unlike getUser it does not require an Auth roundtrip on
  // every navigation when the project uses asymmetric signing keys.
  const { data, error } = await supabase.auth.getClaims()
  const userId = error ? null : data?.claims.sub

  const withSessionHeaders = (response: NextResponse) => {
    supabaseResponse.cookies.getAll().forEach(cookie => response.cookies.set(cookie))
    for (const name of ['cache-control', 'expires', 'pragma']) {
      const value = supabaseResponse.headers.get(name)
      if (value) response.headers.set(name, value)
    }
    return response
  }

  // Public routes that don't require auth
  const publicPaths = ['/portal', '/login', '/api/tickets/public', '/api/recaptcha']
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/'))

  if (!userId && !isPublicPath && request.nextUrl.pathname !== '/') {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      const response = NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 })
      return withSessionHeaders(response)
    }
    // Redirect to login if not authenticated and not on public path
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const response = NextResponse.redirect(url)
    return withSessionHeaders(response)
  }

  return supabaseResponse
}
