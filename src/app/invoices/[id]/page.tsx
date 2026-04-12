'use client'
import RequireAuth from '@/components/RequireAuth'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

type InvoiceDetail = {
  id: string
  contractor: string
  issued_at: string
  created_at: string
  invoice_items: { id: number; inventory_id: string; qty: number }[]
}

function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id)
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/invoices/${encodeURIComponent(id)}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null }
        return r.json()
      })
      .then(data => {
        if (data) { setInvoice(data); setLoading(false) }
      })
  }, [id])

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

            <div className="text-muted">Date Issued</div>
            <div>{formatDate(invoice.issued_at)}</div>

            <div className="text-muted">Line Items</div>
            <div>{invoice.invoice_items.length} item type{invoice.invoice_items.length !== 1 ? 's' : ''}</div>

            <div className="text-muted">Total Units</div>
            <div>{totalQty.toLocaleString()} units</div>
          </div>
        </div>

        <div className="card" style={{ maxWidth: 640 }}>
          <div className="card-title">Items Issued</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Item Code</th><th>Quantity</th></tr>
              </thead>
              <tbody>
                {invoice.invoice_items.length === 0 ? (
                  <tr><td colSpan={3}><div className="empty-state">No items on this invoice</div></td></tr>
                ) : invoice.invoice_items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="text-muted" style={{ fontSize: 12 }}>{idx + 1}</td>
                    <td>
                      <Link href={`/items/${item.inventory_id}`} className="link mono" style={{ fontSize: 13 }}>
                        {item.inventory_id}
                      </Link>
                    </td>
                    <td><strong>{item.qty}</strong></td>
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
