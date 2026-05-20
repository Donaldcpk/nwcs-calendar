import { SdecParsedCatalog } from "@/lib/parse-sdec-monthly-csv";
import { getSdec2026_2027Catalog } from "@/lib/sdec-2026-2027-catalog";
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

function applyCatalog(
  days: SchoolDayMap,
  catalog: SdecParsedCatalog,
  overwriteExisting: boolean,
): { days: SchoolDayMap; touched: number } {
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

  for (const block of catalog.schoolHolidayRanges) {
    for (const date of eachIsoDateInRange(block.start, block.end)) {
      touch(date, (day) => {
        if (!overwriteExisting && day.isLocked) return day;
        if (!overwriteExisting && day.type !== DayType.Normal && day.type !== DayType.SH && day.type !== DayType.Holiday) {
          return day;
        }
        return {
          ...day,
          type: DayType.SH,
          countsAs190: false,
          events: mergeEvents(overwriteExisting ? [] : day.events, [block.name]),
        };
      });
    }
  }

  for (const ph of catalog.publicHolidays) {
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

  for (const sdd of catalog.teacherDevelopmentDays) {
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

  for (const range of catalog.schoolEventRanges) {
    for (const date of eachIsoDateInRange(range.start, range.end)) {
      touch(date, (day) => addEvent(day, range.name, overwriteExisting));
    }
  }

  return { days: next, touched: touchedDates.size };
}

export function applySdec2026_2027Seed(days: SchoolDayMap, overwriteExisting: boolean): { days: SchoolDayMap; touched: number } {
  return applyCatalog(days, getSdec2026_2027Catalog(), overwriteExisting);
}

export function applySdecCatalog(days: SchoolDayMap, catalog: SdecParsedCatalog, overwriteExisting: boolean): { days: SchoolDayMap; touched: number } {
  return applyCatalog(days, catalog, overwriteExisting);
}
