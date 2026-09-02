export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <section className="paper-panel rounded-2xl p-6 text-center sm:p-8">
      <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-full bg-[var(--leaf-pale)] text-lg text-[var(--leaf)]">+</div>
      <h2 className="text-base font-extrabold text-[var(--ink)]">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}

