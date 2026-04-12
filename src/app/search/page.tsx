'use client'
import RequireAuth from '@/components/RequireAuth'
import { useState } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

type ItemResult = {
  id: string; name: string; stock: number; min_level: number
  history: { ts: string; invoice_id: string; contractor: string; qty: number }[]
}
type InvoiceResult = {
  id: string; contractor: string; issued_at: string
  items: { inventory_id: string; item_name: string; qty: number }[]
}

function SearchPage() {
  const [type,     setType]     = useState<'item' | 'invoice'>('item')
  const [query,    setQuery]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [itemRes,  setItemRes]  = useState<ItemResult | null>(null)
  const [invRes,   setInvRes]   = useState<InvoiceResult | null>(null)
  const [notFound, setNotFound] = useState(false)

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    setItemRes(null)
    setInvRes(null)
    setNotFound(false)

    const res  = await fetch(`/api/search?type=${type}&q=${encodeURIComponent(query.trim())}`)
    const data = await res.json()

    if (data.notFound) {
      setNotFound(true)
    } else if (data.type === 'item') {
      setItemRes(data.result)
    } else if (data.type === 'invoice') {
      setInvRes(data.result)
    }

    setLoading(false)
  }

  return (
    <>
      <div className="topbar">
        <h1 className="page-heading">Search</h1>
      </div>
      <div className="page-content">
        <div className="card mb-20" style={{ maxWidth: 540 }}>
          <div className="form-group">
            <label className="form-label">Search type</label>
            <select
              className="form-input"
              value={type}
              onChange={e => {
                setType(e.target.value as 'item' | 'invoice')
                setItemRes(null); setInvRes(null); setNotFound(false)
              }}
            >
              <option value="item">Search by Item Code / Name</option>
              <option value="invoice">Search by Invoice Number</option>
            </select>
          </div>
          <div className="flex gap-8">
            <input
              className="form-input"
              placeholder={type === 'item' ? 'e.g. ITM0000001 or "Cable Tie"' : 'e.g. CF2026041100001'}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
            />
            <button className="btn btn-primary" onClick={search} disabled={loading} style={{ whiteSpace: 'nowrap' }}>
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>
        </div>

        {notFound && (
          <div className="alert alert-error" style={{ maxWidth: 540 }}>No results found for &ldquo;{query}&rdquo;.</div>
        )}

        {itemRes && (
          <div style={{ maxWidth: 640 }}>
            <div className="card mb-16">
              <div className="flex items-center justify-between mb-16">
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{itemRes.name}</div>
                  <div className="mono text-muted" style={{ marginTop: 2 }}>{itemRes.id}</div>
                </div>
                <span className={`badge ${itemRes.stock <= itemRes.min_level ? 'badge-red' : 'badge-green'}`}>
                  {itemRes.stock <= itemRes.min_level ? 'Low Stock' : 'OK'}
                </span>
              </div>
              <div className="grid-2">
                <div className="stat-card"><div className="stat-label">Current Stock</div><div className="stat-value">{itemRes.stock.toLocaleString()}</div></div>
                <div className="stat-card"><div className="stat-label">Min Level</div><div className="stat-value">{itemRes.min_level}</div></div>
              </div>
            </div>
            <div className="card">
              <div className="card-title">Issuing History ({itemRes.history.length} invoices)</div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Date</th><th>Invoice #</th><th>Contractor</th><th>Qty Issued</th></tr></thead>
                  <tbody>
                    {itemRes.history.length === 0 ? (
                      <tr><td colSpan={4}><div className="empty-state">No issuing history</div></td></tr>
                    ) : itemRes.history.map((h, i) => (
                      <tr key={i}>
                        <td className="text-muted" style={{ fontSize: 12 }}>{formatDate(h.ts)}</td>
                        <td><Link href={`/invoices/${h.invoice_id}`} className="link mono" style={{ fontSize: 12 }}>{h.invoice_id}</Link></td>
                        <td>{h.contractor}</td>
                        <td><strong className="text-danger">-{h.qty}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {invRes && (
          <div style={{ maxWidth: 580 }}>
            <div className="card mb-16">
              <div style={{ fontSize: 18, fontWeight: 600 }} className="mono mb-4">{invRes.id}</div>
              <div className="text-muted text-sm mb-16">{formatDate(invRes.issued_at)}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', rowGap: 8, fontSize: 13 }}>
                <div className="text-muted">Contractor</div> <div className="fw-500">{invRes.contractor}</div>
                <div className="text-muted">Line Items</div>  <div>{invRes.items.length}</div>
              </div>
            </div>
            <div className="card">
              <div className="card-title">Items Issued</div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Item Code</th><th>Name</th><th>Qty</th></tr></thead>
                  <tbody>
                    {invRes.items.map((item, i) => (
                      <tr key={i}>
                        <td><Link href={`/items/${item.inventory_id}`} className="link mono" style={{ fontSize: 12 }}>{item.inventory_id}</Link></td>
                        <td>{item.item_name}</td>
                        <td><strong>{item.qty}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default function SearchPageWrapper() {
  return <RequireAuth><SearchPage /></RequireAuth>
}
