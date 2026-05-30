import { describe, expect, test } from "vitest";
import { countByTypeForMonth } from "@/lib/month-type-stats";
import { createSchoolYearDays } from "@/lib/calendar-init";
import { calculateSchoolHolidayQuotaWithTrace } from "@/lib/holiday-quota";
import { DayType } from "@/types/school-day";

describe("month-type-stats", () => {
  test("統計指定月份各類型日數", () => {
    const days = createSchoolYearDays("2026-09-01", "2026-09-10");
    days["2026-09-01"].type = DayType.Normal;
    days["2026-09-02"].type = DayType.PH;
    days["2026-09-03"].type = DayType.SH;
    days["2026-09-04"].events = ["開學祈禱會"];

    const { countedDates } = calculateSchoolHolidayQuotaWithTrace(days);
    const summary = countByTypeForMonth(days, "2026-09", countedDates);
    expect(summary.totalDays).toBe(10);
    expect(summary.rows.find((r) => r.label === "PH")?.count).toBe(1);
    expect(summary.rows.find((r) => r.label === "SH")?.count).toBe(1);
    expect(summary.normalWithEvents).toBe(1);
    expect(summary.rows.find((r) => r.label === "S&S（本月合計）")?.count).toBeGreaterThan(0);
  });
});
