# PG Catering Operations SaaS
## Codex Master PRD — v1.1

**Status:** Implementation specification  
**Primary platform:** Mobile-first responsive web app  
**Primary users:** Caterer/Admin + PG Customer  
**Core principle:** Simple operations, reliable financials, minimal screens.

---

# 0. NON-NEGOTIABLE RULES

Codex MUST read and obey these before writing code.

1. Never invent unspecified business rules.
2. Never silently remove or weaken a requirement.
3. Financial history is immutable.
4. Historical order prices never change.
5. Orders, entitlements, charges and payments are separate concepts.
6. Prepaid meals are represented as meal-specific entitlements.
7. Cancelled prepaid meals return to entitlement before cutoff.
8. Caterer closure returns affected prepaid entitlements.
9. Unused prepaid entitlements carry forward indefinitely until consumed.
10. Subscription expiry does not expire already-paid entitlements.
11. Subscriptions end on the last calendar day of their month.
12. Subscriptions do not automatically renew in MVP.
13. Customer orders after cutoff are blocked.
14. Admin may create manual exception orders.
15. Frontend must never be trusted for price, cutoff, balance, entitlement or authorization decisions.
16. Server/database are the source of truth.
17. Money must use exact integer minor units such as paise.
18. Historical financial records must never be destructively edited.
19. Duplicate submissions must be prevented server-side.
20. No fake integrations, fake payments or fake WhatsApp functionality.
21. No hard-coded customer data, prices, credentials or business rules.
22. Secrets belong in environment variables.
23. Every critical financial calculation requires automated tests.
24. Every important action needs loading, success, empty and error states.
25. If implementation requires a genuinely undefined business decision, STOP and report it rather than guessing.
26. Prefer simple architecture over technical sophistication.
27. Do not build features outside MVP without explicit approval.

---

# 0.1 APPROVED MVP BUSINESS DECISIONS

This register resolves MVP lifecycle decisions. These rules override an earlier ambiguous reading of this PRD. If a later implementation requirement conflicts with this register, STOP and report the conflict.

## Customer creation and access

1. Admin creates customers in MVP. There is no customer self-registration, open sign-up, password, or OTP flow.
2. A customer record requires a display name and a normalized phone number. Multiple customers may share a name; a normalized phone number is unique within one business.
3. Duplicate phone entry must open or identify the existing customer record. It must never silently create a duplicate customer.
4. The customer access mechanism remains name + phone. It is intentionally lightweight, not strong authentication.
5. Phone numbers must be normalized before storage and lookup. Name matching is trimmed and case-insensitive for access, while the entered display name is preserved.
6. Customer access attempts must be rate-limited by normalized phone number and request IP. Customer access failures must not disclose whether a name or phone number exists.
7. An active customer profile may access a read-only account before a plan is active. An inactive customer cannot access the account.
8. Customer sessions must be server-managed, expire, support logout, and be invalidated when the customer is deactivated.
9. A customer may not edit their phone number in MVP. An admin may correct it only after duplicate checking and an audit record.

## Customer profile, service eligibility, and deactivation

10. Customer profile status and service eligibility are separate concepts. Creating an active profile does not itself permit food ordering.
11. A customer without an active prepaid, count-based, or explicitly enabled pay-as-you-go arrangement sees: "No active meal plan" and cannot place orders.
12. Pay-as-you-go must be explicitly enabled by an admin. It is not the implicit fallback for every customer without a plan.
13. Deactivation preserves customer history, debt, payments, invoices, and unused prepaid entitlements. It blocks customer access and all new service.
14. Deactivating a customer cancels every future unfulfilled order. Prepaid orders restore entitlement; count-based and charge-based orders receive the standard full reversal. The action must be atomic and audited.
15. Reactivation restores access and future service eligibility only when the customer also has a valid active arrangement. It never recreates history or entitlement.

## Plans, subscriptions, and activation

16. Plans are created from admin-managed templates. An admin may make an auditable per-enrolment override; customers cannot switch plans themselves in MVP.
17. Every subscription has a lifecycle state: DRAFT, PENDING_PAYMENT, SCHEDULED, ACTIVE, ENDED, or CANCELLED.
18. A prepaid subscription becomes active only when its full required payment has been manually recorded and its start date has arrived.
19. Recording a partial prepaid payment does not create any usable prepaid entitlement. It remains a payment/credit record against a pending enrolment. If that enrolment is subsequently cancelled, the recorded payment becomes general customer ledger credit; the original payment remains preserved and no external refund is implied.
20. Recording the full required prepaid payment creates immutable meal-specific entitlement records. If the subscription starts in the future, those entitlements are created but remain unavailable until the start date.
21. A future meal may be booked against a paid future-start prepaid subscription when its service date is on or after the subscription start date. The applicable entitlement is reserved and decremented at booking, even before the subscription start date; this reservation does not make the entitlement usable for an earlier service date.
22. A count-based subscription creates no prepaid entitlement. A future count-plan order may be booked before its `start_date` only when its service date is on or after `start_date` and on or before `end_date`. Booking reserves monthly count capacity immediately but does not create a financial charge. Capacity reservation, meal consumption/fulfilment, and financial charge creation are separate concepts and must not be inferred from one another. The count-subscription charge is created atomically at the applicable meal's cancellation cutoff, when the order becomes non-cancellable by the customer. Cancellation releases the reservation according to the applicable cancellation rule. Count-plan coverage is blocked for service dates before `start_date` or after `end_date`; if pay-as-you-go is explicitly enabled, a date outside the count-plan period may instead be placed as a normal charge-based order.
23. An explicitly enabled pay-as-you-go customer has no prepaid entitlement or count capacity. Eligible orders create normal historical charges.
24. Subscription expiry ends new subscription capacity but does not expire previously paid prepaid entitlement. Renewal is explicit and never automatic.
25. Future plan entitlement and a confirmed future meal order are different things. Customer UX must never label future entitlement as a booked meal.
26. When more than one valid prepaid entitlement matches a meal type, the oldest valid entitlement is used first (FIFO).
27. A paid future-start prepaid subscription may be cancelled by an admin. The system cancels all affected future unfulfilled orders and reservations, converts the full unused original paid amount into general customer ledger credit, and preserves complete audit history. The application does not initiate an external refund; any physical refund is recorded as an audited adjustment. The operation is atomic and idempotent.

