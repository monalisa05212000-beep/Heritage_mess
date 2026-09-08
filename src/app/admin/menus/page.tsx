import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { MenuManager } from "@/components/admin/menu-manager";
import { getAdminPrincipal } from "@/lib/auth/session";
import { businessDateFromKey, businessDateKey } from "@/lib/domain/time";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MenusPage({ searchParams }: { searchParams: Promise<{ date?: string | string[] }> }) {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/login");
  const today = businessDateKey();
  const requested = (await searchParams).date;
  const serviceDate = typeof requested === "string" && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : today;
  const menuDate = businessDateFromKey(serviceDate);
  const [admin, mealTypes, menu] = await Promise.all([
    prisma.user.findUnique({ where: { id: principal.userId }, select: { name: true, business: { select: { name: true } } } }),
    prisma.mealType.findMany({ where: { businessId: principal.businessId, status: "ACTIVE" }, orderBy: { sortOrder: "asc" }, select: { id: true, code: true, name: true } }),
    prisma.menu.findUnique({ where: { businessId_menuDate: { businessId: principal.businessId, menuDate } }, select: { id: true, status: true, items: { orderBy: { mealType: { sortOrder: "asc" } }, select: { id: true, mealTypeId: true, name: true, description: true, mealType: { select: { id: true, code: true, name: true } } } } } }),
  ]);
  if (!admin) redirect("/login");
  return <AppShell businessName={admin.business.name} adminName={admin.name}><MenuManager serviceDate={serviceDate} today={today} mealTypes={mealTypes} menu={menu} /></AppShell>;
}
