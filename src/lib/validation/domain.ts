import { z } from "zod";

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD service date.");
const idempotencyKey = z.string().trim().min(8, "A request id is required.").max(200);
const uuid = z.string().uuid();

export const adminSaveMenuSchema = z.object({
  menuDate: dateKey,
  publish: z.boolean().default(false),
  idempotencyKey,
  items: z.array(z.object({
    mealTypeId: uuid,
    name: z.string().trim().min(1, "Dish name is required.").max(160),
    description: z.string().trim().max(500).optional().or(z.literal("")),
  })).min(1, "Add at least one menu item."),
});

export const adminUnpublishMenuSchema = z.object({
  menuId: uuid,
  idempotencyKey,
});

export const adminCreateCustomerSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required.").max(120),
  phone: z.string().trim().min(3, "Phone number is required.").max(32),
  payAsYouGoEnabled: z.boolean().default(false),
  idempotencyKey,
});

export const customerCreateOrderSchema = z.object({
  mealTypeId: uuid,
  serviceDate: dateKey,
  quantity: z.coerce.number().int().positive().default(1),
  idempotencyKey,
});

export const customerCancelOrderSchema = z.object({
  orderItemId: uuid,
  idempotencyKey,
});

export const adminOrdersQuerySchema = z.object({
  date: dateKey.optional(),
});

export const customerMenuQuerySchema = z.object({
  date: dateKey.optional(),
});

export const adminSetPriceSchema = z.object({
  mealTypeId: uuid,
  amountMinor: z.coerce.number().int().nonnegative("Price amount must be a non-negative number."),
  effectiveFrom: dateKey,
  effectiveTo: dateKey.optional().or(z.literal("")),
  idempotencyKey,
});

export const adminCreateInvoiceSchema = z.object({
  customerId: uuid,
  chargeIds: z.array(uuid).min(1, "At least one charge ID is required"),
  idempotencyKey,
});