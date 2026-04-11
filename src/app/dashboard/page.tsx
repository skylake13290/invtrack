'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, type InventoryItem, type Invoice } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import RequireAuth from '@/components/RequireAuth'
import { useAuth } from '@/lib/AuthContext'

function Dashboard() {
  const { canWrite } = useAuth()
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [invoices,  setInvoices]  = useState<Invoice[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('inventory').select('*').eq('active', true),
      supabase.from('invoices').select('*').order('issued_at', { ascending: false }).limit(5),
    ]).then(([inv, invs]) => {
      setInventory(inv.data ?? [])
      setInvoices(invs.data ?? [])
      setLoading(false)
    })
  }, [])

  const totalStock = inventory.reduce((s, i) => s + i.stock, 0)
  const lowItems   = inventory.filter(i => i.stock <= i.min_level)

  if (loading) return <div className="page-content"><div className="spinner" style={{ margin: '60px auto' }} /></div>

  return (
    <>
      <div className="topbar">
        <h1 className="page-heading">Dashboard</h1>
        {canWrite && (
          <div className="topbar-actions">
            <Link href="/issue" className="btn btn-primary">+ Issue Items</Link>
          </div>
        )}
      </div>
      <div className="page-content">
        <div className="grid-4 mb-20">
          <div className="stat-card"><div className="stat-label">Total Items</div><div className="stat-value">{inventory.length}</div><div className="stat-sub">active inventory items</div></div>
          <div className="stat-card"><div className="stat-label">Total Stock</div><div className="stat-value">{totalStock.toLocaleString()}</div><div className="stat-sub">units on hand</div></div>
          <div className="stat-card">
            <div className="stat-label">Low Stock</div>
            <div className="stat-value" style={{ color: lowItems.length > 0 ? '#dc2626' : '#16a34a' }}>{lowItems.length}</div>
            <div className="stat-sub">items need reorder</div>
          </div>
          <div className="stat-card"><div className="stat-label">Last Five Invoices</div><div className="stat-value">{invoices.length}</div><div className="stat-sub">all time</div></div>
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="card-title">Low Stock Alerts</div>
            {lowItems.length === 0
              ? <p className="text-muted text-sm">All items are sufficiently stocked ✓</p>
              : lowItems.map(item => (
                <Link key={item.id} href={`/items/${item.id}`} style={{ textDecoration: 'none' }}>
                  <div className="alert alert-warning mb-8" style={{ cursor: 'pointer' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1L0 15h16L8 1zm0 3l5.5 9.5H2.5L8 4zM7 7h2v4H7V7zm0 5h2v2H7v-2z"/></svg>
                    <div>
                      <div className="fw-500 text-sm">{item.id} — {item.name}</div>
                      <div style={{ fontSize: 11 }}>Stock: {item.stock} / Min: {item.min_level}</div>
                    </div>
                  </div>
                </Link>
              ))
            }
          </div>
          <div className="card">
            <div className="card-title">Recent Invoices</div>
            {invoices.length === 0
              ? <p className="text-muted text-sm">No invoices yet.</p>
              : invoices.map(inv => (
                <Link key={inv.id} href={`/invoices/${inv.id}`} style={{ textDecoration: 'none' }}>
                  <div className="alert alert-info mb-8" style={{ cursor: 'pointer' }}>
                    <div style={{ flex: 1 }}>
                      <div className="fw-500 text-sm mono">{inv.id}</div>
                      <div style={{ fontSize: 11 }}>{inv.contractor}</div>
                    </div>
                    <div style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{formatDate(inv.issued_at)}</div>
                  </div>
                </Link>
              ))
            }
          </div>
        </div>
      </div>
    </>
  )
}

export default function DashboardPage() {
  return <RequireAuth><Dashboard /></RequireAuth>
}
