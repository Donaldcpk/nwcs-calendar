import { describe, expect, test } from "vitest";
import { createSchoolYearDays } from "@/lib/calendar-init";
import { calculateComplianceMetrics } from "@/hooks/use-compliance";
import { DayType } from "@/types/school-day";

describe("batch type change countsAs190", () => {
  test("批量設為 SH 應自動清除 countsAs190 並減少 190 日數", () => {
    const days = createSchoolYearDays("2026-09-01", "2026-09-10");
    Object.values(days).forEach((day) => {
      day.type = DayType.Normal;
      day.countsAs190 = true;
    });
    const before = calculateComplianceMetrics(days, "2026-09-01", "2026-09-10").schoolDays;

    days["2026-09-01"].type = DayType.SH;
    days["2026-09-01"].countsAs190 = false;
    days["2026-09-02"].type = DayType.SH;
    days["2026-09-02"].countsAs190 = false;

    const after = calculateComplianceMetrics(days, "2026-09-01", "2026-09-10").schoolDays;
    expect(after).toBe(before - 2);
  });

  test("SH 若仍保留 countsAs190=true 會錯誤計入 190（回歸驗證）", () => {
    const days = createSchoolYearDays("2026-09-01", "2026-09-05");
    Object.values(days).forEach((day) => {
      day.type = DayType.Normal;
      day.countsAs190 = true;
    });
    const before = calculateComplianceMetrics(days, "2026-09-01", "2026-09-05").schoolDays;

    days["2026-09-01"].type = DayType.SH;
    days["2026-09-01"].countsAs190 = true;

    const buggy = calculateComplianceMetrics(days, "2026-09-01", "2026-09-05").schoolDays;
    expect(buggy).toBe(before);
  });
});
