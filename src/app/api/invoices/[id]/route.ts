import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/auth'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('invoices')
    .select('*, invoice_items(id, inventory_id,inventory:inventory_id(name), qty)')
    .eq('id', params.id)
    .single()

  console.log(JSON.stringify(data, null, 2))

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase()
  const invoiceId = decodeURIComponent(params.id)
  const { items, user_id, username } = await req.json()

  // items: Array<{ inventory_id: string; qty: number }>
  // qty === 0 means delete that line

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: 'items array required' }, { status: 400 })
  }

  // Deduplicate check
  const ids = items.filter(i => i.qty > 0).map((i: any) => i.inventory_id)
  if (new Set(ids).size !== ids.length) {
    return NextResponse.json({ error: 'Duplicate items' }, { status: 400 })
  }

  // Fetch current invoice items
  const { data: currentItems, error: fetchErr } = await supabase
    .from('invoice_items')
    .select('id, inventory_id, qty')
    .eq('invoice_id', invoiceId)

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  // Build delta map: inventory_id -> net qty change (positive = more issued, negative = return to stock)
  const oldMap = new Map<string, { rowId: number; qty: number }>()
  for (const row of (currentItems ?? [])) {
    oldMap.set(row.inventory_id, { rowId: row.id, qty: row.qty })
  }

  const newMap = new Map<string, number>()
  for (const item of items) {
    if (item.qty > 0) newMap.set(item.inventory_id, item.qty)
  }

  // Collect all affected inventory IDs
  const allIds = new Set([...oldMap.keys(), ...newMap.keys()])

  // Fetch current stock for all affected items
  const { data: stockRows, error: stockErr } = await supabase
    .from('inventory')
    .select('id, stock, name')
    .in('id', [...allIds])

  if (stockErr) return NextResponse.json({ error: stockErr.message }, { status: 500 })

  const stockMap = new Map<string, { stock: number; name: string }>()
  for (const row of (stockRows ?? [])) {
    stockMap.set(row.id, { stock: row.stock, name: row.name })
  }

  // Validate: for any item where new qty > old qty, check available stock covers the increase
  for (const [invId, newQty] of newMap.entries()) {
    const oldQty = oldMap.get(invId)?.qty ?? 0
    const delta = newQty - oldQty
    if (delta > 0) {
      const available = stockMap.get(invId)?.stock ?? 0
      if (delta > available) {
        const name = stockMap.get(invId)?.name ?? invId
        return NextResponse.json({
          error: `Insufficient stock for "${name}": need ${delta} more, only ${available} available`
        }, { status: 400 })
      }
    }
  }

  // Apply changes
  for (const invId of allIds) {
    const oldEntry = oldMap.get(invId)
    const newQty = newMap.get(invId)

    if (oldEntry && newQty === undefined) {
      // Deleted line: return full qty to stock
      const delta = oldEntry.qty // positive = returning stock
      await supabase.from('invoice_items').delete().eq('id', oldEntry.rowId)
      await supabase.from('inventory').update({ stock: (stockMap.get(invId)?.stock ?? 0) + delta }).eq('id', invId)
      await supabase.from('stock_movements').insert({
        inventory_id: invId,
        qty_change: delta,
        action: 'invoice_edit',
        reference: invoiceId,
        user_id: user_id || null,
        username: username || null,
      })
    } else if (!oldEntry && newQty !== undefined) {
      // New line: deduct stock
      await supabase.from('invoice_items').insert({ invoice_id: invoiceId, inventory_id: invId, qty: newQty })
      await supabase.from('inventory').update({ stock: (stockMap.get(invId)?.stock ?? 0) - newQty }).eq('id', invId)
      await supabase.from('stock_movements').insert({
        inventory_id: invId,
        qty_change: -newQty,
        action: 'invoice_edit',
        reference: invoiceId,
        user_id: user_id || null,
        username: username || null,
      })
    } else if (oldEntry && newQty !== undefined && newQty !== oldEntry.qty) {
      // Changed qty: apply delta
      const delta = newQty - oldEntry.qty // negative = more deducted, positive = returned
      await supabase.from('invoice_items').update({ qty: newQty }).eq('id', oldEntry.rowId)
      await supabase.from('inventory').update({ stock: (stockMap.get(invId)?.stock ?? 0) - delta }).eq('id', invId)
      await supabase.from('stock_movements').insert({
        inventory_id: invId,
        qty_change: -delta,
        action: 'invoice_edit',
        reference: invoiceId,
        user_id: user_id || null,
        username: username || null,
      })
    }
    // If qty unchanged: do nothing
  }

  return NextResponse.json({ ok: true })
}
