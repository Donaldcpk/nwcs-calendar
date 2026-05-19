import { describe, expect, test } from "vitest";
import { createSchoolYearDays } from "@/lib/calendar-init";
import { injectPublicHolidays } from "@/lib/public-holiday-injection";
import { DayType } from "@/types/school-day";

describe("injectPublicHolidays", () => {
  test("merge without overwrite 應保留 locked 與既有事件", () => {
    const days = createSchoolYearDays("2026-09-01", "2026-12-31");
    days["2026-10-01"].type = DayType.Normal;
    days["2026-10-01"].isLocked = true;
    days["2026-10-01"].events = ["特別補課"];

    const result = injectPublicHolidays(
      days,
      [
        { date: "2026-10-01", summary: "National Day" },
        { date: "2026-12-25", summary: "Christmas Day" },
      ],
      false,
    );

    expect(result["2026-10-01"].type).toBe(DayType.Normal);
    expect(result["2026-10-01"].events).toEqual(["特別補課"]);
    expect(result["2026-12-25"].type).toBe(DayType.PH);
  });
});
