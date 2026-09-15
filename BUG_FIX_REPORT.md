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

1. **Write latency (10–25 s)** — superseded. See the performance addendum below and [docs/PERF_BASELINE.md](docs/PERF_BASELINE.md); the cause was cross-region compute plus serialised queries, not cold starts, and most of it is now fixed.
2. **No retry on Serializable conflicts (P2034)** anywhere in the codebase — a pre-existing systemic gap, unchanged by these fixes; a concurrent-write serialization failure still maps to 500. Worth a shared retry helper later.
3. **Security note:** the admin manual (containing credentials) was briefly committed to the public repo during this work; the branch history has been rewritten to purge it and the file is now gitignored, but **the admin password should be rotated** since orphaned commits can remain fetchable by SHA on GitHub until garbage collection.

## Verification

- `npm test` → 41/41 passing (13 files, including the 2 new regression tests)
- `tsc --noEmit` → clean · `next build` → compiled successfully
- Blindspot passes: backend (code-reviewer) and frontend (react-reviewer) agents on the diffs; all CRITICAL/HIGH/MEDIUM findings addressed
- Post-deploy: production re-verification of bugs 1, 2, 4, 5 planned with headed Chrome + screenshots after merge

---

# Addendum — Responsive UI fixes (15 September 2026)

Reported from the live admin panel: the sidebar nav read "Dashboard Menus C…" with a stray horizontal scrollbar, and content looked shoved to one side.

| # | Bug | Root cause | Fix |
|---|---|---|---|
| 8 | HIGH — admin nav clipped to "Dashboard Menus C…" with a horizontal scrollbar under the left column (all screens ≥1024px) | The nav switched to `display:block` at `lg:`, but its `<a>` children are inline elements, so they flowed horizontally inside the 184px sidebar column and were cut off by `overflow-x-auto` | Nav is a flex column from `lg` up and a wrapping pill row below it — `src/components/admin-nav.tsx` |
| 9 | MEDIUM — mobile nav hid items behind a horizontal scroll (6 items = 512px in a 343px row) | `overflow-x-auto` scroll strip used for primary navigation | Wraps to two rows; every destination visible without scrolling |
| 10 | MEDIUM — `/admin/menus` overflowed the viewport on mobile (745px wide at 375px) and pushed the date input off-screen at 768px | Grid items default to `min-width:auto`, so the scrolling service-date strip contributed its full 816px intrinsic width to the cell | `min-w-0` on the grid/section/form and `w-full min-w-0` on the strip — `src/components/admin/menu-manager.tsx` |
| 11 | LOW — no indication of the current section | Nav had no active state | Active link highlighted via `usePathname`, with `aria-current="page"` |
| 12 | LOW — wide screens wasted space | Shell capped at `max-w-6xl` | Admin shell widened to `max-w-7xl`; customer nav wraps instead of scrolling |

## Verification

Automated responsive sweep against production — 6 admin routes and 3 customer routes at **375 / 768 / 1280 / 1920 px** (36 page-widths): no page overflow, no off-screen or clipped content, nav renders as a column ≥1024px and a fully visible wrapping row below, on every page. Test data was reactivated for the portal sweep and deactivated again afterwards.

---

# Addendum — Vercel latency and failure fixes (15 September 2026)

Reported: repeated site failures and long page renders. All four symptoms the owner selected
(hangs that error out, the database-offline panel, 500s, general slowness) traced to one measured
cause and its consequences. Full evidence: [docs/PERF_BASELINE.md](docs/PERF_BASELINE.md).

