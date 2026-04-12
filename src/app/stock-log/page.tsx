'use client'
import RequireAuth from '@/components/RequireAuth'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { type StockMovement, type InventoryItem } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'

function StockLogPage() {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState('')
  const [modal,     setModal]     = useState(false)
  const [form,      setForm]      = useState({ inventory_id: '', qty: 50, reference: '' })
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  const load = async () => {
    const [movRes, invRes] = await Promise.all([
      fetch('/api/stock-movements').then(r => r.json()),
      fetch('/api/inventory').then(r => r.json()),
    ])
    setMovements(Array.isArray(movRes) ? movRes : [])
    setInventory(Array.isArray(invRes) ? invRes : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const nameMap = new Map(inventory.map(i => [i.id, i.name]))

  const filtered = movements.filter(m => {
    if (filter && m.action !== filter) return false
    if (search) {
      const s = search.toLowerCase()
      return m.inventory_id.toLowerCase().includes(s) || (m.reference ?? '').toLowerCase().includes(s)
    }
    return true
  })

  const restock = async () => {
    setError('')
    if (!form.inventory_id) return setError('Select an item.')
    if (form.qty <= 0) return setError('Quantity must be > 0.')
    setSaving(true)
    const res = await fetch('/api/stock-movements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inventory_id: form.inventory_id, qty_change: form.qty, action: 'restock', reference: form.reference || 'Manual restock' }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error); setSaving(false); return }
    setSaving(false)
    setModal(false)
    load()
  }

  return (
    <>
      <div className="topbar">
        <h1 className="page-heading">Stock Log</h1>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={() => { setModal(true); setForm({ inventory_id: '', qty: 50, reference: '' }); setError('') }}>
            + Restock
          </button>
        </div>
      </div>
      <div className="page-content">
        <div className="flex gap-12 mb-16">
          <div className="search-wrap" style={{ width: 260 }}>
            <span className="search-icon">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M10.5 10.5l3.5 3.5-1 1-3.5-3.5A6 6 0 111.5 6 6 6 0 0110.5 10.5zM6 11A5 5 0 106 1a5 5 0 000 10z"/></svg>
            </span>
            <input className="form-input" placeholder="Search by item or reference…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-input" style={{ width: 160 }} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">All types</option>
            <option value="issue">Issue</option>
            <option value="restock">Restock</option>
            <option value="adjustment">Adjustment</option>
          </select>
        </div>

        {loading ? <div className="spinner" /> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Timestamp</th><th>Item</th><th>Change</th><th>Type</th><th>Reference</th></tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5}><div className="empty-state">No entries found</div></td></tr>
                ) : filtered.map(m => (
                  <tr key={m.id}>
                    <td className="text-muted" style={{ fontSize: 12 }}>{formatDate(m.ts)}</td>
                    <td>
                      <Link href={`/items/${m.inventory_id}`} className="link mono" style={{ fontSize: 12 }}>{m.inventory_id}</Link>
                      <div className="text-muted" style={{ fontSize: 11 }}>{nameMap.get(m.inventory_id)}</div>
                    </td>
                    <td>
                      <strong style={{ color: m.qty_change < 0 ? '#dc2626' : '#16a34a' }}>
                        {m.qty_change > 0 ? '+' : ''}{m.qty_change}
                      </strong>
                    </td>
                    <td>
                      <span className={`badge ${m.action === 'issue' ? 'badge-red' : m.action === 'restock' ? 'badge-green' : 'badge-blue'}`}>
                        {m.action}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {m.reference && m.action === 'issue'
                        ? <Link href={`/invoices/${m.reference}`} className="link mono">{m.reference}</Link>
                        : <span className="text-muted">{m.reference ?? '—'}</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Restock Item</div>
            <div className="form-group">
              <label className="form-label">Item</label>
              <select className="form-input" value={form.inventory_id} onChange={e => setForm({ ...form, inventory_id: e.target.value })}>
                <option value="">Select item…</option>
                {inventory.map(i => <option key={i.id} value={i.id}>{i.id} — {i.name} (current: {i.stock})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Quantity to Add</label>
              <input className="form-input" type="number" min={1} value={form.qty} onChange={e => setForm({ ...form, qty: +e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Reference / Note</label>
              <input className="form-input" placeholder="e.g. PO-2025-001" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} />
            </div>
            {error && <div className="alert alert-error mb-12">{error}</div>}
            <div className="modal-footer">
              <button className="btn" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={restock} disabled={saving}>{saving ? 'Saving…' : 'Restock'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function StockLogPageWrapper() {
  return <RequireAuth><StockLogPage /></RequireAuth>
}
