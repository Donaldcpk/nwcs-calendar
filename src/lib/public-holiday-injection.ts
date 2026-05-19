import { DayType, SchoolDayMap } from "@/types/school-day";

export interface PublicHolidayEvent {
  date: string;
  summary: string;
}

export function injectPublicHolidays(
  days: SchoolDayMap,
  holidays: PublicHolidayEvent[],
  overwriteExisting: boolean,
): SchoolDayMap {
  const next: SchoolDayMap = { ...days };

  for (const holiday of holidays) {
    const current = next[holiday.date];
    if (!current) continue;
    if (!overwriteExisting && (current.isLocked || current.type !== DayType.Normal || current.events.length > 0)) {
      continue;
    }

    next[holiday.date] = {
      ...current,
      type: DayType.PH,
      countsAs190: false,
      events: overwriteExisting ? [holiday.summary] : Array.from(new Set([...current.events, holiday.summary])),
    };
  }

  return next;
}
