"use client";

export default function CustomerError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-8 sm:px-6">
      <section className="paper-panel w-full rounded-2xl p-5 sm:p-8">
        <p className="utility-type text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--saffron-deep)]">Your account</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">This page could not load.</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">The database was busy. Nothing was changed. Try again.</p>
        <button type="button" onClick={() => retry()} className="mt-6 min-h-12 rounded-xl bg-[var(--saffron)] px-4 font-bold text-white">Try again</button>
      </section>
    </main>
  );
}
