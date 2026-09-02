import { redirect } from "next/navigation";

import { Brand } from "@/components/brand";
import { SetupForm } from "@/components/auth/setup-form";
import { hasDatabaseUrl } from "@/lib/env";
import { isInitialSetupComplete } from "@/lib/setup";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (!hasDatabaseUrl()) redirect("/preview");
  if (await isInitialSetupComplete()) redirect("/login");

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-8 sm:px-6">
      <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(24rem,0.75fr)] lg:gap-16">
        <section className="arrive self-center px-1 lg:px-8">
          <Brand />
          <p className="utility-type mt-12 text-xs font-bold uppercase text-[var(--saffron-deep)]">First service</p>
          <h1 className="mt-3 max-w-xl text-4xl font-black leading-[1.04] tracking-[-0.045em] text-[var(--ink)] sm:text-6xl">Set the kitchen up once. Keep each day clear.</h1>
          <p className="mt-5 max-w-md text-base leading-7 text-[var(--muted)]">Create the business workspace and its first secure admin account. Customer ordering, menus, and billing are added from this foundation.</p>
          <div className="service-strip mt-9 max-w-md rounded-2xl border border-[#efc69f] bg-[#fff5e9] p-5">
            <p className="utility-type text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--saffron-deep)]">Protected setup</p>
            <p className="mt-2 text-sm font-bold leading-6 text-[var(--ink)]">This screen permanently closes after the first business and admin account are created.</p>
          </div>
        </section>
        <section className="paper-panel arrive-delay rounded-2xl p-5 sm:p-7">
          <p className="utility-type text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Step 1 of 1</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Create your workspace</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">There is no public registration. This creates the only initial admin account.</p>
          <div className="mt-7"><SetupForm /></div>
        </section>
      </div>
    </main>
  );
}
