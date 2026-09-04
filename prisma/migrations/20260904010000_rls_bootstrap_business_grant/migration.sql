-- Initial setup creates the tenant root before a tenant context exists.
-- Keep this grant limited to the bootstrap operation; RLS still controls rows.
GRANT INSERT ON TABLE public.businesses TO heritage_app_runtime;

