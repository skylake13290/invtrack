import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  const { user_id, username, role } = await req.json()

  if (user_id) {
    await supabase.from('activity_log').insert({
      user_id,
      username: username || null,
      role: role || null,
      action: 'logout',
      entity_type: 'auth'
    })
  }

  return NextResponse.json({ success: true })
}
