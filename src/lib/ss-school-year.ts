import { getDay, isLeapYear, parseISO } from "date-fns";
import { DayType, SchoolDayMap } from "@/types/school-day";

export interface SsSchoolYearSummary {
  label: string;
  count: number;
  cap: number;
}

/** 學年內若包含 2 月 29 日則 S&S 上限 80，否則 79。 */
export function schoolYearSsCap(schoolYearStart: string, schoolYearEnd: string): number {
  const start = parseISO(schoolYearStart);
  const end = parseISO(schoolYearEnd);
  for (let year = start.getFullYear(); year <= end.getFullYear(); year += 1) {
    if (!isLeapYear(year)) continue;
    const feb29 = parseISO(`${year}-02-29`);
    if (feb29 >= start && feb29 <= end) return 80;
  }
  return 79;
}

export function formatSchoolYearLabel(schoolYearStart: string, schoolYearEnd: string): string {
  const startY = schoolYearStart.slice(0, 4);
  const endY = schoolYearEnd.slice(2, 4);
  return `${startY}-${endY}學年`;
}

/**
 * S&S：學年內未計入 90 天配額的週六／日（統一以學年計，不按曆年拆分）。
 * 公眾假期（PH）與 S&S 互斥：屬 PH 的週末不計入 S&S。
 */
export function buildSsForSchoolYear(
  days: SchoolDayMap,
  countedDates: ReadonlySet<string>,
  schoolYearStart: string,
  schoolYearEnd: string,
): SsSchoolYearSummary {
  let count = 0;
  for (const date of Object.keys(days).sort()) {
    if (date < schoolYearStart || date > schoolYearEnd) continue;
    const weekday = getDay(parseISO(date));
    if (weekday !== 0 && weekday !== 6) continue;
    if (countedDates.has(date)) continue;
    const day = days[date];
    if (day?.type === DayType.PH) continue;
    count += 1;
  }

  return {
    label: formatSchoolYearLabel(schoolYearStart, schoolYearEnd),
    count,
    cap: schoolYearSsCap(schoolYearStart, schoolYearEnd),
  };
}
