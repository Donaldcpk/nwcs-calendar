import { format } from "date-fns";
import { dayTypeLabel, selectableDayTypes } from "@/lib/day-type-label";
import { parseLocalDate } from "@/lib/parse-local-date";
import { normalizeDayType } from "@/lib/normalize-day-types";
import { DayType, SchoolDayMap } from "@/types/school-day";

export interface MonthTypeStatRow {
  label: string;
  count: number;
}

export interface MonthTypeStatsSummary {
  monthKey: string;
  monthLabel: string;
  rows: MonthTypeStatRow[];
  normalWithEvents: number;
  totalDays: number;
}

export function countByTypeForMonth(days: SchoolDayMap, monthKey: string): MonthTypeStatsSummary {
  const counts = new Map<string, number>();
  for (const type of selectableDayTypes) {
    counts.set(dayTypeLabel(type), 0);
  }

  let normalWithEvents = 0;
  let totalDays = 0;

  for (const day of Object.values(days)) {
    if (!day.date.startsWith(monthKey)) continue;
    totalDays += 1;
    const normalized = normalizeDayType(day.type);
    const label = dayTypeLabel(normalized);
    counts.set(label, (counts.get(label) ?? 0) + 1);
    if (normalized === DayType.Normal && day.events.length > 0) {
      normalWithEvents += 1;
    }
  }

  const rows: MonthTypeStatRow[] = Array.from(counts.entries())
    .filter(([, count]) => count > 0)
    .map(([label, count]) => ({ label, count }));

  if (normalWithEvents > 0) {
    rows.push({ label: "Normal（有活動標籤）", count: normalWithEvents });
  }

  const sampleDate = parseLocalDate(`${monthKey}-01`);
  return {
    monthKey,
    monthLabel: format(sampleDate, "yyyy年M月"),
    rows,
    normalWithEvents,
    totalDays,
  };
}

export function getNextMonthKey(monthKey: string): string | null {
  const [y, m] = monthKey.split("-").map(Number);
  if (!y || !m) return null;
  const next = m === 12 ? { year: y + 1, month: 1 } : { year: y, month: m + 1 };
  return `${next.year}-${String(next.month).padStart(2, "0")}`;
}

export function getPrevMonthKey(monthKey: string): string | null {
  const [y, m] = monthKey.split("-").map(Number);
  if (!y || !m) return null;
  const prev = m === 1 ? { year: y - 1, month: 12 } : { year: y, month: m - 1 };
  return `${prev.year}-${String(prev.month).padStart(2, "0")}`;
}
