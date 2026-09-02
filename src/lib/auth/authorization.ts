import { getAdminPrincipal } from "@/lib/auth/session";

export class AuthorizationError extends Error {
  constructor() {
    super("You are not authorized to perform this action.");
  }
}

export async function requireAdmin() {
  const principal = await getAdminPrincipal();
  if (!principal) throw new AuthorizationError();
  return principal;
}

