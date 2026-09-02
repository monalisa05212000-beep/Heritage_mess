import { DomainError } from "./errors";

export const BUSINESS_TIME_ZONE = "Asia/Kolkata";

export function normalizePhone(phone: string) {
  const normalized = phone.replace(/\D/g, "");
  if (!normalized) throw new DomainError("A phone number is required.", "VALIDATION");
  return normalized;
}

export function dateOnly(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function isDateWithin(value: Date, start: Date, end: Date) {
  const date = dateOnly(value).getTime();
  return date >= dateOnly(start).getTime() && date <= dateOnly(end).getTime();
}

export function cutoffAt(serviceDate: Date, cutoffMinutes: number) {
  if (!Number.isInteger(cutoffMinutes) || cutoffMinutes < 0 || cutoffMinutes > 1439) {
    throw new DomainError("Meal cutoff is invalid.", "VALIDATION");
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(serviceDate)
    .reduce<Record<string, string>>((result, part) => ({ ...result, [part.type]: part.value }), {});
  const utcMillis = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 0, 0) - 330 * 60_000;
  return new Date(utcMillis + cutoffMinutes * 60_000);
}

export function businessDateKey(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(value)
    .reduce<Record<string, string>>((result, part) => ({ ...result, [part.type]: part.value }), {});

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function businessMinutesSinceMidnight(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(value)
    .reduce<Record<string, string>>((result, part) => ({ ...result, [part.type]: part.value }), {});

  return Number(parts.hour) * 60 + Number(parts.minute);
}

export function businessDateFromKey(date: string) {
  return new Date(`${date}T12:00:00+05:30`);
}

export function addBusinessDays(date: string, days: number) {
  const value = businessDateFromKey(date);
  value.setUTCDate(value.getUTCDate() + days);
  return businessDateKey(value);
}

export function formatBusinessDate(date: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: BUSINESS_TIME_ZONE, ...options }).format(businessDateFromKey(date));
}

export function formatBusinessDateTime(value = new Date()) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: BUSINESS_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(value);
}

export function formatBusinessClock(value = new Date()) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: BUSINESS_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(value);
}
