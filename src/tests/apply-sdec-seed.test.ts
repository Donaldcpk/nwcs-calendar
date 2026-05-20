import { describe, expect, test } from "vitest";
import { applySdec2026_2027Seed } from "@/lib/apply-sdec-seed";
import { createSchoolYearDays } from "@/lib/calendar-init";
import { DayType } from "@/types/school-day";

describe("apply-sdec-seed", () => {
  test("開學日與教師發展日、運動會補假", () => {
    const base = createSchoolYearDays("2026-09-01", "2026-09-30");
    const { days } = applySdec2026_2027Seed(base, true);

    expect(days["2026-09-01"].events).toContain("開學日");
    expect(days["2026-09-17"].type).toBe(DayType.Holiday);
    expect(days["2026-09-18"].type).toBe(DayType.SDD);
    expect(days["2026-09-26"].type).toBe(DayType.PH);
  });
});
