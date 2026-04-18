-- Allow 'invoice_edit' as a valid action in stock_movements
ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_action_check;
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_action_check
  CHECK (action IN ('issue', 'restock', 'adjustment', 'invoice_edit'));