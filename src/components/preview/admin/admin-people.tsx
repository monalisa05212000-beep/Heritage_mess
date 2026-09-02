"use client";

import { useState } from "react";
import { customers, type CustomerPersona } from "../mock-data";
import { PreviewCard, PreviewButton, PreviewPill, SectionTitle } from "../preview-ui";
import { IconSearch, IconCustomer, IconCheck, IconWarning } from "../preview-icons";

export function AdminPeopleHub({
  onOpenDeactivate
}: {
  onOpenDeactivate: (customerName: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"customers" | "subscriptions">("customers");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>("CUS-011");
  const [profileTab, setProfileTab] = useState<"overview" | "orders" | "meals" | "billing">("overview");

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery);
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="People & Accounts" title="Customer Directory & Plans" detail="Manage resident profiles, active subscriptions, and account deactivations safely." />

      {/* Sub Tab Switcher */}
      <div className="flex rounded-2xl border border-stone-200 bg-white p-1.5 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab("customers")}
          className={`flex-1 min-h-[42px] rounded-xl text-xs font-extrabold transition-all ${
            activeTab === "customers" ? "bg-[var(--saffron)] text-white shadow-xs" : "text-stone-500 hover:text-stone-900"
          }`}
        >
          Customer Directory
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("subscriptions")}
          className={`flex-1 min-h-[42px] rounded-xl text-xs font-extrabold transition-all ${
            activeTab === "subscriptions" ? "bg-[var(--saffron)] text-white shadow-xs" : "text-stone-500 hover:text-stone-900"
          }`}
        >
          Subscriptions & Plans
        </button>
      </div>

      {activeTab === "customers" ? (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="relative flex-1 min-w-[220px]">
              <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-stone-200 bg-white pl-10 pr-4 text-xs font-bold text-stone-900 focus:border-orange-500 focus:outline-hidden"
              />
            </div>

            <div className="flex gap-1 rounded-xl bg-stone-100 p-1 border border-stone-200">
              {(["ALL", "ACTIVE", "INACTIVE"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`min-h-[36px] rounded-lg px-3 text-xs font-extrabold transition-all ${
                    statusFilter === st ? "bg-white text-stone-900 shadow-xs" : "text-stone-500"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Cards List */}
          <div className="grid gap-3">
            {filteredCustomers.map((c) => {
              const isSelected = c.id === selectedCustomerId;
              return (
                <PreviewCard
                  key={c.id}
                  accent={c.status === "ACTIVE" ? "saffron" : undefined}
                  className={`cursor-pointer transition-all ${isSelected ? "border-[var(--saffron)] ring-2 ring-orange-100" : ""}`}
                  onClick={() => setSelectedCustomerId(c.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-stone-900">{c.name}</h4>
                        <PreviewPill tone={c.status === "ACTIVE" ? "ready" : "neutral"}>
                          {c.status}
                        </PreviewPill>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">{c.phone} · Joined {c.joined}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-black text-stone-900">₹{c.outstanding}</p>
                      <p className="text-[10px] text-stone-400">outstanding</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex justify-between items-center text-xs">
                    <span className="font-extrabold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-lg">
                      {c.coverageSummary}
                    </span>
                    <span className="font-extrabold text-[var(--saffron-deep)]">
                      {isSelected ? "Active Record ↓" : "View Profile →"}
                    </span>
                  </div>
                </PreviewCard>
              );
            })}
          </div>

          {/* Customer Profile Deep-Dive Drawer */}
          {selectedCustomer ? (
            <section className="space-y-4 pt-4 border-t border-stone-200">
              <SectionTitle eyebrow="Customer Profile" title={selectedCustomer.name} detail={`${selectedCustomer.phone} · Joined ${selectedCustomer.joined}`} />

              <div className="grid grid-cols-3 gap-2">
                <PreviewCard className="p-3 text-center">
                  <p className="text-[10px] font-extrabold text-stone-400 uppercase">Outstanding</p>
                  <p className="text-xl font-black text-stone-900 mt-0.5">₹{selectedCustomer.outstanding}</p>
                </PreviewCard>
                <PreviewCard className="p-3 text-center">
                  <p className="text-[10px] font-extrabold text-stone-400 uppercase">Plan Type</p>
                  <p className="text-sm font-black text-stone-900 mt-1">{selectedCustomer.planType}</p>
                </PreviewCard>
                <PreviewCard className="p-3 text-center">
                  <p className="text-[10px] font-extrabold text-stone-400 uppercase">Status</p>
                  <p className="text-sm font-black text-stone-900 mt-1">{selectedCustomer.status}</p>
                </PreviewCard>
              </div>

              {/* Profile Sub Tabs */}
              <div className="flex gap-2 border-b border-stone-200">
                {[
                  { id: "overview", label: "Overview" },
                  { id: "orders", label: "Orders History" },
                  { id: "meals", label: "Meals & Carry-Forward" },
                  { id: "billing", label: "Billing & Ledger" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setProfileTab(tab.id as any)}
                    className={`pb-2 px-1 text-xs font-extrabold border-b-2 transition-all ${
                      profileTab === tab.id
                        ? "border-[var(--saffron)] text-[var(--saffron-deep)]"
                        : "border-transparent text-stone-500 hover:text-stone-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Profile Tab Contents */}
              <div className="rounded-2xl bg-stone-50 p-4 border border-stone-200 text-xs space-y-3">
                {profileTab === "overview" ? (
                  <div className="space-y-2">
                    <p className="font-extrabold text-stone-900">Current Subscription Summary</p>
                    <p className="text-stone-600">{selectedCustomer.coverageSummary}</p>
                    {selectedCustomer.carriedForward > 0 ? (
                      <p className="text-emerald-700 font-extrabold">✓ {selectedCustomer.carriedForward} Lunches carried forward from July</p>
                    ) : null}
                  </div>
                ) : null}

                {profileTab === "orders" ? (
                  <div className="space-y-2">
                    <p className="font-extrabold text-stone-900">Recent Service Activity Feed</p>
                    <div className="space-y-1 text-stone-600">
                      <p>✓ Sun 30 Aug · Lunch ordered (Covered by prepaid plan)</p>
                      <p>↩ Sun 23 Aug · Dinner cancelled (Entitlement restored)</p>
                      <p>₹ Sat 16 Aug · ₹500 payment recorded</p>
                    </div>
                  </div>
                ) : null}

                {profileTab === "meals" ? (
                  <div className="space-y-2">
                    <p className="font-extrabold text-stone-900">Entitlements Log</p>
                    <p className="text-stone-600">Lunch: 20 created → 16 consumed → 4 remaining.</p>
                    <p className="text-stone-600">Dinner: 10 created → 8 consumed → 2 remaining.</p>
                  </div>
                ) : null}

                {profileTab === "billing" ? (
                  <div className="space-y-2">
                    <p className="font-extrabold text-stone-900">Billing History</p>
                    <p className="text-stone-600">INV-2026-0007 · Issued snapshot (₹640 outstanding)</p>
                  </div>
                ) : null}
              </div>

              {/* Deactivate Button */}
              {selectedCustomer.status === "ACTIVE" ? (
                <PreviewButton variant="danger" onClick={() => onOpenDeactivate(selectedCustomer.name)} className="text-xs px-4">
                  Deactivate Customer Account
                </PreviewButton>
              ) : (
                <PreviewButton variant="secondary" onClick={() => alert("Reactivated in preview mode.")} className="text-xs px-4">
                  Reactivate Customer Account
                </PreviewButton>
              )}
            </section>
          ) : null}
        </div>
      ) : null}

      {/* SUBSCRIPTIONS TAB */}
      {activeTab === "subscriptions" ? (
        <div className="space-y-4">
          <SectionTitle eyebrow="Plans Registry" title="Active & Reserved Subscriptions" detail="Prepaid availability takes priority over count capacity. Future-start entitlements stay reserved." />

          <div className="grid gap-3">
            <PreviewCard accent="leaf" className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-base font-black text-stone-900">Aarav Mehta · Prepaid Subscription</h4>
                  <p className="text-xs text-stone-500">1 Aug – 31 Aug 2026 · Paid in full at creation</p>
                </div>
                <PreviewPill tone="ready">ACTIVE</PreviewPill>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                  <p className="text-[10px] font-extrabold text-stone-400 uppercase">Lunch Remaining</p>
                  <p className="text-lg font-black text-stone-900">4 / 20 Left</p>
                </div>
                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                  <p className="text-[10px] font-extrabold text-stone-400 uppercase">Dinner Remaining</p>
                  <p className="text-lg font-black text-stone-900">2 / 10 Left</p>
                </div>
              </div>
            </PreviewCard>

            <PreviewCard accent="amber" className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-base font-black text-stone-900">Priya Verma · Future Prepaid Plan</h4>
                  <p className="text-xs text-stone-500">10 Dinners reserved</p>
                </div>
                <PreviewPill tone="pending">Reserved for 1 Sep</PreviewPill>
              </div>
              <p className="text-xs text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                🔒 Entitlement is paid and exists, but cannot satisfy orders before 1 Sep.
              </p>
            </PreviewCard>
          </div>
        </div>
      ) : null}
    </div>
  );
}
