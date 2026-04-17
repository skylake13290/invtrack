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
  const [jobType, setJobType] = useState('')
  const [rows,        setRows]        = useState<IssueRow[]>([{ uid: ++uidSeq, inventory_id: '', qty: 1 }])
  const [error,       setError]       = useState('')
  const [saving,      setSaving]      = useState(false)
  const [rowSearch, setRowSearch] = useState<Record<number, string>>({})
  const [rowOpen,   setRowOpen]   = useState<Record<number, boolean>>({})

  useEffect(() => {
    const loadData = async () => {
      // Load inventory via API route
      const res = await fetch('/api/inventory')
      const inventoryData: InventoryItem[] = await res.json()
      setInventory(Array.isArray(inventoryData) ? inventoryData : [])

      // Generate invoice number via API route
      const invRes = await fetch('/api/invoices')
      const invoicesData: { id: string }[] = await invRes.json()
          
      const allInvoices = Array.isArray(invoicesData) ? invoicesData : []
      const cfInvoices = allInvoices
        .filter(inv => /^CF\d{5}$/.test(inv.id))  // ← only match new CF00001 format
        .sort((a, b) => b.id.localeCompare(a.id))

      let seq = 1
      if (cfInvoices.length > 0) {
        const match = cfInvoices[0].id.match(/(\d+)$/)
        if (match) seq = parseInt(match[1]) + 1
      }

      setInvoiceNo(`CF${String(seq).padStart(5, '0')}`)
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
	if (!jobType.trim()) return setError('Job type is required.')
    if (!invoiceNo.trim())  return setError('Invoice number is required.')
    const valid = rows.filter(r => r.inventory_id && r.qty > 0)
    if (valid.length === 0) return setError('Add at least one item.')
    const ids = valid.map(r => r.inventory_id)
    if (new Set(ids).size !== ids.length) return setError('Duplicate items detected — combine quantities.')

    setSaving(true)
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: invoiceNo, contractor: contractor.trim(),job_type: jobType.trim(), issued_at: new Date(issuedAt).toISOString(), items: valid }),
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
		  <div className="form-group">
			<label className="form-label">Job Type *</label>
			<input className="form-input" placeholder="e.g. Foundation Work, Electrical, Plumbing" value={jobType} onChange={e => setJobType(e.target.value)} />
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
                  <div style={{ position: 'relative' }}>
                    <input
                      className="form-input"
                      placeholder="Type to search item…"
                      value={rowSearch[row.uid] ?? (item ? `${item.id} — ${item.name}` : '')}
                      onFocus={() => { setRowSearch(s => ({ ...s, [row.uid]: '' })); setRowOpen(o => ({ ...o, [row.uid]: true })) }}
                      onChange={e => { setRowSearch(s => ({ ...s, [row.uid]: e.target.value })); setRowOpen(o => ({ ...o, [row.uid]: true })) }}
                      onBlur={() => setTimeout(() => setRowOpen(o => ({ ...o, [row.uid]: false })), 150)}
                    />
                    {rowOpen[row.uid] && (
                      <div style={{ position: 'absolute', zIndex: 10, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, width: '100%', maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                        {inventory
                          .filter(i => {
                            const q = (rowSearch[row.uid] ?? '').toLowerCase()
                            return !q || i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q)
                          })
                          .map(i => (
                            <div
                              key={i.id}
                              onMouseDown={() => {
                                updateRow(row.uid, 'inventory_id', i.id)
                                setRowSearch(s => ({ ...s, [row.uid]: undefined as unknown as string }))
                                setRowOpen(o => ({ ...o, [row.uid]: false }))
                              }}
                              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f3f4f6' }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                            >
                              <span style={{ fontWeight: 500 }}>{i.id}</span> — {i.name}
                              <span style={{ float: 'right', color: i.stock <= i.min_level ? '#dc2626' : '#6b7280', fontSize: 12 }}>{i.stock} in stock</span>
                            </div>
                          ))
                        }
                        {inventory.filter(i => { const q = (rowSearch[row.uid] ?? '').toLowerCase(); return !q || i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q) }).length === 0 && (
                          <div style={{ padding: '8px 12px', color: '#9ca3af', fontSize: 13 }}>No items found</div>
                        )}
                      </div>
                    )}
                  </div>
                  {item && <div className="form-hint" style={{ color: overStock ? '#dc2626' : undefined }}>{overStock ? `⚠ Only ${item.stock} available` : `${item.stock} units available`}</div>}
                </div>
                <input className="form-input" type="number" min={0.001} step="any" value={row.qty}
                  onChange={e => updateRow(row.uid, 'qty', Math.max(0.001, +e.target.value))}
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
