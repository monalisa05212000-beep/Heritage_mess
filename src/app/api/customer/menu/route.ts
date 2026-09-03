import { MenuStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCustomerPrincipal } from "@/lib/auth/session";
import { businessDateFromKey, businessDateKey } from "@/lib/domain/time";
import { prisma } from "@/lib/prisma";
import { customerMenuQuerySchema } from "@/lib/validation/domain";

export async function GET(request: Request) {
  const principal = await getCustomerPrincipal();
  if (!principal) return NextResponse.json({ error: "Customer access is required." }, { status: 401 });

  const url = new URL(request.url);
  const parsed = customerMenuQuerySchema.safeParse({ date: url.searchParams.get("date") ?? undefined });
  if (!parsed.success) return NextResponse.json({ error: "Use a valid YYYY-MM-DD date." }, { status: 400 });

  const date = parsed.data.date ?? businessDateKey();
  const serviceDate = businessDateFromKey(date);
  const menu = await prisma.menu.findFirst({
    where: { businessId: principal.businessId, menuDate: serviceDate, status: MenuStatus.PUBLISHED },
    include: {
      items: {
        include: {
          mealType: true,
        },
        orderBy: { mealType: { sortOrder: "asc" } },
      },
    },
  });
  return NextResponse.json({ ok: true, date, menu });
}