## Operations and fulfilment

28. Confirmed orders are automatically marked completed/fulfilled after their service date. Fulfilment status is separate from financial charge state and entitlement reservation/consumption state. MVP does not require manual served confirmation.
29. Business timezone is fixed to `Asia/Kolkata` for MVP. All service dates, cutoffs, month-end calculations, reservations, closures, and fulfilment transitions use this timezone. MVP business-wide ordering and customer-cancellation cutoff defaults are 7:00 AM for Breakfast, 11:00 AM for Lunch, and 6:00 PM for Dinner. These remain configurable business settings rather than hard-coded rules.

## Payments, credits, and adjustments

30. Customers pay externally by cash, UPI, bank transfer, or other offline method. The application does not verify bank payments or use a payment gateway in MVP.
31. An admin manually records every payment. A payment records customer, amount in paise, payment date/time, method, optional reference, optional note, recording admin, and immutable timestamp.
32. Payment methods are CASH, UPI, BANK_TRANSFER, and OTHER. A UPI or bank-transfer reference is required when one is available; lack of a reference requires an explanatory note.
33. Partial payments, multiple payments, and overpayments are allowed. Overpayment remains an immutable customer credit and automatically offsets future outstanding charges; it never rewrites or deletes the original payment.
34. A prepaid enrolment and its full payment may be completed in one atomic admin action. The transaction creates the payment, activates or schedules the subscription, creates entitlement when applicable, writes ledger entries, and writes audit records; any failure rolls back the entire action.
35. Financial adjustments are immutable audited customer-ledger debits or credits. A reason is required. Correcting a specific financial record also requires a reference to that record.

## Orders, cancellation, replacement, and closure

36. Coverage priority is fixed: usable matching prepaid entitlement, then matching active count-subscription capacity, then normal charge.
37. Coverage source, price snapshot, and financial/entitlement effect are stored with the order item and are never recalculated from later plan or price changes.
38. Ordering and customer-cancellation cutoffs are independently configurable per meal and enforced server-side. They are business settings, not hard-coded source values.
39. Customer cancellation after its configured cancellation cutoff is blocked. When an admin intervenes after cutoff, the admin must explicitly choose and audit the financial treatment: keep or restore prepaid entitlement; keep or reverse a count/charge effect.
40. Financially consequential orders are never edited in place. Replacement cancels the original using an explicit treatment, creates a new order, and links both records.
41. A closure is processed atomically and idempotently. It cancels affected orders, restores prepaid entitlement, reverses count-based charges, fully credits charge-based orders, updates kitchen counts, and preserves audit history.
42. Unprocessed closure drafts may be deleted. A processed closure is immutable; a correction is an audited compensating event.

## Invoices

43. Invoices are issued manually by an admin in MVP. An issued invoice is an immutable financial snapshot.
44. An invoice includes only eligible, uninvoiced charge records for its selected period. The system must durably link included charges to invoice items to prevent duplicate inclusion.
45. Later payments, credits, and adjustments never rewrite an issued invoice. They appear as separate financial records or separately numbered adjustment documents referencing the affected record.

---

# 1. PRODUCT DEFINITION

The product is:

> **WhatsApp-friendly ordering + meal entitlement management + kitchen planning + simple billing for PG caterers.**

It is NOT a restaurant ERP.

The system must answer four questions immediately:

### Customer
**What can I eat and what do I have remaining?**

### Kitchen
**How many meals do I prepare?**

### Caterer
**Who ordered what and what has to happen today?**

### Billing
**Who owes how much and why?**

---

# 2. CORE DOMAIN MODEL

The application has five primary domains.

## 2.1 Customers

Identity and account information.

## 2.2 Orders

What the customer requested for a particular date/meal.

## 2.3 Entitlements

Prepaid meals already owned by the customer.

## 2.4 Financial Ledger

Charges, payments, credits and adjustments.

## 2.5 Operations

Menu, kitchen counts, closure dates and lunchboxes.

Do not collapse these domains into one generic transaction model.

---

# 3. USER ROLES

## ADMIN

Can:

- Manage customers
- Manage menus
- Configure prices
- Configure business rules
- Create/edit/cancel manual orders
- View orders
- Manage subscriptions
- Manage entitlements
- Record payments
- Generate invoices
- Share invoices
- Manage closure dates
- View kitchen counts
- Track lunchboxes
- View reports
- View audit history

## CUSTOMER

Can:

- Identify using name + phone
- View menu
- Select date
- Order meals
- View upcoming orders
- Cancel before cutoff
- View subscription
- View remaining entitlements
- View outstanding balance
- View invoices
- View order history

Customers cannot access other customers' information.

---

# 4. CUSTOMER IDENTIFICATION

## MVP

Use:

**Phone number + name**

