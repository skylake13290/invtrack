CREATE TABLE stock_adjustments (
  id            BIGSERIAL PRIMARY KEY,
  inventory_id  TEXT NOT NULL REFERENCES inventory(id),
  qty_change    NUMERIC NOT NULL,
  reason        TEXT NOT NULL,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  username      TEXT,
  ts            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_adjustments_inventory ON stock_adjustments(inventory_id);
CREATE INDEX idx_stock_adjustments_ts ON stock_adjustments(ts DESC);

ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;