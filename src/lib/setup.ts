import { prisma } from "@/lib/prisma";
import { hasDatabaseUrl } from "@/lib/env";

export async function isInitialSetupComplete() {
  if (!hasDatabaseUrl()) return false;

  return Boolean(await prisma.setupState.findUnique({ where: { key: "initial-setup" } }));
}
