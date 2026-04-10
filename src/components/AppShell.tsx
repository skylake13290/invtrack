'use client'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const isPublic = path === '/login'

  if (isPublic) {
    return <>{children}</>
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main">{children}</main>
    </div>
  )
}
