import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, test } from "vitest";
import { getSdec2026_2027Catalog } from "@/lib/sdec-2026-2027-catalog";
import { parseSdecMonthlyCsv } from "@/lib/parse-sdec-monthly-csv";

describe("parse-sdec-monthly-csv", () => {
  test("內建目錄與 docs/data CSV 一致", () => {
    const csvPath = join(process.cwd(), "docs", "data", "MonthlyCalendar_2026_2027_SDEC_event.csv");
    const fromFile = parseSdecMonthlyCsv(readFileSync(csvPath, "utf-8"));
    const builtin = getSdec2026_2027Catalog();

    expect(fromFile.activityCatalogRows.length).toBe(builtin.activityCatalogRows.length);
    expect(fromFile.schoolHolidayRanges.length).toBe(builtin.schoolHolidayRanges.length);
    expect(fromFile.publicHolidays.length).toBe(builtin.publicHolidays.length);
    expect(fromFile.teacherDevelopmentDays.length).toBe(3);
    expect(fromFile.schoolEventRanges.some((r) => r.name === "開學日" && r.start === "2026-09-01")).toBe(true);
  });

  test("活動一覽含 PH/SH/活動類別", () => {
    const catalog = getSdec2026_2027Catalog();
    const ph = catalog.activityCatalogRows.find((r) => r.活動名稱 === "國慶日");
    expect(ph?.類別).toContain("PH");
    const sh = catalog.activityCatalogRows.find((r) => r.活動名稱 === "運動會補假");
    expect(sh?.類別).toContain("SH");
  });
});
