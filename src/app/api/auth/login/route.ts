/**
 * src/app/api/auth/login/route.ts  (FIXED)
 * ---------------------------------------------------------
 * Changes from original:
 *  1. Issues a signed JWT in an HttpOnly cookie on success
 *  2. Simple in-process rate limiting (5 attempts / 15 min per username)
 *     For production, replace with Redis / Upstash for persistence
 *     across serverless instances:
 *     npm install @upstash/ratelimit @upstash/redis
 * ---------------------------------------------------------
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, verifyPassword } from '@/lib/auth'
import { createSession } from '@/lib/session'

// --- Simple in-process rate limiter (replace with Upstash in production) ---
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

function checkRateLimit(key: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now()
  const record = loginAttempts.get(key)

  if (!record || now > record.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, retryAfterSec: 0 }
  }

  if (record.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSec: Math.ceil((record.resetAt - now) / 1000) }
  }

  record.count++
  return { allowed: true, retryAfterSec: 0 }
}

function resetRateLimit(key: string) {
  loginAttempts.delete(key)
}
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  const { username, password } = await req.json()

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
  }

  // Rate limit by username (prevents enumeration + brute force)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rateLimitKey = `${username}:${ip}`
  const { allowed, retryAfterSec } = checkRateLimit(rateLimitKey)

  if (!allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${Math.ceil(retryAfterSec / 60)} minutes.` },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfterSec) },
      }
    )
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('is_active', true)
    .single()

  // Use a constant-time comparison path to avoid timing attacks
  if (error || !user) {
    // Still verify a dummy hash to prevent timing-based user enumeration
    await verifyPassword(password, '$2b$10$invalidhashpadding000000000000000000000000000000000000')
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Successful login — clear rate limit counter
  resetRateLimit(rateLimitKey)

  await supabase.from('activity_log').insert({
    user_id: user.id,
    username: user.username,
    role: user.role,
    action: 'login',
    entity_type: 'auth',
    ip_address: ip,
  })

  const sessionPayload = {
    userId: user.id,
    username: user.username,
    role: user.role as 'admin' | 'editor' | 'viewer',
    mustResetPassword: user.must_reset_password,
  }

  // Build response — attach HttpOnly session cookie
  const res = NextResponse.json({
    id: user.id,
    username: user.username,
    role: user.role,
    must_reset_password: user.must_reset_password,
  })

  await createSession(res, sessionPayload)
  return res
}
