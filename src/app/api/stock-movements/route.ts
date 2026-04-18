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

export async function GET(req: NextRequest) {
  const authError = getAuthError(req)
  if (authError) return authError

  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')?.trim() ?? ''

  let query = supabase
    .from('stock_movements')
    .select('*, inventory(name)')
    .order('ts', { ascending: false })
    .limit(1000)

  if (search) {
    query = query.ilike('inventory_id', `%${search}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const authError = getAuthError(req)
  if (authError) return authError

  const supabase = getSupabase()
  const { inventory_id, qty_change, action, reference } = await req.json()

  if (!inventory_id || !qty_change || !action) {
    return NextResponse.json({ error: 'inventory_id, qty_change and action are required' }, { status: 400 })
  }

  // For restocks, go through the RPC so restock_logs stays consistent
  if (action === 'restock') {
    const { error } = await supabase.rpc('restock_item', {
      p_item_id: inventory_id,
      p_quantity: qty_change,
      p_user_id: null,
      p_username: 'manual'
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true }, { status: 201 })
  }

  // For issues/adjustments, insert directly
  const { data, error } = await supabase.from('stock_movements').insert({
    inventory_id, qty_change, action, reference: reference || null
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}