/**
 * Compute the next time a recurring template should fire, given its
 * frequency and an "anchor" timestamp (usually the previous run or the
 * created_at). All math in UTC for predictability across DST boundaries.
 */

export type Frequency = "daily" | "weekly" | "biweekly" | "monthly";

export function nextRun(opts: {
  from: Date;
  frequency: Frequency;
  /** Required for weekly/biweekly. 0=Sunday … 6=Saturday */
  weekday?: number | null;
  hourOfDay: number;
}): Date {
  const result = new Date(opts.from);
  result.setUTCHours(opts.hourOfDay, 0, 0, 0);

  switch (opts.frequency) {
    case "daily":
      // Next day after `from`. If we set today's hour and it's already past,
      // jump to tomorrow.
      if (result <= opts.from) {
        result.setUTCDate(result.getUTCDate() + 1);
      }
      break;

    case "weekly":
    case "biweekly": {
      const targetWeekday = opts.weekday ?? result.getUTCDay();
      const stepDays = opts.frequency === "weekly" ? 7 : 14;
      const currentWeekday = result.getUTCDay();
      let delta = (targetWeekday - currentWeekday + 7) % 7;
      // Same weekday but the time-of-day already passed → jump a full cycle
      if (delta === 0 && result <= opts.from) delta = stepDays;
      result.setUTCDate(result.getUTCDate() + delta);
      break;
    }

    case "monthly": {
      // Same day-of-month next month. setUTCMonth handles end-of-month rollover
      // (e.g. Jan 31 → Mar 3 in February years), which is acceptable for now.
      if (result <= opts.from) {
        result.setUTCMonth(result.getUTCMonth() + 1);
      }
      break;
    }
  }

  return result;
}
