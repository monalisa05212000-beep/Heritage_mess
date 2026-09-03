import { describe, expect, it } from "vitest";

import {
  adminCreateCustomerSchema,
  adminSaveMenuSchema,
  adminSetPriceSchema,
  adminUnpublishMenuSchema,
  customerCancelOrderSchema,
  customerCreateOrderSchema,
} from "../src/lib/validation/domain";

const uuid = "00000000-0000-0000-0000-000000000001";

describe("API validation contracts", () => {
  it("requires customer creation requests to carry a usable idempotency key", () => {
    expect(adminCreateCustomerSchema.safeParse({ name: "Riya", phone: "9876543210", idempotencyKey: "short" }).success).toBe(false);
    expect(adminCreateCustomerSchema.safeParse({ name: "Riya", phone: "9876543210", payAsYouGoEnabled: true, idempotencyKey: "customer-create-1" }).success).toBe(true);
  });

  it("validates price setting payloads", () => {
    expect(adminSetPriceSchema.safeParse({ mealTypeId: uuid, amountMinor: 6000, effectiveFrom: "2026-09-03", idempotencyKey: "price-set-1" }).success).toBe(true);
    expect(adminSetPriceSchema.safeParse({ mealTypeId: "invalid-uuid", amountMinor: -100, effectiveFrom: "invalid-date", idempotencyKey: "" }).success).toBe(false);
  });

  it("validates menu save payloads before the catalog domain service runs", () => {
    expect(adminSaveMenuSchema.safeParse({ menuDate: "02-09-2026", publish: true, idempotencyKey: "menu-save-1", items: [] }).success).toBe(false);
    expect(adminSaveMenuSchema.safeParse({
      menuDate: "2026-09-02",
      publish: true,
      idempotencyKey: "menu-save-1",
      items: [{ mealTypeId: uuid, name: "Sambar rice" }],
    }).success).toBe(true);
  });

  it("validates menu unpublish requests", () => {
    expect(adminUnpublishMenuSchema.safeParse({ menuId: "not-a-uuid", idempotencyKey: "menu-unpublish-1" }).success).toBe(false);
    expect(adminUnpublishMenuSchema.safeParse({ menuId: uuid, idempotencyKey: "menu-unpublish-1" }).success).toBe(true);
  });

  it("validates customer order creation payloads with service dates and idempotency keys", () => {
    expect(customerCreateOrderSchema.safeParse({ mealTypeId: uuid, serviceDate: "today", quantity: 1, idempotencyKey: "order-create-1" }).success).toBe(false);
    expect(customerCreateOrderSchema.safeParse({ mealTypeId: uuid, serviceDate: "2026-09-02", quantity: 1, idempotencyKey: "order-create-1" }).success).toBe(true);
  });

  it("validates customer order cancellation payloads", () => {
    expect(customerCancelOrderSchema.safeParse({ orderItemId: uuid, idempotencyKey: "order-cancel-1" }).success).toBe(true);
    expect(customerCancelOrderSchema.safeParse({ orderItemId: uuid, idempotencyKey: "" }).success).toBe(false);
  });
});
