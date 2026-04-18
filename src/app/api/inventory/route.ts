import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/auth'

export async function GET() {
  const supabase = getSupabase()

  // Fetch inventory items (no nested join)
  const { data: items, error } = await supabase
    .from('inventory')
    .select('id, name, min_level, unit, active')
    .eq('active', true)
    .order('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch all stock movement totals per item via a single aggregated query
  const { data: movements } = await supabase
    .from('stock_movements')
    .select('inventory_id, qty_change')
    .limit(100000) // high enough for total movements across all items

  // Sum qty_change per inventory_id
  const stockMap = new Map<string, number>()
  for (const m of movements ?? []) {
    stockMap.set(m.inventory_id, (stockMap.get(m.inventory_id) ?? 0) + Number(m.qty_change))
  }

  const result = (items ?? []).map((item: any) => ({
    ...item,
    stock: stockMap.get(item.id) ?? 0,
  }))

  return NextResponse.json(result)
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

  const { data: item, error } = await supabase
    .from('inventory')
    .insert({ id: id.trim(), name, min_level, unit })
    .select().single()
  
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (stock > 0) {
    await supabase.from('stock_movements').insert({
      inventory_id: item.id, qty_change: stock, action: 'restock', reference: 'Initial stock'
    })
  }

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
  return NextResponse.json(data)
}
