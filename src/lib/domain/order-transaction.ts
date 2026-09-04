import type { Prisma } from "@prisma/client";

export const ORDER_TRANSACTION_OPTIONS = {
  isolationLevel: "Serializable" as Prisma.TransactionIsolationLevel,
  maxWait: 10_000,
  timeout: 15_000,
};
