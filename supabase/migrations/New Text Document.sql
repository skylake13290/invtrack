-- Drop existing constraints
ALTER TABLE stock_movements DROP CONSTRAINT stock_movements_inventory_id_fkey;
ALTER TABLE restock_logs DROP CONSTRAINT restock_logs_item_id_fkey;
ALTER TABLE invoice_items DROP CONSTRAINT invoice_items_inventory_id_fkey;

-- Re-add with CASCADE
ALTER TABLE stock_movements
  ADD CONSTRAINT stock_movements_inventory_id_fkey
  FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE;

ALTER TABLE restock_logs
  ADD CONSTRAINT restock_logs_item_id_fkey
  FOREIGN KEY (item_id) REFERENCES inventory(id) ON DELETE CASCADE;

ALTER TABLE invoice_items
  ADD CONSTRAINT invoice_items_inventory_id_fkey
  FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE;