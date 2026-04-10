# ✅ Testing Checklist

Use this to verify all features work correctly after deployment.

## 🔐 Authentication Tests

### [ ] 1. Initial Login
- [ ] Navigate to http://localhost:3000
- [ ] Should redirect to /login
- [ ] Enter username: `admin`
- [ ] Enter password: `Admin@123`
- [ ] Click Login
- [ ] ✅ Should redirect to password reset page

### [ ] 2. Forced Password Reset
- [ ] On reset page, enter current password: `Admin@123`
- [ ] Enter new password (min 8 chars)
- [ ] Confirm new password
- [ ] Click Update Password
- [ ] ✅ Should redirect to dashboard
- [ ] ✅ Should show "Password updated successfully"

### [ ] 3. Logout and Re-login
- [ ] Click username in sidebar → Sign Out
- [ ] Should redirect to /login
- [ ] Login with admin and NEW password
- [ ] ✅ Should go directly to dashboard (no reset required)

---

## 📦 Inventory Tests

### [ ] 4. Create First Item (Auto-ID Test)
- [ ] Go to Inventory page
- [ ] Click "+ Add Item" or similar
- [ ] Enter name: "Hammer"
- [ ] Enter stock: 100
- [ ] Enter min level: 10
- [ ] Click Save
- [ ] ✅ Item should get ID: `ITM0000001`
- [ ] ✅ Should appear in inventory list

### [ ] 5. Create Second Item
- [ ] Add another item
- [ ] Name: "Nails"
- [ ] Stock: 500
- [ ] Click Save
- [ ] ✅ Should get ID: `ITM0000002`

### [ ] 6. Create Third Item
- [ ] Add one more
- [ ] Name: "Screws"
- [ ] ✅ Should get ID: `ITM0000003`

### [ ] 7. Edit Item
- [ ] Click Edit on any item
- [ ] Change min level
- [ ] Click Save
- [ ] ✅ Changes should be saved
- [ ] ✅ ID should NOT change

---

## 📋 Invoice Tests

### [ ] 8. Create First Invoice (Auto-ID Test)
- [ ] Go to "Issue Items" page
- [ ] Enter contractor name: "ABC Construction"
- [ ] Select item: ITM0000001 (Hammer)
- [ ] Enter quantity: 10
- [ ] Click Create Invoice
- [ ] ✅ Should get ID format: `CF20260410000001`
  - CF = prefix
  - 20260410 = today's date (YYYYMMDD)
  - 00001 = sequence number
- [ ] ✅ Stock should decrease by 10

### [ ] 9. Create Second Invoice (Same Day)
- [ ] Create another invoice
- [ ] Different contractor: "XYZ Builders"
- [ ] Select different item
- [ ] Click Create
- [ ] ✅ Should get ID: `CF20260410000002`
- [ ] ✅ Sequence incremented, date same

### [ ] 10. Create Third Invoice
- [ ] Create one more
- [ ] ✅ Should get: `CF20260410000003`

### [ ] 11. Multi-Item Invoice
- [ ] Create invoice with 2+ items
- [ ] ✅ Should accept multiple items
- [ ] ✅ All stocks should decrease correctly

### [ ] 12. Insufficient Stock Error
- [ ] Try to create invoice with quantity > available stock
- [ ] ✅ Should show error
- [ ] ✅ Invoice should NOT be created
- [ ] ✅ Stock should NOT change

---

## 📈 Restock Tests

### [ ] 13. Restock Item
- [ ] Go to Restock page
- [ ] Select an item from dropdown
- [ ] Enter quantity to add: 50
- [ ] Click Add Stock
- [ ] ✅ Should show success message
- [ ] ✅ Stock should increase by 50
- [ ] ✅ Should appear in restock logs

### [ ] 14. Verify Restock Log
- [ ] Check stock movement log
- [ ] ✅ Should show restock action
- [ ] ✅ Should show correct quantity
- [ ] ✅ Should show your username
- [ ] ✅ Should show timestamp

---

## 👥 User Management Tests (Admin Only)

### [ ] 15. Create New User
- [ ] Go to Admin → Users
- [ ] Click "+ Create User"
- [ ] Enter username: "staff1"
- [ ] Select role: "Staff"
- [ ] Click Create
- [ ] ✅ Should show generated password
- [ ] ✅ **COPY THE PASSWORD** (shown only once)
- [ ] ✅ User should appear in list
- [ ] ✅ must_reset_password should be "Yes"