Rules:

- Phone number is unique within a business.
- Customer receives an internal immutable customer ID.
- Name is display/identification information.
- Phone number is not changed automatically by user input.
- Authentication strength is intentionally lightweight for MVP.
- Do not build passwords.
- Do not build OTP unless explicitly added later.

If stronger authentication becomes necessary, introduce OTP in V1.1.

---

# 5. ORDER TYPES

The system supports:

1. One-time order
2. Multiple meals on one date
3. Future order
4. Prepaid subscription meal
5. Count-based subscription meal
6. Extra meal outside subscription
7. Admin/manual order

Every order must identify its source/type.

Suggested enum:

```text
ONE_TIME
PREPAID_SUBSCRIPTION
COUNT_SUBSCRIPTION
EXTRA_MEAL
MANUAL
```

---

# 6. MEAL TYPES

MVP supports:

```text
BREAKFAST
LUNCH
DINNER
```

Meal types must be configurable enough to extend later, but do not build arbitrary meal-category complexity.

Each meal type has:

- Name
- Active/inactive status
- Current price
- Ordering rules
- Cutoff configuration

---

# 7. MENU

A menu belongs to a specific business and date.

Example:

```text
August 21

Breakfast
Idli + Sambar

Lunch
Rice + Chicken Curry

Dinner
Chapati + Vegetable Curry
```

## Rules

- Menu is published manually.
- Future menus are never assumed.
- Unpublished future date displays:
  **"Menu not published yet."**
- Admin may publish/edit a menu.
- Existing orders retain their historical meal information.
- Menu changes must not rewrite historical orders.
- Optional image support may exist but is not required for core ordering.

---

# 8. PRICING

Prices are configurable.

Example:

```text
Breakfast ₹60
Lunch ₹80
Dinner ₹60
```

These are examples only.

Never hard-code them.

## Price snapshot rule

When an order/charge is created, store:

```text
unit_price
currency
meal_type
```

Future price changes affect only future transactions.

Example:

```text
August 20 Lunch = ₹80
August 25 Lunch = ₹90
```

The August 20 order remains ₹80 forever.

---

# 9. BUSINESS SETTINGS

Admin-configurable settings must include at minimum:

- Meal prices
- Ordering cutoff
- Cancellation cutoff
- MVP defaults: Breakfast 7:00 AM, Lunch 11:00 AM, Dinner 6:00 PM
- Business name
- Business phone
- Address/contact details if required for invoices
- Invoice numbering configuration
- Closure behavior
- Billing period rules
- Timezone is fixed to `Asia/Kolkata` for MVP.

Never hard-code these values.

---

# 10. ORDER LIFECYCLE

Recommended states:

```text
CONFIRMED
CANCELLED
COMPLETED
VOIDED
```

Avoid destructive deletion.

## Creation

Server validates:

1. Customer exists.
2. Customer is active.
3. Date is valid.
4. Meal is valid.
5. Menu availability/business rules permit ordering.
6. Date is not closed.
7. Cutoff has not passed.
8. Duplicate order does not exist.
9. Subscription/entitlement rules are valid.
10. Current price is retrieved server-side.

Then create order atomically.

For a paid future-start prepaid subscription, a future order may be created when its service date is on or after the subscription start date. The applicable meal entitlement is reserved and decremented at booking, even though fulfilment occurs later. The reservation must be represented in the entitlement event history and restored if the order is cancelled under the applicable rule.

---

# 11. CUTOFF RULE

After cutoff:

> Customer ordering is blocked.

The server must enforce this.

Frontend displaying a disabled button is insufficient.

Admin manual orders may override the customer restriction.

---

# 12. CUSTOMER CANCELLATION

Before cutoff:

```text
Order → CANCELLED
```

No cancellation fee.

### Prepaid order

```text
Consumed entitlement is restored
```

### Count/pay-later order

```text
No billable charge remains
```

### After cutoff

Customer cannot cancel.

Admin may manually intervene.

---

# 13. PREPAID SUBSCRIPTIONS

A prepaid subscription represents purchased meal entitlement.

Examples:

```text
20 Breakfast
20 Lunch
15 Dinner
```

The system creates corresponding entitlement quantities.

Subscription period:

```text
Start date → last day of that calendar month
```

Example:

```text
Start: August 15
End: August 31
```

Never extend automatically to September 14.

A paid future-start prepaid subscription may be cancelled by an admin before it starts. The subscription is cancelled and the unused monetary value becomes customer ledger credit. The system does not initiate an external refund. Any physical refund handled outside the system must be recorded as an audited adjustment.

---

# 14. PREPAID ENTITLEMENT ENGINE

Each entitlement must track:

- Customer
- Subscription
- Meal type
- Original quantity
- Remaining quantity
- Created date
- Consumption history

## Consumption

If customer orders Lunch and has available prepaid Lunch:

```text
Remaining Lunch -= 1
```

No new charge is created for that meal.

## Cancellation

Before cutoff:

```text
Lunch order cancelled
→ Lunch entitlement +1
```

## Extra meal

If customer has no entitlement or explicitly orders outside the subscription:

```text
Create normal charge
```

When more than one valid prepaid entitlement matches the meal type, consume the oldest valid entitlement first (FIFO). A future booking may reserve an entitlement only when its service date is on or after the paid subscription start date. Reservation/decrement occurs at booking; it does not mean the meal has already been fulfilled.

---

# 15. ENTITLEMENT CARRY-FORWARD

Unused prepaid meals:

**DO NOT EXPIRE.**

They remain usable after:

