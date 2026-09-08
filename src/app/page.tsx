import { redirect } from "next/navigation";

import { getAdminPrincipal, getCustomerPrincipal } from "@/lib/auth/session";
import { hasDatabaseUrl } from "@/lib/env";
import { getInitialSetupStatus } from "@/lib/setup";
import { homeRoute } from "@/lib/auth/home-routing";
import { DatabaseUnavailablePanel } from "@/components/database-unavailable-panel";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!hasDatabaseUrl()) return <DatabaseUnavailablePanel />;
  const setupStatus = await getInitialSetupStatus();
  const adminSession = await getAdminPrincipal();
  const customerSession = adminSession ? null : await getCustomerPrincipal();
  redirect(homeRoute({
    databaseConfigured: true,
    setupState: setupStatus.state,
    hasAdminSession: Boolean(adminSession),
    hasCustomerSession: Boolean(customerSession),
  }));
}
