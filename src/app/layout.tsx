import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/AuthContext'
import AppShell from '@/components/AppShell'

export const metadata: Metadata = {
  title: 'Hardware Store System',
  description: 'Complete inventory management with auto-generated IDs and authentication',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
