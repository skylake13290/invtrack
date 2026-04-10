import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/auth'

export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('stock_movements')
    .select('*, inventory(name)')
    .order('ts', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
