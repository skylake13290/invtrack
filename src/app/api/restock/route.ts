import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/auth'

function getAuthError(req: NextRequest, allowedRoles?: string[]) {
  const role = req.headers.get('x-verified-role')
  
  if (!role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return null
}

export async function POST(req: NextRequest) {

  const authError = getAuthError(req)
  if (authError) return authError

  const supabase = getSupabase()
  const { item_id, quantity, user_id, username } = await req.json()

  if (!item_id || !quantity || !user_id || !username) {
    return NextResponse.json({ 
      error: 'item_id, quantity, user_id, and username are required' 
    }, { status: 400 })
  }

  if (quantity <= 0) {
    return NextResponse.json({ error: 'Quantity must be positive' }, { status: 400 })
  }

  const { error } = await supabase.rpc('restock_item', {
    p_item_id: item_id,
    p_quantity: quantity,
    p_user_id: user_id,
    p_username: username
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}

export async function GET(req: NextRequest) {

  const authError = getAuthError(req)
  if (authError) return authError

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('restock_logs')
    .select('*, inventory(name)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
