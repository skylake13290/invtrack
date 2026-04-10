'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'

const nav = [
  { section: 'Main' },
  { href: '/dashboard',  label: 'Dashboard',  icon: 'grid' },
  { href: '/issue',      label: 'Issue Items', icon: 'issue' },
  { href: '/restock',    label: 'Restock',     icon: 'restock' },
  { section: 'Records' },
  { href: '/inventory',  label: 'Inventory',  icon: 'box' },
  { href: '/invoices',   label: 'Invoices',   icon: 'invoice' },
  { href: '/stock-log',  label: 'Stock Log',  icon: 'log' },
  { section: 'Tools' },
  { href: '/search',     label: 'Search',     icon: 'search' },
  { href: '/export',     label: 'Export',     icon: 'export' },
  { section: 'Admin', adminOnly: true },
  { href: '/admin/users',    label: 'Users',        icon: 'users',    adminOnly: true },
  { href: '/admin/activity', label: 'Activity Log', icon: 'activity', adminOnly: true },
]

const roleColors: Record<string, string> = {
  admin: '#185FA5', editor: '#15803d', viewer: '#6b7280',
}

function Icon({ name }: { name: string }) {
  const icons: Record<string, string> = {
    grid:     'M1 1h6v6H1V1zm8 0h6v6H9V1zM1 9h6v6H1V9zm8 0h6v6H9V9z',
    issue:    'M8 1a7 7 0 100 14A7 7 0 008 1zm1 3v4l3 1.5-.5 1L8 9V4h1z',
    restock:  'M8 1L1 5v6l7 4 7-4V5L8 1zM8 3l4 2-4 2-4-2 4-2zm-5 3.5L7 9v5l-4-2v-5.5zm6 7.5V9l4-2.5V12l-4 2z',
    box:      'M8 1l7 3v8l-7 3L1 12V4l7-3zm0 2L3 5.5 8 8l5-2.5L8 3zM2 6.5v5l5 2.5V9L2 6.5zm7 7.5l5-2.5v-5L9 9v5z',
    invoice:  'M3 1h10l1 2v12H2V3l1-2zm1 2v10h8V3H4zm1 2h6v1H5V5zm0 2h6v1H5V7zm0 2h4v1H5V9z',
    log:      'M2 1h12v14H2V1zm2 2v10h8V3H4zm1 1h6v1H5V4zm0 2h6v1H5V6zm0 2h4v1H5V8z',
    search:   'M10.5 10.5l3.5 3.5-1 1-3.5-3.5A6 6 0 111.5 6 6 6 0 0110.5 10.5zM6 11A5 5 0 106 1a5 5 0 000 10z',
    export:   'M9 1H3a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V5L9 1zm0 1.5L12.5 5H9V2.5zM4 11l2-3 1.5 2 1.5-2 2 3H4z',
    users:    'M8 8a3 3 0 100-6 3 3 0 000 6zm-5 6a5 5 0 0110 0H3z',
    activity: 'M1 8h2l2-5 3 10 2-5h3l1-2h-4L8 11 5 1 3 6H1z',
  }
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d={icons[name] ?? ''} />
    </svg>
  )
}

export default function Sidebar() {
  const path = usePathname()
  const { user, logout } = useAuth()
  const isAdmin = user?.role === 'admin'

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">HS</div>
        <div>
          <div className="logo-text">Hardware</div>
          <div className="logo-sub">Store System</div>
        </div>
      </div>

      <nav className="nav" style={{ flex: 1 }}>
        {nav.map((item, i) => {
          if ('section' in item) {
            if (item.adminOnly && !isAdmin) return null
            return <div key={i} className="nav-section">{item.section}</div>
          }
          if (item.adminOnly && !isAdmin) return null
          const active = path === item.href || (item.href !== '/dashboard' && path.startsWith(item.href!))
          return (
            <Link key={item.href} href={item.href!} className={`nav-link ${active ? 'active' : ''}`}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {user && (
        <div style={{ padding: '12px 14px', borderTop: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: roleColors[user.role] ?? '#e5e7eb',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 12, fontWeight: 600, flexShrink: 0,
            }}>
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.username}
              </div>
              <div style={{ fontSize: 11, color: roleColors[user.role], fontWeight: 600, textTransform: 'capitalize' }}>
                {user.role}
              </div>
            </div>
          </div>
          <button onClick={logout} className="btn btn-sm" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}>
            Sign Out
          </button>
        </div>
      )}
    </aside>
  )
}
