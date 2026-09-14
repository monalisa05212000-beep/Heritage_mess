# Heritage Mess — Production E2E Test Report

**Date:** 14–15 September 2026 (Asia/Kolkata) · **Target:** https://heritage-mess-lhu5.vercel.app · **Method:** Automated Playwright browser testing (4 sequential stages), test plan derived from *Heritage Mess Admin User Manual v1.0*.

**Result: 41 checks passed · 1 HIGH bug · 2 MEDIUM bugs · 4 LOW/UX issues.** All core admin and customer workflows in the manual function correctly end to end.

---

## 1. What was verified (passed)

### Admin core
- Login (`/login`) sets `heritage_admin_session` and lands on `/admin` with full navigation (Dashboard, Menus, Customers, Orders, Money, Settings).
- Dashboard shows correct business date/time (IST), per-meal confirmed counts, today's menu section, today's orders, and exceptions (cancellations, unpaid accounts, tomorrow's-menu status).
- Menus: draft saved for 2026-09-15 ("E2E Test Breakfast/Lunch/Dinner" + descriptions), persisted on reload as DRAFT; publish succeeded and persisted as PUBLISHED.
- Date isolation: publishing 2026-09-15 left 2026-09-14 untouched ("Not created", all fields empty). Dashboard exception line correctly flipped to "Tomorrow's menu is published".
- Settings displays business details and the fixed Asia/Kolkata timezone (read-only check).

### Customer journey
- Admin created "E2E Test Customer" (phone 9000000001, PAYG) → 201, listed ACTIVE, detail page correct.
- Portal access (`/customer/access`) with name + phone succeeded in a clean browser context; greeting, nav, and 3-day date strip rendered.
- Published test menu visible to the customer for 2026-09-15 with correct dish names and prices.
- Customer placed orders (201, CONFIRMED, visible in `/customer/orders`); admin order list for the date matched; admin manual order created and verified; admin cancel worked and status changed to CANCELLED on both sides.
- Negative check: wrong phone at `/customer/access` → 401, access refused.

### Money
- Current prices displayed; scheduled Lunch ₹87 effective 2026-09-21 appears under **Upcoming** while the current price remains active — effective-dating behaves per manual §7.
- Recorded ₹50 CASH payment (ref `E2E-TEST-REF`) → balance updated on `/admin/money` and customer detail.
- Customer `/customer/account` reflects the payment and charge/reversal ledger correctly; `/customer` shows the current price, not the scheduled one.

### Verify & cleanup stage
- Independently re-verified menu status, order statuses, and balances (did not trust earlier stage reports).
- Deactivated the test customer (after cancelling orders — see Bug 1), verified INACTIVE status and that portal access is then refused.
- Deactivation auto-cancelled a remaining future (2026-09-16) confirmed order — the release logic works for future dates.

---

## 2. Bugs found

### BUG 1 — HIGH: Deactivation returns 500 when customer has a CONFIRMED order for the current business date
`POST /api/admin/customers/{id}/deactivate` → `500 {"error":"Customer could not be deactivated."}`; customer remains ACTIVE. Reproduced twice with same-day CONFIRMED orders; succeeded immediately after those orders were cancelled. A future-dated (2026-09-16) order was auto-cancelled correctly, isolating the failure to same-day orders. Related to the `serviceDate` date/timestamp comparison fixed in **PR #1** (`fix/deactivation-same-day-orders`) — the deployed build does not include that fix, and its failure mode in production is a hard 500.

### BUG 2 — MEDIUM: Duplicate order returns 500 instead of a 4xx business-rule response
`POST /api/customer/orders` for a (customer, date, mealType) already ordered → `500 {"error":"Order could not be placed."}`. The guard works (no duplicate row is created), but an expected client condition surfaces as a server fault with an unactionable message. Same anti-pattern as Bug 1 (domain-rule failure falling through to a catch-all 500) — likely one root cause in API error handling. Other endpoints (e.g. `/api/customer-access` → 401) do this correctly.

### BUG 3 — MEDIUM: Login redirect takes ~19 seconds
`POST /api/auth/login` responds quickly (200, cookie set) but the UI sits on "Signing in…" for ~19s before navigating to `/admin`. Reproduced on two fresh logins. Users will interpret this as broken login and re-click.

### BUG 4 — LOW: Menu status chip stale until manual reload
After Save draft, the chip still reads "Not created"; after Publish, the chip reads "DRAFT" while the new **Unpublish** button is already rendered (self-inconsistent in one render). Corrects only on full reload.

### BUG 5 — LOW/UX: "Order" button stays enabled for already-ordered meals
`/customer?date=…` keeps all Order buttons active even while "Your orders" below lists those meals as CONFIRMED — this walks customers directly into Bug 2, amplified by 10–25 s order latency inviting double-clicks.

### BUG 6 — LOW: Blank "Save draft" is a silent no-op
Clearing all dish fields and clicking Save draft issues no network request and shows no validation message; fields revert on reload.

### BUG 7 — LOW/cosmetic: Dashboard kitchen board shows dishes of an UNPUBLISHED menu
After unpublishing 2026-09-15, `/admin` still rendered its dish names under TODAY'S MENU with no unpublished indicator.

### Performance observation (not a functional defect)
All writes are slow: order/cancel/deactivate POSTs 10–25 s, menu date switches 2.5–8 s. Consistent with serverless + Supabase transaction pooler (`connection_limit=1`). This magnifies Bugs 3–5.

---

## 3. Residual test data left in production
Nothing was deleted; the UI exposes no deletion (by design). Current state:

| Record | State |
|---|---|
| Customer "E2E Test Customer" (9000000001, id `dd4a2346-…`) | INACTIVE; portal access verified blocked |
| 4 test order items (15–16 Sept) | All CANCELLED |
| Menus 2026-09-15 and 2026-09-16 ("E2E Test …" dishes) | UNPUBLISHED (not customer-visible); overwrite with real dishes when those dates arrive |
| Payment ₹50 CASH, ref `E2E-TEST-REF` | Kept (financial records are immutable per manual §8) |
| Scheduled price: Lunch ₹87 from 2026-09-21 | Kept. **Side effect:** it end-dated the current ₹90 row at 20 Sept. Clean undo: schedule Lunch ₹90 effective 2026-09-21 |
| E2E Test Customer balance | ₹50 credit (payment kept, charges reversed by cancellation) — arithmetically correct |

No real customer, order, menu, or setting was modified.

## 4. Not covered (future test passes)
Subscription/plan flows, capacity limits, same-day cutoff enforcement (14 Sept had no menu, so cutoff never triggered), customer self-service order cancellation, editing/deleting a scheduled price.

## 5. Recommendations
1. Merge **PR #1** and redeploy — fixes the deactivation date filter behind Bug 1.
2. Map `DomainError` (and unique-constraint conflicts) to 4xx responses with user-readable messages in the API route handlers (fixes Bugs 1/2 surface).
3. Disable/replace the Order button for already-ordered meals and show in-flight state during slow submits (Bug 5).
4. Refresh menu status from the server response after save/publish (Bug 4); add empty-field validation feedback (Bug 6); hide or badge unpublished menus on the dashboard (Bug 7).
5. Investigate login redirect latency (Bug 3) and general write latency (pooler/cold-start tuning).

*Artifacts (30+ scripts and screenshots): `C:/Users/ssai0/AppData/Local/Temp/hm_e2e/`.*
