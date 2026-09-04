import { describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/env", () => ({
  hasDatabaseUrl: vi.fn(() => true),
}));

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    setupState: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "../src/lib/prisma";
import { getInitialSetupStatus } from "../src/lib/setup";

const setupState = prisma.setupState.findUnique as ReturnType<typeof vi.fn>;

describe("initial setup status", () => {
  it("returns complete when the setup gate exists", async () => {
    setupState.mockResolvedValueOnce({ key: "initial-setup" });

    await expect(getInitialSetupStatus()).resolves.toEqual({ state: "complete" });
  });

  it("returns incomplete when the setup gate does not exist", async () => {
    setupState.mockResolvedValueOnce(null);

    await expect(getInitialSetupStatus()).resolves.toEqual({ state: "incomplete" });
  });

  it("models database connectivity failures without throwing", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    setupState.mockRejectedValueOnce(new Error("database offline"));

    await expect(getInitialSetupStatus()).resolves.toEqual({ state: "database-unavailable" });
    consoleError.mockRestore();
  });
});
