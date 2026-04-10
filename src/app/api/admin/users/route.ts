import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, hashPassword, generatePassword } from '@/lib/auth'

export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('users')
    .select('id, username, role, is_active, must_reset_password, created_at')
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  const { username, role, admin_id } = await req.json()

  if (!username || !role) {
    return NextResponse.json({ error: 'username and role required' }, { status: 400 })
  }

  if (!['admin', 'staff'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const password = generatePassword()
  const passwordHash = await hashPassword(password)

  const { data: user, error } = await supabase
    .from('users')
    .insert({
      username,
      password_hash: passwordHash,
      role,
      must_reset_password: true
    })
    .select('id, username, role')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await supabase.from('activity_log').insert({
    user_id: admin_id,
    action: 'create_user',
    entity_type: 'user',
    entity_id: user.id,
    detail: { username, role }
  })

  return NextResponse.json({ ...user, password }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const supabase = getSupabase()
  const { id, is_active, role } = await req.json()

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const updates: any = {}
  if (typeof is_active === 'boolean') updates.is_active = is_active
  if (role && ['admin', 'staff'].includes(role)) updates.role = role

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
