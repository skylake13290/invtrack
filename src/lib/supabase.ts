import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
})

// ── Inventory types ───────────────────────────────────────────
export type InventoryItem = {
  id: string; name: string; stock: number; min_level: number
  active: boolean; created_at: string; updated_at: string
}
export type Invoice = {
  id: string; contractor: string; issued_at: string; created_at: string
}
export type InvoiceItem = {
  id: number; invoice_id: string; inventory_id: string; qty: number
}
export type StockMovement = {
  id: number; inventory_id: string; qty_change: number
  action: 'issue' | 'restock' | 'adjustment'; reference: string | null; ts: string
}
export type ActionType = 'issue' | 'restock' | 'adjustment'

// ── Auth / Users ─────────────────────────────────────────────
export type UserRole = 'admin' | 'editor' | 'viewer'
export type UserProfile = {
  id: string; username: string; full_name: string | null
  role: UserRole; is_active: boolean; created_at: string; updated_at: string
}
export type ActivityLog = {
  id: number; user_id: string | null; username: string | null; role: string | null
  action: string; entity_type: string | null; entity_id: string | null
  detail: Record<string, unknown> | null; ip_address: string | null; ts: string
}

// ── Activity logger ───────────────────────────────────────────
export async function logActivity(params: {
  action: string; entity_type?: string; entity_id?: string
  detail?: Record<string, unknown>
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data: profile } = await supabase
    .from('user_profiles').select('username, role').eq('id', user.id).single()
  await supabase.from('activity_log').insert({
    user_id: user.id,
    username: profile?.username ?? user.email ?? 'unknown',
    role: profile?.role ?? 'viewer',
    action: params.action,
    entity_type: params.entity_type ?? null,
    entity_id: params.entity_id ?? null,
    detail: params.detail ?? null,
  })
}
