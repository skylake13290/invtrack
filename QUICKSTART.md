# ⚡ QUICK START - 5 Minutes to Running System

## 1️⃣ Create Supabase Project (2 min)

1. Go to https://supabase.com → **New Project**
2. Name it anything, choose region, set password
3. **Wait for it to finish** (green checkmark)

## 2️⃣ Run Database Setup (1 min)

1. In Supabase → **SQL Editor** → **New Query**
2. Open `supabase/migrations/001_complete_schema.sql`
3. **Copy EVERYTHING** and paste
4. Click **RUN**
5. ✅ See "Admin user created" message

## 3️⃣ Get Your Keys (30 sec)

1. Supabase → **Settings** → **API**
2. Copy:
   - Project URL
   - anon public key

## 4️⃣ Setup App (1 min)

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your keys
npm run dev
```

## 5️⃣ Login (30 sec)

1. Open http://localhost:3000
2. Login: `admin` / `Admin@123`
3. Reset password when prompted
4. ✅ You're in!

---

## 🧪 Test Auto-IDs

**Test Item ID:**
1. Inventory → + Add Item
2. Name: "Test Item"
3. ✅ Should get: `ITM0000001`

**Test Invoice ID:**
1. First add item with stock
2. Issue Items → Create invoice
3. ✅ Should get: `CF20260410000001`

---

## 🚀 Deploy to Vercel (Optional)

1. Push to GitHub
2. Vercel → Import → Add env vars → Deploy
3. ✅ Live in 2 minutes

---

**Need Help?** Check README.md for detailed instructions.
