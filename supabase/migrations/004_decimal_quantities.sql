-- ============================================================
-- Migration 004: Enable decimal quantities
-- Changes INTEGER → NUMERIC(10,3) for all stock/qty columns
-- and updates stored functions to match.
-- ============================================================

-- 1. inventory table
ALTER TABLE inventory
  ALTER COLUMN stock     TYPE NUMERIC(10,3) USING stock::NUMERIC(10,3),
  ALTER COLUMN min_level TYPE NUMERIC(10,3) USING min_level::NUMERIC(10,3);

-- 2. invoice_items table
ALTER TABLE invoice_items
  ALTER COLUMN qty TYPE NUMERIC(10,3) USING qty::NUMERIC(10,3);

-- 3. stock_movements table
ALTER TABLE stock_movements
  ALTER COLUMN qty_change TYPE NUMERIC(10,3) USING qty_change::NUMERIC(10,3);

-- 4. restock_logs table
ALTER TABLE restock_logs
  ALTER COLUMN quantity_added TYPE NUMERIC(10,3) USING quantity_added::NUMERIC(10,3);

-- 5. Re-create deduct_stock with NUMERIC parameter
DROP FUNCTION IF EXISTS deduct_stock(text, integer) CASCADE;
CREATE OR REPLACE FUNCTION deduct_stock(p_inventory_id TEXT, p_qty NUMERIC)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE inventory
  SET stock = stock - p_qty
  WHERE id = p_inventory_id AND stock >= p_qty;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock for item %', p_inventory_id;
  END IF;
END;
$$;

-- 6. Re-create restock_item with NUMERIC parameter
DROP FUNCTION IF EXISTS restock_item(text, integer, uuid, text) CASCADE;
CREATE OR REPLACE FUNCTION restock_item(
  p_item_id TEXT,
  p_quantity NUMERIC,
  p_user_id UUID,
  p_username TEXT
)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE inventory
  SET stock = stock + p_quantity
  WHERE id = p_item_id AND active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item % not found or inactive', p_item_id;
  END IF;

  INSERT INTO restock_logs (item_id, quantity_added, user_id, username)
  VALUES (p_item_id, p_quantity, p_user_id, p_username);

  INSERT INTO stock_movements (inventory_id, qty_change, action, reference, user_id, username)
  VALUES (p_item_id, p_quantity, 'restock', 'Manual restock', p_user_id, p_username);
END;
$$;