- Subscription end
- Month end
- Failure to renew

Example:

```text
August entitlement = 20 Lunches
Consumed = 15
Remaining = 5
```

September subscription not renewed.

The 5 Lunch entitlements remain available.

## Meal-specific rule

Lunch entitlement can only satisfy Lunch.

Do not automatically convert:

```text
Lunch → Breakfast
Lunch → Dinner
Lunch → ₹ credit
```

---

# 16. COUNT-BASED SUBSCRIPTIONS

Count-based subscription customers pay based on accumulated billable meals.

Example:

```text
Lunch × 18
```

If 18 eligible meals occur:

```text
18 × historical applicable prices
```

For each count-subscription order, create its charge atomically when the applicable cancellation cutoff passes and the order becomes non-cancellable by the customer. Booking reserves capacity but does not create the charge.

At month-end:

```text
Charges → invoice → payment
```

Exact commercial configuration belongs to the subscription record.

Do not assume all subscriptions use the same billing model.

Future count-based orders reserve the applicable subscription's monthly capacity when booked. Cancellation releases that reservation according to the cancellation rule. A reservation is distinct from fulfilment and from payment settlement.

---

# 17. SUBSCRIPTION RENEWAL

Every subscription ends on the final calendar day of its month.

Renewal is explicit.

Do not auto-renew in MVP.

Existing unused prepaid entitlements survive independently.

Confirmed orders are automatically treated as completed/fulfilled after their service date. Fulfilment status is separate from financial charge state and entitlement reservation/consumption state. MVP does not require manual served confirmation.

---

# 18. CATERER CLOSURE DAYS

Admin can mark individual dates as:

```text
NO_SERVICE
```

Do not assume Sundays are automatically closed.

Example:

```text
Sunday, August 30 → No Service
```

## On closure

System must automatically:

1. Prevent customer orders.
2. Identify affected existing orders.
3. Cancel affected fulfilment.
4. Restore prepaid entitlements.
5. Remove/reverse affected count-based billing.
6. Preserve audit history.
7. Show affected information to admin.
8. Make returned prepaid meals available for later use.

Customer cancellation and caterer closure must remain distinguishable events.

---

# 19. BILLING ARCHITECTURE

Use a financial ledger.

Core concepts:

```text
CHARGE
PAYMENT
CREDIT
ADJUSTMENT
```

Do not use a single mutable `balance` field as the authoritative financial record.

Balance is conceptually:

```text
Opening balance
+ Charges
- Payments
- Credits
+/- Adjustments
= Outstanding balance
```

Any cached balance must be rebuildable from the ledger.

---

# 20. CHARGES

Every billable meal creates a charge containing:

- Customer
- Order
- Meal type
- Quantity
- Unit price
- Total
- Date
- Source/type
- Creation timestamp

Historical charge values are immutable.

---

# 21. PAYMENTS

Payment records contain:

- Customer
- Amount
- Payment date
- Payment method
- Reference/note
- Recorded by
- Timestamp

Support:

- Full payment
- Partial payment
- Multiple payments
- Overpayment

Do not silently delete or overwrite payments.

Corrections require adjustment/reversal records.

---

# 22. OVERPAYMENT

Example:

```text
Bill ₹850
Payment ₹1,000
```

The ₹150 difference must remain recorded as customer credit/overpayment according to the ledger model.

Never discard it.

---

# 23. INVOICING

Admin can:

- Select customer
- Select billing period
- Generate invoice
- View invoice
- Download invoice
- Share invoice
- Send through WhatsApp share/deep link

Invoice includes:

- Business name
- Business contact
- Customer
- Billing period
- Invoice number
- Invoice date
- Order breakdown
- Meal quantities
- Unit prices
- Subtotal
- Previous balance
- Payments
- Credits/adjustments
- Outstanding amount

Invoice generation must be reproducible.

Regenerating an invoice must not duplicate charges.

---

# 24. WHATSAPP

## MVP

Use:

**WhatsApp share/deep links**

Do not build WhatsApp Business API.

Example message:

```text
Your invoice for August is ₹2,450.
Outstanding amount: ₹850.

Invoice: [shareable invoice link/file]
```

Official WhatsApp API belongs to later scope unless a real business requirement appears.

Never claim API automation exists when it doesn't.

---

# 25. KITCHEN DASHBOARD

The kitchen view is operational, not financial.

Display:

```text
TODAY

Breakfast   42
Lunch       57
Dinner      38

TOTAL       137
```

For each meal show:

- Total quantity
- Subscription quantity
- One-time quantity
- Extra quantity
- Special notes
- Cancelled quantity where useful

Cancelled meals must not count toward preparation.

The primary question:

> **How much food must be prepared?**

---

# 26. LUNCHBOX TRACKING

Simple aggregate tracking only.

Fields:

```text
Date
Boxes dispatched
Boxes returned
Missing
Notes
```

Formula:

```text
Missing = Dispatched - Returned
```

Validate:

```text
Returned <= Dispatched
```

Do not build:

- QR
- RFID
- individual IDs
- scanning

---

# 27. ADMIN DASHBOARD

Dashboard should prioritize today's actions.

### TODAY

```text
Orders       X
Breakfast    X
Lunch        X
Dinner       X
Revenue      ₹X
Collected    ₹X
Outstanding  ₹X
Boxes Missing X
```

Primary shortcuts:

```text
Today's Orders
Kitchen
Customers
Payments
Invoices
Menu
Subscriptions
```

Avoid analytics clutter.

---

# 28. CUSTOMER HOME

Minimal interface:

