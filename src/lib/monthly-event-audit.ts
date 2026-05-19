import { format, parseISO } from "date-fns";
import { badgeByType, eventListAccent } from "@/lib/calendar-day-colors";
import { DayType, SchoolDay } from "@/types/school-day";

export interface MonthlyEventSummaryRow {
  activityName: string;
  displayLine: string;
  accentClass: string;
}

function mergeConsecutiveSortedDates(sorted: string[]): { start: string; end: string }[] {
  if (sorted.length === 0) return [];
  const ranges: { start: string; end: string }[] = [];
  let runStart = sorted[0];
  let runEnd = sorted[0];
  for (let i = 1; i < sorted.length; i += 1) {
    const cur = sorted[i];
    const prevEnd = parseISO(runEnd);
    const curD = parseISO(cur);
    if (Math.floor((curD.getTime() - prevEnd.getTime()) / 86400000) === 1) {
      runEnd = cur;
    } else {
      ranges.push({ start: runStart, end: runEnd });
      runStart = cur;
      runEnd = cur;
    }
  }
  ranges.push({ start: runStart, end: runEnd });
  return ranges;
}

function formatRangeLabel(startIso: string, endIso: string): string {
  const a = parseISO(startIso);
  const b = parseISO(endIso);
  if (startIso === endIso) return format(a, "M/d");
  return `${format(a, "M/d")}–${format(b, "M/d")}`;
}

function dominantAccentClass(entries: SchoolDay[], activityName: string): string {
  const typeCount = new Map<DayType, number>();
  for (const day of entries) {
    if (!day.events.includes(activityName)) continue;
    typeCount.set(day.type, (typeCount.get(day.type) ?? 0) + 1);
  }
  let best: DayType = DayType.Event;
  let bestN = 0;
  for (const [type, n] of typeCount) {
    if (n > bestN) {
      best = type;
      bestN = n;
    }
  }
  if (bestN === 0) return eventListAccent;
  return `${badgeByType[best]} text-slate-800`;
}

/** 同一月份內，活動名稱出現至少兩天的彙總（連續曆日合併為區間）。 */
export function buildMonthlyEventSummary(entries: SchoolDay[]): MonthlyEventSummaryRow[] {
  const eventToDates = new Map<string, string[]>();
  for (const day of entries) {
    for (const raw of day.events) {
      const ev = raw.trim();
      if (!ev) continue;
      if (!eventToDates.has(ev)) eventToDates.set(ev, []);
      eventToDates.get(ev)!.push(day.date);
    }
  }

  const rows: MonthlyEventSummaryRow[] = [];
  for (const [name, dates] of eventToDates) {
    const unique = Array.from(new Set(dates)).sort();
    if (unique.length < 2) continue;
    const ranges = mergeConsecutiveSortedDates(unique);
    const parts = ranges.map((r) => formatRangeLabel(r.start, r.end));
    rows.push({
      activityName: name,
      displayLine: `${name} ${parts.join("、")}`,
      accentClass: dominantAccentClass(entries, name),
    });
  }

  rows.sort((a, b) => a.activityName.localeCompare(b.activityName, "zh-HK"));
  return rows;
}
