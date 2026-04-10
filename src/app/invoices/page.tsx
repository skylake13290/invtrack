'use client'
import RequireAuth from '@/components/RequireAuth'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, type Invoice } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'

function InvoicesPage() {
  const [invoices, setInvoices] = useState<(Invoice & { item_count: number })[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('invoices').select('*').order('issued_at', { ascending: false }),
      supabase.from('invoice_items').select('invoice_id'),
    ]).then(([invRes, itemsRes]) => {
      const countMap = new Map<string, number>()
      itemsRes.data?.forEach(r => countMap.set(r.invoice_id, (countMap.get(r.invoice_id) ?? 0) + 1))
      setInvoices((invRes.data ?? []).map(inv => ({ ...inv, item_count: countMap.get(inv.id) ?? 0 })))
      setLoading(false)
    })
  }, [])

  const filtered = invoices.filter(i =>
    !search ||
    i.id.toLowerCase().includes(search.toLowerCase()) ||
    i.contractor.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="topbar">
        <h1 className="page-heading">Invoices</h1>
        <div className="topbar-actions">
          <Link href="/issue" className="btn btn-primary">+ New Invoice</Link>
        </div>
      </div>
      <div className="page-content">
        <div className="search-wrap mb-16" style={{ width: 280 }}>
          <span className="search-icon">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M10.5 10.5l3.5 3.5-1 1-3.5-3.5A6 6 0 111.5 6 6 6 0 0110.5 10.5zM6 11A5 5 0 106 1a5 5 0 000 10z"/></svg>
          </span>
          <input className="form-input" placeholder="Search invoices…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? <div className="spinner" /> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Invoice #</th><th>Contractor</th><th>Date Issued</th><th>Items</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5}><div className="empty-state">No invoices found</div></td></tr>
                ) : filtered.map(inv => (
                  <tr key={inv.id}>
                    <td><span className="mono">{inv.id}</span></td>
                    <td className="fw-500">{inv.contractor}</td>
                    <td className="text-muted">{formatDate(inv.issued_at)}</td>
                    <td><span className="badge badge-gray">{inv.item_count} line{inv.item_count !== 1 ? 's' : ''}</span></td>
                    <td><Link href={`/invoices/${inv.id}`} className="btn btn-sm">View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

export default function InvoicesPageWrapper() {
  return <RequireAuth><InvoicesPage /></RequireAuth>
}
