-- ============================================================
-- Hardware Store System - Complete Database Schema
-- FRESH DEPLOYMENT - Run this entire script in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- CLEANUP (Drop all existing objects)
-- ============================================================

DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS password_reset_log CASCADE;
DROP TABLE IF EXISTS restock_logs CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP SEQUENCE IF EXISTS invoice_seq_seq CASCADE;
DROP SEQUENCE IF EXISTS item_seq_seq CASCADE;

DROP FUNCTION IF EXISTS generate_invoice_id() CASCADE;
DROP FUNCTION IF EXISTS generate_item_id() CASCADE;
DROP FUNCTION IF EXISTS deduct_stock(text, integer) CASCADE;
DROP FUNCTION IF EXISTS restock_item(text, integer, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS set_updated_at() CASCADE;

-- ============================================================
-- CREATE SEQUENCES
-- ============================================================

CREATE SEQUENCE item_seq_seq START WITH 1;

-- ============================================================
-- CREATE TABLES
-- ============================================================

-- Users table
CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username         TEXT NOT NULL UNIQUE,
  password_hash    TEXT NOT NULL,
  role             TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin','editor','viewer')),
  must_reset_password BOOLEAN NOT NULL DEFAULT true,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- Password reset log
CREATE TABLE password_reset_log (
  id               BIGSERIAL PRIMARY KEY,
  admin_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  target_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  admin_username   TEXT,
  target_username  TEXT,
  new_password     TEXT NOT NULL,
  reset_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_reset_log_target ON password_reset_log(target_user_id);
CREATE INDEX idx_password_reset_log_admin ON password_reset_log(admin_id);

-- Inventory
CREATE TABLE inventory (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL UNIQUE,
  stock            INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_level        INTEGER NOT NULL DEFAULT 0 CHECK (min_level >= 0),
  active           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_name ON inventory(name);
CREATE INDEX idx_inventory_active ON inventory(active);

-- Invoices
CREATE TABLE invoices (
  id               TEXT PRIMARY KEY,
  contractor       TEXT NOT NULL,
  issued_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  issued_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_issued_at ON invoices(issued_at DESC);
CREATE INDEX idx_invoices_issued_by ON invoices(issued_by);

-- Invoice items
CREATE TABLE invoice_items (
  id               BIGSERIAL PRIMARY KEY,
  invoice_id       TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  inventory_id     TEXT NOT NULL REFERENCES inventory(id),
  qty              INTEGER NOT NULL CHECK (qty > 0),
  UNIQUE (invoice_id, inventory_id)
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_inventory ON invoice_items(inventory_id);

-- Stock movements
CREATE TABLE stock_movements (
  id               BIGSERIAL PRIMARY KEY,
  inventory_id     TEXT NOT NULL REFERENCES inventory(id),
  qty_change       INTEGER NOT NULL,
  action           TEXT NOT NULL CHECK (action IN ('issue','restock','adjustment')),
  reference        TEXT,
  user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  username         TEXT,
  ts               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_inv ON stock_movements(inventory_id);
CREATE INDEX idx_stock_movements_ts ON stock_movements(ts DESC);
CREATE INDEX idx_stock_movements_action ON stock_movements(action);

-- Restock logs
CREATE TABLE restock_logs (
  id               BIGSERIAL PRIMARY KEY,
  item_id          TEXT NOT NULL REFERENCES inventory(id),
  quantity_added   INTEGER NOT NULL CHECK (quantity_added > 0),
  user_id          UUID NOT NULL REFERENCES users(id),
  username         TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_restock_logs_item ON restock_logs(item_id);
CREATE INDEX idx_restock_logs_user ON restock_logs(user_id);
CREATE INDEX idx_restock_logs_created_at ON restock_logs(created_at DESC);

-- Activity log
CREATE TABLE activity_log (
  id               BIGSERIAL PRIMARY KEY,
  user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  username         TEXT,
  role             TEXT,
  action           TEXT NOT NULL,
  entity_type      TEXT,
  entity_id        TEXT,
  detail           JSONB,
  ip_address       TEXT,
  ts               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_ts ON activity_log(ts DESC);
CREATE INDEX idx_activity_log_action ON activity_log(action);

-- ============================================================
-- CREATE FUNCTIONS
-- ============================================================

-- Updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN 
  NEW.updated_at = NOW(); 
  RETURN NEW; 
END;
$$;

-- Generate invoice ID (CFYYYYMMDD#####)
CREATE OR REPLACE FUNCTION generate_invoice_id()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  today TEXT;
  seq_num INTEGER;
  result TEXT;
BEGIN
  today := TO_CHAR(NOW(), 'YYYYMMDD');
  
  SELECT COALESCE(MAX(SUBSTRING(id FROM 11)::INTEGER), 0) + 1
  INTO seq_num
  FROM invoices
  WHERE id LIKE 'CF' || today || '%';
  
  result := 'CF' || today || LPAD(seq_num::TEXT, 5, '0');
  RETURN result;
END;
$$;

-- Generate item ID (ITM#######)
CREATE OR REPLACE FUNCTION generate_item_id()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  seq_num BIGINT;
BEGIN
  seq_num := NEXTVAL('item_seq_seq');
  RETURN 'ITM' || LPAD(seq_num::TEXT, 7, '0');
END;
$$;

-- Deduct stock
CREATE OR REPLACE FUNCTION deduct_stock(p_inventory_id TEXT, p_qty INTEGER)
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

-- Restock item
CREATE OR REPLACE FUNCTION restock_item(
  p_item_id TEXT,
  p_quantity INTEGER,
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

-- ============================================================
-- CREATE TRIGGERS
-- ============================================================

CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- INSERT DEFAULT ADMIN USER
-- ============================================================

-- Password: Admin@123 (hashed with bcrypt, 10 rounds)
INSERT INTO users (username, password_hash, role, must_reset_password)
VALUES (
  'admin',
  '$2b$10$RhtcEmcHN9z9TS4F5pVVU.qoz6ARfgjz15cmIAwgouy2YQKgvaGHe',
  'admin',
  true
);

-- ============================================================
-- DISABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE restock_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT 'Admin user created:' AS status, username, role FROM users WHERE username = 'admin';
SELECT 'Sample invoice ID:' AS status, generate_invoice_id() AS id;
SELECT 'Sample item ID:' AS status, generate_item_id() AS id;

-- ============================================================
-- INSTALLATION COMPLETE!
-- ============================================================

-- Default credentials:
-- Username: admin
-- Password: Admin@123
-- (Must be changed on first login)
