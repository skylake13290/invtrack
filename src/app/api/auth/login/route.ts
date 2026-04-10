import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, verifyPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  const { username, password } = await req.json()

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('is_active', true)
    .single()

  if (error || !user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Log activity
  await supabase.from('activity_log').insert({
    user_id: user.id,
    username: user.username,
    role: user.role,
    action: 'login',
    entity_type: 'auth'
  })

  return NextResponse.json({
    id: user.id,
    username: user.username,
    role: user.role,
    must_reset_password: user.must_reset_password
  })
}
