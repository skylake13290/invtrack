'use client'
import { useEffect, useState } from 'react'
import { type ActivityLog } from '@/lib/supabase'
import RequireAuth from '@/components/RequireAuth'
import { formatDate } from '@/lib/utils'

const actionColors: Record<string, string> = {
  login:            'badge-green',
  logout:           'badge-gray',
  logout_idle:      'badge-yellow',
  create_invoice:   'badge-blue',
  create_user:      'badge-blue',
  edit_user:        'badge-blue',
  deactivate_user:  'badge-red',
  reactivate_user:  'badge-green',
  restock:          'badge-green',
  view_report:      'badge-gray',
}

function ActivityPage() {
  const [logs,    setLogs]    = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState('')
  const [page,    setPage]    = useState(0)
  const PAGE_SIZE = 50

  const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/activity-log?page=${page}&limit=${PAGE_SIZE}`)
    const data = await res.json()
    setLogs(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [page])

  const uniqueActions = [...new Set(logs.map(l => l.action))].sort()

  const filtered = logs.filter(l => {
    if (filter && l.action !== filter) return false
    if (search) {
      const s = search.toLowerCase()
      return (
        (l.username ?? '').toLowerCase().includes(s) ||
        l.action.toLowerCase().includes(s) ||
        (l.entity_id ?? '').toLowerCase().includes(s)
      )
    }
    return true
  })

  return (
    <>
      <div className="topbar">
        <h1 className="page-heading">Activity Log</h1>
        <div className="topbar-actions">
          <button className="btn btn-sm" onClick={load}>↻ Refresh</button>
        </div>
      </div>
      <div className="page-content">

        <div className="grid-4 mb-20">
          <div className="stat-card">
            <div className="stat-label">Total Events</div>
            <div className="stat-value">{logs.length}</div>
            <div className="stat-sub">this page</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Logins</div>
            <div className="stat-value">{logs.filter(l => l.action === 'login').length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Idle Logouts</div>
            <div className="stat-value">{logs.filter(l => l.action === 'logout_idle').length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Invoices Created</div>
            <div className="stat-value">{logs.filter(l => l.action === 'create_invoice').length}</div>
          </div>
        </div>

        <div className="flex gap-12 mb-16">
          <div className="search-wrap" style={{ width: 280 }}>
            <span className="search-icon">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M10.5 10.5l3.5 3.5-1 1-3.5-3.5A6 6 0 111.5 6 6 6 0 0110.5 10.5zM6 11A5 5 0 106 1a5 5 0 000 10z"/>
              </svg>
            </span>
            <input className="form-input" placeholder="Search user, action, entity…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-input" style={{ width: 200 }} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">All actions</option>
            {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {loading ? <div className="spinner" /> : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Time</th><th>User</th><th>Role</th><th>Action</th><th>Entity</th><th>Detail</th></tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6}><div className="empty-state">No log entries found</div></td></tr>
                  ) : filtered.map(l => (
                    <tr key={l.id}>
                      <td className="text-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(l.ts)}</td>
                      <td>
                        <div className="fw-500" style={{ fontSize: 13 }}>{l.username ?? '—'}</div>
                      </td>
                      <td>
                        {l.role && (
                          <span className={`badge ${l.role === 'admin' ? 'badge-blue' : l.role === 'editor' ? 'badge-green' : 'badge-gray'}`}>
                            {l.role}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${actionColors[l.action] ?? 'badge-gray'}`}>
                          {l.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {l.entity_type && (
                          <span className="text-muted">{l.entity_type}: </span>
                        )}
                        {l.entity_id && (
                          <span className="mono">{l.entity_id}</span>
                        )}
                      </td>
                      <td style={{ fontSize: 11, color: '#6b7280', maxWidth: 200 }}>
                        {l.detail ? (
                          <span title={JSON.stringify(l.detail, null, 2)} style={{ cursor: 'help' }}>
                            {Object.entries(l.detail).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-8 items-center" style={{ marginTop: 16 }}>
              <button className="btn btn-sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Previous</button>
              <span className="text-muted text-sm">Page {page + 1}</span>
              <button className="btn btn-sm" onClick={() => setPage(p => p + 1)} disabled={logs.length < PAGE_SIZE}>Next →</button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

export default function ActivityPageWrapper() {
  return <RequireAuth minRole="admin"><ActivityPage /></RequireAuth>
}
