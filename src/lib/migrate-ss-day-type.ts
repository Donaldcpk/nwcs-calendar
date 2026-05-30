import { getDay, parseISO } from "date-fns";
import { normalizeDayType } from "@/lib/normalize-day-types";
import { DayType, SchoolDay, SchoolDayMap } from "@/types/school-day";

function isWeekendDate(date: string): boolean {
  const weekday = getDay(parseISO(date));
  return weekday === 0 || weekday === 6;
}

function shouldMigrateToSs(day: SchoolDay): boolean {
  const type = normalizeDayType(day.type);
  if (type === DayType.SS) return false;
  if (!isWeekendDate(day.date)) return false;

  if (type === DayType.Normal) return true;

  if (type === DayType.PH) {
    return day.events.length === 0;
  }

  return false;
}

export function migrateDayToSsIfNeeded(day: SchoolDay): SchoolDay {
  if (!shouldMigrateToSs(day)) return day;
  return {
    ...day,
    type: DayType.SS,
    countsAs190: false,
  };
}

export function migrateSchoolDayMapToSs(days: SchoolDayMap): SchoolDayMap {
  const next: SchoolDayMap = {};
  for (const [date, day] of Object.entries(days)) {
    next[date] = migrateDayToSsIfNeeded(day);
  }
  return next;
}
