import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, verifyPassword, hashPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  const { user_id, current_password, new_password } = await req.json()

  if (!user_id || !current_password || !new_password) {
    return NextResponse.json({ 
      error: 'user_id, current_password, and new_password required' 
    }, { status: 400 })
  }

  if (new_password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user_id)
    .single()

  if (fetchError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const valid = await verifyPassword(current_password, user.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Current password incorrect' }, { status: 401 })
  }

  const newHash = await hashPassword(new_password)
  const { error: updateError } = await supabase
    .from('users')
    .update({ 
      password_hash: newHash,
      must_reset_password: false 
    })
    .eq('id', user_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await supabase.from('activity_log').insert({
    user_id: user.id,
    username: user.username,
    role: user.role,
    action: 'password_change',
    entity_type: 'auth'
  })

  return NextResponse.json({ success: true })
}
