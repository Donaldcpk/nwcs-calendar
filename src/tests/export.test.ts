import { describe, expect, test } from "vitest";
import { buildWebSamsCsv } from "@/lib/export-websams";
import { ExportMapping } from "@/types/export-mapping";
import { DayType, SchoolDayMap } from "@/types/school-day";

describe("buildWebSamsCsv", () => {
  test("應使用自訂 mapping 並保持 CSV 欄位對齊", () => {
    const days: SchoolDayMap = {
      "2026-09-01": {
        date: "2026-09-01",
        type: DayType.Normal,
        cycleDay: 1,
        isLessonSuspended: false,
        countsAs190: true,
        isLocked: false,
        events: [],
      },
      "2026-09-02": {
        date: "2026-09-02",
        type: DayType.PH,
        cycleDay: null,
        isLessonSuspended: true,
        countsAs190: false,
        isLocked: false,
        events: ["National Day Holiday"],
      },
      "2026-09-03": {
        date: "2026-09-03",
        type: DayType.Exam,
        cycleDay: 2,
        isLessonSuspended: false,
        countsAs190: true,
        isLocked: false,
        events: ["Mid-term Exam"],
      },
    };

    const mapping: ExportMapping = {
      date: "Date",
      dayType: "DayType",
      cycleDay: "CycleDay",
      suspendLessons: "SuspendLessons",
      countsAs190: "CountsAs190",
      locked: "Locked",
      events: "School_Events_2026",
    };

    const csv = buildWebSamsCsv(days, mapping);
    const lines = csv.split("\n");

    expect(lines[0]).toContain("School_Events_2026");
    expect(lines[1].split(",").length).toBe(lines[0].split(",").length);
    expect(lines[2]).toContain("PH");
    expect(lines[2]).toContain("National Day Holiday");
  });
});
