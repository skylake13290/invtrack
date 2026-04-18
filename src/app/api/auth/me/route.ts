/**
 * src/app/api/auth/me/route.ts  (NEW)
 * ---------------------------------------------------------
 * Lets the client verify their current session on page load.
 * The HttpOnly cookie is sent automatically by the browser.
 * Returns the public user fields — never the password hash.
 * ---------------------------------------------------------
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const session = await getSession(req)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    id: session.userId,
    username: session.username,
    role: session.role,
    must_reset_password: session.mustResetPassword,
  })
}
