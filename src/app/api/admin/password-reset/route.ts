/**
 * src/app/api/admin/password-reset/route.ts  (FIXED)
 * ---------------------------------------------------------
 * Changes from original:
 *  1. Requires verified admin session (no unauthenticated access)
 *  2. admin_id and admin_username come from the signed JWT, not request body
 *  3. Plaintext password is NO LONGER stored in password_reset_log
 * ---------------------------------------------------------
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, hashPassword, generatePassword } from '@/lib/auth'
import { requireRole } from '@/lib/session'

export async function POST(req: NextRequest) {
  // Verify the caller is an authenticated admin
  const sessionOrRes = await requireRole(req, ['admin'])
  if (sessionOrRes instanceof NextResponse) return sessionOrRes
  const session = sessionOrRes

  const supabase = getSupabase()
  const { target_user_id } = await req.json()

  if (!target_user_id) {
    return NextResponse.json({ error: 'target_user_id required' }, { status: 400 })
  }

  const { data: targetUser, error: fetchError } = await supabase
    .from('users')
    .select('username')
    .eq('id', target_user_id)
    .single()

  if (fetchError || !targetUser) {
    return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
  }

  const newPassword = generatePassword()
  const passwordHash = await hashPassword(newPassword)

  const { error: updateError } = await supabase
    .from('users')
    .update({ password_hash: passwordHash, must_reset_password: true })
    .eq('id', target_user_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // FIX: Do NOT store the plaintext password in the log table.
  // Log only the metadata — who reset whose password and when.
  await supabase.from('password_reset_log').insert({
    admin_id: session.userId,            // from verified JWT
    target_user_id,
    admin_username: session.username,    // from verified JWT
    target_username: targetUser.username,
    // new_password: newPassword         ← REMOVED — never persist plaintext
  })

  await supabase.from('activity_log').insert({
    user_id: session.userId,
    username: session.username,
    action: 'admin_password_reset',
    entity_type: 'user',
    entity_id: target_user_id,
    detail: { target_username: targetUser.username },
  })

  // Return the password once, in-flight only — it is never stored in plaintext
  return NextResponse.json({ password: newPassword })
}
