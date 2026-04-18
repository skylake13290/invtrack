'use client'
/**
 * src/lib/AuthContext.tsx  (FIXED)
 * ---------------------------------------------------------
 * Changes from original:
 *  1. No auth state in localStorage — user info is fetched from
 *     /api/auth/me which reads the HttpOnly session cookie
 *  2. Role/identity cannot be tampered with by client-side JS
 *  3. logout() calls the server to clear the cookie
 * ---------------------------------------------------------
 */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { UserRole } from '@/lib/supabase'

interface User {
  id: string
  username: string
  role: UserRole
  must_reset_password: boolean
}

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loading: boolean
  canWrite: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // On mount: verify session with the server (reads HttpOnly cookie automatically)
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setUser(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const login = async (username: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: 'include', // ensures cookie is received and stored
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Login failed')
    }

    const userData = await res.json()
    setUser(userData)
    // FIX: No localStorage — the HttpOnly cookie is set by the server response
  }

  const logout = async () => {
    // Call server to clear the cookie and log the action
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      loading,
      canWrite: user?.role === 'admin' || user?.role === 'editor',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
