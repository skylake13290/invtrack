import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const type  = searchParams.get('type')  ?? 'item'   // 'item' | 'invoice'
  const query = searchParams.get('q')     ?? ''

  if (!query.trim()) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 })
  }

  if (type === 'item') {
    // Find item by exact ID or name contains
    const { data: items } = await supabase
      .from('inventory')
      .select('*')
      .or(`id.ilike.${query},name.ilike.%${query}%`)
      .limit(1)

    const item = items?.[0]
    if (!item) return NextResponse.json({ notFound: true })

    // Get issue movements for this item
    const { data: movements } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('inventory_id', item.id)
      .eq('action', 'issue')
      .order('ts', { ascending: false })

    const invoiceIds = [...new Set((movements ?? []).map((m: any) => m.reference).filter(Boolean))]

    let contractorMap = new Map<string, string>()
    if (invoiceIds.length > 0) {
      const { data: invs } = await supabase
        .from('invoices')
        .select('id, contractor')
        .in('id', invoiceIds)
      invs?.forEach((i: { id: string; contractor: string }) => contractorMap.set(i.id, i.contractor))
    }

    return NextResponse.json({
      type: 'item',
      result: {
        id:        item.id,
        name:      item.name,
        stock:     item.stock,
        min_level: item.min_level,
        history:   (movements ?? []).map((m: any) => ({
          ts:         m.ts,
          invoice_id: m.reference ?? '',
          contractor: contractorMap.get(m.reference ?? '') ?? '—',
          qty:        Math.abs(m.qty_change),
        })),
      },
    })
  }

  // Invoice lookup
  const { data: inv, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', query.trim())
    .single()

  if (error || !inv) return NextResponse.json({ notFound: true })

  const { data: invoiceItems } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', inv.id)

  const invIds = (invoiceItems ?? []).map((i: any) => i.inventory_id)
  const { data: invList } = await supabase
    .from('inventory')
    .select('id, name')
    .in('id', invIds)

  const nameMap = new Map((invList ?? []).map((i: any) => [i.id, i.name]))

  return NextResponse.json({
    type: 'invoice',
    result: {
      id:         inv.id,
      contractor: inv.contractor,
      issued_at:  inv.issued_at,
      items:      (invoiceItems ?? []).map((r: any) => ({
        inventory_id: r.inventory_id,
        item_name:    nameMap.get(r.inventory_id) ?? '—',
        qty:          r.qty,
      })),
    },
  })
}
