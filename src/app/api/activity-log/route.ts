import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/auth'

const role = req.headers.get('x-verified-role')
if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// For write operations, also check the role:
if (!['admin', 'editor'].includes(role)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function GET(req: NextRequest) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '0')
  const limit = parseInt(searchParams.get('limit') ?? '50')
  const from = page * limit
  const to = from + limit - 1

  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .order('ts', { ascending: false })
    .range(from, to)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