### [ ] 16. Test New User Login
- [ ] Logout
- [ ] Login with: staff1 / [generated password]
- [ ] ✅ Should be forced to reset password
- [ ] Reset to new password
- [ ] ✅ Should see dashboard

### [ ] 17. Admin Password Reset
- [ ] Logout, login as admin
- [ ] Go to Admin → Users
- [ ] Find staff1
- [ ] Click "Reset Password"
- [ ] ✅ Should generate new password
- [ ] ✅ Should show password once
- [ ] ✅ **COPY THE NEW PASSWORD**
- [ ] ✅ User's must_reset should be "Yes"

### [ ] 18. Verify Password Reset
- [ ] Logout
- [ ] Try login with staff1 OLD password
- [ ] ✅ Should fail
- [ ] Login with staff1 NEW password
- [ ] ✅ Should work and force reset

### [ ] 19. Deactivate User
- [ ] Login as admin
- [ ] Go to Users
- [ ] Click Deactivate on staff1
- [ ] ✅ Status should change to "Inactive"
- [ ] Logout
- [ ] Try login as staff1
- [ ] ✅ Should fail (inactive user)

### [ ] 20. Reactivate User
- [ ] Login as admin
- [ ] Click Activate on staff1
- [ ] ✅ Status should change to "Active"
- [ ] Logout
- [ ] Login as staff1
- [ ] ✅ Should work

---

## 📊 Logging & Audit Trail Tests

### [ ] 21. Check Stock Movements
- [ ] Go to Stock Log
- [ ] ✅ Should show all issue and restock actions
- [ ] ✅ Should show quantities (negative for issue, positive for restock)
- [ ] ✅ Should show timestamps
- [ ] ✅ Should show item names

### [ ] 22. Check Activity Log (Admin)
- [ ] Go to Admin → Activity Log
- [ ] ✅ Should show logins
- [ ] ✅ Should show user creations
- [ ] ✅ Should show password resets
- [ ] ✅ Should show timestamps

---

## 🔄 Daily Reset Test (Next Day)

### [ ] 23. Test Invoice Daily Reset
**Tomorrow, test this:**
- [ ] Create first invoice of the day
- [ ] ✅ Should be: `CF[TOMORROW]00001`
- [ ] ✅ Sequence should reset to 00001
- [ ] Create second invoice
- [ ] ✅ Should be: `CF[TOMORROW]00002`

---

## 🧪 Database Verification

### [ ] 24. Run Verification Script
- [ ] Go to Supabase SQL Editor
- [ ] Run `002_verification.sql`
- [ ] ✅ All checks should pass

### [ ] 25. Check Auto-ID Functions
```sql
SELECT generate_item_id();    -- Should be ITM0000004 (or next number)
SELECT generate_invoice_id(); -- Should be CF[TODAY]00004 (or next)
```

---

## 🌐 Production Deployment Tests

### [ ] 26. Vercel Deployment
- [ ] Push to GitHub
- [ ] Deploy to Vercel
- [ ] ✅ Build should succeed
- [ ] ✅ App should be live
- [ ] Test login on production URL
- [ ] ✅ Should work same as local

### [ ] 27. Production Feature Test
- [ ] Create item on production
- [ ] Create invoice on production
- [ ] ✅ Auto-IDs should work
- [ ] ✅ All features should work

---

## 📝 Summary

**Total Tests: 27**

Fill in this summary:
- [ ] All Authentication Tests (3/3)
- [ ] All Inventory Tests (4/4)
- [ ] All Invoice Tests (5/5)
- [ ] All Restock Tests (2/2)
- [ ] All User Management Tests (6/6)
- [ ] All Logging Tests (2/2)
- [ ] Daily Reset Test (1/1 - test tomorrow)
- [ ] Database Verification (2/2)
- [ ] Production Tests (2/2)

**✅ ALL TESTS PASSED** = System is fully functional!

---

## 🐛 If Any Test Fails

1. Note which test failed
2. Check error message
3. Check browser console (F12)
4. See TROUBLESHOOTING.md
5. Re-run database migration if needed

---

## 💾 Test Data Cleanup (Optional)

After testing, clean up test data:

```sql
-- Delete test invoices
DELETE FROM invoices WHERE contractor LIKE '%Test%' OR contractor LIKE '%ABC%' OR contractor LIKE '%XYZ%';

-- Delete test items
DELETE FROM inventory WHERE name LIKE '%Test%';

-- Keep admin user, delete test users
DELETE FROM users WHERE username != 'admin';

-- Reset item sequence
ALTER SEQUENCE item_seq_seq RESTART WITH 1;
```

Then create real data!
