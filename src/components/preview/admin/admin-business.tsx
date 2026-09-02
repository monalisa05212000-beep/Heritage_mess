"use client";

import { useState } from "react";
import { addBusinessDays, businessDateKey, formatBusinessDate } from "@/lib/domain/time";
import { todayMenu } from "../mock-data";
import { PreviewCard, PreviewButton, PreviewPill, PreviewNotice, SectionTitle } from "../preview-ui";
import { IconBusiness, IconWarning, IconCheck, IconCalendar } from "../preview-icons";

export function AdminBusinessHub() {
  const today = businessDateKey();
  const closureDate = addBusinessDays(today, 3);
  const [activeTab, setActiveTab] = useState<"menu" | "closures" | "reports" | "settings">("menu");
  const [showClosureForm, setShowClosureForm] = useState(false);
  const [closureProcessed, setClosureProcessed] = useState(false);
  const [priceEditing, setPriceEditing] = useState(false);

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Business Configuration"
        title="Menu Rules, Closures & Settings"
        detail="Set meal pricing, cutoffs, and business service closures."
      />

      {/* Sub Tab Switcher */}
      <div className="flex rounded-2xl border border-stone-200 bg-white p-1.5 shadow-xs overflow-x-auto no-scrollbar">
        {[
          { id: "menu", label: "Menu & Pricing" },
          { id: "closures", label: "No-Service Closures" },
          { id: "settings", label: "Business Settings" },
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

      {/* VIEW 1: MENU & PRICING */}
      {activeTab === "menu" ? (
        <div className="space-y-6">
          <SectionTitle eyebrow="Menu Publishing" title="Meal Prices & Cutoffs" action={
            <PreviewButton onClick={() => setPriceEditing(!priceEditing)} variant="secondary" className="text-xs px-3">
              {priceEditing ? "Done Editing" : "Edit Meal Rules"}
            </PreviewButton>
          } />

          {/* Price Warning Notice */}
          <PreviewNotice tone="amber">
            <p className="font-extrabold text-amber-950">📌 Important Price Rule Notice</p>
            <p className="mt-1 text-xs text-amber-900 leading-relaxed">
              When changing a price, new prices apply to <strong>future orders only</strong>. Existing confirmed orders keep their original price snapshot.
            </p>
          </PreviewNotice>

          <PreviewCard className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-stone-100">
              <div>
                <h4 className="text-base font-black text-stone-900">{formatBusinessDate(today, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h4>
                <p className="text-xs text-stone-500">Published for today's service</p>
              </div>
              <PreviewPill tone="ready">PUBLISHED</PreviewPill>
            </div>

            <div className="space-y-3 divide-y divide-stone-100">
              {todayMenu.items.map((meal) => (
                <div key={meal.code} className="pt-3 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-extrabold text-stone-900 text-sm">{meal.code} · {meal.name}</p>
                    <p className="text-stone-500 mt-0.5">Order cutoff time: {meal.cutoffTime}</p>
                  </div>
                  <div className="text-right">
                    {priceEditing ? (
                      <input
                        type="number"
                        defaultValue={meal.price}
                        className="w-16 min-h-[36px] rounded-lg border border-stone-300 px-2 text-right font-black text-stone-900"
                      />
                    ) : (
                      <span className="text-base font-black text-stone-900">₹{meal.price}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </PreviewCard>
        </div>
      ) : null}

      {/* VIEW 2: NO-SERVICE CLOSURES */}
      {activeTab === "closures" ? (
        <div className="space-y-6">
          <SectionTitle
            eyebrow="Holiday & Closure Management"
            title="Service Closures & Auto-Compensation"
            detail="Declaring a no-service closure automatically restores prepaid entitlements and reverses billable charges for all affected orders."
            action={
              <PreviewButton onClick={() => setShowClosureForm(true)} className="text-xs px-4">
                + Declare No-Service Closure
              </PreviewButton>
            }
          />

          {showClosureForm ? (
            <PreviewCard accent="amber" className="space-y-4">
              <h4 className="text-base font-black text-stone-900">Declare Holiday / Closure Date</h4>

              <label className="block text-xs font-black uppercase text-stone-700">
                Closure Date
                <input type="date" defaultValue={closureDate} className="mt-1.5 min-h-[44px] w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-bold text-stone-900" />
              </label>

              <label className="block text-xs font-black uppercase text-stone-700">
                Closure Reason (Required)
                <textarea placeholder="e.g. Kitchen maintenance & staff holiday" className="mt-1.5 min-h-[70px] w-full rounded-xl border border-stone-200 p-3 text-xs font-semibold" />
              </label>

              <div className="p-3.5 rounded-xl bg-orange-50 text-orange-950 text-xs leading-relaxed border border-orange-200">
                <strong>Automatic Consequence Preview:</strong> 12 affected orders will be cancelled. 6 prepaid meals returned to available plans, 6 charges reversed.
              </div>

              <div className="flex gap-2">
                <PreviewButton variant="secondary" onClick={() => setShowClosureForm(false)} className="text-xs">
                  Cancel
                </PreviewButton>
                <PreviewButton onClick={() => { setClosureProcessed(true); setShowClosureForm(false); }} className="text-xs">
                  Review & Confirm Closure
                </PreviewButton>
              </div>
            </PreviewCard>
          ) : null}

          {closureProcessed ? (
            <PreviewCard accent="leaf" className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-base font-black text-stone-900">Closure Active: {formatBusinessDate(closureDate, { weekday: "long", day: "numeric", month: "long" })}</h4>
                  <p className="text-xs text-stone-500">12 affected orders compensated automatically.</p>
                </div>
                <PreviewPill tone="ready">PROCESSED</PreviewPill>
              </div>

              <PreviewButton variant="secondary" onClick={() => alert("Closure reversal simulation: Compensating correction event posted.")} className="text-xs px-3">
                Reverse Closure (Create Compensating Event)
              </PreviewButton>
            </PreviewCard>
          ) : null}
        </div>
      ) : null}

      {/* VIEW 3: BUSINESS SETTINGS */}
      {activeTab === "settings" ? (
        <div className="space-y-4">
          <SectionTitle eyebrow="System Configuration" title="Business Settings & Audit Logs" />

          <div className="grid gap-3">
            <PreviewCard className="space-y-2">
              <h4 className="text-sm font-black text-stone-900">Business Details</h4>
              <p className="text-xs text-stone-500">Heritage · +91 98765 43210 · Timezone: Asia/Kolkata</p>
            </PreviewCard>

            <PreviewCard className="space-y-2">
              <h4 className="text-sm font-black text-stone-900">Document Sequence Formats</h4>
              <p className="text-xs text-stone-500">Invoices: INV-YYYY-0001 · Adjustments: ADJ-YYYY-0001 per business in Asia/Kolkata.</p>
            </PreviewCard>

            <PreviewCard className="space-y-2">
              <h4 className="text-sm font-black text-stone-900">Immutable Audit Log</h4>
              <p className="text-xs text-stone-500">Every manual override, price change, and payment shows actor, timestamp, original state, and reason.</p>
            </PreviewCard>
          </div>
        </div>
      ) : null}
    </div>
  );
}
