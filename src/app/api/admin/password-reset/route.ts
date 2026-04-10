import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, hashPassword, generatePassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  const { admin_id, admin_username, target_user_id } = await req.json()

  if (!admin_id || !target_user_id) {
    return NextResponse.json({ error: 'admin_id and target_user_id required' }, { status: 400 })
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
    .update({
      password_hash: passwordHash,
      must_reset_password: true
    })
    .eq('id', target_user_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await supabase.from('password_reset_log').insert({
    admin_id,
    target_user_id,
    admin_username,
    target_username: targetUser.username,
    new_password: newPassword
  })

  await supabase.from('activity_log').insert({
    user_id: admin_id,
    username: admin_username,
    action: 'admin_password_reset',
    entity_type: 'user',
    entity_id: target_user_id,
    detail: { target_username: targetUser.username }
  })

  return NextResponse.json({ password: newPassword })
}
