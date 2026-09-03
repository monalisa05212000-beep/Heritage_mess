import { describe, expect, it } from "vitest";

import { DEFAULT_MEAL_TYPES } from "../src/lib/domain/catalog";
import { DomainError } from "../src/lib/domain/errors";
import { cutoffAt, isDateWithin, normalizePhone } from "../src/lib/domain/time";

describe("domain rule primitives", () => {
  it("normalizes customer phone identity without accepting an empty number", () => {
    expect(normalizePhone(" +91 (987) 654-3210 ")).toBe("919876543210");
    expect(() => normalizePhone("---")).toThrow(DomainError);
  });

  it("derives frozen meal cutoffs in Asia/Kolkata", () => {
    const serviceDate = new Date("2026-08-30T00:00:00.000Z");
    expect(cutoffAt(serviceDate, 7 * 60).toISOString()).toBe("2026-08-30T01:30:00.000Z");
    expect(cutoffAt(serviceDate, 11 * 60).toISOString()).toBe("2026-08-30T05:30:00.000Z");
    expect(cutoffAt(serviceDate, 18 * 60).toISOString()).toBe("2026-08-30T12:30:00.000Z");
  });

  it("defines standard PRD meal types with cutoffs 07:00, 11:00, and 18:00", () => {
    expect(DEFAULT_MEAL_TYPES).toHaveLength(3);
    expect(DEFAULT_MEAL_TYPES[0]).toEqual({ code: "BREAKFAST", name: "Breakfast", sortOrder: 1, orderingCutoffMinutes: 420, cancellationCutoffMinutes: 420 });
    expect(DEFAULT_MEAL_TYPES[1]).toEqual({ code: "LUNCH", name: "Lunch", sortOrder: 2, orderingCutoffMinutes: 660, cancellationCutoffMinutes: 660 });
    expect(DEFAULT_MEAL_TYPES[2]).toEqual({ code: "DINNER", name: "Dinner", sortOrder: 3, orderingCutoffMinutes: 1080, cancellationCutoffMinutes: 1080 });
  });

  it("keeps future plan coverage inside the inclusive service period", () => {
    const start = new Date("2026-09-01T00:00:00.000Z");
    const end = new Date("2026-09-30T00:00:00.000Z");
    expect(isDateWithin(new Date("2026-09-01T00:00:00.000Z"), start, end)).toBe(true);
    expect(isDateWithin(new Date("2026-09-30T00:00:00.000Z"), start, end)).toBe(true);
    expect(isDateWithin(new Date("2026-08-31T00:00:00.000Z"), start, end)).toBe(false);
    expect(isDateWithin(new Date("2026-10-01T00:00:00.000Z"), start, end)).toBe(false);
  });
});
