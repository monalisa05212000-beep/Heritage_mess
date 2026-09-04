import { describe, expect, it, vi } from "vitest";

const redirect = vi.hoisted(() => vi.fn((path: string): never => { throw new Error(`REDIRECT:${path}`); }));
const hasDatabaseUrl = vi.hoisted(() => vi.fn(() => true));
const getInitialSetupStatus = vi.hoisted(() => vi.fn(async () => ({ state: "complete" as const })));
const getAdminPrincipal = vi.hoisted(() => vi.fn());
const getCustomerPrincipal = vi.hoisted(() => vi.fn());
const invalidateCustomerSession = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("../src/lib/env", () => ({ hasDatabaseUrl }));
vi.mock("../src/lib/setup", () => ({ getInitialSetupStatus }));
vi.mock("../src/lib/auth/session", () => ({
  CUSTOMER_SESSION_COOKIE: "heritage_customer_session",
  getAdminPrincipal,
  getCustomerPrincipal,
  invalidateCustomerSession,
}));

import { POST as customerLogout } from "../src/app/api/customer-access/logout/route";
import { homeRoute } from "../src/lib/auth/home-routing";

describe("authentication user flow", () => {
  it("routes an unauthenticated user through the existing login flow", async () => {
    getAdminPrincipal.mockResolvedValue(null);
    getCustomerPrincipal.mockResolvedValue(null);

    expect(homeRoute({ databaseConfigured: true, setupState: "complete", hasAdminSession: false, hasCustomerSession: false })).toBe("/login");
  });

  it("routes an authenticated admin to /admin", async () => {
    getAdminPrincipal.mockResolvedValue({ kind: "admin", userId: "admin-1", businessId: "business-1" });

    expect(homeRoute({ databaseConfigured: true, setupState: "complete", hasAdminSession: true, hasCustomerSession: false })).toBe("/admin");
  });

  it("routes an authenticated customer to /customer without using admin access", async () => {
    getAdminPrincipal.mockResolvedValue(null);
    getCustomerPrincipal.mockResolvedValue({ kind: "customer", customerId: "customer-1", businessId: "business-1" });

    expect(homeRoute({ databaseConfigured: true, setupState: "complete", hasAdminSession: false, hasCustomerSession: true })).toBe("/customer");
  });

  it("invalidates only the current customer session and clears its cookie", async () => {
    const response = await customerLogout(new Request("http://localhost:3000/api/customer-access/logout", {
      method: "POST",
      headers: { cookie: "other=value; heritage_customer_session=customer-token" },
    }));

    expect(invalidateCustomerSession).toHaveBeenCalledWith("customer-token");
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("heritage_customer_session=");
    expect(response.headers.get("set-cookie")).toContain("Expires=Thu, 01 Jan 1970");
  });

  it("makes repeated customer logout safe and does not touch admin sessions", async () => {
    const request = new Request("http://localhost:3000/api/customer-access/logout", { method: "POST" });

    await expect(customerLogout(request)).resolves.toMatchObject({ status: 200 });
    await expect(customerLogout(request)).resolves.toMatchObject({ status: 200 });
    expect(invalidateCustomerSession).toHaveBeenCalledTimes(3);
  });

});
