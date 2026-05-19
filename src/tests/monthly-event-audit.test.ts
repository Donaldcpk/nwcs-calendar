import { describe, expect, test } from "vitest";
import { DayType, SchoolDay } from "@/types/school-day";
import { buildMonthlyEventSummary } from "@/lib/monthly-event-audit";

function day(date: string, events: string[]): SchoolDay {
  return {
    date,
    type: DayType.Normal,
    cycleDay: null,
    isLessonSuspended: false,
    countsAs190: true,
    isLocked: false,
    events,
  };
}

describe("buildMonthlyEventSummary", () => {
  test("同一活動至少兩天才列出，並合併連續區間", () => {
    const entries = [
      day("2026-09-01", ["特別時間表"]),
      day("2026-09-02", ["特別時間表"]),
      day("2026-09-03", ["特別時間表"]),
      day("2026-09-10", ["特別時間表"]),
      day("2026-09-20", ["開放日"]),
    ];
    const rows = buildMonthlyEventSummary(entries);
    const special = rows.find((r) => r.activityName === "特別時間表");
    expect(special?.displayLine).toContain("9/1–9/3");
    expect(special?.displayLine).toContain("9/10");
    expect(rows.some((r) => r.activityName === "開放日")).toBe(false);
  });
});
