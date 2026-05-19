import { describe, expect, test } from "vitest";
import { createSchoolYearDays } from "@/lib/calendar-init";
import { calculateComplianceMetrics } from "@/hooks/use-compliance";
import { calculateSchoolHolidayQuota, calculateSchoolHolidayQuotaWithTrace } from "@/lib/holiday-quota";
import { DayType } from "@/types/school-day";

describe("calculateComplianceMetrics", () => {
  test("若上課日不足 190 應回傳警示", () => {
    const days = createSchoolYearDays("2025-09-01", "2026-08-31");
    Object.values(days).slice(0, 200).forEach((day) => {
      day.type = DayType.Holiday;
      day.countsAs190 = false;
    });
    const metrics = calculateComplianceMetrics(days, "2025-09-01", "2026-08-31");
    expect(metrics.schoolDays).toBeLessThan(190);
    expect(metrics.warnings.some((item) => item.includes("上課日數不足"))).toBe(true);
  });

  test("DH 與 SDD 超限應被偵測", () => {
    const days = createSchoolYearDays("2025-09-01", "2025-09-20");
    days["2025-09-01"].type = DayType.DH;
    days["2025-09-02"].type = DayType.DH;
    days["2025-09-03"].type = DayType.DH;
    days["2025-09-04"].type = DayType.DH;
    days["2025-09-05"].type = DayType.SDD;
    days["2025-09-06"].type = DayType.SDD;
    days["2025-09-07"].type = DayType.SDD;
    days["2025-09-08"].type = DayType.SDD;
    const metrics = calculateComplianceMetrics(days, "2025-09-01", "2025-09-20");
    expect(metrics.warnings.some((item) => item.includes("DH"))).toBe(true);
    expect(metrics.warnings.some((item) => item.includes("SDD"))).toBe(true);
  });

  test("跨年長假期應包含假期中的週末與假後星期六", () => {
    const days = createSchoolYearDays("2025-12-01", "2026-01-10");
    Object.values(days).forEach((day) => {
      day.type = DayType.Normal;
      day.countsAs190 = true;
    });
    const holidayDates = [
      "2025-12-20", "2025-12-21", "2025-12-22", "2025-12-23", "2025-12-24", "2025-12-25", "2025-12-26",
      "2025-12-27", "2025-12-28", "2025-12-29", "2025-12-30", "2025-12-31", "2026-01-01", "2026-01-02",
    ];
    for (const date of holidayDates) days[date].type = DayType.Holiday;

    // 假期長度 14 天，且應額外計入假期後第一個星期六（2026-01-03）
    expect(calculateSchoolHolidayQuota(days)).toBe(15);
  });

  test("PH 與 Holiday 重疊情境不應重複計算同一天", () => {
    const days = createSchoolYearDays("2026-02-10", "2026-02-25");
    Object.values(days).forEach((day) => {
      day.type = DayType.Normal;
      day.countsAs190 = true;
    });
    const longBlock = ["2026-02-12", "2026-02-13", "2026-02-14", "2026-02-15", "2026-02-16", "2026-02-17", "2026-02-18"];
    for (const date of longBlock) days[date].type = DayType.Holiday;
    days["2026-02-16"].type = DayType.PH;
    days["2026-02-17"].type = DayType.PH;

    // 7 天長假 + 假後星期六（2026-02-21） => 8
    expect(calculateSchoolHolidayQuota(days)).toBe(8);
  });

  test("中斷的假期不應被視為單一長達一星期區段", () => {
    const days = createSchoolYearDays("2026-04-01", "2026-04-20");
    Object.values(days).forEach((day) => {
      day.type = DayType.Normal;
      day.countsAs190 = true;
    });
    const holidayDates = [
      "2026-04-02", "2026-04-03", "2026-04-04", "2026-04-05",
      "2026-04-07", "2026-04-08", "2026-04-09", "2026-04-10",
    ];
    for (const date of holidayDates) days[date].type = DayType.Holiday;
    days["2026-04-06"].type = DayType.Normal; // 中斷一天上課日

    // 兩段各 4 天，不應觸發「長達一星期」加算假後星期六
    expect(calculateSchoolHolidayQuota(days)).toBe(8);
  });

  test("星期日公眾假期不計入 90 天配額", () => {
    const days = createSchoolYearDays("2026-01-01", "2026-01-10");
    Object.values(days).forEach((day) => {
      day.type = DayType.Normal;
      day.countsAs190 = true;
    });
    days["2026-01-04"].type = DayType.PH;
    const { countedDates, trace } = calculateSchoolHolidayQuotaWithTrace(days);
    expect(countedDates.has("2026-01-04")).toBe(false);
    expect(trace["2026-01-04"]?.included).toBe(false);
  });

  test("長假開始前被誤標假期的週末應自 90 天配額剔除", () => {
    const days = createSchoolYearDays("2026-03-05", "2026-03-22");
    Object.values(days).forEach((day) => {
      day.type = DayType.Normal;
      day.countsAs190 = true;
    });
    days["2026-03-08"].type = DayType.Holiday;
    days["2026-03-09"].type = DayType.Normal;
    for (let d = 10; d <= 16; d += 1) {
      const iso = `2026-03-${String(d).padStart(2, "0")}`;
      days[iso].type = DayType.Holiday;
    }
    const { countedDates, trace } = calculateSchoolHolidayQuotaWithTrace(days);
    expect(countedDates.has("2026-03-08")).toBe(false);
    expect(countedDates.has("2026-03-09")).toBe(false);
    expect(trace["2026-03-08"]?.included).toBe(false);
  });
});
