import {
  sdecPublicHolidays,
  sdecSchoolEventRanges,
  sdecSchoolHolidayRanges,
  sdecTeacherDevelopmentDays,
} from "@/lib/sdec-2026-2027-seed";
import { eachIsoDateInRange } from "@/lib/parse-local-date";
import { DayType, SchoolDay, SchoolDayMap } from "@/types/school-day";

function mergeEvents(existing: string[], additions: string[]): string[] {
  return Array.from(new Set([...existing, ...additions]));
}

function addEvent(day: SchoolDay, eventName: string, overwriteExisting: boolean): SchoolDay {
  if (!overwriteExisting && day.isLocked) return day;
  if (!overwriteExisting && day.events.includes(eventName)) return day;
  return { ...day, events: mergeEvents(day.events, [eventName]) };
}

export function applySdec2026_2027Seed(days: SchoolDayMap, overwriteExisting: boolean): { days: SchoolDayMap; touched: number } {
  const next: SchoolDayMap = { ...days };
  const touchedDates = new Set<string>();

  const touch = (date: string, updater: (day: SchoolDay) => SchoolDay) => {
    const current = next[date];
    if (!current) return;
    const updated = updater(current);
    if (updated !== current) {
      next[date] = updated;
      touchedDates.add(date);
    }
  };

  for (const block of sdecSchoolHolidayRanges) {
    for (const date of eachIsoDateInRange(block.start, block.end)) {
      touch(date, (day) => {
        if (!overwriteExisting && day.isLocked) return day;
        if (!overwriteExisting && day.type !== DayType.Normal && day.type !== DayType.Holiday) return day;
        return {
          ...day,
          type: DayType.Holiday,
          countsAs190: false,
          events: mergeEvents(overwriteExisting ? [] : day.events, [block.name]),
        };
      });
    }
  }

  for (const ph of sdecPublicHolidays) {
    touch(ph.date, (day) => {
      if (!overwriteExisting && day.isLocked) return day;
      if (!overwriteExisting && day.type !== DayType.Normal && day.type !== DayType.PH) return day;
      return {
        ...day,
        type: DayType.PH,
        countsAs190: false,
        events: mergeEvents(overwriteExisting ? [] : day.events, [ph.name]),
      };
    });
  }

  for (const sdd of sdecTeacherDevelopmentDays) {
    touch(sdd.date, (day) => {
      if (!overwriteExisting && day.isLocked) return day;
      return {
        ...day,
        type: DayType.SDD,
        countsAs190: false,
        events: mergeEvents(overwriteExisting ? [] : day.events, sdd.events ?? ["教師發展日"]),
      };
    });
  }

  for (const range of sdecSchoolEventRanges) {
    for (const date of eachIsoDateInRange(range.start, range.end)) {
      touch(date, (day) => addEvent(day, range.name, overwriteExisting));
    }
  }

  return { days: next, touched: touchedDates.size };
}
