'use client'
import RequireAuth from '@/components/RequireAuth'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { type InventoryItem } from '@/lib/supabase'

function InventoryPage() {
  const [items,   setItems]   = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [modal,   setModal]   = useState<'add' | 'edit' | null>(null)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [form,    setForm]    = useState({ id: '', name: '', stock: 0, min_level: 10, unit: '' })
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const load = async () => {
    const res = await fetch('/api/inventory')
    const data = await res.json()
    setItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = items.filter(i =>
    !search || i.id.toLowerCase().includes(search.toLowerCase()) || i.name.toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => {
    setError('')
    setEditing(null)
    const lastId = items.map(i => i.id).sort().at(-1)
    const match = lastId?.match(/(\d{7})$/)
    const seq = match ? parseInt(match[1]) + 1 : 1
    const newId = `ITM${String(seq).padStart(7, '0')}`
    setForm({ id: newId, name: '', stock: 0, min_level: 10, unit: '' })
    setModal('add')
  }

  const openEdit = (item: InventoryItem) => {
    setForm({ id: item.id, name: item.name, stock: item.stock, min_level: item.min_level, unit: item.unit ?? '' })
    setEditing(item)
    setError('')
    setModal('edit')
  }

  const save = async () => {
    setSaving(true)
    setError('')
    if (!form.unit.trim()) { setError('Unit is required.'); setSaving(false); return }

    if (modal === 'add') {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error); setSaving(false); return }
    } else {
      const res = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editing!.id, name: form.name, min_level: form.min_level, unit: form.unit }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error); setSaving(false); return }
    }
    setSaving(false)
    setModal(null)
    load()
  }

  const deactivate = async (id: string) => {
    if (!confirm(`Deactivate ${id}? It will be hidden but data is preserved.`)) return
    await fetch('/api/inventory', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: false }),
    })
    load()
  }

  return (
    <>
      <div className="topbar">
        <h1 className="page-heading">Inventory</h1>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={openAdd}>+ Add Item</button>
        </div>
      </div>
      <div className="page-content">

        <div className="search-wrap mb-16" style={{ width: 280 }}>
          <span className="search-icon">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M10.5 10.5l3.5 3.5-1 1-3.5-3.5A6 6 0 111.5 6 6 6 0 0110.5 10.5zM6 11A5 5 0 106 1a5 5 0 000 10z"/></svg>
          </span>
          <input className="form-input" type="text" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? <div className="spinner" /> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Code</th><th>Name</th><th>Stock</th><th>Min Level</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6}><div className="empty-state">No items found</div></td></tr>
                ) : filtered.map(item => {
                  const low = item.stock <= item.min_level
                  return (
                    <tr key={item.id}>
                      <td><span className="mono">{item.id}</span></td>
                      <td><Link href={`/items/${item.id}`} className="link fw-500">{item.name}</Link></td>
                      <td>
                        <strong style={{ color: low ? '#dc2626' : undefined }}>{item.stock.toLocaleString()}</strong>
                        {item.unit && <span className="text-muted" style={{ fontSize: 11, marginLeft: 4 }}>{item.unit}</span>}
                      </td>
                      <td className="text-muted">{item.min_level} {item.unit && <span style={{ fontSize: 11 }}>{item.unit}</span>}</td>
                      <td><span className={`badge ${low ? 'badge-red' : 'badge-green'}`}>{low ? 'Low Stock' : 'OK'}</span></td>
                      <td>
                        <div className="flex gap-8">
                          <Link href={`/items/${item.id}`} className="btn btn-sm">View</Link>
                          <button className="btn btn-sm" onClick={() => openEdit(item)}>Edit</button>
                          <button className="btn btn-sm btn-danger" onClick={() => deactivate(item.id)}>Deactivate</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{modal === 'add' ? 'Add Inventory Item' : `Edit: ${editing?.id}`}</div>

            {modal === 'add' && (
              <div className="form-group">
                <label className="form-label">Item Code</label>
                <input className="form-input" value={form.id} readOnly />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">Unit <span className="text-muted" style={{ fontWeight: 400 }}>(e.g. kg, pcs, m³, rolls, bags)</span></label>
              <input
                className="form-input"
                placeholder="e.g. kg"
                value={form.unit}
                onChange={e => setForm({ ...form, unit: e.target.value })}
              />
            </div>

            <div className="grid-2">
              {modal === 'add' && (
                <div className="form-group">
                  <label className="form-label">Initial Stock</label>
                  <input className="form-input" type="number" min={0} value={form.stock} onChange={e => setForm({ ...form, stock: +e.target.value })} />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Min Reorder Level</label>
                <input className="form-input" type="number" min={0} value={form.min_level} onChange={e => setForm({ ...form, min_level: +e.target.value })} />
              </div>
            </div>

            {error && <div className="alert alert-error mb-12">{error}</div>}
            <div className="modal-footer">
              <button className="btn" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function InventoryPageWrapper() {
  return <RequireAuth><InventoryPage /></RequireAuth>
}
