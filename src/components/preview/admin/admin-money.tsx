"use client";

import { useState } from "react";
import { invoices } from "../mock-data";
import { PreviewCard, PreviewButton, PreviewPill, SectionTitle } from "../preview-ui";
import { IconMoney, IconInvoice, IconCheck } from "../preview-icons";

export function AdminMoneyHub({
  onOpenInvoice,
  onOpenRecordPayment
}: {
  onOpenInvoice: () => void;
  onOpenRecordPayment: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"billing" | "invoices" | "adjustments" | "reports">("billing");
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<"daily" | "weekly" | "monthly">("daily");

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Financial Operations"
        title="Money, Ledger & Invoices"
        detail="Every charge, payment, and adjustment is an immutable ledger entry. Outstanding balance is calculated dynamically."
      />

      {/* Sub Views Switcher */}
      <div className="flex rounded-2xl border border-stone-200 bg-white p-1.5 shadow-xs overflow-x-auto no-scrollbar">
        {[
          { id: "billing", label: "Billing & Balances" },
          { id: "invoices", label: "Issued Invoices" },
          { id: "adjustments", label: "Audited Adjustments" },
          { id: "reports", label: "Reports" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 shrink-0 min-h-[42px] px-3 rounded-xl text-xs font-extrabold transition-all ${
              activeTab === tab.id ? "bg-[var(--saffron)] text-white shadow-xs" : "text-stone-500 hover:text-stone-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* VIEW 1: BILLING & BALANCES */}
      {activeTab === "billing" ? (
        <div className="space-y-6">
          {/* Clickable Totals */}
          <div className="grid grid-cols-3 gap-3">
            <PreviewCard
              onClick={() => setActiveTab("invoices")}
              className="cursor-pointer hover:border-orange-300 transition-colors p-4"
            >
              <p className="text-[11px] font-extrabold uppercase text-stone-400">Total Outstanding</p>
              <p className="text-2xl font-black text-stone-900 mt-1">₹8,420</p>
              <p className="text-[11px] font-bold text-orange-700 mt-0.5">Across 6 customers →</p>
            </PreviewCard>

            <PreviewCard className="p-4">
              <p className="text-[11px] font-extrabold uppercase text-stone-400">Collected Today</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">₹1,000</p>
              <p className="text-[11px] font-bold text-stone-500 mt-0.5">UPI payments</p>
            </PreviewCard>

            <PreviewCard className="p-4">
              <p className="text-[11px] font-extrabold uppercase text-stone-400">Uninvoiced Charges</p>
              <p className="text-2xl font-black text-stone-900 mt-1">₹3,220</p>
              <p className="text-[11px] font-bold text-stone-500 mt-0.5">Current month</p>
            </PreviewCard>
          </div>

          <div className="flex gap-2">
            <PreviewButton onClick={onOpenRecordPayment} className="text-xs px-4">
              + Record Payment
            </PreviewButton>
            <PreviewButton variant="secondary" onClick={() => setShowAdjustmentForm(true)} className="text-xs px-4">
              + Create Audited Adjustment
            </PreviewButton>
          </div>

          {/* Inline Adjustment Form */}
          {showAdjustmentForm ? (
            <PreviewCard accent="amber" className="space-y-4">
              <SectionTitle eyebrow="Audited Ledger Entry" title="Create Manual Adjustment" detail="Adjustments never edit original charges or invoices. They create a new audited ledger record." />

              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <label className="block font-black uppercase text-stone-700">
                  Adjustment Type
                  <select className="mt-1.5 min-h-[44px] w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-bold text-stone-900">
                    <option value="CREDIT">CREDIT_ADJUSTMENT — Reduces balance (e.g. Goodwill credit)</option>
                    <option value="DEBIT">DEBIT_ADJUSTMENT — Increases balance</option>
                  </select>
                </label>

                <label className="block font-black uppercase text-stone-700">
                  Adjustment Amount (₹)
                  <input type="number" placeholder="100" className="mt-1.5 min-h-[44px] w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-bold text-stone-900" />
                </label>
              </div>

              <label className="block text-xs font-black uppercase text-stone-700">
                Reason (Required)
                <textarea placeholder="e.g. Compensating resident for late delivery on 18 Aug" className="mt-1.5 min-h-[70px] w-full rounded-xl border border-stone-200 p-3 text-xs font-semibold" />
              </label>

              <div className="flex gap-2">
                <PreviewButton variant="secondary" onClick={() => setShowAdjustmentForm(false)} className="text-xs">
                  Cancel
                </PreviewButton>
                <PreviewButton onClick={() => { setShowAdjustmentForm(false); alert("Adjustment recorded in ledger."); }} className="text-xs">
                  Post Adjustment
                </PreviewButton>
              </div>
            </PreviewCard>
          ) : null}
        </div>
      ) : null}

      {/* VIEW 2: ISSUED INVOICES */}
      {activeTab === "invoices" ? (
        <div className="space-y-4">
          <SectionTitle eyebrow="Document Store" title="Issued Invoices (Immutable Snapshots)" detail="Issued invoices represent frozen billing documents." />

          <div className="grid gap-3">
            {invoices.map((inv) => (
              <PreviewCard key={inv.number} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-black text-stone-900">{inv.number}</h4>
                    <PreviewPill tone={inv.status === "PAID" ? "ready" : "pending"}>
                      {inv.status}
                    </PreviewPill>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">{inv.customer} · {inv.period}</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-black text-stone-900">₹{inv.total}</p>
                    <p className="text-[10px] text-stone-400">₹{inv.outstanding} outstanding</p>
                  </div>

                  <PreviewButton variant="secondary" onClick={onOpenInvoice} className="min-h-[38px] text-xs px-3">
                    View Document
                  </PreviewButton>
                </div>
              </PreviewCard>
            ))}
          </div>
        </div>
      ) : null}

      {/* VIEW 3: ADJUSTMENTS */}
      {activeTab === "adjustments" ? (
        <div className="space-y-4">
          <SectionTitle eyebrow="Audit Ledger" title="Adjustment Log" />
          <div className="divide-y divide-stone-100 rounded-2xl bg-white border border-stone-200 overflow-hidden text-xs">
            <div className="p-3.5 space-y-1">
              <div className="flex justify-between font-extrabold text-stone-900">
                <span>ADJ-2026-0004 · Aarav Mehta</span>
                <span className="text-emerald-700">-₹100 (Credit)</span>
              </div>
              <p className="text-stone-500">Reason: Goodwill credit for dinner delay on 18 Aug. Recorded by Admin.</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* VIEW 4: REPORTS */}
      {activeTab === "reports" ? (
        <div className="space-y-6">
          <SectionTitle eyebrow="Business Insights" title="Operations & Financial Reports" detail="Clean totals without vanity charts." />

          <div className="flex gap-2">
            {(["daily", "weekly", "monthly"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setReportPeriod(p)}
                className={`min-h-[38px] rounded-xl px-4 text-xs font-extrabold uppercase transition-all ${
                  reportPeriod === p ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <PreviewCard className="space-y-4">
            <h4 className="text-base font-black text-stone-900 capitalize">{reportPeriod} Operational Summary</h4>

            <div className="grid gap-2 sm:grid-cols-2 text-xs">
              {[
                ["Meals Prepared", "24 meals"],
                ["Breakfast / Lunch / Dinner", "7 / 12 / 5"],
                ["Gross Revenue Billed", "₹1,800"],
                ["Payments Collected", "₹1,000"],
                ["Cancellations Processed", "3 orders"],
                ["Missing Lunchboxes", "3 boxes"],
              ].map(([lbl, val]) => (
                <div key={lbl} className="flex justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                  <span className="text-stone-500">{lbl}</span>
                  <span className="font-black text-stone-900">{val}</span>
                </div>
              ))}
            </div>

            <PreviewButton variant="secondary" onClick={() => alert("CSV Export simulation: File downloaded.")} className="text-xs">
              Export Report to CSV
            </PreviewButton>
          </PreviewCard>
        </div>
      ) : null}
    </div>
  );
}
