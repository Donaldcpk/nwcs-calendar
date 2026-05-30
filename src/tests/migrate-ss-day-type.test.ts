import { describe, expect, test } from "vitest";
import { createSchoolYearDays } from "@/lib/calendar-init";
import { migrateDayToSsIfNeeded, migrateSchoolDayMapToSs } from "@/lib/migrate-ss-day-type";
import { DayType } from "@/types/school-day";

describe("migrate-ss-day-type", () => {
  test("週末 Normal 應遷移為 S&S", () => {
    const days = createSchoolYearDays("2026-09-01", "2026-09-07");
    days["2026-09-05"].type = DayType.Normal;
    const migrated = migrateDayToSsIfNeeded(days["2026-09-05"]);
    expect(migrated.type).toBe(DayType.SS);
    expect(migrated.countsAs190).toBe(false);
  });

  test("平日 Normal 不應遷移", () => {
    const days = createSchoolYearDays("2026-09-01", "2026-09-07");
    const migrated = migrateDayToSsIfNeeded(days["2026-09-01"]);
    expect(migrated.type).toBe(DayType.Normal);
  });

  test("週末 PH 無活動應遷移為 S&S", () => {
    const day = {
      date: "2026-09-06",
      type: DayType.PH,
      cycleDay: null,
      isLessonSuspended: false,
      countsAs190: false,
      isLocked: false,
      events: [],
    };
    const migrated = migrateDayToSsIfNeeded(day);
    expect(migrated.type).toBe(DayType.SS);
  });

  test("週末 PH 有活動標籤應保留 PH", () => {
    const day = {
      date: "2026-09-06",
      type: DayType.PH,
      cycleDay: null,
      isLessonSuspended: false,
      countsAs190: false,
      isLocked: false,
      events: ["國慶日"],
    };
    const migrated = migrateDayToSsIfNeeded(day);
    expect(migrated.type).toBe(DayType.PH);
  });

  test("migrateSchoolDayMapToSs 批次遷移週末", () => {
    const days = createSchoolYearDays("2026-09-01", "2026-09-14");
    days["2026-09-01"].type = DayType.Normal;
    days["2026-09-06"].type = DayType.Normal;
    const migrated = migrateSchoolDayMapToSs(days);
    expect(migrated["2026-09-01"].type).toBe(DayType.Normal);
    expect(migrated["2026-09-06"].type).toBe(DayType.SS);
  });
});
