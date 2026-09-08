import { redirect } from "next/navigation";

import { OrdersBoard } from "@/components/admin/orders-board";
import { AppShell } from "@/components/app-shell";
import { getAdminPrincipal } from "@/lib/auth/session";
import { businessDateFromKey, businessDateKey } from "@/lib/domain/time";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ date?: string | string[] }> }) {
  const principal = await getAdminPrincipal(); if (!principal) redirect("/login");
  const requested = (await searchParams).date;
  const serviceDate = typeof requested === "string" && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : businessDateKey();
  const date = businessDateFromKey(serviceDate);
  const [admin, mealTypes, customers, orders] = await Promise.all([
    prisma.user.findUnique({ where: { id: principal.userId }, select: { name: true, business: { select: { name: true } } } }),
    prisma.mealType.findMany({ where: { businessId: principal.businessId, status: "ACTIVE" }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    prisma.customer.findMany({ where: { businessId: principal.businessId }, orderBy: { name: "asc" }, select: { id: true, name: true, phone: true, status: true } }),
    prisma.orderItem.findMany({ where: { businessId: principal.businessId, serviceDate: date }, orderBy: [{ mealType: { sortOrder: "asc" } }, { id: "desc" }], select: { id: true, status: true, quantity: true, allocationKind: true, menuItemNameSnapshot: true, unitPriceMinor: true, customer: { select: { name: true, phone: true } }, mealType: { select: { name: true } } } }),
  ]);
  if (!admin) redirect("/login");
  return <AppShell businessName={admin.business.name} adminName={admin.name}><OrdersBoard serviceDate={serviceDate} mealTypes={mealTypes} customers={customers} orders={orders} /></AppShell>;
}
