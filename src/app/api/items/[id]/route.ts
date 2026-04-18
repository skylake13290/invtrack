import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase()
  const id = params.id

  const [itemRes, movRes] = await Promise.all([
    supabase.from('inventory').select('*').eq('id', id).single(),
    supabase.from('stock_movements').select('*').eq('inventory_id', id).order('ts', { ascending: false }),
  ])

  if (itemRes.error) return NextResponse.json({ error: itemRes.error.message }, { status: 404 })

  // Fetch contractor names for any invoice references
  const invoiceIds = [...new Set(
    (movRes.data ?? [])
      .map((m: any) => m.reference)
      .filter((r: any): r is string => !!r && m_isIssue(movRes.data ?? [], r))
  )]

  let contractorMap = new Map<string, string>()
  if (invoiceIds.length > 0) {
    const { data: invs } = await supabase
      .from('invoices').select('id, contractor, job_type').in('id', invoiceIds)
    invs?.forEach((i: { id: string; contractor: string; job_type: string }) => contractorMap.set(i.id, i.contractor + '|||' + (i.job_type ?? '')))
  }

  const movements = (movRes.data ?? []).map((m: any) => {
    const combined = m.reference ? contractorMap.get(m.reference) ?? null : null
    const [contractor, job_type] = combined ? combined.split('|||') : [null, null]
    return { ...m, contractor: contractor ?? null, job_type: job_type ?? null }
  })

  const calculatedStock = (movRes.data || []).reduce(
  (sum: number, m: any) => sum + Number(m.qty_change),
  0
)

return NextResponse.json({
  item: {
    ...itemRes.data,
    stock: calculatedStock
  },
  movements
})
}

// Helper: check if any movement with this reference is an 'issue' action
function m_isIssue(movements: any[], reference: string): boolean {
  return movements.some(m => m.reference === reference && m.action === 'issue')
}
