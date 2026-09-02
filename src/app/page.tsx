import { redirect } from "next/navigation";

import { getAdminPrincipal } from "@/lib/auth/session";
import { hasDatabaseUrl } from "@/lib/env";
import { isInitialSetupComplete } from "@/lib/setup";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!hasDatabaseUrl()) redirect("/preview");
  if (!(await isInitialSetupComplete())) redirect("/setup");
  if (await getAdminPrincipal()) redirect("/admin");
  redirect("/login");
}
