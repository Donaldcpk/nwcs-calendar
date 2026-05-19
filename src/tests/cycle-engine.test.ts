import { describe, expect, test } from "vitest";
import { createSchoolYearDays } from "@/lib/calendar-init";
import { recalculateCycles } from "@/lib/cycle-engine";
import { DayType } from "@/types/school-day";

describe("recalculateCycles", () => {
  test("應跳過停課日並順延 cycle", () => {
    const days = createSchoolYearDays("2025-09-01", "2025-09-10");
    days["2025-09-03"].isLessonSuspended = true;
    const result = recalculateCycles(days, 6, "2025-09-01", "2025-09-01");
    expect(result["2025-09-01"].cycleDay).toBe(1);
    expect(result["2025-09-02"].cycleDay).toBe(2);
    expect(result["2025-09-03"].cycleDay).toBeNull();
    expect(result["2025-09-04"].cycleDay).toBe(3);
  });

  test("鎖定日應保留自訂 cycle", () => {
    const days = createSchoolYearDays("2025-09-01", "2025-09-08");
    days["2025-09-04"].isLocked = true;
    days["2025-09-04"].cycleDay = 6;
    days["2025-09-03"].type = DayType.Holiday;
    const result = recalculateCycles(days, 6, "2025-09-01", "2025-09-01");
    expect(result["2025-09-04"].cycleDay).toBe(6);
    expect(result["2025-09-05"].cycleDay).toBe(1);
  });
});
