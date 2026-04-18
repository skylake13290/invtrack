/**
 * session.ts
 * ---------------------------------------------------------
 * Replaces localStorage-based auth with signed JWT stored
 * in an HttpOnly, Secure, SameSite=Strict cookie.
 *
 * Requirements:
 *   npm install jose
 *
 * Env vars required:
 *   SESSION_SECRET   — at least 32 random bytes, base64-encoded
 *                      generate with: openssl rand -base64 32
 * ---------------------------------------------------------
 */
import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'invtrack_session'
const SESSION_MAX_AGE = 60 * 60 * 8 // 8 hours in seconds

export type SessionPayload = {
  userId: string
  username: string
  role: 'admin' | 'editor' | 'viewer'
  mustResetPassword: boolean
}

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET env variable is not set')
  return new TextEncoder().encode(secret)
}

/** Create a signed JWT and attach it as an HttpOnly cookie on the response. */
export async function createSession(
  res: NextResponse,
  payload: SessionPayload
): Promise<void> {
  const token = await new SignJWT({ ...payload } as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret())

  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

/** Verify the session cookie and return the payload, or null if invalid/absent. */
export async function getSession(
  req?: NextRequest
): Promise<SessionPayload | null> {
  try {
    // Works in both route handlers (req provided) and Server Components (cookies())
    const token = req
      ? req.cookies.get(COOKIE_NAME)?.value
      : (await cookies()).get(COOKIE_NAME)?.value

    if (!token) return null

    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

/** Clear the session cookie (logout). */
export function clearSession(res: NextResponse): void {
  res.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })
}

/**
 * requireSession — use inside route handlers.
 * Returns the session payload or a 401 NextResponse.
 *
 * Usage:
 *   const sessionOrResponse = await requireSession(req)
 *   if (sessionOrResponse instanceof NextResponse) return sessionOrResponse
 *   const session = sessionOrResponse
 */
export async function requireSession(
  req: NextRequest
): Promise<SessionPayload | NextResponse> {
  const session = await getSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return session
}

/**
 * requireRole — use inside route handlers that need a specific role.
 * Returns the session payload or a 403 NextResponse.
 */
export async function requireRole(
  req: NextRequest,
  allowedRoles: Array<'admin' | 'editor' | 'viewer'>
): Promise<SessionPayload | NextResponse> {
  const session = await getSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!allowedRoles.includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return session
}
