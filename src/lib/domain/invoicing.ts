import { ChargeStatus, InvoiceStatus, PrismaClient } from "@prisma/client";

import type { DomainActor, DomainTransaction } from "./context";
import { requireAdmin, requireCustomerInBusiness, writeAudit } from "./context";
import { DomainError } from "./errors";
import { beginIdempotentOperation, completeIdempotentOperation } from "./idempotency";

export type CreateInvoiceInput = {
    businessId: string;
    customerId: string;
    chargeIds: string[];
    actorUserId?: string;
    idempotencyKey: string;
};

export type CreateInvoiceResult = {
    invoiceId: string;
    invoiceNumber: string;
    status: "DRAFT";
    subtotalMinor: number;
    outstandingMinor: number;
    chargeCount: number;
};

export async function createDraftInvoice(
    prisma: PrismaClient,
    actor: DomainActor,
    input: CreateInvoiceInput,
): Promise<CreateInvoiceResult> {
    requireAdmin(actor);

    const uniqueChargeIds = Array.from(new Set(input.chargeIds));
    if (!uniqueChargeIds.length) throw new DomainError("At least one charge ID is required.", "VALIDATION");

    return prisma.$transaction(async (tx) => {
        const operation = await beginIdempotentOperation(tx, actor, "invoice.create", input.idempotencyKey);
        if (operation.replay) return operation.replay as CreateInvoiceResult;

        await requireCustomerInBusiness(tx, actor.businessId, input.customerId);

        const charges = await tx.charge.findMany({
            where: { businessId: actor.businessId, id: { in: uniqueChargeIds } },
        });
        if (charges.length !== uniqueChargeIds.length) {
            throw new DomainError("One or more charges were not found.", "NOT_FOUND");
        }

        for (const charge of charges) {
            if (charge.status !== ChargeStatus.POSTED) {
                throw new DomainError("Only posted charges can be invoiced.", "INVALID_STATE");
            }
            if (charge.customerId !== input.customerId) {
                throw new DomainError("All charges must belong to the same customer.", "INVALID_STATE");
            }
        }

        const alreadyInvoiced = await tx.charge.findFirst({
            where: { businessId: actor.businessId, id: { in: uniqueChargeIds }, status: ChargeStatus.INVOICED },
        });
        if (alreadyInvoiced) {
            throw new DomainError("One or more charges are already invoiced.", "INVALID_STATE");
        }

        const subtotalMinor = charges.reduce((sum, charge) => sum + charge.amountMinor, 0);
        const invoiceNumber = await nextInvoiceNumber(tx, actor.businessId);

        const invoice = await tx.invoice.create({
            data: {
                businessId: actor.businessId,
                customerId: input.customerId,
                invoiceNumber,
                periodStart: new Date(1970, 0, 1),
                periodEnd: new Date(1970, 0, 1),
                status: InvoiceStatus.DRAFT,
                subtotalMinor,
                previousBalanceMinor: 0,
                paymentsMinor: 0,
                creditsMinor: 0,
                outstandingMinor: subtotalMinor,
                createdByUserId: actor.userId,
            },
        });

        for (const charge of charges) {
            const orderItem = await tx.orderItem.findFirst({ where: { id: charge.orderItemId, businessId: actor.businessId } });
            await tx.invoiceItem.create({
                data: {
                    businessId: actor.businessId,
                    invoiceId: invoice.id,
                    chargeId: charge.id,
                    orderItemId: orderItem?.id ?? null,
                    description: "Meal charge",
                    mealTypeName: orderItem?.mealTypeId ? orderItem.mealTypeId : "meal",
                    quantity: charge.quantity,
                    unitPriceMinor: charge.unitPriceMinor,
                    totalMinor: charge.amountMinor,
                },
            });
            const claimed = await tx.charge.updateMany({
                where: { id: charge.id, businessId: actor.businessId, status: ChargeStatus.POSTED },
                data: { status: ChargeStatus.INVOICED },
            });
            if (claimed.count !== 1) {
                throw new DomainError("A charge changed state while invoicing.", "CONFLICT");
            }
        }

        await writeAudit(tx, actor, "invoice", invoice.id, "INVOICE_CREATED", {
            invoiceNumber,
            customerId: input.customerId,
            subtotalMinor,
            chargeCount: charges.length,
            status: "DRAFT",
        });

        const result: CreateInvoiceResult = {
            invoiceId: invoice.id,
            invoiceNumber,
            status: "DRAFT",
            subtotalMinor,
            outstandingMinor: subtotalMinor,
            chargeCount: charges.length,
        };

        await completeIdempotentOperation(tx, actor, "invoice.create", input.idempotencyKey, "invoice", invoice.id, result);
        return result;
    });
}

async function nextInvoiceNumber(tx: DomainTransaction, businessId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const latest = await tx.invoice.findFirst({
        where: { businessId, invoiceNumber: { startsWith: prefix } },
        orderBy: { invoiceNumber: "desc" },
    });
    if (!latest) return `${prefix}000001`;
    const suffix = latest.invoiceNumber.slice(prefix.length);
    const next = Number.parseInt(suffix, 10) + 1;
    return `${prefix}${next.toString().padStart(6, "0")}`;
}