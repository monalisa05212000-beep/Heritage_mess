import { describe, expect, it } from "vitest";

import { belongsToBusiness, canManageBusiness, canReadCustomer } from "../src/lib/auth/policy";

const admin = { kind: "admin" as const, userId: "admin-1", businessId: "business-a" };
const customer = { kind: "customer" as const, customerId: "customer-1", businessId: "business-a" };

describe("authorization policy", () => {
  it("allows an admin to manage only their own business", () => {
    expect(canManageBusiness(admin, "business-a")).toBe(true);
    expect(canManageBusiness(admin, "business-b")).toBe(false);
  });

  it("allows a customer to read only their own records", () => {
    expect(canReadCustomer(customer, "customer-1", "business-a")).toBe(true);
    expect(canReadCustomer(customer, "customer-2", "business-a")).toBe(false);
  });

  it("does not allow any principal to cross a business boundary", () => {
    expect(belongsToBusiness(customer, "business-b")).toBe(false);
    expect(canReadCustomer(admin, "customer-9", "business-b")).toBe(false);
    expect(canReadCustomer(customer, "customer-1", "business-b")).toBe(false);
  });
});
