"use client";

import { useState } from "react";
import { dateRibbonOptions, todayMenu, type DateOption, type MealCode } from "../mock-data";
import { PreviewCard, PreviewButton, PreviewPill, PreviewNotice, PreviewState, SectionTitle } from "../preview-ui";
import { IconBreakfast, IconLunch, IconDinner, IconCheck } from "../preview-icons";

export function CustomerHome({
  entitlements,
  outstandingBalance,
  onSelectMeal
}: {
  entitlements: Array<{ code: MealCode; label: string; remaining: number; original: number; usable: boolean }>;
  outstandingBalance: number;
  onSelectMeal: (mealCode: MealCode, dateLabel: string, isCovered: boolean, price: number) => void;
}) {
  const [selectedDateId, setSelectedDateId] = useState<string>("today");

  const selectedDateObj = dateRibbonOptions.find((d) => d.id === selectedDateId) || dateRibbonOptions[1];

  const getMealIcon = (code: MealCode) => {
    switch (code) {
      case "BREAKFAST": return <IconBreakfast className="size-5 text-amber-600" />;
      case "LUNCH": return <IconLunch className="size-5 text-orange-600" />;
      case "DINNER": return <IconDinner className="size-5 text-indigo-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="service-strip rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <span className="inline-block rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-800">
              Active Resident Plan
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-stone-900">Good morning, Aarav 👋</h1>
            <p className="mt-1 text-xs sm:text-sm leading-relaxed text-stone-600">
              Review today's menu or select a date below to plan your meals.
            </p>
          </div>
        </div>
      </section>

      {/* Date Navigation Ribbon */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <SectionTitle eyebrow="Select Date" title="Meal Schedule" />
          <button
            type="button"
            onClick={() => setSelectedDateId("today")}
            className="text-xs font-extrabold text-[var(--saffron-deep)] hover:underline"
          >
            Reset to Today
          </button>
        </div>

        {/* Scrollable Ribbon */}
        <div className="flex gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar">
          {dateRibbonOptions.map((item) => {
            const isSelected = item.id === selectedDateId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedDateId(item.id)}
                className={`flex shrink-0 flex-col items-center justify-center rounded-2xl min-w-[72px] p-3 text-center transition-all ${
                  isSelected
                    ? "bg-[var(--saffron)] text-white shadow-md scale-[1.02]"
                    : "bg-white border border-stone-200 text-stone-700 hover:border-stone-300"
                }`}
              >
                <span className={`text-[11px] font-extrabold ${isSelected ? "text-orange-100" : "text-stone-400"}`}>
                  {item.shortDay}
                </span>
                <span className="text-lg font-black">{item.dayNum}</span>
                {item.id === "today" ? (
                  <span className={`mt-1 rounded-full px-1.5 py-0.5 text-[9px] font-black ${isSelected ? "bg-white text-[var(--saffron-deep)]" : "bg-orange-100 text-orange-800"}`}>
                    Today
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      {/* Date State Notices */}
      {selectedDateObj.state === "unpublished" ? (
        <PreviewState
          kind="empty"
          title="Menu not published yet"
          detail={`Your caterer hasn't published the menu for ${selectedDateObj.dayLabel}. Check back later.`}
        />
      ) : null}

      {selectedDateObj.state === "closure" ? (
        <PreviewState
          kind="error"
          title="No food service on this day"
          detail={`Your caterer has declared a holiday/no-service closure for ${selectedDateObj.dayLabel}. Any prepaid meals remain saved in your balance for future use.`}
        />
      ) : null}

      {selectedDateObj.state === "past-cutoff" ? (
        <PreviewNotice tone="amber">
          <p className="font-extrabold text-amber-900">Ordering closed for this date</p>
          <p className="mt-1 text-xs text-amber-800">The customer cutoff for this service date has passed (7:00 AM).</p>
        </PreviewNotice>
      ) : null}

      {/* Published Menu Display */}
      {selectedDateObj.state === "published" ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-stone-900">Menu for {selectedDateObj.dayLabel}</h3>
            <span className="text-xs font-semibold text-stone-500">3 Meals Available</span>
          </div>

          <div className="grid gap-3">
            {todayMenu.items.map((meal) => {
              const entitlement = entitlements.find((e) => e.code === meal.code);
              const isCovered = Boolean(entitlement && entitlement.remaining > 0);
              const remainingCount = entitlement?.remaining || 0;

              return (
                <PreviewCard key={meal.code} className="relative overflow-hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-stone-100">
                        {getMealIcon(meal.code)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-stone-500">{meal.code}</span>
                          {!meal.available ? (
                            <PreviewPill tone="neutral">Cutoff passed</PreviewPill>
                          ) : null}
                        </div>
                        <h4 className="text-base font-black text-stone-900 mt-0.5">{meal.name}</h4>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-stone-900">₹{meal.price}</span>
                    </div>
                  </div>

                  {/* Plain Language Coverage Banner */}
                  <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isCovered ? (
                        <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          <IconCheck className="size-3.5" />
                          <span>Covered by your plan ({remainingCount} remaining)</span>
                        </div>
                      ) : (
                        <div className="text-xs font-extrabold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                          <span>₹{meal.price} will be added to your bill</span>
                        </div>
                      )}
                    </div>

                    {meal.available ? (
                      <PreviewButton
                        onClick={() => onSelectMeal(meal.code, selectedDateObj.dayLabel, isCovered, meal.price)}
                        variant={isCovered ? "primary" : "secondary"}
                        className="min-h-[42px] text-xs px-4"
                      >
                        Order {meal.code[0] + meal.code.slice(1).toLowerCase()}
                      </PreviewButton>
                    ) : (
                      <span className="text-xs font-bold text-stone-400">Cutoff: {meal.cutoffTime}</span>
                    )}
                  </div>
                </PreviewCard>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Plan Summary Section */}
      <section className="space-y-3 pt-2">
        <SectionTitle eyebrow="Your Active Balance" title="Meals & Account" />
        <div className="grid grid-cols-3 gap-2">
          {entitlements.map((entry) => (
            <PreviewCard key={entry.code} className="p-3 text-center">
              <p className="text-[11px] font-extrabold text-stone-500 uppercase tracking-wider">{entry.label}</p>
              <p className="mt-1 text-2xl font-black text-stone-900">{entry.remaining}</p>
              <p className="text-[10px] font-bold text-stone-400">remaining</p>
            </PreviewCard>
          ))}
        </div>

        <PreviewCard className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs font-extrabold uppercase text-stone-500">Outstanding Balance</p>
            <p className="text-xs text-stone-500 mt-0.5">From extra billable meals</p>
          </div>
          <p className="text-2xl font-black text-stone-900">₹{outstandingBalance}</p>
        </PreviewCard>
      </section>
    </div>
  );
}
