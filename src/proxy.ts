import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/_next', '/favicon.ico', '/api/auth']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const role = request.cookies.get('proppio-role')?.value

  // Check for Supabase session via cookie
  const accessToken = request.cookies.get('sb-access-token')?.value
  let hasSession = !!accessToken

  if (!hasSession) {
    try {
      const allCookies = request.cookies.getAll()
      for (const cookie of allCookies) {
        if (cookie.name.includes('auth-token') || cookie.name.includes('access-token')) {
          try {
            const val = JSON.parse(decodeURIComponent(cookie.value))
            if (val?.access_token || (Array.isArray(val) && val[0])) {
              hasSession = true
              break
            }
          } catch { /* skip invalid cookies */ }
        }
      }
    } catch { /* continue */ }
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Role-based routing
  if (pathname.startsWith('/dashboard') && role === 'manager') {
    return NextResponse.redirect(new URL('/seller/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login).*)'],
}
