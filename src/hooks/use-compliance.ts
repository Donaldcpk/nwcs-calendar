import { useMemo } from "react";
import { getDay, isLeapYear, parseISO } from "date-fns";
import { DayType, SchoolDayMap } from "@/types/school-day";
import { calculateSchoolHolidayQuotaWithTrace } from "@/lib/holiday-quota";

export interface SsYearRow {
  year: number;
  count: number;
  cap: number;
}

export interface ComplianceMetrics {
  schoolDays: number;
  schoolHolidayQuota: number;
  dhDays: number;
  sddDays: number;
  ssByYear: SsYearRow[];
  warnings: string[];
}

const nonSchoolTypes = new Set<DayType>([DayType.Holiday, DayType.PH, DayType.DH, DayType.SDD]);

function buildSsByYear(days: SchoolDayMap, countedDates: ReadonlySet<string>): SsYearRow[] {
  const byYear = new Map<number, number>();
  const years = new Set<number>();
  for (const date of Object.keys(days)) {
    const y = parseISO(date).getFullYear();
    years.add(y);
    const weekday = getDay(parseISO(date));
    if (weekday !== 0 && weekday !== 6) continue;
    if (countedDates.has(date)) continue;
    byYear.set(y, (byYear.get(y) ?? 0) + 1);
  }
  const rows: SsYearRow[] = [];
  for (const year of Array.from(years).sort((a, b) => a - b)) {
    const cap = isLeapYear(year) ? 80 : 79;
    rows.push({ year, count: byYear.get(year) ?? 0, cap });
  }
  return rows;
}

export function calculateComplianceMetrics(days: SchoolDayMap): ComplianceMetrics {
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
  const ssByYear = buildSsByYear(days, countedDates);
  const warnings: string[] = [];
  if (schoolDays < 190) warnings.push("警告：上課日數不足，請取消部分假期。");
  if (holidayQuota > 90) warnings.push("警告：School Holidays 超過 90 天上限。");
  if (dhDays > 3) warnings.push("警告：自行決定假期（DH）超過 3 天上限。");
  if (sddDays > 3) warnings.push("警告：教師發展日（SDD）超過 3 天上限。");
  for (const row of ssByYear) {
    if (row.count > row.cap) {
      warnings.push(
        `警告：${row.year} 年 S&S（不計入 90 天之星期六／日）為 ${row.count} 天，超過該曆年上限 ${row.cap} 天。`,
      );
    }
  }

  return { schoolDays, schoolHolidayQuota: holidayQuota, dhDays, sddDays, ssByYear, warnings };
}

export function useCompliance(days: SchoolDayMap): ComplianceMetrics {
  return useMemo(() => calculateComplianceMetrics(days), [days]);
}
