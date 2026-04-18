# Security Remediation Guide — invtrack

## Overview

10 vulnerabilities were identified: 4 Critical, 3 High, 3 Medium.
This guide explains what was fixed, where each file goes, and the order to apply changes.

---

## Step 0 — Install the new dependency

```bash
npm install jose
```

`jose` is a lightweight, zero-dependency JWT library used for signing the session token.

---

## Step 1 — Add the SESSION_SECRET environment variable

Generate a strong secret and add it to your `.env.local` (and your production environment):

```bash
openssl rand -base64 32
```

Add to `.env.local`:
```
SESSION_SECRET=<paste output here>
```

Never commit this value to source control.

---

## Step 2 — Apply file changes

Copy each file from this remediation package to your project:

| Remediation file | Destination in your project | Status |
|---|---|---|
| `src/lib/session.ts` | `src/lib/session.ts` | **NEW** |
| `middleware.ts` | `middleware.ts` (project root) | **NEW** |
| `src/app/api/auth/me/route.ts` | `src/app/api/auth/me/route.ts` | **NEW** |
| `src/app/api/auth/login/route.ts` | `src/app/api/auth/login/route.ts` | REPLACE |
| `src/app/api/auth/logout/route.ts` | `src/app/api/auth/logout/route.ts` | REPLACE |
| `src/app/api/admin/users/route.ts` | `src/app/api/admin/users/route.ts` | REPLACE |
| `src/app/api/admin/password-reset/route.ts` | `src/app/api/admin/password-reset/route.ts` | REPLACE |
| `src/app/api/inventory/route.ts` | `src/app/api/inventory/route.ts` | REPLACE |
| `src/app/api/stock-adjustments/route.ts` | `src/app/api/stock-adjustments/route.ts` | REPLACE |
| `src/lib/auth.ts` | `src/lib/auth.ts` | REPLACE |
| `src/lib/AuthContext.tsx` | `src/lib/AuthContext.tsx` | REPLACE |
| `src/CloudFlare/cf_worker.js` | `src/CloudFlare/cf_worker.js` | REPLACE |
| `.env.example` | `.env.example` | REPLACE |

---

## Step 3 — Run the database migration

```bash
# Using Supabase CLI:
supabase db push

# Or run directly in the Supabase SQL editor:
-- Contents of: supabase/migrations/009_remove_plaintext_password_from_reset_log.sql
```

This removes the `new_password` column from `password_reset_log`.

---

## Step 4 — Update remaining API routes (stock-movements, restock, invoices, activity-log, export)

These routes were not included as full replacements but all need the same one-line fix: they are now protected by the global middleware (no request reaches them unauthenticated), but for defense-in-depth, add a role check at the top of each handler using the verified headers:

```typescript
// At the top of any route handler that should be authenticated:
const role = req.headers.get('x-verified-role')
if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// For write operations, also check the role:
if (!['admin', 'editor'].includes(role)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

Routes to update:
- `src/app/api/stock-movements/route.ts` — POST needs editor/admin check
- `src/app/api/restock/route.ts` — POST needs editor/admin check
- `src/app/api/invoices/route.ts` — POST needs editor/admin check
- `src/app/api/invoices/[id]/route.ts` — PATCH needs editor/admin check
- `src/app/api/activity-log/route.ts` — GET needs admin check
- `src/app/api/export/route.ts` — GET needs at minimum authenticated check

---

## Step 5 — Add input validation (Medium severity)

Install `zod`:
```bash
npm install zod
```

Add schema validation to each route handler. Example for the restock route:

```typescript
import { z } from 'zod'

const RestockSchema = z.object({
  item_id: z.string().max(100),
  quantity: z.number().positive().max(999999),
  // user_id and username now come from session, not request body
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const result = RestockSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
  }
  // use result.data instead of body
}
```

---

## What was fixed and why

### Critical: Admin API routes had zero authentication
`/api/admin/users` and `/api/admin/password-reset` had no session check — anyone on the internet could call them. Fixed by adding `requireRole(req, ['admin'])` at the top of every handler, which verifies the signed session JWT.

### Critical: Role enforcement via spoofable client header
Routes read `x-user-role` from the request, which any caller can set freely. Fixed by reading `x-verified-role` instead — this header is set by the Next.js middleware after verifying the signed JWT, and any client-supplied version is stripped before the request reaches the handler.

### Critical: Plaintext passwords stored in `password_reset_log`
The `new_password` column stored generated passwords in plaintext. Fixed by removing that column from the insert and dropping it from the schema. The password is returned once in the API response only.

### Critical: Auth state in `localStorage`
User role and identity were stored in `localStorage`, readable and writable by any JavaScript on the page. Fixed by issuing a signed JWT in an `HttpOnly; Secure; SameSite=Strict` cookie. `localStorage` is no longer used for auth state.

### High: No rate limiting on login
The login endpoint accepted unlimited attempts. Fixed by adding per-username+IP rate limiting (5 attempts per 15 minutes). For production, replace the in-process Map with Upstash/Redis to persist limits across serverless instances.

### High: Sensitive read endpoints were unauthenticated
`GET /api/activity-log`, `GET /api/export`, `GET /api/admin/users` required no credentials. Fixed by the global middleware which blocks all unauthenticated requests before they reach any route handler.

### High: Weak password generator used `Math.random()`
`generatePassword()` used `Math.random()`, which is not cryptographically secure. Fixed by replacing it with `crypto.getRandomValues()`.

### Medium: No CSRF protection
Fixed by the `SameSite=Strict` attribute on the session cookie, which prevents browsers from sending the cookie on cross-origin requests. No additional CSRF token is needed when using `SameSite=Strict`.

### Medium: No input validation
Not fully addressed in this patch. See Step 5 above for the `zod`-based approach to apply to each route.

### Medium: Cloudflare worker forwarded trust headers
Fixed by explicitly stripping `x-user-role`, `x-user-id`, `x-username`, and the new `x-verified-*` headers before forwarding. This ensures the proxy cannot be used to inject false identity claims.
