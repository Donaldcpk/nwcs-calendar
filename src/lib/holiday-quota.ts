import { addDays, compareAsc, formatISO, getDay, parseISO, subDays } from "date-fns";
import { DayType, SchoolDayMap } from "@/types/school-day";

const holidayTypes = new Set<DayType>([DayType.PH, DayType.Holiday]);

function isHolidayLike(type: DayType): boolean {
  return holidayTypes.has(type);
}

export interface HolidayTrace {
  included: boolean;
  reason: string;
}

/** 長假開始前、緊貼開學日前的「最後一個完整星期六、日」對（教育局指引乙項） */
function getPreLongBreakWeekendPair(startIso: string): { sat: string; sun: string } | null {
  const start = parseISO(startIso);
  let bestSat: Date | null = null;
  for (let i = 1; i <= 14; i++) {
    const d = subDays(start, i);
    if (getDay(d) !== 6) continue;
    const sunD = addDays(d, 1);
    if (sunD < start && (!bestSat || d > bestSat)) {
      bestSat = d;
    }
  }
  if (!bestSat) return null;
  const sun = addDays(bestSat, 1);
  return {
    sat: formatISO(bestSat, { representation: "date" }),
    sun: formatISO(sun, { representation: "date" }),
  };
}

export function calculateSchoolHolidayQuotaWithTrace(days: SchoolDayMap): {
  quota: number;
  trace: Record<string, HolidayTrace>;
  countedDates: ReadonlySet<string>;
} {
  const sorted = Object.keys(days).sort(compareAsc);
  const counted = new Set<string>();
  const trace: Record<string, HolidayTrace> = {};

  for (const date of sorted) {
    const day = days[date];
    if (!day || !isHolidayLike(day.type)) continue;

    if (day.type === DayType.PH && getDay(parseISO(date)) === 0) {
      trace[date] = { included: false, reason: "公眾假期落於星期日，依指引不計入 90 天學校假期配額" };
      continue;
    }

    counted.add(date);
    trace[date] = { included: true, reason: "假期或公眾假期，直接計入 90 天配額" };
  }

  let blockStart: string | null = null;
  let previous: string | null = null;

  const flush = () => {
    if (!blockStart || !previous) return;
    const start = parseISO(blockStart);
    const end = parseISO(previous);
    const length = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;

    if (length >= 7) {
      for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
        const wd = getDay(cursor);
        if (wd !== 0 && wd !== 6) continue;
        const iso = formatISO(cursor, { representation: "date" });
        const innerDay = days[iso];
        if (innerDay?.type === DayType.PH && wd === 0) {
          trace[iso] = {
            included: false,
            reason: "公眾假期落於星期日，依指引不計入 90 天學校假期配額（長假內亦然）",
          };
          counted.delete(iso);
          continue;
        }
        counted.add(iso);
        trace[iso] = {
          included: true,
          reason: "長達一星期或以上學校假期內的星期六／星期日，計入 90 天配額",
        };
      }

      const pre = getPreLongBreakWeekendPair(blockStart);
      if (pre) {
        for (const iso of [pre.sat, pre.sun]) {
          counted.delete(iso);
          trace[iso] = {
            included: false,
            reason: "長假開始前的星期六及星期日（S&S 相關），不計入 90 天配額",
          };
        }
      }

      const nextSaturday = addDays(end, getDay(end) === 6 ? 0 : (6 - getDay(end) + 7) % 7);
      const nextSatIso = formatISO(nextSaturday, { representation: "date" });
      counted.add(nextSatIso);
      trace[nextSatIso] = {
        included: true,
        reason: "長達一星期或以上假期後的星期六，計入 90 天配額",
      };

      const nextDay = addDays(end, 1);
      if (getDay(nextDay) === 0) {
        const nextDayIso = formatISO(nextDay, { representation: "date" });
        counted.delete(nextDayIso);
        trace[nextDayIso] = {
          included: false,
          reason: "假期後的星期日（S&S 相關），不計入 90 天配額",
        };
      }
    }

    blockStart = null;
    previous = null;
  };

  for (const date of sorted) {
    const day = days[date];
    if (!day || !isHolidayLike(day.type)) {
      flush();
      continue;
    }

    if (!blockStart) {
      blockStart = date;
      previous = date;
      continue;
    }

    const prevDate = parseISO(previous!);
    const current = parseISO(date);
    const isContinuous = Math.floor((current.getTime() - prevDate.getTime()) / 86400000) === 1;

    if (isContinuous) previous = date;
    else {
      flush();
      blockStart = date;
      previous = date;
    }
  }

  flush();
  return { quota: counted.size, trace, countedDates: counted };
}

export function calculateSchoolHolidayQuota(days: SchoolDayMap): number {
  return calculateSchoolHolidayQuotaWithTrace(days).quota;
}
