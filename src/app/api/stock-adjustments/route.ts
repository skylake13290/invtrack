import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/auth'

export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('stock_adjustments')
    .select('*')
    .order('ts', { ascending: false })
    .limit(300)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase()

  const userRole = req.headers.get('x-user-role')
  const userId   = req.headers.get('x-user-id')
  const username = req.headers.get('x-username')

  if (userRole !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 })
  }

  const { inventory_id, qty_change, reason } = await req.json()

  if (!inventory_id) return NextResponse.json({ error: 'inventory_id is required' }, { status: 400 })
  if (qty_change === 0 || qty_change == null) return NextResponse.json({ error: 'qty_change must be non-zero' }, { status: 400 })
  if (!reason?.trim()) return NextResponse.json({ error: 'reason is required' }, { status: 400 })

  // Insert into stock_movements so stock totals stay consistent
  const { error: movErr } = await supabase.from('stock_movements').insert({
    inventory_id,
    qty_change,
    action: 'adjustment',
    reference: reason.trim(),
    user_id: userId || null,
    username: username || null,
  })
  if (movErr) return NextResponse.json({ error: movErr.message }, { status: 500 })

  // Insert into dedicated adjustment log
  const { data, error: adjErr } = await supabase.from('stock_adjustments').insert({
    inventory_id,
    qty_change,
    reason: reason.trim(),
    user_id: userId || null,
    username: username || null,
  }).select().single()
  if (adjErr) return NextResponse.json({ error: adjErr.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}