```text
Today's Menu

Breakfast ₹X
Lunch ₹X
Dinner ₹X

[Order]

Upcoming Orders
Remaining Prepaid Meals
Outstanding Balance
Recent Orders
```

Customer should not see internal accounting complexity.

---

# 29. DATABASE SCHEMA

Use PostgreSQL.

Minimum tables:

### businesses

```text
id UUID PK
name
phone
address
created_at
updated_at
```

### users

```text
id UUID PK
business_id FK
role
name
phone
status
created_at
updated_at
```

### customers

```text
id UUID PK
business_id FK
user_id nullable FK
name
phone
status
created_at
updated_at
```

Unique:

```text
business_id + phone
```

### meal_types

```text
id UUID PK
business_id FK
name
code
active
sort_order
```

### prices

```text
id UUID PK
business_id FK
meal_type_id FK
amount_minor
effective_from
effective_to nullable
```

Never update historical price records destructively.

### menus

```text
id UUID PK
business_id FK
menu_date
status
published_at
created_at
updated_at
```

Unique:

```text
business_id + menu_date
```

### menu_items

```text
id UUID PK
menu_id FK
meal_type_id FK
name
description
image_url nullable
```

### orders

```text
id UUID PK
business_id FK
customer_id FK
order_date
source
status
notes
created_at
updated_at
cancelled_at nullable
cancelled_by nullable
```

### order_items

```text
id UUID PK
order_id FK
meal_type_id FK
menu_item_name_snapshot
quantity
unit_price_minor
entitlement_id nullable
```

### subscriptions

```text
id UUID PK
business_id FK
customer_id FK
type
start_date
end_date
status
created_at
updated_at
```

### subscription_items

```text
id UUID PK
subscription_id FK
meal_type_id FK
quantity
billing_mode
```

### entitlements

```text
id UUID PK
business_id FK
customer_id FK
subscription_id FK nullable
meal_type_id FK
original_quantity
remaining_quantity
created_at
```

### entitlement_events

```text
id UUID PK
entitlement_id FK
event_type
quantity
order_id nullable
reason
created_at
created_by
```

Examples:

```text
CREATED
CONSUMED
RESTORED
CARRY_FORWARD
ADJUSTED
```

### ledger_entries

```text
id UUID PK
business_id FK
customer_id FK
type
amount_minor
order_id nullable
payment_id nullable
invoice_id nullable
description
created_at
created_by
```

### payments

```text
id UUID PK
business_id FK
customer_id FK
amount_minor
payment_date
method
reference
notes
created_at
created_by
```

### invoices

```text
id UUID PK
business_id FK
customer_id FK
invoice_number
period_start
period_end
status
subtotal_minor
previous_balance_minor
payments_minor
credits_minor
outstanding_minor
issued_at
created_at
created_by
```

### invoice_items

```text
id UUID PK
invoice_id FK
order_id nullable
description
meal_type
quantity
unit_price_minor
total_minor
```

### closure_days

```text
id UUID PK
business_id FK
closure_date
reason
created_at
created_by
```

Unique:

```text
business_id + closure_date
```

### lunchbox_records

```text
id UUID PK
business_id FK
record_date
dispatched
returned
missing
notes
created_at
updated_at
created_by
```

### business_settings

```text
id UUID PK
business_id FK
setting_key
setting_value
```

### audit_logs

```text
id UUID PK
business_id FK
actor_user_id
entity_type
entity_id
action
before_data
after_data
reason
created_at
```

---

# 30. DATABASE RULES

Must enforce:

- Foreign-key integrity
- Unique customer phone per business
- Unique menu per date/business
- Unique closure per date/business
- Valid non-negative quantities
- Valid non-negative money
- Valid subscription dates
- Returned boxes cannot exceed dispatched
- Appropriate order uniqueness
- Business isolation

All critical multi-record operations must use database transactions.

---

# 31. API DESIGN

Use REST initially.

Examples:

```text
POST   /api/customers
GET    /api/customers
GET    /api/customers/:id
PATCH  /api/customers/:id

GET    /api/menu?date=
POST   /api/menu
PATCH  /api/menu/:id
POST   /api/menu/:id/publish

POST   /api/orders
GET    /api/orders
GET    /api/orders/:id
POST   /api/orders/:id/cancel

POST   /api/subscriptions
GET    /api/subscriptions
GET    /api/subscriptions/:id

GET    /api/customers/:id/entitlements

POST   /api/payments
GET    /api/payments

POST   /api/invoices
GET    /api/invoices/:id
GET    /api/invoices/:id/download

POST   /api/closures
DELETE /api/closures/:id   # unprocessed drafts only; processed closures require a compensating action

GET    /api/kitchen/today

POST   /api/lunchboxes
GET    /api/lunchboxes

GET    /api/reports/daily
GET    /api/reports/weekly
GET    /api/reports/monthly
```

All APIs must enforce authorization server-side.

---

# 32. ORDER CREATION TRANSACTION

Creating an order must be atomic.

Pseudo-process:

```text
BEGIN

Validate customer
Validate date
Validate meal
Validate closure
Validate cutoff
Validate menu/business rules
Check duplicate/idempotency
Resolve current price
Check subscription entitlement
Create order
Create order item
Consume entitlement OR create charge
Create audit event

COMMIT
```

If any critical step fails:

```text
ROLLBACK
```

Never leave half-created orders.

---

# 33. CLOSURE TRANSACTION

When admin closes a date:

```text
BEGIN

Create closure
Find affected active orders

For each affected order:
    cancel fulfilment
    restore prepaid entitlement if applicable
    reverse/remove billable charge if applicable
    create audit event

COMMIT
```

