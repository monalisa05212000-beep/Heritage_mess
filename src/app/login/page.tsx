import { redirect } from "next/navigation";

import { Brand } from "@/components/brand";
import { LoginForm } from "@/components/auth/login-form";
import { DatabaseUnavailablePanel } from "@/components/database-unavailable-panel";
import { getAdminPrincipal } from "@/lib/auth/session";
import { hasDatabaseUrl } from "@/lib/env";
import { getInitialSetupStatus } from "@/lib/setup";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (!hasDatabaseUrl()) redirect("/preview");
  const setupStatus = await getInitialSetupStatus();
  if (setupStatus.state === "database-unavailable") return <DatabaseUnavailablePanel />;
  if (setupStatus.state === "incomplete") redirect("/setup");
  if (await getAdminPrincipal()) redirect("/admin");

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-8 sm:px-6">
      <section className="paper-panel w-full rounded-2xl p-5 sm:p-8">
        <Brand />
        <p className="utility-type mt-10 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--saffron-deep)]">Admin access</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Welcome back.</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Sign in to manage today’s food service.</p>
        <div className="mt-8"><LoginForm /></div>
      </section>
    </main>
  );
}
