/**
 * src/app/api/inventory/route.ts  (FIXED)
 * ---------------------------------------------------------
 * Changes from original:
 *  1. Role is read from x-verified-role (set by middleware from signed JWT)
 *     NOT from x-user-role (which any client could set to anything)
 *  2. GET also requires authentication (was previously open)
 * ---------------------------------------------------------
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Helper: read verified headers set by middleware (cannot be spoofed by client)
function getVerifiedRole(req: NextRequest): string | null {
  return req.headers.get('x-verified-role')
}

export async function GET(req: NextRequest) {
  // Middleware already blocks unauthenticated requests before reaching here.
  // x-verified-role is set by middleware from the signed JWT — not the client.
  const role = getVerifiedRole(req)
  if (!role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()

  const { data: items, error } = await supabase
    .from('inventory')
    .select('id, name, min_level, unit, active')
    .eq('active', true)
    .order('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: movements } = await supabase
    .from('stock_movements')
    .select('inventory_id, qty_change')
    .limit(100000)

  const stockMap = new Map<string, number>()
  for (const m of movements ?? []) {
    stockMap.set(m.inventory_id, (stockMap.get(m.inventory_id) ?? 0) + Number(m.qty_change))
  }

  const result = (items ?? []).map((item: Record<string, unknown>) => ({
    ...item,
    stock: stockMap.get(item.id as string) ?? 0,
  }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  // FIX: Read role from verified header (set by middleware), not client-supplied header
  const role = getVerifiedRole(req)
  if (!role || !['admin', 'editor'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = getSupabase()
  const body = await req.json()
  const { name, id, stock = 0, min_level = 0, unit = 'unit' } = body

  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { data: item, error } = await supabase
    .from('inventory')
    .insert({ id: id.trim(), name, min_level, unit })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (stock > 0) {
    await supabase.from('stock_movements').insert({
      inventory_id: item.id,
      qty_change: stock,
      action: 'restock',
      reference: 'Initial stock',
    })
  }

  return NextResponse.json(item, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  // FIX: Read role from verified header (set by middleware), not client-supplied header
  const role = getVerifiedRole(req)
  if (!role || !['admin', 'editor'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = getSupabase()
  const { id, ...updates } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const allowed = ['name', 'min_level', 'active', 'unit']
  const patch = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k))
  )

  const { data, error } = await supabase
    .from('inventory')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
