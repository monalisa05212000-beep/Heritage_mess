import { hasDatabaseUrl } from "./env";
import { prisma } from "./prisma";

export type InitialSetupStatus =
  | { state: "missing-database-url" }
  | { state: "database-unavailable" }
  | { state: "complete" }
  | { state: "incomplete" };

export async function getInitialSetupStatus(): Promise<InitialSetupStatus> {
  if (!hasDatabaseUrl()) return { state: "missing-database-url" };

  try {
    const setupState = await prisma.setupState.findUnique({ where: { key: "initial-setup" } });
    return { state: setupState ? "complete" : "incomplete" };
  } catch (error) {
    console.error("Initial setup status check failed", error);
    return { state: "database-unavailable" };
  }
}

export async function isInitialSetupComplete() {
  return (await getInitialSetupStatus()).state === "complete";
}
