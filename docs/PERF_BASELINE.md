# Production performance baseline — 15 September 2026, before region fix

Measured against https://heritage-mess-lhu5.vercel.app (warm functions, repeated samples).

**Root cause identified:** `X-Vercel-Id: bom1::iad1::…` — the Vercel edge POP is Mumbai (`bom1`) but the
serverless **compute runs in `iad1` (US East, Virginia)**, while the Supabase database is in
**`ap-south-1` (Mumbai)**. Every Prisma query is a Virginia↔Mumbai round trip, and Prisma interactive
transactions issue their statements sequentially.

## Authenticated journey (Playwright, real browser)

| Action | Before |
|---|---|
| Login → dashboard rendered | **19,513 ms** |
| GET /admin (7 queries) | **11,208 ms** |
| GET /admin/menus | 5,390 ms |
| GET /admin/customers | 3,914 ms |
| GET /admin/orders | 6,274 ms |
| GET /admin/money | 6,460 ms |
| POST /api/admin/menus (save draft) | **9,278 ms** |

## HTTP-level samples (curl, warm)

| Endpoint | Before |
|---|---|
| GET /customer/access (minimal DB) | 0.35–0.38 s |
| GET /login | 1.25–1.51 s |
| GET / (307 redirect, session check) | 1.24–1.29 s |
| POST /api/auth/login, bad credentials (5 sequential round trips + argon2) | **4.84–7.57 s** |

Failed-login round trips, counted from source: `rateLimitEvent.count` → `rateLimitEvent.create` →
`loginAttempt.count` → `user.findFirst` → `loginAttempt.create` (5 sequential), plus a fresh
cross-continent TLS handshake to the pooler on a cold instance.

Database indexes were checked and are correct (`@@index([scope, keyHash, occurredAt])`,
`@@index([email, occurredAt])`, unique `tokenHash`) — this is latency, not query planning.
