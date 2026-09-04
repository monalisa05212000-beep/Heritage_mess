"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function CustomerLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/customer-access/logout", { method: "POST" });
    router.replace("/customer/access");
    router.refresh();
  }

  return (
    <Button variant="quiet" onClick={logout} disabled={loading} className="min-h-10 px-3 text-xs">
      {loading ? "Signing out…" : "Sign out"}
    </Button>
  );
}
