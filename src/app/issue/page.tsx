'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { type InventoryItem } from '@/lib/supabase'
import { localDateTimeNow } from '@/lib/utils'
import RequireAuth from '@/components/RequireAuth'

type IssueRow = { uid: number; inventory_id: string; qty: number }
let uidSeq = 0

function IssuePage() {
  const router = useRouter()
  const [inventory,   setInventory]   = useState<InventoryItem[]>([])
  const [contractor,  setContractor]  = useState('')
  const [issuedAt,    setIssuedAt]    = useState(localDateTimeNow())
  const [invoiceNo,   setInvoiceNo]   = useState('')
  const [rows,        setRows]        = useState<IssueRow[]>([{ uid: ++uidSeq, inventory_id: '', qty: 1 }])
  const [error,       setError]       = useState('')
  const [saving,      setSaving]      = useState(false)

  useEffect(() => {
    const loadData = async () => {
      // Load inventory via API route
      const res = await fetch('/api/inventory')
      const inventoryData: InventoryItem[] = await res.json()
      setInventory(Array.isArray(inventoryData) ? inventoryData : [])

      // Generate invoice number via API route
      const invRes = await fetch('/api/invoices')
      const invoicesData: { id: string }[] = await invRes.json()

      const now = new Date()
      const yyyy = now.getFullYear()
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const dd = String(now.getDate()).padStart(2, '0')
      const dateStr = `${yyyy}${mm}${dd}`
      const prefix = `CF${dateStr}`

      // Filter today's invoices client-side from the API response
      const todayInvoices = (Array.isArray(invoicesData) ? invoicesData : [])
        .filter(inv => inv.id.startsWith(prefix))
        .sort((a, b) => b.id.localeCompare(a.id))

      let seq = 1
      if (todayInvoices.length > 0) {
        const match = todayInvoices[0].id.match(/(\d{5})$/)
        if (match) seq = parseInt(match[1]) + 1
      }

      setInvoiceNo(`${prefix}${String(seq).padStart(5, '0')}`)
    }

    loadData()
  }, [])

  const addRow = () => setRows(r => [...r, { uid: ++uidSeq, inventory_id: '', qty: 1 }])
  const removeRow = (uid: number) => setRows(r => r.filter(x => x.uid !== uid))
  const updateRow = (uid: number, field: keyof IssueRow, value: string | number) =>
    setRows(r => r.map(x => x.uid === uid ? { ...x, [field]: value } : x))

  const submit = async () => {
    setError('')
    if (!contractor.trim()) return setError('Contractor name is required.')
    if (!invoiceNo.trim())  return setError('Invoice number is required.')
    const valid = rows.filter(r => r.inventory_id && r.qty > 0)
    if (valid.length === 0) return setError('Add at least one item.')
    const ids = valid.map(r => r.inventory_id)
    if (new Set(ids).size !== ids.length) return setError('Duplicate items detected — combine quantities.')

    setSaving(true)
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: invoiceNo, contractor: contractor.trim(), issued_at: new Date(issuedAt).toISOString(), items: valid }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error); setSaving(false); return }
    router.push(`/invoices/${invoiceNo}`)
  }

  const totalUnits = rows.filter(r => r.inventory_id).reduce((s, r) => s + r.qty, 0)

  return (
    <>
      <div className="topbar"><h1 className="page-heading">Issue Items</h1></div>
      <div className="page-content">
        <div className="card" style={{ maxWidth: 660 }}>
          <div className="grid-2 mb-12">
            <div className="form-group">
              <label className="form-label">Contractor Name *</label>
              <input className="form-input" placeholder="e.g. Apex Civil Works" value={contractor} onChange={e => setContractor(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Date & Time</label>
              <input className="form-input" type="datetime-local" value={issuedAt} onChange={e => setIssuedAt(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Invoice Number *</label>
            <input className="form-input" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} />
          </div>
          <div className="flex items-center justify-between mb-12">
            <div className="card-title" style={{ margin: 0 }}>Items to Issue</div>
            <button className="btn btn-sm" onClick={addRow}>+ Add Item</button>
          </div>
          {rows.map(row => {
            const item = inventory.find(i => i.id === row.inventory_id)
            const overStock = item && row.qty > item.stock
            return (
              <div key={row.uid} className="issue-grid" style={{ marginBottom: 8 }}>
                <div>
                  <select className="form-input" value={row.inventory_id} onChange={e => updateRow(row.uid, 'inventory_id', e.target.value)}>
                    <option value="">Select item…</option>
                    {inventory.map(i => <option key={i.id} value={i.id}>{i.id} — {i.name} ({i.stock} in stock)</option>)}
                  </select>
                  {item && <div className="form-hint" style={{ color: overStock ? '#dc2626' : undefined }}>{overStock ? `⚠ Only ${item.stock} available` : `${item.stock} units available`}</div>}
                </div>
                <input className="form-input" type="number" min={1} value={row.qty}
                  onChange={e => updateRow(row.uid, 'qty', Math.max(1, +e.target.value))}
                  style={{ textAlign: 'center', borderColor: overStock ? '#dc2626' : undefined }} />
                <button className="btn btn-sm btn-danger btn-icon" onClick={() => removeRow(row.uid)}>✕</button>
              </div>
            )
          })}
          {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}
          <div className="flex items-center justify-between" style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #e5e7eb' }}>
            <div className="text-muted text-sm">{rows.filter(r => r.inventory_id).length > 0 && `${rows.filter(r => r.inventory_id).length} item type(s) · ${totalUnits} total units`}</div>
            <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Creating…' : 'Create Invoice'}</button>
          </div>
        </div>
      </div>
    </>
  )
}

export default function IssuePageWrapper() {
  return <RequireAuth minRole="editor"><IssuePage /></RequireAuth>
}
