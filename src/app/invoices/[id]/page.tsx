'use client'
import RequireAuth from '@/components/RequireAuth'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { useAuth } from '@/lib/AuthContext'

type InvoiceItem = {
  id: number
  inventory_id: string
  inventory?: { name: string }
  qty: number
}

type InvoiceDetail = {
  id: string
  contractor: string
  job_type: string
  issued_at: string
  created_at: string
  invoice_items: InvoiceItem[]
}

type EditRow = {
  inventory_id: string
  name: string
  qty: number
  isNew?: boolean
}

function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id)
  const { user, canWrite } = useAuth()

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Edit state
  const [editing, setEditing] = useState(false)
  const [editRows, setEditRows] = useState<EditRow[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Add-item row state
  const [newItemId, setNewItemId] = useState('')
  const [newItemQty, setNewItemQty] = useState('')

  const loadInvoice = () => {
    setLoading(true)
    fetch(`/api/invoices/${encodeURIComponent(id)}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null }
        return r.json()
      })
      .then(data => {
        if (data) { setInvoice(data); setLoading(false) }
      })
  }

  useEffect(() => { loadInvoice() }, [id])

  const startEdit = () => {
    if (!invoice) return
    setEditRows(invoice.invoice_items.map(item => ({
      inventory_id: item.inventory_id,
      name: item.inventory?.name ?? item.inventory_id,
      qty: item.qty,
    })))
    setNewItemId('')
    setNewItemQty('')
    setSaveError('')
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setSaveError('')
  }

  const updateQty = (inventory_id: string, val: string) => {
    const qty = parseFloat(val)
    setEditRows(rows => rows.map(r =>
      r.inventory_id === inventory_id ? { ...r, qty: isNaN(qty) ? 0 : qty } : r
    ))
  }

  const deleteRow = (inventory_id: string) => {
    setEditRows(rows => rows.filter(r => r.inventory_id !== inventory_id))
  }

  const addNewItem = () => {
    const trimId = newItemId.trim().toUpperCase()
    const qty = parseFloat(newItemQty)
    if (!trimId || isNaN(qty) || qty <= 0) return
    if (editRows.find(r => r.inventory_id === trimId)) {
      setSaveError(`Item ${trimId} is already in this invoice.`)
      return
    }
    setEditRows(rows => [...rows, { inventory_id: trimId, name: trimId, qty, isNew: true }])
    setNewItemId('')
    setNewItemQty('')
    setSaveError('')
  }

  const saveEdit = async () => {
    setSaving(true)
    setSaveError('')
    const validRows = editRows.filter(r => r.qty > 0)
    const res = await fetch(`/api/invoices/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: validRows.map(r => ({ inventory_id: r.inventory_id, qty: r.qty })),
        user_id: user?.id,
        username: user?.username,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setSaveError(data.error ?? 'Failed to save changes')
      setSaving(false)
      return
    }
    setEditing(false)
    setSaving(false)
    loadInvoice()
  }

  if (loading) return <div className="page-content"><div className="spinner" style={{ margin: '60px auto' }} /></div>
  if (notFound || !invoice) return (
    <div className="page-content">
      <div className="alert alert-error" style={{ maxWidth: 480 }}>
        Invoice <strong>{id}</strong> not found.
      </div>
      <Link href="/invoices" className="btn" style={{ marginTop: 12 }}>← Back to Invoices</Link>
    </div>
  )

  const totalQty = invoice.invoice_items.reduce((s, i) => s + i.qty, 0)

  return (
    <>
      <div className="topbar">
        <h1 className="page-heading">Invoice Detail</h1>
        <div className="topbar-actions">
          {canWrite && !editing && (
            <button className="btn btn-primary" onClick={startEdit}>Edit Invoice</button>
          )}
          {editing && (
            <>
              <button className="btn" onClick={cancelEdit} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </>
          )}
          <Link href="/invoices" className="btn">← Invoices</Link>
        </div>
      </div>
      <div className="page-content">

        <div className="card mb-16" style={{ maxWidth: 640 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 10, fontSize: 14 }}>
            <div className="text-muted">Invoice #</div>
            <div className="mono fw-500" style={{ fontSize: 16 }}>{invoice.id}</div>
            <div className="text-muted">Contractor</div>
            <div className="fw-500">{invoice.contractor}</div>
            <div className="text-muted">Job Type</div>
            <div>{invoice.job_type}</div>
            <div className="text-muted">Date Issued</div>
            <div>{formatDate(invoice.issued_at)}</div>
            <div className="text-muted">Line Items</div>
            <div>{invoice.invoice_items.length} item type{invoice.invoice_items.length !== 1 ? 's' : ''}</div>
            <div className="text-muted">Total Units</div>
            <div>{totalQty.toLocaleString()} units</div>
          </div>
        </div>

        {saveError && (
          <div className="alert alert-error mb-16" style={{ maxWidth: 640 }}>{saveError}</div>
        )}

        <div className="card" style={{ maxWidth: 640 }}>
          <div className="card-title">Items Issued</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item Code</th>
                  <th>Name</th>
                  <th>Quantity</th>
                  {editing && <th></th>}
                </tr>
              </thead>
              <tbody>
                {!editing && invoice.invoice_items.length === 0 && (
                  <tr><td colSpan={4}><div className="empty-state">No items on this invoice</div></td></tr>
                )}

                {!editing && invoice.invoice_items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="text-muted" style={{ fontSize: 12 }}>{idx + 1}</td>
                    <td>
                      <Link href={`/items/${item.inventory_id}`} className="link mono" style={{ fontSize: 13 }}>
                        {item.inventory_id}
                      </Link>
                    </td>
                    <td className="text-muted" style={{ fontSize: 13 }}>{item.inventory?.name ?? '—'}</td>
                    <td><strong>{item.qty}</strong></td>
                  </tr>
                ))}

                {editing && editRows.map((row, idx) => (
                  <tr key={row.inventory_id}>
                    <td className="text-muted" style={{ fontSize: 12 }}>{idx + 1}</td>
                    <td><span className="mono" style={{ fontSize: 13 }}>{row.inventory_id}</span></td>
                    <td className="text-muted" style={{ fontSize: 13 }}>{row.name}</td>
                    <td>
                      <input
                        type="number"
                        className="form-input"
                        style={{ width: 80 }}
                        value={row.qty}
                        min={0}
                        step={0.01}
                        onChange={e => updateQty(row.inventory_id, e.target.value)}
                      />
                    </td>
                    <td>
                      <button
                        className="btn btn-sm"
                        style={{ color: 'var(--danger, #e53e3e)' }}
                        onClick={() => deleteRow(row.inventory_id)}
                        title="Remove item"
                      >✕</button>
                    </td>
                  </tr>
                ))}

                {editing && (
                  <tr style={{ borderTop: '2px dashed var(--border)' }}>
                    <td className="text-muted" style={{ fontSize: 12 }}>+</td>
                    <td>
                      <input
                        type="text"
                        className="form-input mono"
                        style={{ width: 130, fontSize: 13 }}
                        placeholder="Item code"
                        value={newItemId}
                        onChange={e => setNewItemId(e.target.value)}
                      />
                    </td>
                    <td className="text-muted" style={{ fontSize: 12 }}>new item</td>
                    <td>
                      <input
                        type="number"
                        className="form-input"
                        style={{ width: 80 }}
                        placeholder="Qty"
                        value={newItemQty}
                        min={0.01}
                        step={0.01}
                        onChange={e => setNewItemQty(e.target.value)}
                      />
                    </td>
                    <td>
                      <button className="btn btn-sm btn-primary" onClick={addNewItem}>Add</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  )
}

export default function InvoiceDetailPageWrapper({ params }: { params: { id: string } }) {
  return <RequireAuth><InvoiceDetailPage params={params} /></RequireAuth>
}