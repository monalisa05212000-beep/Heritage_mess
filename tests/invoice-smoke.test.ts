import { ChargeStatus, InvoiceStatus } from "@prisma/client";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { createDraftInvoice } from "../src/lib/domain/invoicing";
import { DomainError } from "../src/lib/domain/errors";

const BUSINESS_ID = "00000000-0000-0000-0000-000000000001";
const CUSTOMER_ID = "00000000-0000-0000-0000-000000000002";
const USER_ID = "00000000-0000-0000-0000-000000000003";
const CHARGE_1 = "00000000-0000-0000-0000-000000000010";
const CHARGE_2 = "00000000-0000-0000-0000-000000000011";

function makeCharge(overrides = {}) {
    return {
        id: CHARGE_1,
        businessId: BUSINESS_ID,
        customerId: CUSTOMER_ID,
        orderItemId: "orderitem-1",
        quantity: 1,
        unitPriceMinor: 6000,
        amountMinor: 6000,
        status: ChargeStatus.POSTED,
        chargeDueAt: new Date(),
        postedAt: new Date(),
        reversedAt: null,
        ledgerEntryId: "ledger-1",
        ...overrides,
    };
}

describe("invoice smoke tests", () => {
    describe("successful invoice creation", () => {
        it("creates a DRAFT invoice with linked charges", async () => {
            const invoice = { id: "invoice-1", invoiceNumber: "INV-2026-000001" };
            const invoiceItem = { id: "item-1" };
            const audit = { id: "audit-1" };
            const idempotency = { id: "idem-1" };

            const tx = {
                idempotencyKey: {
                    findUnique: vi.fn().mockResolvedValue(null),
                    create: vi.fn().mockResolvedValue(idempotency),
                    update: vi.fn().mockResolvedValue(null),
                },
                customer: { findFirst: vi.fn().mockResolvedValue({ id: CUSTOMER_ID }) },
                charge: {
                    findMany: vi.fn().mockResolvedValue([makeCharge()]),
                    findFirst: vi.fn().mockResolvedValue(null),
                    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
                },
                orderItem: { findFirst: vi.fn().mockResolvedValue({ id: "orderitem-1", mealTypeId: "meal-1" }) },
                invoice: {
                    findFirst: vi.fn().mockResolvedValue(null),
                    create: vi.fn().mockResolvedValue(invoice),
                },
                invoiceItem: { create: vi.fn().mockResolvedValue(invoiceItem) },
                auditLog: { create: vi.fn().mockResolvedValue(audit) },
            };

            const prisma = { $transaction: vi.fn().mockImplementation(async (fn) => fn(tx)) } as never;
            const actor = { businessId: BUSINESS_ID, userId: USER_ID, role: "ADMIN" as const };

            const result = await createDraftInvoice(prisma, actor, {
                businessId: BUSINESS_ID,
                customerId: CUSTOMER_ID,
                chargeIds: [CHARGE_1],
                idempotencyKey: "test-key-12345",
            });

            expect(result.invoiceId).toBe("invoice-1");
            expect(result.invoiceNumber).toBe("INV-2026-000001");
            expect(result.status).toBe("DRAFT");
            expect(result.subtotalMinor).toBe(6000);
            expect(result.outstandingMinor).toBe(6000);
            expect(result.chargeCount).toBe(1);
            expect(tx.invoice.create).toHaveBeenCalled();
            expect(tx.invoiceItem.create).toHaveBeenCalled();
            expect(tx.charge.updateMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ id: CHARGE_1 }),
                data: { status: ChargeStatus.INVOICED },
            }));
            expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ entityType: "invoice", action: "INVOICE_CREATED" }),
            }));
        });

        it("calculates subtotal from multiple charges", async () => {
            const invoice = { id: "invoice-2", invoiceNumber: "INV-2026-000001" };
            const tx = {
                idempotencyKey: {
                    findUnique: vi.fn().mockResolvedValue(null),
                    create: vi.fn().mockResolvedValue({ id: "idem-1" }),
                    update: vi.fn().mockResolvedValue(null),
                },
                customer: { findFirst: vi.fn().mockResolvedValue({ id: CUSTOMER_ID }) },
                charge: {
                    findMany: vi.fn().mockResolvedValue([makeCharge({ id: CHARGE_1, amountMinor: 6000 }), makeCharge({ id: CHARGE_2, amountMinor: 4000 })]),
                    findFirst: vi.fn().mockResolvedValue(null),
                    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
                },
                orderItem: { findFirst: vi.fn().mockResolvedValue({ id: "orderitem-1", mealTypeId: "meal-1" }) },
                invoice: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue(invoice) },
                invoiceItem: { create: vi.fn().mockResolvedValue({ id: "item-1" }) },
                auditLog: { create: vi.fn().mockResolvedValue({ id: "audit-1" }) },
            };
            const prisma = { $transaction: vi.fn().mockImplementation(async (fn) => fn(tx)) } as never;
            const actor = { businessId: BUSINESS_ID, userId: USER_ID, role: "ADMIN" as const };

            const result = await createDraftInvoice(prisma, actor, {
                businessId: BUSINESS_ID,
                customerId: CUSTOMER_ID,
                chargeIds: [CHARGE_1, CHARGE_2],
                idempotencyKey: "test-key-12346",
            });

            expect(result.subtotalMinor).toBe(10000);
            expect(result.outstandingMinor).toBe(10000);
            expect(result.chargeCount).toBe(2);
        });
    });

    describe("idempotent replay", () => {
        it("returns cached result on replay", async () => {
            const cachedResult = { invoiceId: "invoice-1", invoiceNumber: "INV-2026-000001", status: "DRAFT", subtotalMinor: 6000, outstandingMinor: 6000, chargeCount: 1 };
            const tx = {
                idempotencyKey: {
                    findUnique: vi.fn().mockResolvedValue({ status: "SUCCEEDED", responseBody: cachedResult }),
                },
            };
            const prisma = { $transaction: vi.fn().mockImplementation(async (fn) => fn(tx)) } as never;
            const actor = { businessId: BUSINESS_ID, userId: USER_ID, role: "ADMIN" as const };

            const result = await createDraftInvoice(prisma, actor, {
                businessId: BUSINESS_ID,
                customerId: CUSTOMER_ID,
                chargeIds: [CHARGE_1],
                idempotencyKey: "test-key-12347",
            });

            expect(result).toEqual(cachedResult);
        });
    });

    describe("already-invoiced rejection", () => {
        it("rejects charges that are already invoiced", async () => {
            const tx = {
                idempotencyKey: {
                    findUnique: vi.fn().mockResolvedValue(null),
                    create: vi.fn().mockResolvedValue({ id: "idem-1" }),
                    update: vi.fn().mockResolvedValue(null),
                },
                customer: { findFirst: vi.fn().mockResolvedValue({ id: CUSTOMER_ID }) },
                charge: {
                    findMany: vi.fn().mockResolvedValue([makeCharge({ status: ChargeStatus.INVOICED })]),
                    findFirst: vi.fn().mockResolvedValue(null),
                },
            };
            const prisma = { $transaction: vi.fn().mockImplementation(async (fn) => fn(tx)) } as never;
            const actor = { businessId: BUSINESS_ID, userId: USER_ID, role: "ADMIN" as const };

            await expect(createDraftInvoice(prisma, actor, {
                businessId: BUSINESS_ID,
                customerId: CUSTOMER_ID,
                chargeIds: [CHARGE_1],
                idempotencyKey: "test-key-12348",
            })).rejects.toThrow(DomainError);
        });
    });

    describe("cross-business rejection", () => {
        it("rejects charges from a different business", async () => {
            const tx = {
                idempotencyKey: {
                    findUnique: vi.fn().mockResolvedValue(null),
                    create: vi.fn().mockResolvedValue({ id: "idem-1" }),
                    update: vi.fn().mockResolvedValue(null),
                },
                customer: { findFirst: vi.fn().mockResolvedValue({ id: CUSTOMER_ID }) },
                charge: {
                    findMany: vi.fn().mockResolvedValue([makeCharge({ businessId: "other-business" })]),
                    findFirst: vi.fn().mockResolvedValue(null),
                    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
                },
                orderItem: { findFirst: vi.fn().mockResolvedValue({ id: "orderitem-1", mealTypeId: "meal-1" }) },
                invoice: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: "invoice-x", invoiceNumber: "INV-2026-000001" }) },
                invoiceItem: { create: vi.fn().mockResolvedValue({ id: "item-x" }) },
                auditLog: { create: vi.fn().mockResolvedValue({ id: "audit-x" }) },
            };
            const prisma = { $transaction: vi.fn().mockImplementation(async (fn) => fn(tx)) } as never;
            const actor = { businessId: BUSINESS_ID, userId: USER_ID, role: "ADMIN" as const };

            await expect(createDraftInvoice(prisma, actor, {
                businessId: BUSINESS_ID,
                customerId: CUSTOMER_ID,
                chargeIds: [CHARGE_1],
                idempotencyKey: "test-key-12349",
            })).rejects.toThrow(DomainError);
        });
    });

    describe("unauthenticated rejection", () => {
        it("rejects non-admin actors", async () => {
            const actor = { businessId: BUSINESS_ID, role: "CUSTOMER" as const };
            const prisma = {} as never;

            await expect(createDraftInvoice(prisma, actor, {
                businessId: BUSINESS_ID,
                customerId: CUSTOMER_ID,
                chargeIds: [CHARGE_1],
                idempotencyKey: "test-key-12350",
            })).rejects.toThrow(DomainError);
        });
    });

    describe("validation", () => {
        it("requires at least one charge ID", async () => {
            const actor = { businessId: BUSINESS_ID, role: "ADMIN" as const };
            const prisma = {} as never;

            await expect(createDraftInvoice(prisma, actor, {
                businessId: BUSINESS_ID,
                customerId: CUSTOMER_ID,
                chargeIds: [],
                idempotencyKey: "test-key-12351",
            })).rejects.toThrow(DomainError);
        });
    });
});
