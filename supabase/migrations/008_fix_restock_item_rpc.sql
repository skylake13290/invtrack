CREATE OR REPLACE FUNCTION public.restock_item(p_item_id text, p_quantity numeric, p_user_id uuid, p_username text)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Verify item exists and is active (stock column no longer maintained here)
  -- stock is calculated from stock_movements as single source of truth
  IF NOT EXISTS (SELECT 1 FROM inventory WHERE id = p_item_id AND active = true) THEN
    RAISE EXCEPTION 'Item % not found or inactive', p_item_id;
  END IF;

  INSERT INTO restock_logs (item_id, quantity_added, user_id, username)
  VALUES (p_item_id, p_quantity, p_user_id, p_username);

  INSERT INTO stock_movements (inventory_id, qty_change, action, reference, user_id, username)
  VALUES (p_item_id, p_quantity, 'restock', 'Manual restock', p_user_id, p_username);
END;
$function$;