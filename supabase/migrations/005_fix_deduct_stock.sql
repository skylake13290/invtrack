DROP FUNCTION IF EXISTS deduct_stock(text, numeric) CASCADE;

CREATE OR REPLACE FUNCTION deduct_stock(
  p_inventory_id TEXT,
  p_qty NUMERIC,
  p_invoice_id TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_username TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE inventory
  SET stock = stock - p_qty
  WHERE id = p_inventory_id AND stock >= p_qty;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock for item %', p_inventory_id;
  END IF;

  INSERT INTO stock_movements (inventory_id, qty_change, action, reference, user_id, username)
  VALUES (p_inventory_id, -p_qty, 'issue', p_invoice_id, p_user_id, p_username);
END;
$$;