| # | Issue | Root cause | Fix |
|---|---|---|---|
| 13 | CRITICAL — every database query crossed the planet | No `vercel.json`, so Vercel used its default compute region `iad1` (Virginia) while Supabase is `ap-south-1`. Proven by `X-Vercel-Id: bom1::iad1::…` | `vercel.json` pins compute to `bom1`. `preferredRegion` is deprecated in this Next version, so `vercel.json` is the only supported mechanism. Verified: header now reads `bom1::bom1` |
| 14 | CRITICAL — `Promise.all` gave zero concurrency | The pooled connection serialises queries, so every page paid `queries × 654 ms` in strict sequence. Measured: 5 sequential = 5 via `Promise.all` = 3,270 ms; 5 batched = 1,700 ms | Nine read sites converted from `Promise.all` to `prisma.$transaction([...])` |
| 15 | HIGH — login made six sequential round trips | Rate-limit count, rate-limit insert, failed-attempt count, user lookup, attempt insert, session insert | Independent reads batched; the success audit record deferred via `after()`. Failed attempts stay awaited — they are the brute-force counter |
| 16 | HIGH — transient database failures surfaced as opaque 500s | `P2024`/`P2028`/`P2034`/`P2037`/`P1001`/`P1002` fell through `domainError()` to the generic catch-all | Mapped to 503 with `Retry-After` and an accurate "nothing was saved" message, in one place so all 22 routes inherit it |
| 17 | HIGH — a failed page render showed Next's bare error screen | No error boundaries | `admin/error.tsx` and `customer/error.tsx` render a retryable page, using the `retry` prop (stable in this version; `reset` is discouraged) |
| 18 | MEDIUM — no way to attribute latency | Nothing measured the database from inside the function | `/api/health` reports compute region and database round-trip time, and logs the connection shape once per cold start |
| 19 | LOW | `coverageFor` re-read a customer row already loaded in the same transaction; `PrismaClient` was not reused in production; the offline panel told a production owner the app "is running locally" | All three corrected |

**Deliberately not done:** `maxDuration` was not raised — Fluid compute already defaults to 300 s, and
the app returns its *own* errors at ~25 s, which is Prisma's `maxWait` + `timeout` ceiling, not a
platform kill. Raising it would only let slow writes hang longer. A setup-status memoisation was
reverted after its test correctly caught that it would permanently suppress the database-offline
panel on a warm instance.

**Results:** login → dashboard 19.5 s → 10.8 s; `/admin` 11.2 s → 4.6 s; failed login 4.8–7.6 s →
3.2 s. 45/45 tests pass, types and build clean. The remaining ~650 ms-per-query floor is a
connection-target problem for the owner to confirm from the function logs — see
[PRODUCTION_READINESS.md](PRODUCTION_READINESS.md) item 1.

---

# Addendum — Customer portal fixes (15 September 2026)

Reported: *"admin is all good but customer all features are not working, there are problems in the
customer interface of UI and everything else."*

## The headline bug: nobody could sign in

Reproduced against production before changing anything. The portal matched the customer's name
**case-sensitively** and their phone number **as an exact string**:

| Typed into the portal | Before (measured on production) | After (unit-tested; production re-run pending merge) |
|---|---|---|
| `E2E Test Customer` + `9000000001` | 200 | 200 |
| `e2e test customer` | **401** | 200 |
| `E2E TEST CUSTOMER` | **401** | 200 |
| `90000 00001` | **401** | 200 |
| `+91 9000000001` | **401** | 200 |
| `+919000000001` | **401** | 200 |
| `09000000001` | **401** | 200 |

The `Customer` table already had a `normalizedPhone` column with a unique index, and the codebase
already had a `normalizePhone()` helper. The sign-in route used neither. Any customer who typed
their own name naturally, or their number with a country code, was locked out of the product
entirely — which is the whole of "customer features are not working".

## Fixes

