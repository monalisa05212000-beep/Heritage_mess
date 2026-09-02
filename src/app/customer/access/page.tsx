import Link from "next/link";
import { redirect } from "next/navigation";

import { Brand } from "@/components/brand";
import { CustomerAccessForm } from "@/components/auth/customer-access-form";
import { getCustomerPrincipal } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function CustomerAccessPage() {
  if (await getCustomerPrincipal()) redirect("/customer");

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-8 sm:px-6">
      <section className="paper-panel w-full rounded-2xl p-5 sm:p-8">
        <Brand />
        <p className="utility-type mt-10 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--saffron-deep)]">Customer access</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Your meals, simply.</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Enter the same name and phone number your caterer has on record.</p>
        <div className="mt-8"><CustomerAccessForm /></div>
        <p className="mt-6 text-center text-xs leading-5 text-[var(--muted)]">Are you the caterer? <Link className="font-bold text-[var(--saffron-deep)]" href="/login">Admin sign in</Link></p>
      </section>
    </main>
  );
}
