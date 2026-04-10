export function formatDate(ts: string): string {
  const d = new Date(ts)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function isLowStock(stock: number, minLevel: number): boolean {
  return stock <= minLevel
}

export function generateInvoiceId(seq: number): string {
  const year = new Date().getFullYear()
  return `INV${year}-${String(seq).padStart(4, '0')}`
}

export function localDateTimeNow(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}
