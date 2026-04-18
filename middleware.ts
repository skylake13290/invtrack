/**
 * middleware.ts  (place at project root: /middleware.ts)
 * ---------------------------------------------------------
 * Runs on every request BEFORE the route handler.
 * Enforces authentication globally so no individual route
 * can accidentally be left unprotected.
 * ---------------------------------------------------------
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

// Routes that do NOT require authentication
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',   // only public API endpoint
]

// Routes that require admin role
const ADMIN_ONLY_PATHS = [
  '/api/admin/',
  '/admin/',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Allow static assets and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const session = await getSession(req)

  // Not authenticated → redirect pages to login, return 401 for API calls
  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Admin-only routes — non-admins get 403
  if (ADMIN_ONLY_PATHS.some(p => pathname.startsWith(p))) {
    if (session.role !== 'admin') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  // Authenticated — pass the verified session data via headers
  // so route handlers can read it WITHOUT trusting the client
  const requestHeaders = new Headers(req.headers)

  // Strip any client-supplied trust headers (prevent spoofing)
  requestHeaders.delete('x-user-role')
  requestHeaders.delete('x-user-id')
  requestHeaders.delete('x-username')

  // Set verified values from the signed JWT
  requestHeaders.set('x-verified-user-id', session.userId)
  requestHeaders.set('x-verified-role', session.role)
  requestHeaders.set('x-verified-username', session.username)

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: [
    /*
     * Match all paths except Next.js internals and static files.
     * The middleware function above handles further filtering.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
