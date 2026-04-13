'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { UserRole } from '@/lib/supabase'

interface User {
  id: string
  username: string
  role: UserRole
  must_reset_password: boolean
}

interface Profile {
  role: UserRole
}

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
  canWrite: boolean
  profile: Profile | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      const userData = JSON.parse(stored)
      setUser(userData)
      setProfile({ role: userData.role })
    }
    setLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Login failed')
    }

    const userData = await res.json()
    setUser(userData)
    setProfile({ role: userData.role })
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const logout = () => {
    const stored = localStorage.getItem('user')
    if (stored) {
      try {
        const userData = JSON.parse(stored)
        fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userData.id, username: userData.username, role: userData.role })
        }).catch(() => {}) // fire-and-forget
      } catch {}
    }
    setUser(null)
    setProfile(null)
    localStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, canWrite: user?.role === 'admin' || user?.role === 'editor', profile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
