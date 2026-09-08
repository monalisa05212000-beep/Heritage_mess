"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { InputField, TextareaField } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status-pill";

type MealType = { id: string; code: string; name: string };
type MenuItem = { id: string; mealTypeId: string; name: string; description: string | null; mealType: MealType };
type Menu = { id: string; status: "DRAFT" | "PUBLISHED" | "UNPUBLISHED"; items: MenuItem[] } | null;

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function readableDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(`${date}T12:00:00+05:30`));
}

export function MenuManager({ serviceDate, today, mealTypes, menu }: { serviceDate: string; today: string; mealTypes: MealType[]; menu: Menu }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"draft" | "publish" | "unpublish" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const items = useMemo(() => new Map(menu?.items.map((item) => [item.mealTypeId, item]) ?? []), [menu]);
  const serviceDays = Array.from({ length: 7 }, (_, index) => shiftDate(today, index - 2));

  function go(date: string) {
    router.push(`/admin/menus?date=${date}`);
  }

  async function send(url: string, body: unknown, action: "draft" | "publish" | "unpublish", success: string) {
    setBusy(action);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "Couldn’t save the menu. Please try again.");
        return;
      }
      setMessage(success);
      router.refresh();
    } catch {
      setError("Couldn’t reach Heritage Mess. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  function save(form: HTMLFormElement, publish: boolean) {
    const values = new FormData(form);
    return send("/api/admin/menus", {
      menuDate: serviceDate,
      publish,
      items: mealTypes.map((mealType) => ({
        mealTypeId: mealType.id,
        name: String(values.get(`dish-${mealType.id}`) ?? ""),
        description: String(values.get(`description-${mealType.id}`) ?? ""),
      })),
      idempotencyKey: crypto.randomUUID(),
    }, publish ? "publish" : "draft", publish ? "Menu published." : "Menu saved as draft.");
  }

  return (
    <div className="grid gap-5">
      <section className="paper-panel rounded-2xl p-5 sm:p-6">
        <p className="utility-type text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Menu management</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-black tracking-tight">{readableDate(serviceDate)}</h1>
          <StatusPill tone={menu?.status === "PUBLISHED" ? "ready" : "neutral"}>{menu?.status ?? "Not created"}</StatusPill>
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Choose service date">
          {serviceDays.map((date) => (
            <Button key={date} variant={date === serviceDate ? "primary" : "secondary"} className="min-h-10 shrink-0 px-3" onClick={() => go(date)}>
              {date === today ? "Today" : new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(new Date(`${date}T12:00:00+05:30`))}
            </Button>
          ))}
          <input aria-label="Choose another service date" className="min-h-10 rounded-xl border border-[var(--line)] bg-white px-3 text-sm" type="date" value={serviceDate} onChange={(event) => go(event.target.value)} />
        </div>
      </section>

      {message ? <p className="rounded-xl bg-[var(--leaf-pale)] px-4 py-3 text-sm font-semibold text-[var(--leaf)]" role="status">{message}</p> : null}
      {error ? <p className="rounded-xl bg-[var(--danger-pale)] px-4 py-3 text-sm font-semibold text-[var(--danger)]" role="alert">{error}</p> : null}

      <form className="paper-panel grid gap-4 rounded-2xl p-5 sm:p-6" onSubmit={(event) => { event.preventDefault(); void save(event.currentTarget, false); }}>
        {mealTypes.length === 0 ? <p className="text-sm text-[var(--muted)]">No active meal types are available. Menus cannot be saved until meal types are configured.</p> : mealTypes.map((mealType) => {
          const item = items.get(mealType.id);
          return <div key={mealType.id} className="grid gap-3 rounded-xl border border-[var(--line)] bg-white/70 p-4">
            <InputField label={mealType.name} name={`dish-${mealType.id}`} defaultValue={item?.name ?? ""} required />
            <TextareaField label={`${mealType.name} description`} name={`description-${mealType.id}`} defaultValue={item?.description ?? ""} />
          </div>;
        })}
        {mealTypes.length > 0 ? <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={busy !== null}>{busy === "draft" ? "Saving…" : "Save draft"}</Button>
          <Button disabled={busy !== null} onClick={(event) => { const form = event.currentTarget.form; if (form) void save(form, true); }}>{busy === "publish" ? "Publishing…" : "Publish menu"}</Button>
          {menu ? <Button variant="secondary" disabled={busy !== null || menu.status !== "PUBLISHED"} onClick={() => void send("/api/admin/menus/unpublish", { menuId: menu.id, idempotencyKey: crypto.randomUUID() }, "unpublish", "Menu unpublished.")}>{busy === "unpublish" ? "Unpublishing…" : "Unpublish"}</Button> : null}
        </div> : null}
      </form>
    </div>
  );
}
