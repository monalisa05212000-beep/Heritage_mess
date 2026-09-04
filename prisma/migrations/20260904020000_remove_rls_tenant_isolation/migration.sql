-- RLS cleanup. The earlier RLS migrations remain immutable because they were applied.
-- This migration returns application tables to ordinary PostgreSQL visibility and
-- removes the dedicated runtime role and its grants.

DO $$
DECLARE
  policy_row record;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND policyname LIKE 'heritage_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  END LOOP;
END $$;

DO $$
DECLARE
  table_name text;
  app_tables constant text[] := ARRAY[
    'businesses','users','customers','business_settings','setup_state','admin_sessions',
    'customer_sessions','login_attempts','rate_limit_events','audit_logs','meal_types',
    'plan_templates','plan_template_items','subscriptions','subscription_items','prices',
    'menus','menu_items','orders','order_items','entitlements','prepaid_reservations',
    'entitlement_effects','subscription_capacity_periods','capacity_reservations',
    'capacity_effects','order_item_events','ledger_entries','charges','payments',
    'payment_applications','financial_adjustments','invoices','invoice_items','closure_days',
    'closure_effects','idempotency_keys'
  ];
BEGIN
  FOREACH table_name IN ARRAY app_tables LOOP
    EXECUTE format('ALTER TABLE public.%I NO FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM heritage_app_runtime;
REVOKE USAGE ON SCHEMA public FROM heritage_app_runtime;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'heritage_app_runtime') THEN
    DROP ROLE heritage_app_runtime;
  END IF;
END $$;

