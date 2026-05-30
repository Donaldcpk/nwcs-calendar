import { describe, expect, test } from "vitest";
import { createSchoolYearDays } from "@/lib/calendar-init";
import { calculateSchoolHolidayQuotaWithTrace } from "@/lib/holiday-quota";
import { buildSsForSchoolYear, schoolYearSsCap } from "@/lib/ss-school-year";
import { DayType } from "@/types/school-day";

describe("S&S school year", () => {
  test("2026-2027 學年上限為 79（不含閏年 2/29）", () => {
    expect(schoolYearSsCap("2026-09-01", "2027-08-31")).toBe(79);
  });

  test("以學年合計顯示，不按 2026/2027 曆年拆分", () => {
    const start = "2026-09-01";
    const end = "2027-08-31";
    const days = createSchoolYearDays(start, end);
    const { countedDates } = calculateSchoolHolidayQuotaWithTrace(days);
    const summary = buildSsForSchoolYear(days, countedDates, start, end);
    expect(summary.label).toBe("2026-27學年");
    expect(summary.cap).toBe(79);
    expect(summary.count).toBeGreaterThan(0);
  });

  test("PH 週末不計入 S&S（與 S&S 互斥）", () => {
    const start = "2026-09-01";
    const end = "2026-10-31";
    const days = createSchoolYearDays(start, end);
    const { countedDates } = calculateSchoolHolidayQuotaWithTrace(days);
    const saturday = Object.keys(days).find((d) => {
      const wd = new Date(`${d}T00:00:00`).getDay();
      return wd === 6 && !countedDates.has(d) && days[d].type === DayType.SS;
    });
    expect(saturday).toBeTruthy();

    const before = buildSsForSchoolYear(days, countedDates, start, end).count;
    days[saturday!].type = DayType.PH;
    const afterPh = buildSsForSchoolYear(days, countedDates, start, end).count;

    expect(afterPh).toBe(before - 1);
  });

  test("明確 S&S 類型計入統計", () => {
    const start = "2026-09-01";
    const end = "2026-09-30";
    const days = createSchoolYearDays(start, end);
    const { countedDates } = calculateSchoolHolidayQuotaWithTrace(days);
    const summary = buildSsForSchoolYear(days, countedDates, start, end);
    expect(summary.count).toBeGreaterThan(0);
    expect(days["2026-09-05"].type).toBe(DayType.SS);
  });
});
