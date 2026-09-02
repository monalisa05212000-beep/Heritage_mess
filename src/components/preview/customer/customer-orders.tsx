"use client";

import { useState } from "react";
import { PreviewCard, PreviewButton, PreviewPill, SectionTitle } from "../preview-ui";
import { IconWarning } from "../preview-icons";

export interface CustomerOrderItem {
  id: string;
  date: string;
  meal: string;
  dish: string;
  coverage: string;
  amount: number;
  status: string;
  cancellable: boolean;
  cutoffTime: string;
}

export function CustomerOrdersView({
  orders,
  onCancelOrder,
  onToast
}: {
  orders: CustomerOrderItem[];
  onCancelOrder: (id: string) => void;
  onToast: (msg: string) => void;
}) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleConfirmCancel = (id: string, meal: string) => {
    onCancelOrder(id);
    setCancellingId(null);
  };

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Your Orders" title="Service Plan & History" detail="Track upcoming kitchen orders and manage your cancellations before cutoff." />

      {/* Upcoming Orders Section */}
      <section className="space-y-3">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-stone-500">Upcoming Orders ({orders.length})</h3>

        <div className="grid gap-3">
          {orders.map((order) => {
            const isCancelled = order.status === "CANCELLED";
            const isCancelling = cancellingId === order.id;

            return (
              <PreviewCard key={order.id} accent={isCancelled ? "danger" : "saffron"} className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-stone-400">{order.id}</span>
                    <h4 className="text-base font-black text-stone-900 mt-0.5">{order.meal} · {order.date}</h4>
                    <p className="text-xs text-stone-600 mt-0.5">{order.dish}</p>
                  </div>
                  <PreviewPill tone={isCancelled ? "danger" : "ready"}>
                    {isCancelled ? "CANCELLED" : "CONFIRMED"}
                  </PreviewPill>
                </div>

                <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className={`font-extrabold ${isCancelled ? "text-red-700" : "text-emerald-700"}`}>
                    {order.coverage}
                  </span>

                  {!isCancelled && order.cancellable ? (
                    <PreviewButton
                      variant="outline"
                      onClick={() => setCancellingId(order.id)}
                      className="min-h-[38px] text-xs px-3 text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Cancel Meal
                    </PreviewButton>
                  ) : !isCancelled ? (
                    <span className="text-[11px] font-bold text-stone-400 bg-stone-100 px-2.5 py-1 rounded-lg">
                      Cancellation closed (Cutoff: {order.cutoffTime})
                    </span>
                  ) : null}
                </div>

                {/* Inline Confirmation Drawer for Cancellation */}
                {isCancelling ? (
                  <div className="mt-3 p-4 rounded-xl bg-red-50 border border-red-200 space-y-3">
                    <div className="flex items-start gap-2">
                      <IconWarning className="size-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-black text-red-950">Cancel {order.meal}?</p>
                        <p className="text-xs text-red-900 mt-0.5 leading-relaxed">
                          Your place can still be released because the cutoff hasn't passed ({order.cutoffTime}). {order.amount === 0 ? "Your prepaid meal will be returned directly to your available plan count." : `₹${order.amount} extra meal charge will be removed from your balance.`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <PreviewButton
                        variant="secondary"
                        onClick={() => setCancellingId(null)}
                        className="min-h-[36px] text-xs px-3"
                      >
                        Keep Order
                      </PreviewButton>
                      <PreviewButton
                        variant="danger"
                        onClick={() => handleConfirmCancel(order.id, order.meal)}
                        className="min-h-[36px] text-xs px-3"
                      >
                        Confirm Cancellation
                      </PreviewButton>
                    </div>
                  </div>
                ) : null}
              </PreviewCard>
            );
          })}
        </div>
      </section>

      {/* Past History */}
      <section className="space-y-3 pt-4 border-t border-stone-200">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-stone-500">Past Service History</h3>

        <div className="space-y-2">
          {[
            { date: "Sat, 22 Aug", meal: "Lunch", dish: "Chole Bhature & Lassi", status: "Delivered", note: "Covered by plan" },
            { date: "Fri, 21 Aug", meal: "Dinner", dish: "Roti, Dal Tadka & Mix Veg", status: "Delivered", note: "Covered by plan" },
            { date: "Thu, 20 Aug", meal: "Lunch", dish: "Veg Biryani & Raita", status: "Cancelled", note: "Meal returned before cutoff" },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-stone-200 text-xs">
              <div>
                <p className="font-extrabold text-stone-900">{item.date} · {item.meal}</p>
                <p className="text-stone-500">{item.dish}</p>
              </div>
              <div className="text-right">
                <span className={`font-bold ${item.status === "Delivered" ? "text-emerald-700" : "text-stone-400"}`}>
                  {item.status}
                </span>
                <p className="text-[10px] text-stone-400">{item.note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
