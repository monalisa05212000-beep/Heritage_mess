import { describe, expect, it, vi, beforeEach } from "vitest";

const businessFindMany = vi.hoisted(() => vi.fn());
const customerFindMany = vi.hoisted(() => vi.fn());
const customerSessionCreate = vi.hoisted(() => vi.fn(async () => ({})));
const enforceRateLimit = vi.hoisted(() => vi.fn(async (..._args: unknown[]) => null));

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    business: { findMany: businessFindMany },
    customer: { findMany: customerFindMany },
    customerSession: { create: customerSessionCreate },
  },
}));
vi.mock("../src/lib/security/rate-limit", () => ({ enforceRateLimit }));
vi.mock("../src/lib/auth/session", () => ({
  CUSTOMER_SESSION_COOKIE: "heritage_customer_session",
  createSessionToken: () => "token",
  hashToken: (value: string) => `hash:${value}`,
  sessionCookieOptions: () => ({ httpOnly: true, path: "/" }),
  sessionExpiry: () => new Date("2026-10-01T00:00:00.000Z"),
}));

import { POST as customerAccess } from "../src/app/api/customer-access/route";

function request(name: string, phone: string) {
  return new Request("http://localhost:3000/api/customer-access", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, phone }),
  });
}

const CUSTOMER = { id: "customer-1", name: "E2E Test Customer" };
const whereOf = () => customerFindMany.mock.calls[0][0].where;

describe("customer portal sign-in matching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    businessFindMany.mockResolvedValue([{ id: "business-1" }]);
    customerFindMany.mockResolvedValue([CUSTOMER]);
  });

  it.each([
    ["exact", "E2E Test Customer"],
    ["lowercase", "e2e test customer"],
    ["uppercase", "E2E TEST CUSTOMER"],
    ["extra inner spacing", "E2E  Test   Customer"],
    ["surrounding whitespace", "  E2E Test Customer  "],
  ])("signs in when the name is typed %s", async (_label, typed) => {
    const response = await customerAccess(request(typed, "9000000001"));

    expect(response.status).toBe(200);
    expect(customerSessionCreate).toHaveBeenCalledOnce();
  });

  it.each([
    ["plain", "9000000001", "9000000001"],
    ["spaced", "90000 00001", "9000000001"],
    ["country code", "+91 9000000001", "9000000001"],
    ["leading zero", "09000000001", "9000000001"],
    ["dashed", "900-000-0001", "9000000001"],
  ])("signs in with a %s phone number by its last ten digits", async (_label, typed, expected) => {
    const response = await customerAccess(request("E2E Test Customer", typed));

    expect(response.status).toBe(200);
    expect(whereOf().normalizedPhone).toEqual({ endsWith: expected });
  });

  it("falls back to an exact match for numbers shorter than ten digits", async () => {
    customerFindMany.mockResolvedValue([{ id: "c", name: "Front Desk" }]);

    await customerAccess(request("Front Desk", "12345"));

    expect(whereOf().normalizedPhone).toEqual({ equals: "12345" });
  });

  it("never sends the name to the database, so it cannot become a SQL wildcard", async () => {
    await customerAccess(request("E2E Test Customer", "9000000001"));

    expect(whereOf()).not.toHaveProperty("name");
    expect(whereOf()).toMatchObject({ businessId: "business-1", status: "ACTIVE" });
  });

  it.each(["%%", "%", "_2E Test Customer", "E2E Test Custome_"])(
    "refuses the SQL wildcard %j instead of matching every customer",
    async (wildcard) => {
      // The DB layer would return the whole business if the name were an ILIKE pattern.
      customerFindMany.mockResolvedValue([CUSTOMER]);

      const response = await customerAccess(request(wildcard, "9000000001"));

      // 401 from the name comparison, or 400 when it is too short for the schema —
      // either way it must not become a session.
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(customerSessionCreate).not.toHaveBeenCalled();
    },
  );

  it("refuses to sign anyone in when two customers match the same details", async () => {
    customerFindMany.mockResolvedValue([
      { id: "customer-1", name: "Ravi Kumar" },
      { id: "customer-2", name: "ravi kumar" },
    ]);

    const response = await customerAccess(request("Ravi Kumar", "9000000001"));

    expect(response.status).toBe(401);
    expect(customerSessionCreate).not.toHaveBeenCalled();
  });

  it("picks the right customer when the phone suffix reaches several records", async () => {
    customerFindMany.mockResolvedValue([
      { id: "customer-1", name: "Ravi Kumar" },
      { id: "customer-2", name: "Priya Nair" },
    ]);

    const response = await customerAccess(request("priya nair", "9000000001"));

    expect(response.status).toBe(200);
    expect(customerSessionCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ customerId: "customer-2" }) }));
  });

  it("refuses an all-punctuation phone number without querying for customers", async () => {
    const response = await customerAccess(request("E2E Test Customer", "-----"));

    expect(response.status).toBe(401);
    expect(customerFindMany).not.toHaveBeenCalled();
  });

  it("refuses an unknown customer without creating a session", async () => {
    customerFindMany.mockResolvedValue([]);

    const response = await customerAccess(request("Nobody", "9999999999"));

    expect(response.status).toBe(401);
    expect(customerSessionCreate).not.toHaveBeenCalled();
  });

  it("rate-limits on the phone number rather than the shared mess WiFi address", async () => {
    await customerAccess(request("E2E Test Customer", "+91 9000000001"));

    const configs = enforceRateLimit.mock.calls.map((call) => call[2] as { scope: string; limit: number; identity?: string });
    expect(configs).toContainEqual(expect.objectContaining({ scope: "customer.access", identity: "phone:919000000001" }));
    // …and the IP guard that remains is generous enough for a whole building.
    const ipGuard = configs.find((config) => config.scope === "customer.access.ip");
    expect(ipGuard?.limit ?? 0).toBeGreaterThanOrEqual(100);
  });
});
