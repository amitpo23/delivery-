import { describe, it, expect } from "vitest";
import {
  slaHoursFor,
  slaDeadline,
  slaMinutesRemaining,
  isSlaBreached,
} from "@/lib/orders/sla";

describe("SLA", () => {
  it("hours per tier", () => {
    expect(slaHoursFor("express")).toBe(4);
    expect(slaHoursFor("same_day")).toBe(12);
    expect(slaHoursFor("next_day")).toBe(30);
    expect(slaHoursFor("economy")).toBe(72);
  });

  it("deadline is created+hours", () => {
    const created = new Date("2026-01-01T08:00:00Z");
    const d = slaDeadline(created, "express");
    expect(d.toISOString()).toBe("2026-01-01T12:00:00.000Z");
  });

  it("minutes remaining counts down and goes negative when breached", () => {
    const created = new Date("2026-01-01T00:00:00Z");
    const noon = new Date("2026-01-01T12:00:00Z");
    expect(slaMinutesRemaining(created, "express", noon)).toBeLessThan(0);
    expect(slaMinutesRemaining(created, "next_day", noon)).toBeGreaterThan(0);
  });

  it("isSlaBreached uses delivered_at when present", () => {
    const created = "2026-01-01T08:00:00Z";
    const onTime = "2026-01-01T11:00:00Z";
    const tooLate = "2026-01-01T13:00:00Z";
    expect(isSlaBreached(created, "express", onTime)).toBe(false);
    expect(isSlaBreached(created, "express", tooLate)).toBe(true);
  });

  it("isSlaBreached uses now() for undelivered orders", () => {
    const created = new Date("2026-01-01T00:00:00Z");
    const stillPendingAtNoon = new Date("2026-01-01T12:00:00Z");
    expect(isSlaBreached(created, "express", null, stillPendingAtNoon)).toBe(true);
    expect(isSlaBreached(created, "next_day", null, stillPendingAtNoon)).toBe(false);
  });
});
