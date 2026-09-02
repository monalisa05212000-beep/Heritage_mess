"use client";

import { useState } from "react";
import { addBusinessDays, businessDateKey, formatBusinessDate } from "@/lib/domain/time";
import { PreviewCard, PreviewButton, PreviewProgressBar, PreviewPill, SectionTitle, PreviewBottomSheet, PreviewNotice } from "../preview-ui";
import { IconCheck, IconInvoice, IconCalendar, IconMoney } from "../preview-icons";
import type { MealCode } from "../mock-data";
import type { CustomerPlanState } from "./customer-preview";

export function CustomerAccountView({
  entitlements,
  outstandingBalance,
  statementEntries,
  activePlan,
  onSubscribePlan
}: {
  entitlements: Array<{ code: MealCode; label: string; remaining: number; original: number; usable: boolean }>;
  outstandingBalance: number;
  statementEntries: Array<{ date: string; description: string; amount: number; type: string }>;
  activePlan: CustomerPlanState;
  onSubscribePlan: (planType: "PREPAID" | "COUNT" | "ONE_TIME") => void;
}) {
  const futurePlanStart = addBusinessDays(businessDateKey(), 2);
  const [showStatement, setShowStatement] = useState(false);
  const [showPlanSelection, setShowPlanSelection] = useState(false);

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Your Account" title="Plan & Billing" detail="View your meal balance, active subscriptions, and detailed statement proof." />

      {/* Current Active Plan */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-stone-500">Active Meal Plan</h3>
          <button
            type="button"
            onClick={() => setShowPlanSelection(true)}
            className="text-xs font-extrabold text-[var(--saffron-deep)] hover:underline"
          >
            Change / Subscribe Plan
          </button>
        </div>

        <PreviewCard className="space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-stone-100">
            <div>
              <h4 className="text-base font-black text-stone-900">{activePlan.name}</h4>
              <p className="text-xs text-stone-500">Renewal / Period: {activePlan.renewalDate}</p>
            </div>
            <PreviewPill tone="ready">Active</PreviewPill>
          </div>

          {activePlan.type === "PREPAID" ? (
            <div className="space-y-3">
              {entitlements.map((entry) => (
                <div key={entry.code} className="space-y-1">
                  <PreviewProgressBar
                    value={entry.remaining}
                    max={entry.original}
                    label={`${entry.label} (${entry.remaining} remaining of ${entry.original})`}
                  />
                </div>
              ))}
            </div>
          ) : activePlan.type === "COUNT" ? (
            <div className="space-y-3">
              <PreviewNotice tone="amber">
                <p className="font-extrabold text-amber-950">Flexi Count-Based Plan</p>
                <p className="mt-1 text-xs text-amber-900 leading-relaxed">
                  You have consumed 12 of your 20 monthly allowed meals. Orders past cap will be billed at ₹80 on your statement.
                </p>
              </PreviewNotice>
            </div>
          ) : (
            <div className="space-y-3">
              <PreviewNotice tone="amber">
                <p className="font-extrabold text-amber-950">Pay-As-You-Go (One-Time Customer)</p>
                <p className="mt-1 text-xs text-amber-900 leading-relaxed">
                  No monthly commitment. You pay for individual meal orders billed directly to your statement.
                </p>
              </PreviewNotice>
            </div>
          )}

          <div className="pt-2 text-xs text-stone-500 bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 flex items-center justify-between">
            <div>
              <p className="font-extrabold text-emerald-950">✓ Indefinite Carry-Forward Guarantee</p>
              <p className="text-emerald-900 mt-0.5 leading-relaxed">
                Unused prepaid meals do not expire at month-end.
              </p>
            </div>
          </div>
        </PreviewCard>
      </section>

      {/* Carry-Forward Section */}
      <section className="space-y-3">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-stone-500">Carried Forward</h3>
        <PreviewCard className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-orange-100 text-orange-700 font-black">
              +3
            </div>
            <div>
              <p className="text-sm font-black text-stone-900">3 Lunches Carried Forward</p>
              <p className="text-xs text-stone-500">Unused from July 2026 plan</p>
            </div>
          </div>
          <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
            Available Now
          </span>
        </PreviewCard>
      </section>

      {/* Reserved Future Plan */}
      <section className="space-y-3">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-stone-500">Reserved Future Meals</h3>
        <PreviewCard className="space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-black text-stone-900">September Plan · 10 Dinners</p>
              <p className="text-xs text-stone-500">Paid in advance on 20 Aug</p>
            </div>
            <PreviewPill tone="pending">Reserved</PreviewPill>
          </div>
          <p className="text-xs text-stone-600 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
            🔒 Reserved until <strong>{formatBusinessDate(futurePlanStart, { day: "numeric", month: "long", year: "numeric" })}</strong>. Available automatically when the plan begins.
          </p>
        </PreviewCard>
      </section>

      {/* Outstanding Balance & Statement Drill-down */}
      <section className="space-y-3 pt-2">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-stone-500">Billing Statement</h3>
        <PreviewCard className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-extrabold uppercase text-stone-500">Current Outstanding Balance</p>
              <p className="text-2xl font-black text-stone-900 mt-0.5">₹{outstandingBalance}</p>
              <p className="text-xs text-stone-500">From extra billable meals</p>
            </div>
            <PreviewButton
              variant="secondary"
              onClick={() => setShowStatement(true)}
              className="text-xs px-4"
            >
              View Itemized Statement
            </PreviewButton>
          </div>
        </PreviewCard>
      </section>

      {/* Plan Selection Modal */}
      {showPlanSelection ? (
        <PreviewBottomSheet title="Subscribe or Change Meal Plan" onClose={() => setShowPlanSelection(false)}>
          <div className="space-y-4">
            <p className="text-xs text-stone-600 leading-relaxed">
              Select a meal subscription option tailored to your resident stay.
            </p>

            <div className="grid gap-3">
              {/* Option 1: Prepaid */}
              <div
                onClick={() => {
                  onSubscribePlan("PREPAID");
                  setShowPlanSelection(false);
                }}
                className={`cursor-pointer rounded-2xl p-4 border transition-all ${
                  activePlan.type === "PREPAID"
                    ? "border-[var(--saffron)] bg-orange-50/50 ring-2 ring-orange-200"
                    : "border-stone-200 hover:border-stone-300 bg-white"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">BEST VALUE</span>
                    <h4 className="text-base font-black text-stone-900 mt-1">Full Monthly Prepaid Plan</h4>
                    <p className="text-xs text-stone-500 mt-0.5">20 Lunches + 10 Dinners included</p>
                  </div>
                  <span className="text-lg font-black text-stone-900">₹2,400<span className="text-xs font-normal text-stone-400">/mo</span></span>
                </div>
                <p className="text-xs text-stone-600 mt-2">
                  ✓ Priority ordering · Unused meals carry forward automatically to next month.
                </p>
              </div>

              {/* Option 2: Flexi Count */}
              <div
                onClick={() => {
                  onSubscribePlan("COUNT");
                  setShowPlanSelection(false);
                }}
                className={`cursor-pointer rounded-2xl p-4 border transition-all ${
                  activePlan.type === "COUNT"
                    ? "border-[var(--saffron)] bg-orange-50/50 ring-2 ring-orange-200"
                    : "border-stone-200 hover:border-stone-300 bg-white"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">FLEXIBLE</span>
                    <h4 className="text-base font-black text-stone-900 mt-1">Flexi Count-Based Plan</h4>
                    <p className="text-xs text-stone-500 mt-0.5">Up to 20 monthly meals capacity</p>
                  </div>
                  <span className="text-lg font-black text-stone-900">₹1,800<span className="text-xs font-normal text-stone-400">/mo</span></span>
                </div>
                <p className="text-xs text-stone-600 mt-2">
                  ✓ Billed monthly · Extra meals past cap added to your end-of-month statement.
                </p>
              </div>

              {/* Option 3: Pay-As-You-Go */}
              <div
                onClick={() => {
                  onSubscribePlan("ONE_TIME");
                  setShowPlanSelection(false);
                }}
                className={`cursor-pointer rounded-2xl p-4 border transition-all ${
                  activePlan.type === "ONE_TIME"
                    ? "border-[var(--saffron)] bg-orange-50/50 ring-2 ring-orange-200"
                    : "border-stone-200 hover:border-stone-300 bg-white"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-black text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">NO COMMITMENT</span>
                    <h4 className="text-base font-black text-stone-900 mt-1">Pay-As-You-Go</h4>
                    <p className="text-xs text-stone-500 mt-0.5">Order meals on demand</p>
                  </div>
                  <span className="text-lg font-black text-stone-900">₹80<span className="text-xs font-normal text-stone-400">/meal</span></span>
                </div>
                <p className="text-xs text-stone-600 mt-2">
                  ✓ Pay per meal · Billed directly to statement per confirmed order.
                </p>
              </div>
            </div>

            <PreviewButton variant="secondary" onClick={() => setShowPlanSelection(false)} className="w-full">
              Cancel
            </PreviewButton>
          </div>
        </PreviewBottomSheet>
      ) : null}

      {/* Itemized Statement Proof Modal */}
      {showStatement ? (
        <PreviewBottomSheet title="Your Statement Proof" onClose={() => setShowStatement(false)}>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-2xl bg-stone-100 border border-stone-200">
              <div>
                <p className="text-xs text-stone-500 font-bold uppercase">Total Outstanding</p>
                <p className="text-xl font-black text-stone-900">₹{outstandingBalance}</p>
              </div>
              <span className="text-xs font-extrabold text-stone-600">Aarav Mehta (+91 98765 4812)</span>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-wider text-stone-400">Recent Transactions & Charges</p>
              <div className="divide-y divide-stone-100 rounded-2xl bg-white border border-stone-200 overflow-hidden">
                {statementEntries.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 text-xs">
                    <div>
                      <p className="font-extrabold text-stone-900">{item.description}</p>
                      <p className="text-stone-400">{item.date}</p>
                    </div>
                    <span className={`font-black ${item.type === "payment" ? "text-emerald-600" : "text-stone-900"}`}>
                      {item.type === "payment" ? `-₹${Math.abs(item.amount)}` : `+₹${item.amount}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-orange-50 text-orange-950 text-xs leading-relaxed border border-orange-200">
              <strong>Human-Readable Audit Proof:</strong> All charges represent non-prepaid meals requested past your subscription cap. Payments recorded directly reduce your outstanding total.
            </div>

            <PreviewButton onClick={() => setShowStatement(false)} className="w-full">
              Close Statement
            </PreviewButton>
          </div>
        </PreviewBottomSheet>
      ) : null}
    </div>
  );
}
