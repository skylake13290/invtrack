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
  const body = await req.json()
  const { name, stock = 0, min_level = 0 } = body
  
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const { data: itemId, error: idError } = await supabase.rpc('generate_item_id')
  if (idError) return NextResponse.json({ error: idError.message }, { status: 500 })

  const { data: item, error } = await supabase
    .from('inventory')
    .insert({ id: itemId, name, stock, min_level })
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
  const { id, ...updates } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const allowed = ['name', 'min_level', 'active']
  const patch = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)))

  const { data, error } = await supabase
    .from('inventory').update(patch).eq('id', id).select().single()
  
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
