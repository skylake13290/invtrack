/**
 * src/lib/auth.ts  (FIXED)
 * ---------------------------------------------------------
 * Changes from original:
 *  1. generatePassword() now uses crypto.getRandomValues()
 *     instead of Math.random() — cryptographically secure PRNG
 * ---------------------------------------------------------
 */
import { createClient } from '@supabase/supabase-js'
import * as bcrypt from 'bcryptjs'

export function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12) // increased cost factor from 10 → 12
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Generates a cryptographically random 12-character password.
 *
 * FIX: Replaced Math.random() (not cryptographically secure) with
 * crypto.getRandomValues() which uses the OS CSPRNG.
 */
export function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes) // Node.js built-in — no import needed
  return Array.from(bytes)
    .map(b => chars[b % chars.length])
    .join('')
}
