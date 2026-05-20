import { DayType, SchoolDay, SchoolDayMap } from "@/types/school-day";

/** 將舊版 Holiday 正規化為 SH（學校假期） */
export function normalizeDayType(type: DayType): DayType {
  if (type === DayType.Holiday) return DayType.SH;
  return type;
}

export function normalizeSchoolDay(day: SchoolDay): SchoolDay {
  const type = normalizeDayType(day.type);
  if (type === day.type) return day;
  return { ...day, type };
}

export function normalizeSchoolDayMap(days: SchoolDayMap): SchoolDayMap {
  const next: SchoolDayMap = {};
  for (const [date, day] of Object.entries(days)) {
    next[date] = normalizeSchoolDay(day);
  }
  return next;
}
