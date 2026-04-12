import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow: login, static files, API
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const cookies  = request.cookies.getAll()
  const hasAuth  = cookies.some(c =>
    c.name.includes('auth-token') ||
    c.name.includes('sb-') ||
    c.name.startsWith('sb')
  )
  const role = request.cookies.get('proppio-role')?.value

  // Not logged in at all
  if (!hasAuth && role !== 'resident') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ── Resident role ──────────────────────────────────────────────────
  if (role === 'resident') {
    // Must have resident-id cookie
    const residentId = request.cookies.get('proppio-resident-id')?.value
    if (!residentId) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    // Residents can only access /resident/* paths
    if (!pathname.startsWith('/resident')) {
      return NextResponse.redirect(new URL('/resident/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // ── Protect /resident/* from non-residents ─────────────────────────
  if (pathname.startsWith('/resident')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ── JKH Manager role ───────────────────────────────────────────────
  if (role === 'jkh_manager') {
    // Redirect /dashboard → /jkh/dashboard for JKH managers
    if (pathname === '/dashboard') {
      return NextResponse.redirect(new URL('/jkh/dashboard', request.url))
    }
    // Block admin-only routes
    const adminOnly = ['/projects', '/clients', '/pricing', '/users']
    if (adminOnly.some(p => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL('/jkh/dashboard', request.url))
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login).*)'],
}
