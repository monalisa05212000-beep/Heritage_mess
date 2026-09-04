-- RLS is intentionally enabled only for the application runtime role.
-- The role must be provisioned separately; no password belongs in migrations.

GRANT USAGE ON SCHEMA public TO heritage_app_runtime;

DO $$
DECLARE
  table_name text;
  tenant_tables constant text[] := ARRAY[
    'business_settings','audit_logs','meal_types','plan_templates',
    'plan_template_items','subscriptions','subscription_items','prices','menus','menu_items',
    'orders','order_items','entitlements','prepaid_reservations','entitlement_effects',
    'subscription_capacity_periods','capacity_reservations','capacity_effects','order_item_events',
    'ledger_entries','charges','payments','payment_applications','financial_adjustments',
    'invoices','invoice_items','closure_days','closure_effects','idempotency_keys'
  ];
BEGIN
  FOREACH table_name IN ARRAY tenant_tables LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON TABLE public.%I TO heritage_app_runtime', table_name);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format($policy$
      CREATE POLICY heritage_tenant_isolation ON public.%I
      USING (business_id::text = nullif(current_setting('app.current_business_id', true), ''))
      WITH CHECK (business_id::text = nullif(current_setting('app.current_business_id', true), ''))
    $policy$, table_name);
  END LOOP;
END $$;

-- Authentication bootstrap policies are deliberately narrow. The application sets
-- these LOCAL transaction settings before it knows the tenant.
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses FORCE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON TABLE public.businesses TO heritage_app_runtime;
CREATE POLICY heritage_business_access ON public.businesses
  USING (
    id::text = nullif(current_setting('app.current_business_id', true), '')
    OR current_setting('app.customer_access_mode', true) = 'true'
    OR current_setting('app.setup_mode', true) = 'true'
  )
  WITH CHECK (id::text = nullif(current_setting('app.current_business_id', true), '') OR current_setting('app.setup_mode', true) = 'true');

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE public.users TO heritage_app_runtime;
CREATE POLICY heritage_user_access ON public.users
  USING (
    business_id::text = nullif(current_setting('app.current_business_id', true), '')
    OR id::text = nullif(current_setting('app.auth_user_id', true), '')
    OR email = nullif(current_setting('app.login_email', true), '')
    OR current_setting('app.setup_mode', true) = 'true'
  )
  WITH CHECK (business_id::text = nullif(current_setting('app.current_business_id', true), '') OR current_setting('app.setup_mode', true) = 'true');

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE public.customers TO heritage_app_runtime;
CREATE POLICY heritage_customer_access ON public.customers
  USING (
    business_id::text = nullif(current_setting('app.current_business_id', true), '')
    OR id::text = nullif(current_setting('app.auth_customer_id', true), '')
    OR current_setting('app.setup_mode', true) = 'true'
  )
  WITH CHECK (business_id::text = nullif(current_setting('app.current_business_id', true), '') OR current_setting('app.setup_mode', true) = 'true');

ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE public.admin_sessions TO heritage_app_runtime;
CREATE POLICY heritage_admin_session_access ON public.admin_sessions
  USING (
    token_hash = nullif(current_setting('app.session_token_hash', true), '')
    OR user_id::text = nullif(current_setting('app.auth_user_id', true), '')
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = admin_sessions.user_id AND u.business_id::text = nullif(current_setting('app.current_business_id', true), ''))
  )
  WITH CHECK (user_id::text = nullif(current_setting('app.auth_user_id', true), '') OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = admin_sessions.user_id AND u.business_id::text = nullif(current_setting('app.current_business_id', true), '')));

ALTER TABLE public.customer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_sessions FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE public.customer_sessions TO heritage_app_runtime;
CREATE POLICY heritage_customer_session_access ON public.customer_sessions
  USING (
    token_hash = nullif(current_setting('app.session_token_hash', true), '')
    OR customer_id::text = nullif(current_setting('app.auth_customer_id', true), '')
    OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_sessions.customer_id AND c.business_id::text = nullif(current_setting('app.current_business_id', true), ''))
  )
  WITH CHECK (customer_id::text = nullif(current_setting('app.auth_customer_id', true), '') OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_sessions.customer_id AND c.business_id::text = nullif(current_setting('app.current_business_id', true), '')));

-- These are global operational-security tables, not tenant data. They are
-- accessible only to the runtime role and are not granted to anon/authenticated.
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON TABLE public.login_attempts TO heritage_app_runtime;
CREATE POLICY heritage_login_attempts_runtime ON public.login_attempts USING (true) WITH CHECK (true);

ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_events FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON TABLE public.rate_limit_events TO heritage_app_runtime;
CREATE POLICY heritage_rate_limit_runtime ON public.rate_limit_events USING (true) WITH CHECK (true);

ALTER TABLE public.setup_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setup_state FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON TABLE public.setup_state TO heritage_app_runtime;
CREATE POLICY heritage_setup_runtime ON public.setup_state USING (key = 'initial-setup') WITH CHECK (key = 'initial-setup');

-- Prisma migrations remain privileged-admin-only. Remove the broad grants that
-- previously existed for Supabase API roles on application tables.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
