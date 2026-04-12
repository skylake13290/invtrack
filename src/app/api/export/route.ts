import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/auth'

export async function GET() {
  const supabase = getSupabase()

  const [inv, invoices, items, movements] = await Promise.all([
    supabase.from('inventory').select('*').eq('active', true),
    supabase.from('invoices').select('*').order('issued_at', { ascending: false }),
    supabase.from('invoice_items').select('*'),
    supabase.from('stock_movements').select('*').order('ts', { ascending: false }),
  ])

  if (inv.error)       return NextResponse.json({ error: inv.error.message }, { status: 500 })
  if (invoices.error)  return NextResponse.json({ error: invoices.error.message }, { status: 500 })
  if (items.error)     return NextResponse.json({ error: items.error.message }, { status: 500 })
  if (movements.error) return NextResponse.json({ error: movements.error.message }, { status: 500 })

  return NextResponse.json({
    inventory:      inv.data      ?? [],
    invoices:       invoices.data ?? [],
    invoiceItems:   items.data    ?? [],
    stockMovements: movements.data ?? [],
  })
}
