# Hardware Store System - Fresh Deployment Guide

## 🚀 FRESH INSTALLATION (Start Here!)

### Step 1: Create New Supabase Project

1. Go to **https://supabase.com**
2. Click **New Project**
3. Fill in:
   - Name: `hardware-store`
   - Database Password: (create a strong password)
   - Region: Choose closest to you
4. Click **Create new project**
5. **Wait 2-3 minutes** for setup to complete

### Step 2: Copy API Credentials

1. Once ready, go to **Settings** → **API**
2. Copy these two values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: Long string starting with `eyJ...`

### Step 3: Run Database Migration

1. In Supabase, click **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open the file: `supabase/migrations/001_complete_schema.sql`
4. **Copy ALL content** (entire file from top to bottom)
5. Paste into SQL Editor
6. Click **RUN** button (bottom right)
7. Wait 2-3 seconds
8. You should see:
   ```
   Admin user created: admin | admin
   Sample invoice ID: CF20260410000001  
   Sample item ID: ITM0000001
   ```

✅ **If you see the above output, database is ready!**

### Step 4: Configure Application

1. Extract the ZIP file
2. Open terminal in the extracted folder
3. Run:
   ```bash
   npm install
   ```

4. Create `.env.local` file:
   ```bash
   cp .env.example .env.local
   ```

5. Edit `.env.local` with your credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

### Step 5: Start Application

```bash
npm run dev
```

Open: **http://localhost:3000**

### Step 6: First Login

1. You'll see the login page
2. Enter:
   - Username: `admin`
   - Password: `Admin@123`
3. **You MUST reset password** on first login
4. After reset, you'll see the dashboard

## 🌐 Deploy to Vercel (Production)

1. Push code to GitHub
2. Go to **vercel.com** → **Add New Project**
3. Import your GitHub repository
4. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy**
6. Done! Your app is live

## ✅ Verify Everything Works

Test these features:

1. **Login** with admin credentials
2. **Create Item**: Goes to Inventory → Add Item
   - Should get ID: `ITM0000001`
3. **Create Invoice**: Go to Issue Items
   - Should get ID: `CF20260410000001`
4. **Create Second Invoice**:
   - Should get ID: `CF20260410000002`
5. **Restock Item**: Go to Restock
6. **Create User** (Admin): Go to Admin → Users
7. **Reset Password** (Admin): Select user → Reset Password

## 🐛 Common Issues

**"Invalid credentials"**
- Re-run the migration SQL script
- Verify admin user exists in users table

**"Function does not exist"**
- Migration didn't complete
- Re-run entire `001_complete_schema.sql` file

**Auto-IDs not working**
- Test in SQL Editor:
  ```sql
  SELECT generate_item_id();
  SELECT generate_invoice_id();
  ```

## 📝 Default Credentials

- **Username**: `admin`
- **Password**: `Admin@123`
- **⚠️ MUST BE CHANGED ON FIRST LOGIN**

## 🎯 Features Implemented

✅ Auto-generated Invoice IDs (CFYYYYMMDD#####)
✅ Auto-generated Item IDs (ITM#######)  
✅ Database authentication (bcrypt)
✅ Forced password reset
✅ Admin password management
✅ Restock functionality
✅ Complete audit trail

Your system is ready to use!
