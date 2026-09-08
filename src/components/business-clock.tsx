"use client";

import { useEffect, useState } from "react";
import { formatBusinessDateTime } from "@/lib/domain/time";

export function BusinessClock() {
  // Render the same markup on the server and during hydration. The clock is
  // intentionally started after mount so a millisecond-level Date.now()
  // difference cannot produce a hydration mismatch.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return <time dateTime={now?.toISOString()}>{now ? formatBusinessDateTime(now) : ""}</time>;
}
