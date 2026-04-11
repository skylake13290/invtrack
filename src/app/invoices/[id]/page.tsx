'use client'
import RequireAuth from '@/components/RequireAuth'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, type Invoice, type InvoiceItem } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'

function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id)
  const [invoice,  setInvoice]  = useState<Invoice | null>(null)
  const [items,    setItems]    = useState<(InvoiceItem & { item_name: string })[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    supabase
      .from('invoices')
      .select('*, invoice_items(count)')
      .order('issued_at', { ascending: false })
      .then(({ data }) => {
        setInvoices(
          (data ?? []).map(inv => ({
            ...inv,
            item_count: inv.invoice_items[0]?.count ?? 0,
          }))
        )
        setLoading(false)
      })
  }, [id])

  if (loading) return <div className="page-content"><div className="spinner" style={{ margin: '60px auto' }} /></div>
  if (!invoice) return <div className="page-content"><div className="alert alert-error">Invoice not found.</div></div>

  const totalUnits = items.reduce((s, i) => s + i.qty, 0)

  return (
    <>
      <div className="topbar">
        <h1 className="page-heading">Invoice Detail</h1>
        <div className="topbar-actions">
          <Link href="/invoices" className="btn">← All Invoices</Link>
        </div>
      </div>
      <div className="page-content">
        <div className="card mb-16" style={{ maxWidth: 620 }}>
          <div className="flex items-center justify-between mb-16">
            <div>
              <div style={{ fontSize: 20, fontWeight: 600 }} className="mono">{invoice.id}</div>
              <div className="text-muted text-sm" style={{ marginTop: 2 }}>{formatDate(invoice.issued_at)}</div>
            </div>
            <span className="badge badge-blue">Issued</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 10 }}>
            <div className="text-muted">Contractor</div>   <div className="fw-500">{invoice.contractor}</div>
            <div className="text-muted">Invoice #</div>    <div className="mono">{invoice.id}</div>
            <div className="text-muted">Date Issued</div>  <div>{formatDate(invoice.issued_at)}</div>
            <div className="text-muted">Line Items</div>   <div>{items.length}</div>
            <div className="text-muted">Total Units</div>  <div><strong>{totalUnits}</strong></div>
          </div>
        </div>

        <div className="card" style={{ maxWidth: 620 }}>
          <div className="card-title">Items Issued</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Item Code</th><th>Name</th><th>Qty Issued</th></tr></thead>
              <tbody>
                {items.map(row => (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/items/${row.inventory_id}`} className="link mono">{row.inventory_id}</Link>
                    </td>
                    <td>{row.item_name}</td>
                    <td><strong>{row.qty}</strong></td>
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

export default function InvoiceDetailPageWrapper({ params }: { params: { id: string } }) {
  return <RequireAuth><InvoiceDetailPage params={params} /></RequireAuth>
}
