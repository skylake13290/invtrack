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
  const { data, error } = await supabase
    .from('invoices')
    .select('*, invoice_items(id, inventory_id, qty)')
    .order('issued_at', { ascending: false })
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {

  const authError = getAuthError(req)
  if (authError) return authError

  const supabase = getSupabase()
  const { id, contractor, job_type, issued_at, items, user_id, username } = await req.json()


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

  if (!id?.trim()) return NextResponse.json({ error: 'Invoice number is required' }, { status: 400 })
  const invoiceId = id.trim().toUpperCase()

  const { data: existing } = await supabase.from('invoices').select('id').eq('id', invoiceId).single()
  if (existing) return NextResponse.json({ error: `Invoice number "${invoiceId}" already exists` }, { status: 400 })

  // Create invoice
  const { error: invErr } = await supabase.from('invoices').insert({
  id: invoiceId,
  contractor,
  job_type: job_type.trim(),
  issued_at: issued_at || new Date().toISOString(),
  issued_by: user_id || null
})
  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 400 })

  // Insert items
  const { error: itemsErr } = await supabase.from('invoice_items').insert(
    items.map((i: any) => ({ invoice_id: invoiceId, inventory_id: i.inventory_id, qty: i.qty }))
  )
  if (!job_type?.trim()) {
  return NextResponse.json({ error: 'job_type is required' }, { status: 400 })}
  
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 400 })

  // Deduct stock + log
  for (const row of items) {
    await supabase.rpc('deduct_stock', {
    p_inventory_id: row.inventory_id,
    p_qty: row.qty,
    p_invoice_id: invoiceId,
    p_user_id: user_id || null,
    p_username: username || null
  })
  }

  return NextResponse.json({ id: invoiceId }, { status: 201 })
}
