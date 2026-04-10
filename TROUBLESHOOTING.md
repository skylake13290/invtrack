# 🔧 Troubleshooting Guide

## Common Issues & Solutions

### 1. "Invalid credentials" on Login

**Symptom**: Can't login with admin/Admin@123

**Solutions**:

**A. Verify admin user exists:**
```sql
-- Run in Supabase SQL Editor
SELECT * FROM users WHERE username = 'admin';
```
Should show 1 row with username 'admin'.

**B. If no admin user, re-run migration:**
1. Go to SQL Editor
2. Paste entire `001_complete_schema.sql`
3. Click RUN

**C. Clear browser cache:**
- Press Ctrl+Shift+Delete
- Clear all cached data
- Try login again

---

### 2. Auto-Generated IDs Not Working

**Symptom**: Creating item/invoice fails or shows error

**Test the functions:**
```sql
-- Run in Supabase SQL Editor
SELECT generate_item_id();
SELECT generate_invoice_id();
```

**If error "function does not exist":**
1. Re-run entire `001_complete_schema.sql` file
2. Verify functions exist:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public';
```

**If sequence error:**
```sql
-- Check sequence exists
SELECT * FROM pg_sequences WHERE schemaname = 'public';

-- If missing, create it:
CREATE SEQUENCE item_seq_seq START WITH 1;
```

---

### 3. "Insufficient stock" Error

**Symptom**: Can't create invoice even though stock shows available

**Solutions**:

**A. Check actual stock:**
```sql
SELECT id, name, stock FROM inventory WHERE active = true;
```

**B. Check for negative stock:**
```sql
SELECT * FROM inventory WHERE stock < 0;
```

**C. Verify deduct_stock function:**
```sql
-- Test with dummy data
SELECT deduct_stock('ITM0000001', 1);
```

---

### 4. Restock Not Working

**Symptom**: Can't add stock to items

**Test restock function:**
```sql
-- Get a real item ID and user ID first
SELECT id FROM inventory LIMIT 1;
SELECT id FROM users WHERE username = 'admin';

-- Test restock (replace UUIDs with real values)
SELECT restock_item('ITM0000001', 10, 'uuid-here', 'admin');
```

**Check restock logs:**
```sql
SELECT * FROM restock_logs ORDER BY created_at DESC LIMIT 10;
```

---

### 5. Password Reset Not Working

**Symptom**: Error when trying to reset password

**Check bcryptjs installed:**
```bash
npm list bcryptjs
```

**If not installed:**
```bash
npm install bcryptjs @types/bcryptjs
```

**Restart dev server:**
```bash
npm run dev
```

---

### 6. Environment Variables Not Loaded

**Symptom**: "Invalid Supabase credentials" or connection errors

**Verify .env.local exists:**
```bash
ls -la .env.local
```

**Check contents:**
```bash
cat .env.local
```

Should show:
```
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

**Restart dev server after any .env changes**

---

### 7. Migration Fails Partially

**Symptom**: Some tables created, some missing

**Solution: Complete clean reinstall**

```sql
-- Run in Supabase SQL Editor
-- This drops EVERYTHING and starts fresh

DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS password_reset_log CASCADE;
DROP TABLE IF EXISTS restock_logs CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP SEQUENCE IF EXISTS item_seq_seq CASCADE;
DROP FUNCTION IF EXISTS generate_invoice_id() CASCADE;
DROP FUNCTION IF EXISTS generate_item_id() CASCADE;
DROP FUNCTION IF EXISTS deduct_stock(text, integer) CASCADE;
DROP FUNCTION IF EXISTS restock_item(text, integer, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS set_updated_at() CASCADE;

-- Then run entire 001_complete_schema.sql again
```

---

### 8. Vercel Deployment Fails

**Check build logs:**
1. Vercel dashboard → Your project → Deployments
2. Click failed deployment
3. Check "Building" section for errors

**Common causes:**

**A. Missing environment variables:**
- Add `NEXT_PUBLIC_SUPABASE_URL`
- Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**B. TypeScript errors:**
```bash
# Run locally first
npm run build
```

**C. Package.json issues:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

---

### 9. "Must reset password" Loop

**Symptom**: After resetting password, still asked to reset

**Check database:**
```sql
SELECT username, must_reset_password FROM users WHERE username = 'admin';
```

**If still true, manually set:**
```sql
UPDATE users 
SET must_reset_password = false 
WHERE username = 'admin';
```

**Then clear localStorage:**
- Browser Console (F12)
- Type: `localStorage.clear()`
- Refresh page

---

### 10. Invoice ID Not Resetting Daily

**Symptom**: Next day invoice is CF20260410000003 instead of CF20260411000001

**This is actually correct!** 

The function checks the date in the ID. Test it:
```sql
-- Should return CF[TODAY]00001
SELECT generate_invoice_id();

-- Check existing invoices
SELECT id, issued_at FROM invoices ORDER BY issued_at DESC;
```

If today's first invoice isn't 00001, there might be existing invoices from today.

---

## 🆘 Still Having Issues?

### Run Complete Verification

1. Go to Supabase SQL Editor
2. Run `002_verification.sql`
3. Check all tests pass

### Check System Status

```sql
-- All tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;

-- All functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' ORDER BY routine_name;

-- All sequences
SELECT * FROM pg_sequences WHERE schemaname = 'public';

-- Sample data
SELECT 'Users:' AS info, COUNT(*) AS count FROM users
UNION ALL
SELECT 'Inventory:', COUNT(*) FROM inventory
UNION ALL
SELECT 'Invoices:', COUNT(*) FROM invoices;
```

### Nuclear Option: Complete Reset

If nothing works, start completely fresh:

1. Delete Supabase project
2. Create new Supabase project
3. Run `001_complete_schema.sql`
4. Update `.env.local` with new credentials
5. `npm install`
6. `npm run dev`

---

## 📞 Getting Help

When asking for help, provide:

1. **Error message** (exact text)
2. **What you were doing** (step-by-step)
3. **Results of verification script**
4. **Browser console errors** (F12 → Console)
5. **Supabase SQL Editor errors** (if any)

This helps diagnose issues faster!
