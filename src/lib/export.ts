import * as XLSX from 'xlsx'
import type { InventoryItem, Invoice, InvoiceItem, StockMovement } from './supabase'

export function exportToExcel(data: {
  inventory: InventoryItem[]
  invoices: Invoice[]
  invoiceItems: InvoiceItem[]
  stockMovements: StockMovement[]
}) {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Inventory
  const invRows = data.inventory.filter(i => i.active).map(i => ({
    'Item Code':     i.id,
    'Name':          i.name,
    'Stock':         i.stock,
    'Min Level':     i.min_level,
    'Status':        i.stock <= i.min_level ? 'LOW STOCK' : 'OK',
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invRows), 'Inventory')

  // Sheet 2: Low Stock
  const lowRows = data.inventory.filter(i => i.active && i.stock <= i.min_level).map(i => ({
    'Item Code': i.id,
    'Name':      i.name,
    'Stock':     i.stock,
    'Min Level': i.min_level,
    'Deficit':   i.min_level - i.stock,
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lowRows), 'Low Stock')

  // Sheet 3: Invoices
  const itemMap = new Map<string, InvoiceItem[]>()
  data.invoiceItems.forEach(r => {
    if (!itemMap.has(r.invoice_id)) itemMap.set(r.invoice_id, [])
    itemMap.get(r.invoice_id)!.push(r)
  })
  const invListRows = data.invoices.map(inv => ({
    'Invoice #':   inv.id,
    'Contractor':  inv.contractor,
    'Job Type':    inv.job_type ?? '',
    'Issued At':   inv.issued_at,
    'Line Items':  itemMap.get(inv.id)?.length ?? 0,
    'Total Units': itemMap.get(inv.id)?.reduce((s, r) => s + r.qty, 0) ?? 0,
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invListRows), 'Invoices')

  // Sheet 4: Invoice Items (detailed)
  const invMap = new Map(data.invoices.map(i => [i.id, i]))
  const itemNameMap = new Map(data.inventory.map(i => [i.id, i.name]))
  const detailRows = data.invoiceItems.map(r => ({
    'Invoice #':   r.invoice_id,
    'Contractor':  invMap.get(r.invoice_id)?.contractor ?? '',
    'Job Type':    invMap.get(r.invoice_id)?.job_type ?? '',
    'Issued At':   invMap.get(r.invoice_id)?.issued_at ?? '',
    'Item Code':   r.inventory_id,
    'Item Name':   itemNameMap.get(r.inventory_id) ?? '',
    'Qty Issued':  r.qty,
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows), 'Invoice Items')

  // Sheet 5: Stock Movements
  const movRows = data.stockMovements.map(m => ({
    'Timestamp':   m.ts,
    'Item Code':   m.inventory_id,
    'Item Name':   itemNameMap.get(m.inventory_id) ?? '',
    'Qty Change':  m.qty_change,
    'Action':      m.action,
    'Reference':   m.reference ?? '',
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(movRows), 'Stock Log')

  XLSX.writeFile(wb, `invtrack_export_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
