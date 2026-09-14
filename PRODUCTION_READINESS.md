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

1. **Write latency 10–25 s** (orders, cancellations, payments). Root cause is infrastructure: serverless cold starts + Supabase transaction pooler with `connection_limit=1`. The UI now shows honest in-flight states, so it's usable — but customers will feel it. First post-launch improvement: Vercel Fluid Compute / function warming, and revisit the connection limit.
2. **Untested in production:** subscription/plan flows, capacity limits, same-day cutoff enforcement, and customer self-service cancellation. Covered by code review and unit tests, but no browser has proven them live. Run a follow-up test pass once real menus and subscriptions exist.
3. **No retry on serialization conflicts (P2034):** two admins writing to the same records at the exact same moment can get a generic error and must retry manually. Rare with one operator; add a shared retry helper if multiple admins become the norm.

## Residual E2E test data in the database (harmless, documented)

- Customer "E2E Test Customer" (9000000001) — INACTIVE.
- Four CANCELLED test orders (15–16 Sept); unpublished "E2E Test" menus for 15–16 Sept (overwrite with real dishes when those dates arrive).
- ₹50 CASH payment ref `E2E-TEST-REF` (immutable ledger record); scheduled Lunch price ₹87 effective 21 Sept — **if unwanted, schedule Lunch ₹90 effective 21 Sept to neutralise it**, since it end-dated the current ₹90 price at 20 Sept.

## Launch-day checklist for the operator

1. Rotate the admin password (see above).
2. Create real menus for the first service dates and publish after review.
3. Decide on the 21 Sept Lunch price (keep ₹87 or re-schedule ₹90).
4. Follow the manual's daily operating checklist (§11).
