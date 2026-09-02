"use client";

import { useState } from "react";
import { todayKitchenSummary, adminOrders } from "../mock-data";
import { PreviewCard, PreviewButton, PreviewPill, SectionTitle } from "../preview-ui";
import { IconBreakfast, IconLunch, IconDinner, IconKitchen, IconOrder, IconLunchbox, IconWarning } from "../preview-icons";

export function AdminTodayHub({
  onOpenManualOrder,
  onOpenReplacement,
  onSwitchSubView
}: {
  onOpenManualOrder: () => void;
  onOpenReplacement: () => void;
  onSwitchSubView?: (subView: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "kitchen" | "orders">("overview");

  const kitchen = todayKitchenSummary;
  const totalMealsToPrepare = kitchen.meals.reduce((acc, m) => acc + m.total, 0);

  return (
    <div className="space-y-6">
      {/* Today Top Strip */}
      <section className="service-strip rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-block rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-900">
              {kitchen.date} · Daily Operations
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-stone-900">
              Prepare {totalMealsToPrepare} Meals Today
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-stone-600">
              Operational preparation counts exclude cancelled orders.
            </p>
          </div>

          <div className="flex gap-2">
            <PreviewButton onClick={onOpenManualOrder} className="text-xs px-4">
              + Manual Order
            </PreviewButton>
          </div>
        </div>
      </section>

      {/* Sub View Toggle */}
      <div className="flex rounded-2xl border border-stone-200 bg-white p-1.5 shadow-xs">
        {[
          { id: "overview", label: "Today Overview" },
          { id: "kitchen", label: "3-Second Kitchen View" },
          { id: "orders", label: "Service Orders" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 min-h-[42px] rounded-xl text-xs font-extrabold transition-all ${
              activeTab === tab.id
                ? "bg-[var(--saffron)] text-white shadow-xs"
                : "text-stone-500 hover:text-stone-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* VIEW 1: OVERVIEW */}
      {activeTab === "overview" ? (
        <div className="space-y-6">
          {/* Interactive Metric Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <PreviewCard
              onClick={() => setActiveTab("kitchen")}
              className="cursor-pointer hover:border-orange-300 transition-colors p-4"
            >
              <p className="text-[11px] font-extrabold uppercase text-stone-400">Total Kitchen Prep</p>
              <p className="text-2xl font-black text-stone-900 mt-1">{totalMealsToPrepare} Meals</p>
              <p className="text-[11px] font-bold text-emerald-700 mt-0.5">Ready for cook</p>
            </PreviewCard>

            <PreviewCard
              onClick={() => setActiveTab("orders")}
              className="cursor-pointer hover:border-orange-300 transition-colors p-4"
            >
              <p className="text-[11px] font-extrabold uppercase text-stone-400">Orders Today</p>
              <p className="text-2xl font-black text-stone-900 mt-1">24 Active</p>
              <p className="text-[11px] font-bold text-stone-500 mt-0.5">3 Cancelled</p>
            </PreviewCard>

            <PreviewCard className="p-4">
              <p className="text-[11px] font-extrabold uppercase text-stone-400">Daily Revenue</p>
              <p className="text-2xl font-black text-stone-900 mt-1">₹1,800</p>
              <p className="text-[11px] font-bold text-stone-500 mt-0.5">Today's charges</p>
            </PreviewCard>

            <PreviewCard className="p-4">
              <p className="text-[11px] font-extrabold uppercase text-stone-400">Lunchboxes Missing</p>
              <p className="text-2xl font-black text-amber-700 mt-1">3 Boxes</p>
              <p className="text-[11px] font-bold text-stone-500 mt-0.5">From 23 Aug service</p>
            </PreviewCard>
          </div>

          {/* Attention Items */}
          <section className="space-y-3">
            <SectionTitle eyebrow="Requires Attention" title="Operational Checklist" />
            <div className="grid gap-3 sm:grid-cols-2">
              <PreviewCard accent="amber" className="space-y-2">
                <div className="flex items-center gap-2">
                  <IconWarning className="size-5 text-amber-600" />
                  <p className="font-extrabold text-sm text-stone-900">Tomorrow's Menu Unpublished</p>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Tuesday's menu is currently unpublished. Customers see an "Unpublished" notice when selecting tomorrow.
                </p>
                <PreviewButton variant="secondary" onClick={() => onSwitchSubView?.("menu")} className="min-h-[36px] text-xs px-3">
                  Publish Menu Now
                </PreviewButton>
              </PreviewCard>

              <PreviewCard accent="saffron" className="space-y-2">
                <div className="flex items-center gap-2">
                  <IconOrder className="size-5 text-orange-600" />
                  <p className="font-extrabold text-sm text-stone-900">Customer Cancellations</p>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  2 customers requested order changes near cutoff. Review original records and replacement trails.
                </p>
                <PreviewButton variant="secondary" onClick={() => setActiveTab("orders")} className="min-h-[36px] text-xs px-3">
                  Review Service Orders
                </PreviewButton>
              </PreviewCard>
            </div>
          </section>

          {/* Lunchbox Tracker */}
          <section className="space-y-3">
            <SectionTitle eyebrow="Hardware Tracking" title="Lunchbox Inventory (23 Aug)" />
            <PreviewCard className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-xl bg-stone-50">
                  <p className="text-[11px] font-extrabold text-stone-400">DISPATCHED</p>
                  <p className="text-xl font-black text-stone-900 mt-0.5">{kitchen.lunchboxTracker.dispatched}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50">
                  <p className="text-[11px] font-extrabold text-emerald-700">RETURNED</p>
                  <p className="text-xl font-black text-emerald-900 mt-0.5">{kitchen.lunchboxTracker.returned}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50">
                  <p className="text-[11px] font-extrabold text-amber-700">MISSING</p>
                  <p className="text-xl font-black text-amber-900 mt-0.5">{kitchen.lunchboxTracker.missing}</p>
                </div>
              </div>
            </PreviewCard>
          </section>
        </div>
      ) : null}

      {/* VIEW 2: 3-SECOND KITCHEN VIEW */}
      {activeTab === "kitchen" ? (
        <div className="space-y-6">
          <SectionTitle
            eyebrow="3-Second Cook View"
            title="Kitchen Preparation Board"
            detail="Bold operational counts for instant scanning by kitchen staff."
          />

          <div className="grid gap-4 sm:grid-cols-3">
            {kitchen.meals.map((m) => (
              <PreviewCard key={m.type} accent="saffron" className="space-y-4">
                <div className="flex justify-between items-start pb-2 border-b border-stone-100">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-orange-800">{m.type}</span>
                    <p className="text-xs text-stone-500">Cutoff {m.cutoff}</p>
                  </div>
                  <span className="text-3xl font-black text-stone-900">{m.total}</span>
                </div>

                <div>
                  <p className="text-sm font-black text-stone-900 leading-tight">{m.dish}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100 text-xs">
                  <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                    <p className="text-[10px] font-extrabold text-emerald-800 uppercase">Prepaid</p>
                    <p className="text-base font-black text-emerald-950">{m.prepaid}</p>
                  </div>
                  <div className="bg-amber-50 p-2 rounded-xl border border-amber-200">
                    <p className="text-[10px] font-extrabold text-amber-800 uppercase">Billable</p>
                    <p className="text-base font-black text-amber-950">{m.billable}</p>
                  </div>
                </div>
              </PreviewCard>
            ))}
          </div>

          {/* Kitchen Order List Detail */}
          <section className="space-y-3 pt-2">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-stone-500">
              Kitchen Recipient Breakdown (Lunch · 12 Meals)
            </h3>
            <div className="divide-y divide-stone-100 rounded-2xl bg-white border border-stone-200 overflow-hidden">
              {[
                { name: "Aarav Mehta", coverage: "Covered by Prepaid Plan", phone: "+91 98765 4812" },
                { name: "Riya Shah", coverage: "₹80 Count Subscription Billable", phone: "+91 97123 2308" },
                { name: "Kabir Singh", coverage: "Covered by Prepaid Plan", phone: "+91 99888 9211" },
                { name: "Meera Patel", coverage: "Covered by Prepaid Plan", phone: "+91 98220 3311" },
              ].map((res, idx) => (
                <div key={idx} className="flex justify-between items-center p-3.5 text-xs">
                  <div>
                    <p className="font-extrabold text-stone-900">{res.name}</p>
                    <p className="text-stone-400">{res.phone}</p>
                  </div>
                  <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                    {res.coverage}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {/* VIEW 3: SERVICE ORDERS */}
      {activeTab === "orders" ? (
        <div className="space-y-4">
          <SectionTitle
            eyebrow="Order Registry"
            title="Service Orders Today"
            detail="Financially consequential changes create linked replacement records; original orders are never silently deleted."
          />

          <div className="grid gap-3">
            {adminOrders.map((order) => (
              <PreviewCard key={order.id} className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-black uppercase text-stone-400">{order.id}</span>
                    <h4 className="text-base font-black text-stone-900 mt-0.5">{order.customer}</h4>
                    <p className="text-xs text-stone-500">{order.phone} · {order.meal} ({order.dish})</p>
                  </div>
                  <PreviewPill tone={order.status === "CANCELLED" ? "danger" : "ready"}>
                    {order.status}
                  </PreviewPill>
                </div>

                <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                    {order.coverage}
                  </span>

                  {order.status === "CONFIRMED" ? (
                    <div className="flex gap-2">
                      <PreviewButton variant="secondary" onClick={onOpenReplacement} className="min-h-[36px] text-xs px-3">
                        Cancel / Replace
                      </PreviewButton>
                    </div>
                  ) : null}
                </div>
              </PreviewCard>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
