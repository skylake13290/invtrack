'use client'
import RequireAuth from '@/components/RequireAuth'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { exportToExcel } from '@/lib/export'

function ExportPage() {
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)

  const handleExport = async () => {
    setLoading(true)
    setDone(false)
    const [inv, invoices, items, movements] = await Promise.all([
      supabase.from('inventory').select('*').eq('active', true),
      supabase.from('invoices').select('*').order('issued_at', { ascending: false }),
      supabase.from('invoice_items').select('*'),
      supabase.from('stock_movements').select('*').order('ts', { ascending: false }),
    ])
    exportToExcel({
      inventory:      inv.data      ?? [],
      invoices:       invoices.data ?? [],
      invoiceItems:   items.data    ?? [],
      stockMovements: movements.data ?? [],
    })
    setLoading(false)
    setDone(true)
  }

  return (
    <>
      <div className="topbar"><h1 className="page-heading">Export Data</h1></div>
      <div className="page-content">
        <div className="card" style={{ maxWidth: 480 }}>
          <div className="card-title">Excel Export</div>
          <p className="text-muted mb-16" style={{ fontSize: 13, lineHeight: 1.6 }}>
            Downloads a single <strong>.xlsx</strong> file with five sheets:
          </p>
          <ul style={{ fontSize: 13, color: '#4b5563', paddingLeft: 18, marginBottom: 20, lineHeight: 2 }}>
            <li>Inventory — all active items with stock levels</li>
            <li>Low Stock — items at or below minimum level</li>
            <li>Invoices — full invoice list with totals</li>
            <li>Invoice Items — per-line issuing detail</li>
            <li>Stock Log — complete movement audit trail</li>
          </ul>
          {done && <div className="alert alert-success mb-12">Download started — check your downloads folder.</div>}
          <button className="btn btn-primary" onClick={handleExport} disabled={loading}>
            {loading ? 'Preparing…' : '⬇ Download Excel'}
          </button>
        </div>
      </div>
    </>
  )
}

export default function ExportPageWrapper() {
  return <RequireAuth><ExportPage /></RequireAuth>
}
