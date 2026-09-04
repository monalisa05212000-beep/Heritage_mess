import { Brand } from "@/components/brand";

export function DatabaseUnavailablePanel() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-8 sm:px-6">
      <section className="paper-panel w-full rounded-2xl p-5 sm:p-8">
        <Brand />
        <p className="utility-type mt-10 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--saffron-deep)]">Database offline</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Cannot reach the database.</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Heritage Mess is running locally, but PostgreSQL is not reachable at the configured Supabase host. Restore database access, then refresh this page.
        </p>
      </section>
    </main>
  );
}
