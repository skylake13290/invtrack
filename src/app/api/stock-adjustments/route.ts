/**
 * src/app/api/stock-adjustments/route.ts  (FIXED)
 * ---------------------------------------------------------
 * Changes from original:
 *  1. Role is read from x-verified-role (middleware-set), not x-user-role (client-set)
 *  2. user_id and username come from verified headers, not client body
 * ---------------------------------------------------------
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/auth'

export async function GET(req: NextRequest) {
  // Middleware guards this route — just check the verified role header
  const role = req.headers.get('x-verified-role')
  if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
  // FIX: Role from verified header set by middleware, not client-supplied x-user-role
  const role = req.headers.get('x-verified-role')
  const userId = req.headers.get('x-verified-user-id')
  const username = req.headers.get('x-verified-username')

  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 })
  }

  const supabase = getSupabase()
  const { inventory_id, qty_change, reason } = await req.json()

  if (!inventory_id) return NextResponse.json({ error: 'inventory_id is required' }, { status: 400 })
  if (qty_change === 0 || qty_change == null) return NextResponse.json({ error: 'qty_change must be non-zero' }, { status: 400 })
  if (!reason?.trim()) return NextResponse.json({ error: 'reason is required' }, { status: 400 })

  const { error: movErr } = await supabase.from('stock_movements').insert({
    inventory_id,
    qty_change,
    action: 'adjustment',
    reference: reason.trim(),
    user_id: userId,
    username,
  })
  if (movErr) return NextResponse.json({ error: movErr.message }, { status: 500 })

  const { data, error: adjErr } = await supabase.from('stock_adjustments').insert({
    inventory_id,
    qty_change,
    reason: reason.trim(),
    user_id: userId,
    username,
  }).select().single()

  if (adjErr) return NextResponse.json({ error: adjErr.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
