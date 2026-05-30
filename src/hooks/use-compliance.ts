import { useMemo } from "react";
import { getDay, parseISO } from "date-fns";
import { DayType, SchoolDayMap } from "@/types/school-day";
import { calculateSchoolHolidayQuotaWithTrace } from "@/lib/holiday-quota";
import { buildSsForSchoolYear, countUnmarkedSsWeekends, SsSchoolYearSummary } from "@/lib/ss-school-year";

export type { SsSchoolYearSummary };

export interface ComplianceMetrics {
  schoolDays: number;
  schoolHolidayQuota: number;
  dhDays: number;
  sddDays: number;
  ssSchoolYear: SsSchoolYearSummary;
  warnings: string[];
}

const nonSchoolTypes = new Set<DayType>([DayType.SH, DayType.Holiday, DayType.PH, DayType.DH, DayType.SDD]);

function isWeekendOnlyDay(type: DayType, weekday: number): boolean {
  if (type === DayType.SS) return true;
  return (weekday === 0 || weekday === 6) && type === DayType.Normal;
}

export function calculateComplianceMetrics(
  days: SchoolDayMap,
  schoolYearStart: string,
  schoolYearEnd: string,
): ComplianceMetrics {
  const allDays = Object.values(days);
  const { quota: holidayQuota, countedDates } = calculateSchoolHolidayQuotaWithTrace(days);
  let dhDays = 0;
  let sddDays = 0;
  let baseNonSchool = 0;
  let weekendOnly = 0;
  let countsAs190Bonus = 0;

  for (const day of allDays) {
    const weekday = getDay(parseISO(day.date));
    if (day.type === DayType.DH) dhDays += 1;
    if (day.type === DayType.SDD) sddDays += 1;

    if (nonSchoolTypes.has(day.type)) baseNonSchool += 1;
    else if (isWeekendOnlyDay(day.type, weekday)) weekendOnly += 1;

    if (day.countsAs190 && (nonSchoolTypes.has(day.type) || day.isLessonSuspended || weekday === 0 || weekday === 6)) {
      countsAs190Bonus += 1;
    }
  }

  const schoolDays = allDays.length - baseNonSchool - weekendOnly + countsAs190Bonus;
  const ssSchoolYear = buildSsForSchoolYear(days, countedDates, schoolYearStart, schoolYearEnd);
  const unmarkedSs = countUnmarkedSsWeekends(days, countedDates, schoolYearStart, schoolYearEnd);
  const warnings: string[] = [];
  if (schoolDays < 190) warnings.push("警告：上課日數不足，請取消部分假期。");
  if (holidayQuota > 90) warnings.push("警告：SH（PH+SH 配額）超過 90 天上限。");
  if (dhDays > 3) warnings.push("警告：自行決定假期（DH）超過 3 天上限。");
  if (sddDays > 3) warnings.push("警告：教師發展日（SDD）超過 3 天上限。");
  if (ssSchoolYear.count > ssSchoolYear.cap) {
    warnings.push(
      `警告：${ssSchoolYear.label} S&S（不計入 90 天之星期六／日，不含 PH）為 ${ssSchoolYear.count} 天，超過學年上限 ${ssSchoolYear.cap} 天。`,
    );
  }
  if (unmarkedSs > 0) {
    warnings.push(`提示：有 ${unmarkedSs} 個週末日仍為 Normal，建議標記為 S&S。`);
  }

  return { schoolDays, schoolHolidayQuota: holidayQuota, dhDays, sddDays, ssSchoolYear, warnings };
}

export function useCompliance(days: SchoolDayMap, schoolYearStart: string, schoolYearEnd: string): ComplianceMetrics {
  return useMemo(
    () => calculateComplianceMetrics(days, schoolYearStart, schoolYearEnd),
    [days, schoolYearStart, schoolYearEnd],
  );
}
