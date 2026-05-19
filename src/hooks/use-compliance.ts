import { useMemo } from "react";
import { getDay, parseISO } from "date-fns";
import { DayType, SchoolDayMap } from "@/types/school-day";
import { calculateSchoolHolidayQuotaWithTrace } from "@/lib/holiday-quota";
import { buildSsForSchoolYear, SsSchoolYearSummary } from "@/lib/ss-school-year";

export type { SsSchoolYearSummary };

export interface ComplianceMetrics {
  schoolDays: number;
  schoolHolidayQuota: number;
  dhDays: number;
  sddDays: number;
  ssSchoolYear: SsSchoolYearSummary;
  warnings: string[];
}

const nonSchoolTypes = new Set<DayType>([DayType.Holiday, DayType.PH, DayType.DH, DayType.SDD]);

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
    else if (weekday === 0 || weekday === 6) weekendOnly += 1;

    if (day.countsAs190 && (nonSchoolTypes.has(day.type) || day.isLessonSuspended || weekday === 0 || weekday === 6)) {
      countsAs190Bonus += 1;
    }
  }

  const schoolDays = allDays.length - baseNonSchool - weekendOnly + countsAs190Bonus;
  const ssSchoolYear = buildSsForSchoolYear(days, countedDates, schoolYearStart, schoolYearEnd);
  const warnings: string[] = [];
  if (schoolDays < 190) warnings.push("警告：上課日數不足，請取消部分假期。");
  if (holidayQuota > 90) warnings.push("警告：School Holidays 超過 90 天上限。");
  if (dhDays > 3) warnings.push("警告：自行決定假期（DH）超過 3 天上限。");
  if (sddDays > 3) warnings.push("警告：教師發展日（SDD）超過 3 天上限。");
  if (ssSchoolYear.count > ssSchoolYear.cap) {
    warnings.push(
      `警告：${ssSchoolYear.label} S&S（不計入 90 天之星期六／日，不含 PH）為 ${ssSchoolYear.count} 天，超過學年上限 ${ssSchoolYear.cap} 天。`,
    );
  }

  return { schoolDays, schoolHolidayQuota: holidayQuota, dhDays, sddDays, ssSchoolYear, warnings };
}

export function useCompliance(days: SchoolDayMap, schoolYearStart: string, schoolYearEnd: string): ComplianceMetrics {
  return useMemo(
    () => calculateComplianceMetrics(days, schoolYearStart, schoolYearEnd),
    [days, schoolYearStart, schoolYearEnd],
  );
}