| # | Severity | Issue | Root cause | Fix |
|---|---|---|---|---|
| 20 | CRITICAL | Customers could not sign in unless they reproduced the admin's exact capitalisation and phone formatting | `findFirst` on raw `name` + raw `phone`; `normalizedPhone` and `normalizePhone()` both ignored | Phone narrows in SQL on its last 10 digits; name compared in JS, case- and spacing-insensitively. Ambiguous matches refuse rather than guess — `src/app/api/customer-access/route.ts` |
| 21 | HIGH | **Sign-in bypass introduced by the first draft of fix 20 and caught in review before shipping** | Prisma's `mode: "insensitive"` compiles to an *unescaped* `ILIKE`. `{"name":"%%","phone":"<digits>"}` matches every customer, collapsing a two-factor sign-in to the phone number alone — and that session can order, cancel and read the victim's full ledger | The name is never sent to the database. Regression tests cover `%%`, `%` and `_` payloads |
| 22 | HIGH | Ten sign-ins and twenty orders per 15 minutes **for an entire building** | Rate limits keyed on client IP; a mess or hostel shares one WiFi address | Limits key on customer id (or the submitted phone digits); a generous IP guard remains against floods — `src/lib/security/rate-limit.ts` |
| 23 | HIGH | Account balance could disagree with the admin's figure | Balance was summed from the 30 newest ledger rows that happened to be displayed | Aggregated over the whole ledger; `take: 30` now only bounds the visible activity list |
| 24 | HIGH | Optimistic "Ordered" state leaked onto the wrong day | Switching the date strip from `<a>` to `<Link>` made navigation soft, and Next strips search params from the page cache key, so the board kept its state across dates | `key={serviceDate}` remounts the board per date |
| 25 | MEDIUM | `/customer/orders` was a dead end: no service dates, no way to cancel | Page rendered status and price only | Service date, cancel button and cutoff time, via a shared `CancelOrderButton` used by both the board and the history page |
| 26 | MEDIUM | Order button offered meals the server was certain to refuse | Closure days, ordering cutoffs and missing prices were only discovered on submit | Pre-computed server-side; the button is disabled with the reason shown |
| 27 | MEDIUM | A credit rendered as "₹-50"; ledger rows showed accounting jargon with no dates | Raw `amountMinor / 100` and raw `description` | `formatMoney` / `formatServiceDate` / `describeLedgerEntry` — `src/lib/format.ts`. "₹50 in credit", "Refund for a cancelled meal" |
| 28 | MEDIUM | iOS Safari zoomed in on every form and stayed zoomed | Inputs inherited 14px; Safari auto-zooms any focused control under 16px | `text-base` on the shared input and textarea — fixes every form in the app |
| 29 | LOW | Customer nav touch targets were 38px | `py-2` on a 20px line box | `py-3` (46px) on all three links |
| 30 | LOW | Customer sign-in button re-enabled mid-navigation, so it looked like nothing happened | Same defect as bug 3 on the admin login, never mirrored here | Submitting state persists through navigation, with a 30 s safety valve |
| 31 | LOW | A long dish name could push the page sideways | `min-w-0` wrappers with no `overflow-wrap` | `break-words` on the three wrappers |

Also: "No active meal plan covers this meal" now tells the customer what to do about it, and the
account page warns a customer who has no plan *and* no pay-as-you-go **before** they try to order.

## How the security bug was caught

The first draft of fix 20 used `name: { equals, mode: "insensitive" }` — the obvious Prisma
idiom. A four-lens adversarial review (auth / React-RSC / customer journey / mobile) raised 21
findings; 11 survived a refute-by-default verification pass. The auth reviewer reproduced the
`ILIKE` behaviour against the installed Prisma 6.19.3 query engine rather than from memory, and
correctly noted that the green test suite could not have caught it: the tests mock
`prisma.customer.findMany` and assert on the shape of the `where` object, so no SQL is ever
generated. That finding is the reason this addendum documents a vulnerability that never shipped.

## Deliberately not done

- **Plan-aware order copy.** A PREPAID (plan-covered) meal still shows a rupee figure and the
  cancel text says "credited" rather than "returned to your plan". Refuted as unreachable in the
  current data — no admin screen creates prepaid subscriptions — but it becomes real the day one does.
- **Coverage pre-check on the Order button.** The three cheap refusals are pre-computed; entitlement
  and capacity are not, because that needs the full allocation check per meal on every page render.
- **Ambiguous-match telemetry.** Two customers matching the same details is refused but not logged.

## Verification

- **72 tests pass** (was 61 — 11 new covering the matching matrix, the wildcard payloads, the
  ambiguity guard and money formatting), `tsc --noEmit` clean, `next build` clean.
- **Production sign-in matrix NOT yet re-run.** PR #2 is not merged, and the Vercel preview is
  behind deployment protection, so the "After" column above is what the unit tests assert, not a
  live measurement. Production was re-checked at 23:50 IST and still returns 401 for a lowercase
  name. The matrix will be re-run against production once PR #2 merges.
