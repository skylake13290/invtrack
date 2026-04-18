/**
 * src/app/api/auth/logout/route.ts  (FIXED)
 * ---------------------------------------------------------
 * Changes from original:
 *  1. Clears the HttpOnly session cookie
 *  2. Reads user identity from the verified session (not request body)
 * ---------------------------------------------------------
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/auth'
import { getSession, clearSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  const session = await getSession(req)

  const res = NextResponse.json({ success: true })
  clearSession(res) // Expire the HttpOnly cookie

  if (session) {
    const supabase = getSupabase()
    await supabase.from('activity_log').insert({
      user_id: session.userId,
      username: session.username,
      role: session.role,
      action: 'logout',
      entity_type: 'auth',
    })
  }

  return res
}
