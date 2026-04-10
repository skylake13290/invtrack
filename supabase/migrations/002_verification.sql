-- ============================================================
-- VERIFICATION SCRIPT
-- Run this AFTER installing 001_complete_schema.sql
-- to verify everything is set up correctly
-- ============================================================

-- 1. Check all tables exist
SELECT 
  'Tables Check' AS test,
  COUNT(*) AS found,
  '8 expected' AS expected
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'users', 'inventory', 'invoices', 'invoice_items',
    'stock_movements', 'restock_logs', 'password_reset_log', 'activity_log'
  );

-- 2. Check sequences exist
SELECT 
  'Sequences Check' AS test,
  COUNT(*) AS found,
  '1 expected (item_seq_seq)' AS expected
FROM pg_sequences 
WHERE schemaname = 'public';

-- 3. Check functions exist
SELECT 
  'Functions Check' AS test,
  COUNT(*) AS found,
  '5 expected' AS expected
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name IN (
    'generate_item_id', 'generate_invoice_id', 
    'deduct_stock', 'restock_item', 'set_updated_at'
  );

-- 4. Check admin user exists
SELECT 
  'Admin User Check' AS test,
  username,
  role,
  must_reset_password,
  'Should be: admin, admin, true' AS expected
FROM users 
WHERE username = 'admin';

-- 5. Test invoice ID generation
SELECT 
  'Invoice ID Test' AS test,
  generate_invoice_id() AS generated_id,
  'Should match: CF[TODAY]00001' AS expected;

-- 6. Test item ID generation
SELECT 
  'Item ID Test' AS test,
  generate_item_id() AS generated_id,
  'Should be: ITM0000001' AS expected;

-- 7. Check indexes
SELECT 
  'Indexes Check' AS test,
  COUNT(*) AS found,
  '15+ expected' AS expected
FROM pg_indexes 
WHERE schemaname = 'public';

-- ============================================================
-- INTERPRETATION OF RESULTS
-- ============================================================

-- ✅ ALL CHECKS SHOULD PASS:
--
-- 1. Tables Check: found = 8
-- 2. Sequences Check: found = 1
-- 3. Functions Check: found = 5
-- 4. Admin User: username = admin, role = admin, must_reset_password = true
-- 5. Invoice ID: Format CF[YYYYMMDD]00001
-- 6. Item ID: ITM0000001
-- 7. Indexes Check: found >= 15
--
-- ✅ If all pass → Database is correctly set up!
-- ❌ If any fail → Re-run 001_complete_schema.sql

-- ============================================================
-- TROUBLESHOOTING
-- ============================================================

-- If Admin User Check fails:
-- SELECT * FROM users;  -- Should show 1 row

-- If Function Tests fail:
-- SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';

-- If Tables Check fails:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
