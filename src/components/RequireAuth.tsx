'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import type { UserRole } from '@/lib/supabase'

type Props = {
  children: React.ReactNode
  minRole?: UserRole   // 'viewer' | 'editor' | 'admin'
}

const roleRank: Record<UserRole, number> = { viewer: 1, editor: 2, admin: 3 }

export default function RequireAuth({ children, minRole = 'viewer' }: Props) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user, router])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!user) return null

  if (profile && roleRank[profile.role as UserRole] < roleRank[minRole]) {
    return (
      <div className="page-content">
        <div className="alert alert-error" style={{ maxWidth: 480 }}>
          <strong>Access denied.</strong> You need <strong>{minRole}</strong> access for this page.
          Your current role is <strong>{profile.role}</strong>.
        </div>
      </div>
    )
  }

  return <>{children}</>
}