Must be idempotent.

Running closure processing twice must not double-credit entitlements.

---

# 34. ADMIN MANUAL ORDERS

Admin can create an order even when customer ordering is closed.

Manual orders must clearly identify:

```text
source = MANUAL
created_by = admin
```

If the admin overrides a normal rule, audit it.

---

# 35. CONCURRENCY

Protect against:

- Two customers ordering simultaneously
- Customer double-submitting
- Two admins editing an order
- Two processes consuming the same entitlement

Use:

- Database transactions
- Unique constraints
- Row locking where needed
- Idempotency keys
- Optimistic versioning where appropriate

Never rely solely on frontend state.

---

# 36. RESPONSIVE UX

## 360px

Primary target.

- Single-column layouts
- Large buttons
- Minimal tables
- Sticky primary action where useful

## 390–430px

Same mobile model with more breathing room.

## 768px+

Tablet layouts may introduce:

- Two-column admin views
- Wider tables
- Side navigation

## 1024px+

Desktop admin dashboard may use:

- Sidebar
- Multi-column layouts
- Data tables

Do not simply shrink desktop onto mobile.

---

# 37. DESIGN SYSTEM

## Visual direction

Reliable, friendly, food-service oriented.

Avoid:

- Corporate ERP appearance
- Excessive gradients
- Dense dashboards
- Tiny text
- Excessive cards

## Typography

Use a highly readable modern sans-serif.

Suggested:

**Inter**

## Color system

Use:

- Neutral background
- Dark readable text
- One primary brand color
- Green for successful/paid/returned states
- Red for errors/missing/critical states
- Amber for warnings/pending

Do not use color as the only indicator.

---

# 38. COMPONENTS

Build reusable components:

- Button
- Input
- Select
- Date picker
- Meal selector
- Price display
- Status badge
- Card
- Table
- Bottom sheet
- Modal
- Toast
- Confirmation dialog
- Empty state
- Error state
- Loading skeleton
- Order summary
- Balance summary
- Entitlement counter

Avoid giant page-specific components.

---

# 39. CUSTOMER ORDER UX

Preferred flow:

```text
Home
 ↓
Select date
 ↓
Meal selection
 ↓
Review
 ↓
Confirm
 ↓
Confirmation
```

Do not create unnecessary checkout pages.

If prepaid entitlement applies, show:

> **Covered by your prepaid Lunch entitlement**

If billable:

> **₹80 will be added to your balance**

This makes the financial consequence obvious.

---

# 40. CUSTOMER ORDER CONFIRMATION

After successful order:

Show:

- Date
- Meal
- Quantity
- Menu item
- Amount charged OR entitlement consumed
- Cancellation deadline
- Order status

Clear success message.

Never merely refresh the page.

---

# 41. CUSTOMER UPCOMING ORDERS

Show:

- Date
- Meals
- Status
- Amount/entitlement
- Cancellation availability

Cancellation button only appears when permitted.

---

# 42. ADMIN ORDER SCREEN

Filters:

- Date
- Meal
- Customer
- Status
- Order type

Actions:

- View
- Cancel
- Modify where allowed
- Manual order
- View financial consequence

Do not allow dangerous silent edits.

---

# 43. CUSTOMER MANAGEMENT

Admin can:

- Create customer
- Edit customer details
- Deactivate customer
- View history
- View subscriptions
- View entitlements
- View balance
- View invoices

Deactivation must not delete history.

---

# 44. REPORTING

MVP reports:

### Daily

- Orders
- Breakfast count
- Lunch count
- Dinner count
- Revenue
- Collections
- Outstanding
- Active customers

### Weekly

Same aggregated metrics.

### Monthly

Same aggregated metrics.

Optional CSV export.

No vanity charts.

---

# 45. ANALYTICS

Track only:

- Active customers
- Orders/day
- Meals/day
- Revenue
- Collections
- Outstanding
- Subscription customers
- One-time customers
- Cancellations
- Missing boxes

Do not add product analytics complexity until actual usage justifies it.

---

# 46. SECURITY

Minimum production requirements:

- Secure authentication/session handling
- Role-based authorization
- Business-level data isolation
- Server-side validation
- Input sanitization
- Rate limiting for sensitive endpoints
- Secure cookies/tokens
- HTTPS in deployment
- Environment variables for secrets
- No credentials in source code
- Database access restrictions
- Audit logs
- Backups
- Restore procedure

A customer must never access another customer's:

- Orders
- Balance
- Payments
- Invoices
- Entitlements

---

# 47. MULTI-TENANCY FOUNDATION

The first deployment may serve one caterer.

Nevertheless, all major business data should contain:

```text
business_id
```

Business data must always be scoped by business.

Do not build a complex multi-tenant UI yet.

Architecture should allow:

```text
Business A
 ├ Customers
 ├ Menus
 ├ Orders
 └ Financials

Business B
 ├ Customers
 ├ Menus
 ├ Orders
 └ Financials
```

---

# 48. RECOMMENDED TECH STACK

## Frontend

**Next.js + TypeScript**

Reason:

- Fast development
- Excellent mobile web support
- Mature ecosystem
- Easy deployment
- Good Codex compatibility

## UI

**Tailwind CSS**

Reason:

- Fast responsive implementation
- Consistent design system
- Minimal custom CSS overhead

## Backend

Use **Next.js server/API layer** initially.

Do not create a separate backend service unless actual requirements demand it.

## Database

**PostgreSQL**

Reason:

