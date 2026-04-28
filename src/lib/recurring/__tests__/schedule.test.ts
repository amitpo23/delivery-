import { describe, it, expect } from "vitest";
import { nextRun } from "@/lib/recurring/schedule";

describe("nextRun", () => {
  it("daily at 06:00 from 09:00 today → tomorrow 06:00", () => {
    const from = new Date("2026-04-28T09:00:00Z");
    const r = nextRun({ from, frequency: "daily", hourOfDay: 6 });
    expect(r.toISOString()).toBe("2026-04-29T06:00:00.000Z");
  });

  it("daily at 18:00 from 09:00 today → today 18:00", () => {
    const from = new Date("2026-04-28T09:00:00Z");
    const r = nextRun({ from, frequency: "daily", hourOfDay: 18 });
    expect(r.toISOString()).toBe("2026-04-28T18:00:00.000Z");
  });

  it("weekly Monday 08:00 from Friday → next Monday", () => {
    // 2026-05-01 is a Friday
    const from = new Date("2026-05-01T12:00:00Z");
    const r = nextRun({ from, frequency: "weekly", weekday: 1, hourOfDay: 8 });
    expect(r.toISOString()).toBe("2026-05-04T08:00:00.000Z");
  });

  it("biweekly Sunday → 14 days when same weekday already passed", () => {
    // 2026-04-26 is Sunday at 09:00 UTC → recur on Sunday 06:00 means jump
    const from = new Date("2026-04-26T09:00:00Z");
    const r = nextRun({ from, frequency: "biweekly", weekday: 0, hourOfDay: 6 });
    expect(r.toISOString()).toBe("2026-05-10T06:00:00.000Z");
  });

  it("monthly rolls forward when today's hour already past", () => {
    const from = new Date("2026-04-28T09:00:00Z");
    const r = nextRun({ from, frequency: "monthly", hourOfDay: 6 });
    expect(r.toISOString()).toBe("2026-05-28T06:00:00.000Z");
  });
});
