"use client";

import { useState } from "react";

import { AdminPreview, type AdminHub } from "./admin/admin-preview";
import { CustomerPreview } from "./customer/customer-preview";
import { DemoBanner } from "./preview-ui";
import {
  IconToday,
  IconPeople,
  IconMoney,
  IconBusiness,
  IconCustomer,
  IconOrder,
  IconKitchen,
  IconInvoice,
  IconCalendar
} from "./preview-icons";
import { PreviewStoreProvider } from "./preview-store";

export function MvpPreview() {
  const [audience, setAudience] = useState<"customer" | "admin">("customer");
  const [adminHub, setAdminHub] = useState<AdminHub>("today");
  const [adminSubView, setAdminSubView] = useState<string | null>(null);

  const adminNavHubs: Array<{ id: AdminHub; label: string; icon: typeof IconToday; subItems: Array<{ id: string; label: string }> }> = [
    {
      id: "today",
      label: "Today",
      icon: IconToday,
      subItems: [
        { id: "overview", label: "Overview" },
        { id: "kitchen", label: "Kitchen Prep" },
        { id: "orders", label: "Today's Orders" },
      ]
    },
    {
      id: "people",
      label: "People",
      icon: IconPeople,
      subItems: [
        { id: "customers", label: "Customers" },
        { id: "subscriptions", label: "Subscriptions" },
      ]
    },
    {
      id: "money",
      label: "Money",
      icon: IconMoney,
      subItems: [
        { id: "billing", label: "Billing & Balances" },
        { id: "invoices", label: "Invoices" },
        { id: "adjustments", label: "Adjustments" },
      ]
    },
    {
      id: "business",
      label: "Business",
      icon: IconBusiness,
      subItems: [
        { id: "menu", label: "Menu & Cutoffs" },
        { id: "closures", label: "Closure Management" },
        { id: "reports", label: "Reports" },
        { id: "settings", label: "Business Settings" },
      ]
    },
  ];

  return (
    <PreviewStoreProvider>
    <div className="min-h-screen bg-[var(--paper)]">
      <DemoBanner />
      
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-[var(--saffron)] text-white font-black text-lg">
              H
            </div>
            <div>
              <p className="text-lg font-black tracking-tight text-[var(--ink)]">Heritage</p>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-[var(--saffron-deep)]">PG Catering Operations</p>
            </div>
          </div>

          {/* Role Toggle Switcher */}
          <div className="flex items-center gap-2">
            <div role="group" aria-label="Preview role switch" className="flex rounded-2xl border border-stone-200 bg-stone-100 p-1 shadow-inner">
              <button
                type="button"
                onClick={() => setAudience("customer")}
                aria-pressed={audience === "customer"}
                className={`flex items-center gap-1.5 min-h-[38px] rounded-xl px-3.5 text-xs font-extrabold transition-all ${
                  audience === "customer"
                    ? "bg-white text-[var(--ink)] shadow-xs"
                    : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                <IconCustomer className="size-4" />
                <span>Customer View</span>
              </button>
              <button
                type="button"
                onClick={() => setAudience("admin")}
                aria-pressed={audience === "admin"}
                className={`flex items-center gap-1.5 min-h-[38px] rounded-xl px-3.5 text-xs font-extrabold transition-all ${
                  audience === "admin"
                    ? "bg-[var(--saffron)] text-white shadow-xs"
                    : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                <IconBusiness className="size-4" />
                <span>Admin Hub</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      {audience === "customer" ? (
        <main className="mx-auto max-w-xl px-4 py-5 sm:px-6 sm:py-8">
          <CustomerPreview />
        </main>
      ) : (
        <div className="mx-auto max-w-7xl px-4 py-5 lg:px-8 lg:py-8">
          <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-8">
            
            {/* Desktop Sidebar Navigation (1024px+) */}
            <aside className="hidden lg:block">
              <nav aria-label="Admin sidebar navigation" className="sticky top-24 space-y-6 rounded-2xl border border-[var(--line)] bg-white p-4 shadow-sm">
                <div>
                  <p className="px-3 text-[11px] font-black uppercase tracking-widest text-[var(--muted)]">Admin Hubs</p>
                </div>
                {adminNavHubs.map((hub) => {
                  const Icon = hub.icon;
                  const isActive = adminHub === hub.id;
                  return (
                    <div key={hub.id} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAdminHub(hub.id);
                          setAdminSubView(null);
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-extrabold transition-all ${
                          isActive
                            ? "bg-[var(--saffron-pale)] text-[var(--saffron-deep)]"
                            : "text-[var(--muted)] hover:bg-stone-50 hover:text-[var(--ink)]"
                        }`}
                      >
                        <Icon className="size-5 shrink-0" />
                        <span>{hub.label}</span>
                      </button>

                      {/* Sub-items */}
                      {isActive ? (
                        <div className="ml-9 space-y-1 border-l-2 border-[var(--saffron-pale)] pl-3">
                          {hub.subItems.map((sub) => {
                            const isSubActive = adminSubView === sub.id || (adminSubView === null && sub.id === hub.subItems[0].id);
                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => setAdminSubView(sub.id)}
                                className={`block w-full rounded-lg px-2 py-1.5 text-left text-xs font-bold transition-colors ${
                                  isSubActive ? "text-[var(--saffron-deep)] font-extrabold" : "text-stone-500 hover:text-stone-900"
                                }`}
                              >
                                {sub.label}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </nav>
            </aside>

            {/* Admin Content Area */}
            <main className="pb-24 lg:pb-8">
              <AdminPreview hub={adminHub} subView={adminSubView} onHubChange={setAdminHub} onSubViewChange={setAdminSubView} />
            </main>
          </div>

          {/* Admin Mobile Bottom Navigation (<1024px) - 4 MAJOR HUBS */}
          <nav aria-label="Admin mobile navigation" className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--line)] bg-white/95 px-2 py-2 backdrop-blur-md lg:hidden">
            <div className="mx-auto flex max-w-md justify-around">
              {adminNavHubs.map((hub) => {
                const Icon = hub.icon;
                const isActive = adminHub === hub.id;
                return (
                  <button
                    key={hub.id}
                    type="button"
                    onClick={() => {
                      setAdminHub(hub.id);
                      setAdminSubView(null);
                    }}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex flex-col items-center justify-center min-h-[48px] w-full rounded-xl px-2 text-[11px] font-extrabold transition-all ${
                      isActive
                        ? "bg-[var(--saffron-pale)] text-[var(--saffron-deep)]"
                        : "text-[var(--muted)] hover:text-[var(--ink)]"
                    }`}
                  >
                    <Icon className="size-5 mb-0.5" />
                    <span>{hub.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </div>
    </PreviewStoreProvider>
  );
}