- Strong relational integrity
- Excellent transactions
- Constraints
- Suitable for financial data
- Scales far beyond the initial business

## ORM

**Prisma** or another mature typed PostgreSQL ORM.

Choose one and keep it consistent.

## Validation

**Zod** or equivalent schema validation.

## Authentication

Simple secure session/authentication appropriate for the chosen Next.js architecture.

## Hosting

A simple managed deployment:

- Vercel/Cloudflare-compatible frontend/application hosting
- Managed PostgreSQL such as Neon/Supabase/Railway

Exact provider can be selected during implementation.

---

# 49. ARCHITECTURE PRINCIPLE

Start as a:

> **Modular monolith.**

Not microservices.

Suggested modules:

```text
customers/
orders/
menus/
subscriptions/
entitlements/
billing/
payments/
invoices/
kitchen/
lunchboxes/
reports/
settings/
audit/
```

Each module should have clear boundaries.

---

# 50. MVP DEVELOPMENT PHASES

## Phase 1 — Foundation

Build:

- Project
- Database
- Authentication
- Business
- Admin/customer roles
- Settings
- Base UI

### Test

Users cannot access unauthorized data.

---

## Phase 2 — Customers + Menu

Build:

- Customer management
- Meal types
- Pricing
- Menu creation
- Publishing
- Customer menu view

### Test

Changing current price doesn't alter historical data.

---

## Phase 3 — Orders

Build:

- Customer ordering
- Future dates
- Multiple meals
- Cutoff
- Cancellation
- Manual admin orders
- Duplicate protection

### Test

Every order scenario works correctly.

---

## Phase 4 — Subscriptions + Entitlements

Build:

- Prepaid subscriptions
- Count subscriptions
- Meal-specific entitlements
- Consumption
- Cancellation restoration
- Carry-forward
- Extra meals
- Monthly expiry

### Test

Construct automated scenarios around entitlement balances.

---

## Phase 5 — Billing

Build:

- Charges
- Payments
- Partial payments
- Credits
- Balance
- Invoices
- Audit trail

### Test

Every balance can be independently reconstructed.

---

## Phase 6 — Operations

Build:

- Kitchen dashboard
- Closure days
- Automatic closure handling
- Lunchboxes

### Test

Closure correctly affects orders, entitlements, billing and kitchen counts.

---

## Phase 7 — Reporting + WhatsApp

Build:

- Daily/weekly/monthly reports
- CSV
- Invoice sharing
- WhatsApp deep links

---

## Phase 8 — Production Hardening

Test:

- Mobile responsiveness
- Slow network
- Security
- Concurrent requests
- Database transactions
- Error handling
- Backups
- Deployment
- Recovery

---

# 51. REQUIRED TEST SCENARIOS

Codex must create automated tests for at least these scenarios.

### Ordering

1. One lunch order.
2. Three meals same day.
3. Future order.
4. Duplicate submission.
5. Order after cutoff.
6. Order on closure day.
7. Cancel before cutoff.
8. Cancel after cutoff.
9. Admin manual order.

### Pricing

10. Current price applied.
11. Price changes.
12. Old order retains old price.

### Prepaid

13. Create entitlement.
14. Consume entitlement.
15. Cancel and restore.
16. Carry forward.
17. Use carried-forward entitlement.
18. Extra meal creates charge.
19. Meal type cannot be incorrectly substituted.

### Count subscription

20. Accumulate monthly charges.
21. Generate month-end invoice.
22. Partial payment.
23. Full payment.
24. Overpayment.

### Closure

25. Closure before orders.
26. Closure after orders.
27. Prepaid entitlement restoration.
28. Count-based charge reversal.
29. Closure processed twice without duplication.

### Financial integrity

30. Reconstruct customer balance.
31. Correct an erroneous charge without destroying history.
32. Regenerate invoice without duplicate billing.

### Security

33. Customer cannot access another customer.
34. Customer cannot perform admin operations.
35. Business A cannot access Business B.

---

# 52. EDGE CASE MATRIX

| Scenario | Required behavior |
|---|---|
| Duplicate order | Reject/idempotently return existing order |
| Price changed | Existing order retains old price |
| Menu changed | Existing order remains historically correct |
| Cancel before cutoff | Free cancellation |
| Cancel after cutoff | Block customer |
| Admin late order | Allow as manual order |
| Customer doesn't pay | Balance remains outstanding |
| Partial payment | Reduce outstanding only by paid amount |
| Overpayment | Record customer credit |
| Future menu unavailable | Show menu-not-published |
| Subscription expires | Subscription ends; entitlements remain |
| Unused prepaid meal | Carry forward |
| Wrong meal entitlement | Reject |
| Customer doesn't renew | Existing prepaid entitlement remains |
| Caterer closes | Automatically process affected orders |
| Customer joins mid-month | Subscription ends on month-end |
| Customer leaves PG | Deactivate account; preserve history |
| Deleted order | Never destructively delete historical financial data |
| Double admin action | Idempotent/protected |
| Network retry | No duplicate transaction |
| Concurrent entitlement use | Database-safe atomic consumption |
| Invoice regenerated | No duplicate charge |
| Lunchboxes returned > dispatched | Reject |

---

# 53. V1.1

After real customer usage validates MVP:

- OTP authentication
- Better customer onboarding
- Automated WhatsApp reminders
- WhatsApp Business API
- Online payments
- Subscription templates
- Better invoice delivery
- More sophisticated reports
- Staff accounts
- Better notification system

Only build features based on observed operational pain.

---

# 54. V2

Potential:

