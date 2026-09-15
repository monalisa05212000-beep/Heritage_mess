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

---

## After co-locating compute in Mumbai (`vercel.json` → `regions: ["bom1"]`)

Verified switched: `X-Vercel-Id: bom1::bom1::…` (was `bom1::iad1::…`).

| Action | Before | After | Change |
|---|---|---|---|
| Login → dashboard | 19,513 ms | 17,383 ms | −11% |
| GET /admin | 11,208 ms | 7,323 ms | −35% |
| GET /admin/menus | 5,390 ms | 3,832 ms | −29% |
| GET /admin/customers | 3,914 ms | 2,806 ms | −28% |
| GET /admin/orders | 6,274 ms | 4,535 ms | −28% |
| GET /admin/money | 6,460 ms | 4,678 ms | −28% |
| POST /api/admin/menus (write) | 9,278 ms | 6,589 ms | −29% |
| POST /api/auth/login (bad creds) | 4,840–7,570 ms | 3,600–5,640 ms | −26% |

Geography accounted for only ~30% of the latency. **The remaining ~70% is the database
connection itself**, now isolated by `/api/health`:

```
{"ok":true,"region":"bom1","firstQueryMs":646,"warmQueryMs":646}   ← 8 consecutive samples
```

`SELECT 1` costs **646 ms** from compute in `bom1`. `warmQueryMs` equals `firstQueryMs`, so this
is not connection establishment — it is the per-query cost, and it is rock-steady to ±2 ms across
samples. An in-region Supabase query should be 1–3 ms.

A fixed, jitter-free 646 ms is characteristic of geographic distance, not load or throttling.
Since compute is now provably in Mumbai, the implication is that **`DATABASE_URL` does not point at
an ap-south-1 host** (or its pooler hop lands outside the region).

**This is the single remaining bottleneck.** Page cost now tracks query count almost exactly:
`/admin` issues ~8 queries ≈ 7.3 s at 646 ms each; `/login` issues 1 ≈ 0.9 s. Fixing the connection
target should collapse every number in the table above by roughly an order of magnitude — far more
than any application-level change could achieve.

### Owner action required

Read `DATABASE_URL` in Vercel → Settings → Environment Variables and check the **host** (the password
is not needed to diagnose this):

- Expected for a Mumbai project: `aws-0-ap-south-1.pooler.supabase.com`, port `6543`,
  with `?pgbouncer=true&sslmode=require`.
- If the host names a different region, repoint it to the ap-south-1 pooler.
- If the port is `5432` on a pooler host, that is the session pooler; the transaction pooler on
  `6543` is the correct choice for serverless, and `pgbouncer=true` must be present or
  prepared-statement errors follow.

---

## After batching reads and trimming the login path

`Promise.all` was providing **no concurrency at all** — proven by `/api/health?diag=1`:

| 5 × `SELECT 1` | Time | Per query |
|---|---|---|
| Sequential | 3,270 ms | 654 ms |
| `Promise.all` | 3,270 ms | 654 ms ← no parallelism |
| `$transaction([...])` | 1,700 ms | 340 ms |

The pooled connection serialises every query, so each page paid `queries × 654 ms` in strict
sequence. Nine read sites were converted to batched transactions, and the login critical path went
from six round trips to three.

### End-to-end result

| Action | Before | After | Change |
|---|---|---|---|
| Login → dashboard | 19,513 ms | **10,834 ms** | −44% |
| GET /admin | 11,208 ms | **4,652 ms** | −58% |
| GET /admin/customers | 3,914 ms | 2,227 ms | −43% |
| GET /admin/orders | 6,274 ms | 3,284 ms | −48% |
| GET /admin/menus | 5,390 ms | 4,106 ms | −24% |
| GET /admin/money | 6,460 ms | 5,248 ms | −19% |
| POST /api/admin/menus (write) | 9,278 ms | 6,515 ms | −30% |
| POST /api/auth/login (bad creds) | 4,840–7,570 ms | **3,143–3,292 ms** | −50%, and far more consistent |

Single-sample page timings carry cold-start noise of a second or more; the login and `/admin`
figures were the most repeatable and are the ones to trust.

## The remaining bottleneck is not in this codebase

Everything above is application-level work around a database that answers `SELECT 1` in **654 ms**
while sitting in the same region as the compute. That floor now dominates every remaining number.

**Evidence for what it is.** A standalone query costs 654 ms, but five queries inside one
`$transaction` cost 340 ms each. If the cost were raw network distance, batching could not halve
it. What batching changes is the number of *transactions*: Supabase's pooler (Supavisor) in
transaction mode assigns a server connection per transaction, and a standalone query is its own
implicit transaction. So roughly 300–400 ms of every query is **pooler connection-assignment
overhead**, not query execution and not distance.

### Experiment for the owner (about 5 minutes, fully reversible)

`/api/health` makes this measurable. Note the current numbers, then try each alternative
`DATABASE_URL` and re-check:

```
curl https://heritage-mess-lhu5.vercel.app/api/health?diag=1
```

1. **Session pooler** — same host, port `5432`, drop `pgbouncer=true`. Holds a server connection
   instead of reassigning per transaction. Expect `warmQueryMs` to collapse if the hypothesis is
   right. Trade-off: fewer connection slots, so watch for `P2037` under concurrency.
2. **Direct connection** — `db.<ref>.supabase.co:5432`. Bypasses the pooler entirely; use only as a
   diagnostic, not a production setting for serverless.
3. **Supabase plan** — a free-tier instance shares pooler capacity; the paid tier removes that
   contention.

Whichever lowers `warmQueryMs` is the answer, and every number in the table above scales down with
it. A 654 ms → 10 ms query turns the 4.6 s dashboard into roughly 200 ms — far more than any
further application change can deliver.
