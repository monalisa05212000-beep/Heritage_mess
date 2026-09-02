"use client";

import { useEffect, useState } from "react";
import { formatBusinessDateTime } from "@/lib/domain/time";

export function BusinessClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return <time dateTime={now.toISOString()}>{formatBusinessDateTime(now)}</time>;
}