- Multiple PG locations
- Multiple kitchens
- Staff permissions
- Inventory
- Ingredient forecasting
- Delivery tracking
- Advanced analytics
- Customer feedback
- Coupons
- Automated subscription renewal
- Payment reconciliation
- Advanced business reporting

---

# 55. MVP EXCLUSIONS

Codex MUST NOT implement these unless explicitly instructed:

- AI
- Chatbot
- QR lunchboxes
- RFID
- Inventory
- Ingredient management
- Delivery routing
- Payroll
- Loyalty
- Coupons
- Marketing automation
- Automated WhatsApp API
- Online payment gateway
- Multi-kitchen UI
- Complex staff permissions
- Accounting/GST replacement
- Automatic subscription renewal

---

# 56. PERFORMANCE REQUIREMENTS

Target:

- Fast first load on mobile
- Minimal JavaScript where possible
- Optimized images
- Pagination for large datasets
- Indexed database queries
- No unnecessary polling
- No large dashboard queries on every page load

The app must remain usable on slow mobile networks.

---

# 57. ERROR HANDLING

Every operation must have:

```text
Loading
Success
Empty
Error
Retry
```

Financial failure messages must be explicit.

Bad:

> Something went wrong.

Better:

> Payment could not be recorded. No balance was changed. Please try again.

Never leave the user uncertain whether a financial action succeeded.

---

# 58. AUDIT LOGGING

Audit:

- Price changes
- Order cancellation
- Admin order creation
- Financial adjustments
- Payment recording
- Invoice generation
- Entitlement adjustments
- Subscription changes
- Closure creation
- Customer deactivation

Audit record:

```text
actor
timestamp
entity
action
before
after
reason
```

---

# 59. CODEx IMPLEMENTATION GUARDRAILS

Codex must:

- Read this complete specification before coding.
- Implement one phase at a time.
- Inspect existing code before modifying it.
- Avoid unnecessary rewrites.
- Preserve working functionality.
- Use migrations for schema changes.
- Never modify production data directly to solve application bugs.
- Never hard-code prices.
- Never hard-code credentials.
- Never use fake API responses as production functionality.
- Validate both frontend and backend.
- Write tests alongside critical functionality.
- Keep financial calculations centralized.
- Keep business rules documented.
- Keep components modular.
- Avoid giant files/components.
- Avoid unnecessary dependencies.
- Run tests after every major phase.
- Report failing tests instead of hiding them.
- Report incomplete functionality honestly.

---

# 60. CODEx DEVELOPMENT LOOP

For every feature:

```text
1. Read requirements
2. Inspect existing implementation
3. Identify affected modules
4. Design smallest correct change
5. Implement
6. Add validation
7. Add error handling
8. Add tests
9. Run tests
10. Verify UI
11. Review for business-rule violations
12. Report what changed
```

Do not jump directly from requirement → code.

---

# 61. DEFINITION OF DONE

A feature is NOT complete merely because the UI exists.

It is complete only when:

- Backend logic exists.
- Database changes exist.
- Validation exists.
- Authorization exists.
- Error handling exists.
- Loading state exists.
- Empty state exists where relevant.
- Tests exist.
- Tests pass.
- Financial implications are verified.
- Mobile UI works.
- Audit requirements are satisfied.
- No fake functionality remains.
- Documentation is updated.

---

# 62. PRODUCTION-READY ACCEPTANCE CRITERIA

The MVP is production-ready only when:

### Orders

- Customers can reliably order meals.
- Cutoff works server-side.
- Duplicate orders are prevented.
- Cancellation works correctly.
- Manual admin orders work.

### Subscriptions

- Prepaid subscriptions create correct entitlements.
- Count subscriptions accumulate correct charges.
- Cancelled meals restore entitlements.
- Caterer closures restore affected prepaid meals.
- Carry-forward works.
- Month-end subscription expiry works.

### Billing

- Every billable meal produces the correct charge.
- Historical prices remain unchanged.
- Payments are traceable.
- Partial payments work.
- Overpayments are preserved.
- Balance is reproducible.
- Invoices are accurate.

### Operations

- Kitchen counts are correct.
- Closure dates work.
- Lunchbox counts work.

### Security

- Customer/admin access is separated.
- Business data is isolated.
- Secrets are protected.
- Critical actions are audited.

### Reliability

- Critical workflows have automated tests.
- Database transactions protect multi-step operations.
- Error states don't corrupt data.
- Network retries don't create duplicates.
- Backup and recovery procedures exist.

### UX

- Core customer workflow works comfortably at 360px.
- Admin can determine today's kitchen quantity quickly.
- No unnecessary screens are required.
- The application works on inexpensive Android devices.

---

# 63. FINAL PRODUCT TEST

Before launch, the owner should be able to perform this complete scenario:

> Create customer → publish menu → configure price → create prepaid subscription → customer orders → entitlement consumed → kitchen count updates → customer cancels before cutoff → entitlement restored → caterer closes a Sunday → affected meal restored → customer later uses entitlement → customer orders an extra meal → extra meal becomes charge → record partial payment → generate invoice → verify outstanding balance → change price → confirm old orders still use historical price.

If this scenario works **without manual database intervention**, the core architecture is doing its job.

---

# 64. FINAL PRODUCT PRINCIPLE

When deciding whether to add something, ask:

> **Does this make taking orders, preparing food, managing customers, tracking entitlements, collecting money, billing, or tracking lunchboxes materially easier?**

If not:

**Do not build it.**

The product wins by being **simple, predictable and difficult to break**.

# END OF MASTER PRD
