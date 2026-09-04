import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/authorization";
import { createDraftInvoice } from "@/lib/domain/invoicing";
import { domainError, invalidInput } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { adminCreateInvoiceSchema } from "@/lib/validation/domain";

export async function POST(request: Request) {
    const limited = await enforceRateLimit(prisma, request, { scope: "admin.invoices.write", limit: 30, windowMs: 15 * 60 * 1000 });
    if (limited) return limited;

    const parsed = adminCreateInvoiceSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return invalidInput(parsed.error);

    try {
        const principal = await requireAdmin();
        const result = await createDraftInvoice(prisma, { role: "ADMIN", businessId: principal.businessId, userId: principal.userId }, {
            businessId: principal.businessId,
            customerId: parsed.data.customerId,
            chargeIds: parsed.data.chargeIds,
            idempotencyKey: parsed.data.idempotencyKey,
        });
        return NextResponse.json({ ok: true, ...result }, { status: 200 });
    } catch (error) {
        const mapped = domainError(error);
        if (mapped) return mapped;
        console.error("Admin invoice creation failed", error);
        return NextResponse.json({ error: "Invoice could not be created." }, { status: 500 });
    }
}
