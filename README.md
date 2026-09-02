# Heritage Mess

Mobile-first operations software for PG caterers. This repository currently implements **Phase 1 — Foundation** only.

## Included in Phase 1

- Next.js + TypeScript application shell with a mobile-first admin and customer base UI.
- Version-controlled PostgreSQL/Prisma foundation migration.
- One-time, transactional first-business and first-admin setup flow.
- Admin email/password authentication using Argon2id hashes and opaque, server-managed sessions.
- Secure HttpOnly session cookies, server-side admin authorization, database-backed login-attempt limiting, and logout invalidation.
- Customer name + phone account-access flow using a separate opaque session.
- Business isolation policy helpers with automated authorization tests.
- Audited business-detail updates and initial setup record.

## Not included yet

Customers and menus (Phase 2), orders (Phase 3), subscriptions/entitlements (Phase 4), billing (Phase 5), operations (Phase 6), and reports/WhatsApp sharing (Phase 7) have not been implemented yet.

## Local setup

1. Copy `.env.example` to `.env` and supply a real PostgreSQL `DATABASE_URL`.
2. Install dependencies: `npm install`.
3. Apply the tracked migration: `npx prisma migrate deploy`.
4. Start the app: `npm run dev`.
5. Visit `/setup` once to create the business and first admin. The setup endpoint is permanently locked after successful completion.

## Zero-cost infrastructure

The MVP is designed to run on PostgreSQL through Prisma. Supabase Free can be used as managed PostgreSQL by putting the Supabase connection string in `DATABASE_URL`; no Supabase API key is required for Phase 1.

Use Supabase only as the database unless a future phase explicitly approves another free service. Do not add Supabase Auth, paid authentication, SMS/OTP, email delivery, payment gateways, WhatsApp Business API, paid file storage, or paid observability for the MVP.

For migrations and persistent Node runtimes, use a direct/session PostgreSQL URL from Supabase with `sslmode=require`. For serverless-style runtime app traffic, use Supabase's transaction-pooler URL and include `pgbouncer=true`. Do not hard-code the Supabase project ref, host, username, password, or database name in source code.

This application requires a Node-capable host because it uses Next.js route handlers, server-managed cookies, Prisma, and database sessions. Static-only hosting is not sufficient.

## Verification

Run `npm test` for the Phase 1 authorization checks, and `npm run lint` for TypeScript validation.

## Security notes

- No credentials are committed to the repository.
- Cookie `Secure` is enabled automatically in production; always use HTTPS in deployment.
- Customer access intentionally follows the approved MVP name + phone identification model. It remains a lightweight mechanism and should be upgraded to OTP in V1.1 if stronger assurance is required.
- The rate-limit window and session duration are environment-controlled. Their defaults are documented in `.env.example`.
