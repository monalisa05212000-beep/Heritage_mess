# Heritage Mess — E2E Bug Fix Report

**Date:** 15 September 2026 · **Branch/PR:** `fix/deactivation-same-day-orders` (PR #1) · **Input:** [E2E_TEST_REPORT.md](E2E_TEST_REPORT.md) (production browser test of 14 Sept 2026)

All 7 bugs from the E2E report are fixed, plus 4 additional issues surfaced by blindspot review passes. Verification: **41/41 tests pass, `tsc --noEmit` clean, production build clean.**

| # | Bug (E2E report) | Root cause | Fix |
|---|---|---|---|
| 1 | HIGH — deactivating a customer with a CONFIRMED same-day order returns 500, customer stays active | Two defects: (a) `serviceDate` (date-only, UTC midnight) compared with `gt: new Date()` skipped same-day orders (fixed earlier in this PR); (b) the per-order cancellation loop ran in a `$transaction` with the **default 5 s timeout**, which the pooled serverless connection exceeds → P2028 → catch-all 500 | `deactivateCustomerAccess` now uses the shared `ORDER_TRANSACTION_OPTIONS` (Serializable, `maxWait` 10 s, `timeout` 15 s) — `src/lib/domain/customers.ts` |
| 2 | MEDIUM — duplicate order returns 500 `"Order could not be placed."` | The partial unique index `order_items_one_active_meal_per_customer_date` raises Prisma **P2002**, which fell through the `DomainError` mapping to the 500 catch-all | `orderItem.create` catches `Prisma.PrismaClientKnownRequestError` P2002 and throws `DomainError("A confirmed order for this meal already exists for this date.", "CONFLICT")` → HTTP **409** with an actionable message — `src/lib/domain/orders.ts` |
| 3 | MEDIUM — login appears broken for ~19 s | API answers instantly, but `finally { setIsSubmitting(false) }` re-enabled the button while the slow `/admin` server render was still in flight — the UI looked idle mid-navigation | Submitting state now persists through navigation (reset only on error), with a 30 s safety valve that re-enables retry if navigation silently bounces back — `src/components/auth/login-form.tsx`. (Server-side latency itself is infra-level and out of scope — see recommendations.) |
| 4 | LOW — menu status chip stale (showed DRAFT next to a live Unpublish button) | Chip rendered the server prop; `router.refresh()` takes seconds to deliver it | Optimistic status set on successful save/publish/unpublish, keyed to the service date (no leak across date switches), and dropped once the refreshed server value confirms it — `src/components/admin/menu-manager.tsx` |
| 5 | LOW — "Order" button stays enabled for meals already ordered, walking customers into bug 2 | Board received the customer's orders but never consulted them | Buttons now disable and read **"Ordered"** for meal types with a CONFIRMED order on the selected date; optimistic in both directions (just-ordered disables immediately; cancel re-enables, including pruning the optimistic entry) — `src/components/customer/customer-order-board.tsx`, `src/app/customer/page.tsx` (query now includes `mealType.id`) |
| 6 | LOW — blank "Save draft" is a silent no-op | Only native `required` validation, no visible feedback path | All-blank submissions now show "Enter at least one dish name before saving the menu." — partial menus still save — `src/components/admin/menu-manager.tsx` |
| 7 | LOW — dashboard kitchen board shows dishes of an UNPUBLISHED menu with no indicator | Dashboard rendered `menu.items` without checking `menu.status` | Non-published menus now carry a red "DRAFT/UNPUBLISHED — not visible to customers" label — `src/app/admin/page.tsx` |

## Additional fixes from blindspot reviews

- **Same 5 s-timeout hazard in three batch operations** (`processClosure`, `processCountChargesDue`, `fulfilPastOrders`, plus `correctClosureDay`) — all looped over orders inside default-timeout transactions; all now use `ORDER_TRANSACTION_OPTIONS` — `src/lib/domain/operations.ts`.
- **Stricter P2002 detection** — `instanceof Prisma.PrismaClientKnownRequestError` instead of duck-typing, so an unrelated error can't masquerade as a duplicate order.
- **Optimistic-state hygiene** — menu chip re-syncs with server truth; order board's optimistic sets are pruned on cancel and reset across date navigation.

## Regression tests added

- `tests/customer-deactivation.test.ts` — deactivation includes today's orders (`gte dateOnly(now)`) **and** runs with a ≥15 s transaction timeout.
- `tests/duplicate-order.test.ts` — a P2002 from the duplicate-order index surfaces as `DomainError` code `CONFLICT`, not an unhandled 500.

## Known remaining risks (documented, not fixed)

1. **Write latency (10–25 s)** is infra-level: serverless cold starts + Supabase transaction pooler with `connection_limit=1`. Recommendations: keep the pooler on port 6543 with pgbouncer per the manual; consider Vercel Fluid Compute/warmer, and revisit `connection_limit` if the plan allows.
2. **No retry on Serializable conflicts (P2034)** anywhere in the codebase — a pre-existing systemic gap, unchanged by these fixes; a concurrent-write serialization failure still maps to 500. Worth a shared retry helper later.
3. **Security note:** the admin manual (containing credentials) was briefly committed to the public repo during this work; the branch history has been rewritten to purge it and the file is now gitignored, but **the admin password should be rotated** since orphaned commits can remain fetchable by SHA on GitHub until garbage collection.

## Verification

- `npm test` → 41/41 passing (13 files, including the 2 new regression tests)
- `tsc --noEmit` → clean · `next build` → compiled successfully
- Blindspot passes: backend (code-reviewer) and frontend (react-reviewer) agents on the diffs; all CRITICAL/HIGH/MEDIUM findings addressed
- Post-deploy: production re-verification of bugs 1, 2, 4, 5 planned with headed Chrome + screenshots after merge
