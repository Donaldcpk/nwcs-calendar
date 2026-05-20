import { describe, expect, test } from "vitest";
import { shouldShowInPrincipalAudit } from "@/lib/principal-audit";
import { DayType } from "@/types/school-day";

describe("principal-audit", () => {
  test("空白 SH 不顯示；有活動的 SH 顯示", () => {
    expect(
      shouldShowInPrincipalAudit({
        date: "2026-09-17",
        type: DayType.SH,
        cycleDay: null,
        isLessonSuspended: false,
        countsAs190: false,
        isLocked: false,
        events: [],
      }),
    ).toBe(false);

    expect(
      shouldShowInPrincipalAudit({
        date: "2026-09-17",
        type: DayType.SH,
        cycleDay: null,
        isLessonSuspended: false,
        countsAs190: false,
        isLocked: false,
        events: ["運動會補假"],
      }),
    ).toBe(true);
  });

  test("PH 無活動仍顯示", () => {
    expect(
      shouldShowInPrincipalAudit({
        date: "2026-10-01",
        type: DayType.PH,
        cycleDay: null,
        isLessonSuspended: false,
        countsAs190: false,
        isLocked: false,
        events: [],
      }),
    ).toBe(true);
  });
});
