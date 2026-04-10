import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/auth'

export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('invoices')
    .select('*, invoice_items(id, inventory_id, qty)')
    .order('issued_at', { ascending: false })
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  const { contractor, issued_at, items, user_id, username } = await req.json()

  if (!contractor || !items?.length) {
    return NextResponse.json({ error: 'contractor and items required' }, { status: 400 })
  }

  const ids = items.map((i: any) => i.inventory_id)
  if (new Set(ids).size !== ids.length) {
    return NextResponse.json({ error: 'Duplicate items' }, { status: 400 })
  }

  // Check stock
  const { data: stockRows, error: stockErr } = await supabase
    .from('inventory').select('id, stock, name').in('id', ids)
  if (stockErr) return NextResponse.json({ error: stockErr.message }, { status: 500 })

  for (const row of items) {
    const inv = stockRows?.find((s: any) => s.id === row.inventory_id)
    if (!inv) return NextResponse.json({ error: `Item ${row.inventory_id} not found` }, { status: 400 })
    if (row.qty > inv.stock) {
      return NextResponse.json({
        error: `Insufficient stock for ${inv.id}: requested ${row.qty}, available ${inv.stock}`
      }, { status: 400 })
    }
  }

  // Generate invoice ID
  const { data: invoiceId, error: idError } = await supabase.rpc('generate_invoice_id')
  if (idError) return NextResponse.json({ error: idError.message }, { status: 500 })

  // Create invoice
  const { error: invErr } = await supabase.from('invoices').insert({
    id: invoiceId,
    contractor,
    issued_at: issued_at || new Date().toISOString(),
    issued_by: user_id || null
  })
  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 400 })

  // Insert items
  const { error: itemsErr } = await supabase.from('invoice_items').insert(
    items.map((i: any) => ({ invoice_id: invoiceId, inventory_id: i.inventory_id, qty: i.qty }))
  )
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 400 })

  // Deduct stock + log
  for (const row of items) {
    await supabase.rpc('deduct_stock', { p_inventory_id: row.inventory_id, p_qty: row.qty })
    await supabase.from('stock_movements').insert({
      inventory_id: row.inventory_id,
      qty_change: -row.qty,
      action: 'issue',
      reference: invoiceId,
      user_id: user_id || null,
      username: username || null
    })
  }

  return NextResponse.json({ id: invoiceId }, { status: 201 })
}
