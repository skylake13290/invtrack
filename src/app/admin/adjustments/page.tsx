'use client'
import RequireAuth from '@/components/RequireAuth'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import Link from 'next/link'
import { type InventoryItem, type StockAdjustment } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'

function AdjustmentsPage() {
  const { user } = useAuth()
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([])
  const [inventory,   setInventory]   = useState<InventoryItem[]>([])
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState(false)
  const [form,        setForm]        = useState({ inventory_id: '', qty_change: 0, reason: '' })
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [search,      setSearch]      = useState('')

  const load = async () => {
    const [adjRes, invRes] = await Promise.all([
      fetch('/api/stock-adjustments').then(r => r.json()),
      fetch('/api/inventory').then(r => r.json()),
    ])
    setAdjustments(Array.isArray(adjRes) ? adjRes : [])
    setInventory(Array.isArray(invRes) ? invRes : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const nameMap = new Map(inventory.map(i => [i.id, i.name]))

  const filtered = adjustments.filter(a => {
    if (!search) return true
    const s = search.toLowerCase()
    return a.inventory_id.toLowerCase().includes(s) || a.reason.toLowerCase().includes(s) || (a.username ?? '').toLowerCase().includes(s)
  })

  const submit = async () => {
    setError('')
    if (!form.inventory_id) return setError('Select an item.')
    if (form.qty_change === 0) return setError('Quantity change cannot be zero.')
    if (!form.reason.trim()) return setError('Reason is required.')
    setSaving(true)
    const res = await fetch('/api/stock-adjustments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': user?.role ?? '',
        'x-user-id':   user?.id ?? '',
        'x-username':  user?.username ?? '',
      },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error); setSaving(false); return }
    setSaving(false)
    setModal(false)
    load()
  }

  const openModal = () => {
    setForm({ inventory_id: '', qty_change: 0, reason: '' })
    setError('')
    setModal(true)
  }

  return (
    <>
      <div className="topbar">
        <h1 className="page-heading">Stock Adjustments</h1>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={openModal}>+ New Adjustment</button>
        </div>
      </div>
      <div className="page-content">
        <div className="search-wrap mb-16" style={{ width: 280 }}>
          <span className="search-icon">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M10.5 10.5l3.5 3.5-1 1-3.5-3.5A6 6 0 111.5 6 6 6 0 0110.5 10.5zM6 11A5 5 0 106 1a5 5 0 000 10z"/></svg>
          </span>
          <input className="form-input" placeholder="Search by item, reason, user…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? <div className="spinner" /> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Timestamp</th><th>Item</th><th>Change</th><th>Reason</th><th>By</th></tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5}><div className="empty-state">No adjustments found</div></td></tr>
                ) : filtered.map(a => (
                  <tr key={a.id}>
                    <td className="text-muted" style={{ fontSize: 12 }}>{formatDate(a.ts)}</td>
                    <td>
                      <Link href={`/items/${a.inventory_id}`} className="link mono" style={{ fontSize: 12 }}>{a.inventory_id}</Link>
                      <div className="text-muted" style={{ fontSize: 11 }}>{nameMap.get(a.inventory_id)}</div>
                    </td>
                    <td>
                      <strong style={{ color: a.qty_change < 0 ? '#dc2626' : '#16a34a' }}>
                        {a.qty_change > 0 ? '+' : ''}{a.qty_change}
                      </strong>
                    </td>
                    <td style={{ fontSize: 13 }}>{a.reason}</td>
                    <td className="text-muted" style={{ fontSize: 12 }}>{a.username ?? '—'}</td>
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
            <div className="modal-title">New Stock Adjustment</div>
            <div className="form-group">
              <label className="form-label">Item</label>
              <select className="form-input" value={form.inventory_id} onChange={e => setForm({ ...form, inventory_id: e.target.value })}>
                <option value="">Select item…</option>
                {inventory.map(i => <option key={i.id} value={i.id}>{i.id} — {i.name} (stock: {i.stock})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Quantity Change <span className="text-muted" style={{ fontWeight: 400 }}>(use negative to reduce)</span></label>
              <input className="form-input" type="number" step="any" value={form.qty_change} onChange={e => setForm({ ...form, qty_change: +e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Reason *</label>
              <input className="form-input" placeholder="e.g. Damaged goods write-off, count correction" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
            </div>
            {error && <div className="alert alert-error mb-12">{error}</div>}
            <div className="modal-footer">
              <button className="btn" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Apply Adjustment'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function AdjustmentsPageWrapper() {
  return <RequireAuth minRole="admin"><AdjustmentsPage /></RequireAuth>
}