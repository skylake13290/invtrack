import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/auth'

export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('active', true)
    .order('id')
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  const userHeader = req.headers.get('x-user-role') // or read from your session/cookie
  if (!userHeader || !['admin', 'editor'].includes(userHeader)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const { name, id, stock = 0, min_level = 0, unit = 'unit' } = body
  
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const body2 = { id: id.trim(), name, stock, min_level, unit }
  const { data: item, error } = await supabase
    .from('inventory')
    .insert(body2)
    .select().single()
  
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (stock > 0) {
    await supabase.from('stock_movements').insert({
      inventory_id: item.id, qty_change: stock, action: 'restock', reference: 'Initial stock'
    })
  }

  const userIdHeader = req.headers.get('x-user-id')
  const usernameHeader = req.headers.get('x-username')
  await supabase.from('activity_log').insert({
    user_id: userIdHeader || null,
    username: usernameHeader || null,
    action: 'create_item',
    entity_type: 'inventory',
    entity_id: item.id,
    detail: { name, stock, min_level, unit }
  })

  return NextResponse.json(item, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const supabase = getSupabase()
  const userHeader = req.headers.get('x-user-role') // or read from your session/cookie
  if (!userHeader || !['admin', 'editor'].includes(userHeader)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id, ...updates } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const allowed = ['name', 'min_level', 'active', 'unit']
  const patch = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)))

  const { data, error } = await supabase
    .from('inventory').update(patch).eq('id', id).select().single()
  
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const userIdHeader = req.headers.get('x-user-id')
  const usernameHeader = req.headers.get('x-username')
  await supabase.from('activity_log').insert({
    user_id: userIdHeader || null,
    username: usernameHeader || null,
    action: 'update_item',
    entity_type: 'inventory',
    entity_id: id,
    detail: patch
  })

  return NextResponse.json(data)
}
