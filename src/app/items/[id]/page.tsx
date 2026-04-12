'use client'
import RequireAuth from '@/components/RequireAuth'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { type InventoryItem, type StockMovement } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'

type Movement = StockMovement & { contractor?: string | null }

function ItemDetailPage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id)
  const [item,      setItem]      = useState<InventoryItem | null>(null)
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    fetch(`/api/items/${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(data => {
        setItem(data.item ?? null)
        setMovements(data.movements ?? [])
        setLoading(false)
      })
  }, [id])

  if (loading) return <div className="page-content"><div className="spinner" style={{ margin: '60px auto' }} /></div>
  if (!item) return <div className="page-content"><div className="alert alert-error">Item not found.</div></div>

  const isLow = item.stock <= item.min_level
  const issued = movements.filter(m => m.action === 'issue').reduce((s, m) => s + Math.abs(m.qty_change), 0)

  return (
    <>
      <div className="topbar">
        <h1 className="page-heading">Item Detail</h1>
        <div className="topbar-actions">
          <Link href="/inventory" className="btn">← Inventory</Link>
        </div>
      </div>
      <div className="page-content">

        <div className="card mb-16" style={{ maxWidth: 640 }}>
          <div className="flex items-center justify-between mb-16">
            <div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{item.name}</div>
              <div className="mono text-muted" style={{ marginTop: 2 }}>{item.id}</div>
            </div>
            <span className={`badge ${isLow ? 'badge-red' : 'badge-green'}`}>{isLow ? 'Low Stock' : 'OK'}</span>
          </div>
          <div className="grid-3">
            <div className="stat-card">
              <div className="stat-label">Current Stock</div>
              <div className="stat-value" style={{ color: isLow ? '#dc2626' : undefined }}>{item.stock.toLocaleString()}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Min Level</div>
              <div className="stat-value">{item.min_level}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Issued</div>
              <div className="stat-value">{issued.toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ maxWidth: 640 }}>
          <div className="card-title">Stock History ({movements.length} movements)</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Date</th><th>Type</th><th>Change</th><th>Reference</th><th>Contractor</th></tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr><td colSpan={5}><div className="empty-state">No movements recorded</div></td></tr>
                ) : movements.map(m => (
                  <tr key={m.id}>
                    <td className="text-muted" style={{ fontSize: 12 }}>{formatDate(m.ts)}</td>
                    <td>
                      <span className={`badge ${m.action === 'issue' ? 'badge-red' : m.action === 'restock' ? 'badge-green' : 'badge-blue'}`}>
                        {m.action}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: m.qty_change < 0 ? '#dc2626' : '#16a34a' }}>
                        {m.qty_change > 0 ? '+' : ''}{m.qty_change}
                      </strong>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {m.reference && m.action === 'issue'
                        ? <Link href={`/invoices/${m.reference}`} className="link mono">{m.reference}</Link>
                        : <span className="text-muted">{m.reference ?? '—'}</span>
                      }
                    </td>
                    <td className="text-muted" style={{ fontSize: 12 }}>{m.contractor ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  )
}

export default function ItemDetailPageWrapper({ params }: { params: { id: string } }) {
  return <RequireAuth><ItemDetailPage params={params} /></RequireAuth>
}
