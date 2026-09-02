"use client";

import { useState } from "react";
import { todayMenu, type MealCode } from "../mock-data";
import { PreviewButton, PreviewNotice, PreviewCard } from "../preview-ui";
import { IconCheck, IconWarning } from "../preview-icons";

export function CustomerOrderFlow({
  mealCode,
  dateLabel,
  isCovered,
  price,
  remainingCount = 0,
  onClose,
  onConfirmed
}: {
  mealCode: MealCode;
  dateLabel: string;
  isCovered: boolean;
  price: number;
  remainingCount?: number;
  onClose: () => void;
  onConfirmed: (mealName: string) => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const mealItem = todayMenu.items.find((m) => m.code === mealCode) || todayMenu.items[1];
  const mealName = mealItem.name;
  const cutoffTime = mealItem.cutoffTime;

  const handleConfirm = () => {
    setConfirmed(true);
  };

  if (confirmed) {
    return (
      <div className="space-y-6 text-center py-4">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600 animate-bounce">
          <IconCheck className="size-8" />
        </div>

        <div>
          <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
            Order Confirmed
          </span>
          <h2 className="mt-3 text-2xl font-black text-stone-900 tracking-tight">
            {mealCode[0] + mealCode.slice(1).toLowerCase()} is on the kitchen list!
          </h2>
          <p className="mt-1 text-xs text-stone-500">ORD-1052 · {dateLabel}</p>
        </div>

        <PreviewCard accent="leaf" className="text-left space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-stone-100">
            <span className="font-extrabold text-stone-900">{mealName}</span>
            <span className="text-xs font-black text-emerald-700">1 Meal</span>
          </div>

          <div className="space-y-1.5 text-xs text-stone-600">
            <p className="font-extrabold text-emerald-700">
              {isCovered ? "✓ Covered by your meal plan" : `✓ ₹${price} added to your statement`}
            </p>
            <p className="text-stone-500">
              Cancellation closes at <strong className="text-stone-800">{cutoffTime}</strong> today.
            </p>
          </div>
        </PreviewCard>

        <div className="pt-2">
          <PreviewButton
            onClick={() => onConfirmed(mealName)}
            className="w-full"
          >
            Done
          </PreviewButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="border-b border-stone-100 pb-3">
        <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--saffron-deep)]">Review & Confirm</span>
        <h3 className="text-xl font-black text-stone-900 mt-0.5">{mealCode[0] + mealCode.slice(1).toLowerCase()} for {dateLabel}</h3>
      </div>

      <div className="rounded-2xl bg-stone-50 p-4 space-y-3 border border-stone-200">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-black text-base text-stone-900">{mealName}</p>
            <p className="text-xs text-stone-500 mt-0.5">Freshly prepared PG Catering Service</p>
          </div>
          <span className="text-lg font-black text-stone-900">₹{price}</span>
        </div>

        <div className="pt-2 border-t border-stone-200/80 flex justify-between text-xs font-semibold text-stone-600">
          <span>Quantity</span>
          <span className="font-black text-stone-900">1 Meal</span>
        </div>
      </div>

      {/* Human-readable coverage notice */}
      <PreviewNotice tone={isCovered ? "green" : "amber"}>
        <p className="font-extrabold text-sm">
          {isCovered ? "✓ Covered by your meal plan" : `₹${price} will be added to your bill`}
        </p>
        <p className="mt-1 text-xs leading-relaxed">
          {isCovered
            ? `This uses 1 ${mealCode[0] + mealCode.slice(1).toLowerCase()} from your remaining ${remainingCount} prepaid meals. No additional payment required today.`
            : "You have used your prepaid limit. This item will be billed on your end-of-month statement."}
        </p>
      </PreviewNotice>

      <div className="text-xs text-stone-500 space-y-1 bg-orange-50/60 p-3 rounded-xl border border-orange-100">
        <p className="font-bold text-orange-950">Cancellation policy:</p>
        <p className="text-orange-900">You can cancel this order anytime before <strong>{cutoffTime}</strong> today directly from your Orders tab.</p>
      </div>

      <div className="flex gap-2 pt-2">
        <PreviewButton variant="secondary" onClick={onClose} className="flex-1">
          Back
        </PreviewButton>
        <PreviewButton onClick={handleConfirm} className="flex-2">
          Confirm {mealCode[0] + mealCode.slice(1).toLowerCase()} Order
        </PreviewButton>
      </div>
    </div>
  );
}
