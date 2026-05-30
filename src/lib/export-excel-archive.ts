import * as XLSX from "xlsx";
import { calculateComplianceMetrics } from "@/hooks/use-compliance";
import { calculateSchoolHolidayQuotaWithTrace } from "@/lib/holiday-quota";
import { dayTypeLabel } from "@/lib/day-type-label";
import { countByTypeForMonth } from "@/lib/month-type-stats";
import { parseLocalDate } from "@/lib/parse-local-date";
import { format } from "date-fns";
import { sdecActivityCatalogRows } from "@/lib/sdec-2026-2027-catalog";
import { SchoolDayMap } from "@/types/school-day";

function uniqueMonthKeys(days: SchoolDayMap): string[] {
  const keys = new Set<string>();
  for (const day of Object.values(days)) {
    keys.add(format(parseLocalDate(day.date), "yyyy-MM"));
  }
  return Array.from(keys).sort();
}

export function downloadSchoolYearExcelArchive(
  days: SchoolDayMap,
  schoolYearStart: string,
  schoolYearEnd: string,
  filename?: string,
): void {
  const detailRows = Object.values(days)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((day) => ({
      日期: day.date,
      類型: dayTypeLabel(day.type),
      循環日: day.cycleDay ?? "",
      活動: day.events.join("; "),
      停課: day.isLessonSuspended ? "Y" : "N",
      計入190: day.countsAs190 ? "Y" : "N",
      鎖定: day.isLocked ? "Y" : "N",
    }));

  const monthKeys = uniqueMonthKeys(days);
  const { countedDates } = calculateSchoolHolidayQuotaWithTrace(days);
  const monthStatRows = monthKeys.flatMap((key) => {
    const summary = countByTypeForMonth(days, key, countedDates);
    const header = { 月份: summary.monthLabel, 類型: "—", 日數: summary.totalDays };
    const body = summary.rows.map((row) => ({
      月份: summary.monthLabel,
      類型: row.label,
      日數: row.count,
    }));
    return [header, ...body, { 月份: "", 類型: "", 日數: "" }];
  });

  const metrics = calculateComplianceMetrics(days, schoolYearStart, schoolYearEnd);
  const summaryRows = [
    { 項目: "S1-S3 上課日數", 數值: metrics.schoolDays, 目標: "≥ 190" },
    { 項目: "SH（PH+SH 配額）", 數值: metrics.schoolHolidayQuota, 目標: "≤ 90" },
    { 項目: "自行決定假期 DH", 數值: metrics.dhDays, 目標: "≤ 3" },
    { 項目: "教師發展日 SDD", 數值: metrics.sddDays, 目標: "≤ 3" },
    {
      項目: `${metrics.ssSchoolYear.label} S&S`,
      數值: metrics.ssSchoolYear.count,
      目標: `≤ ${metrics.ssSchoolYear.cap}`,
    },
    ...metrics.warnings.map((w) => ({ 項目: "警告", 數值: w, 目標: "" })),
  ];

  const workbook = XLSX.utils.book_new();
  const activityCatalogRows = sdecActivityCatalogRows.map((row) => ({
    活動名稱: row.活動名稱,
    開始日期: row.開始日期,
    結束日期: row.結束日期,
    類別: row.類別,
  }));

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(detailRows), "校曆明細");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(activityCatalogRows), "活動一覽");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(monthStatRows), "每月統計");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "學年摘要");

  const label = `${schoolYearStart.slice(0, 4)}-${schoolYearEnd.slice(2, 4)}`;
  XLSX.writeFile(workbook, filename ?? `NWCS_${label}_校曆存檔.xlsx`);
}
