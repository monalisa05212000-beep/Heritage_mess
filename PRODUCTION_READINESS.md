# Heritage Mess — Production Readiness Assessment

**Date:** 15 September 2026 · **Deployment:** https://heritage-mess-lhu5.vercel.app · **Basis:** full code review, two rounds of automated browser testing against the live deployment ([E2E_TEST_REPORT.md](E2E_TEST_REPORT.md)), and post-fix verification ([BUG_FIX_REPORT.md](BUG_FIX_REPORT.md)).

## Verdict: READY TO SHIP — after one action (rotate the admin password)

## What is verified working in production

Every workflow in the Admin User Manual was exercised end-to-end in a real browser, twice (before and after fixes):

- **Auth:** admin login/logout; customer portal access by name + phone; wrong credentials refused; inactive customers refused.
- **Menus:** draft → publish → unpublish; date isolation (editing one date never touches another); customer visibility follows published state.
- **Customers:** create, edit, deactivate (now works even with same-day confirmed orders, auto-cancelling them), reactivate.
- **Orders:** customer ordering, admin manual orders, cancellation with correct financial reversal, duplicate orders cleanly rejected (409), already-ordered meals disabled in the UI.
- **Money:** effective-dated pricing (current vs upcoming), payment recording, ledger-derived balances consistent between admin and customer views.

Engineering quality is solid: immutable financial ledger, idempotency keys on every mutation, Serializable transactions with proper timeouts, per-endpoint rate limiting, hashed session tokens, Argon2id passwords, Zod validation. 41/41 automated tests, clean typecheck and build.

## Required before launch

| # | Action | Why | Effort |
|---|---|---|---|
| 1 | **Rotate the admin password** | Credentials were briefly committed to the public repo on 15 Sept. History was purged the same night, but orphaned commits can remain fetchable on GitHub until garbage collection. | ~1 minute |

## Known limitations (acceptable at current scale, plan for them)

1. **Write and page latency — largely addressed, one item left with the owner.** The original diagnosis ("cold starts") was wrong. Measured root cause: Vercel ran the functions in `iad1` (Virginia) while Supabase is in `ap-south-1`, and `Promise.all` provided no concurrency because the pooled connection serialises every query. Fixed by pinning compute to `bom1` and batching reads into transactions — login → dashboard went 19.5 s → 10.8 s and `/admin` 11.2 s → 4.6 s. See [docs/PERF_BASELINE.md](docs/PERF_BASELINE.md) for full before/after.

   **Still open, and it now dominates everything else:** `SELECT 1` costs **~650 ms** from compute that is provably in Mumbai. The arithmetic says this is a region boundary, not pooler load — a standalone query costs ~2 round trips (654 ms) and a batched statement ~1 (340 ms), implying an RTT of ~330 ms, which is not an intra-Mumbai figure. So despite the project being listed as `ap-south-1`, the effective connection is very likely still crossing a region. **Owner action:** open the Vercel function logs and find the `db connection shape` line (logged once per cold start by `/api/health`); it prints the database hostname, port, `pgbouncer` and `connection_limit` without exposing credentials. If the host is not `aws-0-ap-south-1.pooler.supabase.com`, correcting that one environment variable is worth roughly a 50× improvement and makes every number above collapse.
2. **Untested in production:** subscription/plan flows, capacity limits, same-day cutoff enforcement, and customer self-service cancellation. Covered by code review and unit tests, but no browser has proven them live. Run a follow-up test pass once real menus and subscriptions exist.
3. **No automatic retry on serialization conflicts (P2034):** two admins writing to the same records at the same moment must retry manually. The error is now at least honest — transient database failures (`P2024`, `P2028`, `P2034`, `P2037`, `P1001`, `P1002`) return a 503 with `Retry-After` and an accurate "nothing was saved" message instead of an opaque 500, and `/admin` and `/customer` render a retryable page rather than a bare error screen. Automatic retry is still worth adding if multiple admins become the norm.

4. **Unverified:** the successful-login audit record is now written via `after()`, off the critical path. Latency was measured, but that a `login_attempts` row with `succeeded = true` still lands was not confirmed against the live database. Failed attempts remain awaited and are unaffected. Worth one check of the function logs.

## Residual E2E test data in the database (harmless, documented)

- Customer "E2E Test Customer" (9000000001) — INACTIVE.
- Four CANCELLED test orders (15–16 Sept); unpublished "E2E Test" menus for 15–16 Sept (overwrite with real dishes when those dates arrive).
- ₹50 CASH payment ref `E2E-TEST-REF` (immutable ledger record); scheduled Lunch price ₹87 effective 21 Sept — **if unwanted, schedule Lunch ₹90 effective 21 Sept to neutralise it**, since it end-dated the current ₹90 price at 20 Sept.

## Launch-day checklist for the operator

1. Rotate the admin password (see above).
2. Create real menus for the first service dates and publish after review.
3. Decide on the 21 Sept Lunch price (keep ₹87 or re-schedule ₹90).
4. Follow the manual's daily operating checklist (§11).
