"use client";

import { useState } from "react";
import { addBusinessDays, businessDateKey, formatBusinessDate } from "@/lib/domain/time";
import { PreviewBottomSheet, PreviewButton, PreviewNotice, PreviewPill, PreviewCard } from "../preview-ui";
import { IconCheck, IconWarning, IconInvoice, IconOrder } from "../preview-icons";

const currentBusinessDate = businessDateKey();
const tomorrowBusinessDate = addBusinessDays(currentBusinessDate, 1);
const closureBusinessDate = addBusinessDays(currentBusinessDate, 3);
const shortDateLabel = (date: string) => formatBusinessDate(date, { weekday: "short", day: "numeric", month: "short" });
const longDateLabel = (date: string) => formatBusinessDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

// 1. MANUAL ORDER FLOW (4 Steps)
export function ManualOrderDialog({
  onClose,
  onSuccess
}: {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [customer, setCustomer] = useState("Aarav Mehta");
  const [date, setDate] = useState("today");
  const [meal, setMeal] = useState("LUNCH");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const isClosureDay = date === "closure";
  const hasReasonError = isClosureDay && submitted && !reason.trim();

  const isPrepaid = customer === "Aarav Mehta" && meal === "LUNCH";
  const isCount = customer === "Riya Shah" && meal === "LUNCH";

  const coverageDescription = isPrepaid
    ? "✓ Covered by customer's 1 remaining prepaid Lunch entitlement"
    : isCount
    ? "✓ Uses 1 remaining monthly plan count and adds ₹80 to invoice"
    : "✓ Billed as a ₹80 one-time manual order charge";

  const handleReview = () => {
    setSubmitted(true);
    if (isClosureDay && !reason.trim()) return;
    onSuccess(`Manual ${meal} order created for ${customer}.`);
  };

  return (
    <PreviewBottomSheet title="Create Manual Order" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-stone-500 leading-relaxed">
          Manual orders override customer cutoffs and restrictions. Every manual order maintains full financial audit tracking.
        </p>

        {/* Step 1: Select Customer */}
        <label className="block text-xs font-black uppercase text-stone-700">
          Step 1 · Customer
          <select
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            className="mt-1.5 min-h-[44px] w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-bold text-stone-900"
          >
            <option value="Aarav Mehta">Aarav Mehta (Prepaid Plan · 4 Lunches left)</option>
            <option value="Riya Shah">Riya Shah (Count-based · 12/20 used)</option>
            <option value="Kabir Singh">Kabir Singh (One-time Customer)</option>
          </select>
        </label>

        {/* Step 2: Select Date */}
        <label className="block text-xs font-black uppercase text-stone-700">
          Step 2 · Service Date
          <select
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1.5 min-h-[44px] w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-bold text-stone-900"
          >
            <option value="today">Today · {shortDateLabel(currentBusinessDate)}</option>
            <option value="tomorrow">Tomorrow · {shortDateLabel(tomorrowBusinessDate)}</option>
            <option value="closure">{longDateLabel(closureBusinessDate)} (No-Service Closure Day!)</option>
          </select>
        </label>

        {/* Step 3: Select Meal */}
        <label className="block text-xs font-black uppercase text-stone-700">
          Step 3 · Meal
          <select
            value={meal}
            onChange={(e) => setMeal(e.target.value)}
            className="mt-1.5 min-h-[44px] w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-bold text-stone-900"
          >
            <option value="BREAKFAST">Breakfast (₹60)</option>
            <option value="LUNCH">Lunch (₹80)</option>
            <option value="DINNER">Dinner (₹60)</option>
          </select>
        </label>

        {/* Closure Warning Banner */}
        {isClosureDay ? (
          <PreviewNotice tone="amber">
            <p className="font-black text-amber-950">⚠️ Admin Closure-Day Override Warning</p>
            <p className="mt-1 text-xs text-amber-900 leading-relaxed">
              {shortDateLabel(closureBusinessDate)} is a declared no-service closure. Creating a manual order overrides closure restriction. Reason is required for audit history.
            </p>
          </PreviewNotice>
        ) : null}

        {/* Step 4: System Preview Coverage */}
        <div className="rounded-2xl bg-orange-50/80 p-3.5 border border-orange-200 space-y-1">
          <p className="text-xs font-black uppercase tracking-wider text-orange-950">Coverage Preview</p>
          <p className="text-xs font-extrabold text-orange-900">{coverageDescription}</p>
        </div>

        {isClosureDay ? (
          <label className="block text-xs font-black uppercase text-stone-700">
            Override Reason (Required)
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Special catering arrangement requested by resident"
              className={`mt-1.5 min-h-[70px] w-full rounded-xl border p-3 text-xs font-semibold ${
                hasReasonError ? "border-red-500 bg-red-50" : "border-stone-200"
              }`}
            />
            {hasReasonError ? (
              <p className="text-[11px] font-bold text-red-600 mt-1">Please enter an override reason.</p>
            ) : null}
          </label>
        ) : null}

        <div className="flex gap-2 pt-2">
          <PreviewButton variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </PreviewButton>
          <PreviewButton onClick={handleReview} className="flex-2">
            Create Manual Order
          </PreviewButton>
        </div>
      </div>
    </PreviewBottomSheet>
  );
}

// 2. REPLACEMENT ORDER FLOW (3 Steps)
export function ReplacementDialog({
  onClose,
  onSuccess
}: {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [treatment, setTreatment] = useState("RESTORE_ENTITLEMENT");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const hasError = submitted && !reason.trim();

  return (
    <PreviewBottomSheet title="Cancel & Replace Order" onClose={onClose}>
      <div className="space-y-4">
        {/* Step Indicator */}
        <div className="flex items-center justify-between gap-1 text-[11px] font-black border-b border-stone-100 pb-2">
          <span className={`px-2 py-1 rounded-lg ${step === 1 ? "bg-orange-100 text-orange-800" : "text-stone-400"}`}>1. Financial Treatment</span>
          <span className="text-stone-300">→</span>
          <span className={`px-2 py-1 rounded-lg ${step === 2 ? "bg-orange-100 text-orange-800" : "text-stone-400"}`}>2. Replacement Details</span>
          <span className="text-stone-300">→</span>
          <span className={`px-2 py-1 rounded-lg ${step === 3 ? "bg-emerald-100 text-emerald-800" : "text-stone-400"}`}>3. Linked Trail</span>
        </div>

        {step === 1 ? (
          <>
            <PreviewNotice tone="amber">
              <p className="font-extrabold text-amber-950">Original Order: ORD-1048 · Aarav Mehta (Lunch)</p>
              <p className="mt-1 text-xs text-amber-900">Original order consumed 1 prepaid Lunch entitlement.</p>
            </PreviewNotice>

            <label className="block text-xs font-black uppercase text-stone-700">
              Select Financial Treatment
              <select
                value={treatment}
                onChange={(e) => setTreatment(e.target.value)}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-bold text-stone-900"
              >
                <option value="RESTORE_ENTITLEMENT">RESTORE_ENTITLEMENT — Return 1 Lunch back to plan</option>
                <option value="KEEP_CONSUMED">KEEP_CONSUMED — Leave meal consumed as late cancellation fee</option>
              </select>
            </label>

            <label className="block text-xs font-black uppercase text-stone-700">
              Cancellation Reason
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this order being replaced?"
                className={`mt-1.5 min-h-[70px] w-full rounded-xl border p-3 text-xs font-semibold ${
                  hasError ? "border-red-500 bg-red-50" : "border-stone-200"
                }`}
              />
              {hasError ? <p className="text-[11px] font-bold text-red-600 mt-1">Enter a reason to proceed.</p> : null}
            </label>

            <PreviewButton
              onClick={() => {
                setSubmitted(true);
                if (reason.trim()) setStep(2);
              }}
              className="w-full"
            >
              Proceed to Replacement
            </PreviewButton>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-950">
              ✓ Step 1 Complete: Original cancellation treatment set to {treatment.replace("_", " ")}. Original record remains preserved.
            </div>

            <p className="text-sm font-black text-stone-900">Configure Replacement Order</p>

            <div className="space-y-3">
              <label className="block text-xs font-black uppercase text-stone-700">
                Replacement Meal Date
                <select className="mt-1.5 min-h-[44px] w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-bold text-stone-900">
                  <option>Today · {shortDateLabel(currentBusinessDate)}</option>
                  <option>Tomorrow · {shortDateLabel(tomorrowBusinessDate)}</option>
                </select>
              </label>

              <label className="block text-xs font-black uppercase text-stone-700">
                Replacement Meal Type
                <select className="mt-1.5 min-h-[44px] w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-bold text-stone-900">
                  <option>Dinner (Paneer Masala & Jeera Rice)</option>
                </select>
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <PreviewButton variant="secondary" onClick={() => setStep(1)} className="flex-1">
                Back
              </PreviewButton>
              <PreviewButton onClick={() => setStep(3)} className="flex-2">
                Create Linked Replacement
              </PreviewButton>
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <div className="text-center py-3 space-y-2">
              <div className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                <IconCheck className="size-6" />
              </div>
              <h4 className="text-lg font-black text-stone-900">Replacement Flow Complete</h4>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-3 text-xs">
              <div className="pb-2 border-b border-stone-200">
                <p className="font-extrabold text-stone-900">ORD-1048 (Original Order)</p>
                <p className="text-stone-500 mt-0.5">Status: CANCELLED · Treatment: {treatment.replace("_", " ")}</p>
              </div>
              <div>
                <p className="font-extrabold text-emerald-800">ORD-1054 (Replacement Order)</p>
                <p className="text-stone-500 mt-0.5">Status: CONFIRMED · Dinner · Linked to ORD-1048</p>
              </div>
            </div>

            <PreviewButton
              onClick={() => onSuccess("Replacement flow completed. Linked history trail created.")}
              className="w-full"
            >
              Finish Preview
            </PreviewButton>
          </>
        ) : null}
      </div>
    </PreviewBottomSheet>
  );
}

// 3. DOCUMENT-STYLE INVOICE DETAIL VIEW
export function InvoiceDetailDialog({
  onClose
}: {
  onClose: () => void;
}) {
  return (
    <PreviewBottomSheet title="Document View: Invoice INV-2026-0042" onClose={onClose}>
      <div className="space-y-4">
        {/* Document Header */}
        <div className="rounded-2xl bg-white border border-stone-200 p-5 space-y-4 shadow-sm">
          <div className="flex justify-between items-start pb-4 border-b border-stone-100">
            <div>
              <h3 className="text-lg font-black tracking-tight text-stone-900">HERITAGE</h3>
              <p className="text-xs text-stone-500">Kothrud, Pune · +91 98765 43210</p>
            </div>
            <div className="text-right">
              <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">
                ISSUED DOCUMENT
              </span>
              <p className="text-[11px] text-stone-400 mt-1">Date: 31 Aug 2026</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="font-extrabold text-stone-400 uppercase tracking-wider">Bill To</p>
              <p className="font-black text-stone-900 mt-0.5">Riya Shah</p>
              <p className="text-stone-500">+91 97123 2308</p>
            </div>
            <div>
              <p className="font-extrabold text-stone-400 uppercase tracking-wider">Billing Period</p>
              <p className="font-black text-stone-900 mt-0.5">1 Aug – 31 Aug 2026</p>
              <p className="text-stone-500">Count-based Monthly Plan</p>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-stone-400 font-extrabold">
                  <th className="py-2">Meal Item</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Price</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                <tr>
                  <td className="py-2.5 font-semibold text-stone-900">Lunch · Extra meal past cap (12 Aug)</td>
                  <td className="py-2.5 text-center text-stone-600">1</td>
                  <td className="py-2.5 text-right text-stone-600">₹80</td>
                  <td className="py-2.5 text-right font-bold text-stone-900">₹80</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-semibold text-stone-900">Lunch · Extra meal past cap (13 Aug)</td>
                  <td className="py-2.5 text-center text-stone-600">1</td>
                  <td className="py-2.5 text-right text-stone-600">₹80</td>
                  <td className="py-2.5 text-right font-bold text-stone-900">₹80</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-semibold text-stone-900">Monthly Base Plan Allowance</td>
                  <td className="py-2.5 text-center text-stone-600">1</td>
                  <td className="py-2.5 text-right text-stone-600">₹2,290</td>
                  <td className="py-2.5 text-right font-bold text-stone-900">₹2,290</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Statement Calculations */}
          <div className="pt-3 border-t border-stone-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal</span>
              <span className="font-extrabold text-stone-900">₹2,450</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Payments Received (14 Aug)</span>
              <span className="font-extrabold text-emerald-700">-₹1,600</span>
            </div>
            <div className="flex justify-between text-base font-black text-stone-900 pt-2 border-t border-stone-100">
              <span>Outstanding Amount</span>
              <span>₹850</span>
            </div>
          </div>
        </div>

        <PreviewNotice tone="amber">
          <p className="font-extrabold text-xs text-amber-950">🔒 Issued Invoice — Read Only Snapshot</p>
          <p className="mt-0.5 text-[11px] text-amber-900">
            This invoice document is immutable. Subsequent payments or corrections produce separate ledger entries and do not alter this document.
          </p>
        </PreviewNotice>

        <div className="flex gap-2">
          <PreviewButton variant="secondary" onClick={() => alert("WhatsApp Share simulation: Link copied to clipboard.")} className="flex-1 text-xs">
            Share via WhatsApp
          </PreviewButton>
          <PreviewButton onClick={onClose} className="flex-1 text-xs">
            Close Document
          </PreviewButton>
        </div>
      </div>
    </PreviewBottomSheet>
  );
}

// 4. DEACTIVATION DIALOG
export function DeactivateCustomerDialog({
  customerName,
  onClose,
  onSuccess
}: {
  customerName: string;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  return (
    <PreviewBottomSheet title={`Deactivate ${customerName}?`} onClose={onClose}>
      <div className="space-y-4">
        <PreviewNotice tone="red">
          <p className="font-extrabold text-red-950">⚠️ Status Change — Not Data Deletion</p>
          <p className="mt-1 text-xs text-red-900 leading-relaxed">
            Deactivation stops new order placement. It preserves all past history, unused prepaid meals, and outstanding balance intact.
          </p>
        </PreviewNotice>

        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-2 text-xs">
          <p className="font-black text-stone-900">Deactivation Consequences:</p>
          <ul className="list-disc pl-4 space-y-1 text-stone-600 font-medium">
            <li>Future eligible orders before cutoff are cancelled normally</li>
            <li>Active subscription stops generating future automated meals</li>
            <li>4 unused prepaid Lunches stay safely preserved in balance</li>
            <li>Outstanding balance of ₹240 remains recorded for collection</li>
          </ul>
        </div>

        <div className="flex gap-2 pt-2">
          <PreviewButton variant="secondary" onClick={onClose} className="flex-1">
            Keep Active
          </PreviewButton>
          <PreviewButton variant="danger" onClick={() => onSuccess(`${customerName} has been deactivated. Entitlements and balance preserved.`)} className="flex-1">
            Deactivate Account
          </PreviewButton>
        </div>
      </div>
    </PreviewBottomSheet>
  );
}

// 5. PAYMENT RECORDING DIALOG
export function RecordPaymentDialog({
  onClose,
  onSuccess
}: {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [customer, setCustomer] = useState("Aarav Mehta");
  const [amount, setAmount] = useState("200");

  const currentOutstanding = 240;
  const payAmt = Number(amount) || 0;
  const newOutstanding = Math.max(0, currentOutstanding - payAmt);

  return (
    <PreviewBottomSheet title="Record Customer Payment" onClose={onClose}>
      <div className="space-y-4">
        <label className="block text-xs font-black uppercase text-stone-700">
          Customer
          <select
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            className="mt-1.5 min-h-[44px] w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-bold text-stone-900"
          >
            <option value="Aarav Mehta">Aarav Mehta (Current Outstanding: ₹240)</option>
            <option value="Riya Shah">Riya Shah (Current Outstanding: ₹640)</option>
            <option value="Kabir Singh">Kabir Singh (Current Outstanding: ₹150)</option>
          </select>
        </label>

        <label className="block text-xs font-black uppercase text-stone-700">
          Payment Amount (₹)
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1.5 min-h-[44px] w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-bold text-stone-900"
          />
        </label>

        {/* Before / After Balance Preview */}
        <div className="p-4 rounded-2xl bg-stone-100 border border-stone-200 space-y-2 text-xs">
          <div className="flex justify-between text-stone-600">
            <span>Current Outstanding</span>
            <span className="font-extrabold text-stone-900">₹{currentOutstanding}</span>
          </div>
          <div className="flex justify-between text-emerald-700">
            <span>Payment Recorded</span>
            <span className="font-extrabold">-₹{payAmt}</span>
          </div>
          <div className="flex justify-between text-sm font-black text-stone-900 pt-2 border-t border-stone-200">
            <span>New Outstanding Balance</span>
            <span>₹{newOutstanding}</span>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <PreviewButton variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </PreviewButton>
          <PreviewButton onClick={() => onSuccess(`Payment of ₹${payAmt} recorded for ${customer}.`)} className="flex-2">
            Record Payment
          </PreviewButton>
        </div>
      </div>
    </PreviewBottomSheet>
  );
}
