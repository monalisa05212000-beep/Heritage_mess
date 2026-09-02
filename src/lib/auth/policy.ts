export type AdminPrincipal = {
  kind: "admin";
  userId: string;
  businessId: string;
};

export type CustomerPrincipal = {
  kind: "customer";
  customerId: string;
  businessId: string;
};

export type Principal = AdminPrincipal | CustomerPrincipal;

export function belongsToBusiness(principal: Principal, businessId: string) {
  return principal.businessId === businessId;
}

export function canManageBusiness(principal: Principal, businessId: string) {
  return principal.kind === "admin" && belongsToBusiness(principal, businessId);
}

export function canReadCustomer(principal: Principal, customerId: string, businessId: string) {
  if (!belongsToBusiness(principal, businessId)) return false;
  return principal.kind === "admin" || principal.customerId === customerId;
}

