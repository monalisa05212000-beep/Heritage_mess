export type HomeSetupState = "missing-database-url" | "database-unavailable" | "complete" | "incomplete";

export function homeRoute(input: {
  databaseConfigured: boolean;
  setupState: HomeSetupState;
  hasAdminSession: boolean;
  hasCustomerSession: boolean;
}) {
  if (!input.databaseConfigured) return "/preview";
  if (input.setupState === "database-unavailable") return "/login";
  if (input.setupState === "incomplete") return "/setup";
  if (input.hasAdminSession) return "/admin";
  if (input.hasCustomerSession) return "/customer";
  return "/login";
}
