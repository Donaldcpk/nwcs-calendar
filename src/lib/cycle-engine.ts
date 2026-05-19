import { compareAsc, eachDayOfInterval, formatISO, subDays } from "date-fns";
import { SchoolDayMap } from "@/types/school-day";
import { shouldSkipCycle } from "@/lib/cycle-rules";

function normalizeDate(date: string): string {
  return formatISO(new Date(`${date}T00:00:00`), { representation: "date" });
}

export function recalculateCycles(
  days: SchoolDayMap,
  cycleLength: number,
  schoolYearStart: string,
  startDate: string,
): SchoolDayMap {
  const next = { ...days };
  const normalizedStart = normalizeDate(startDate);
  const normalizedYearStart = normalizeDate(schoolYearStart);
  const sorted = Object.keys(next).sort(compareAsc);
  if (sorted.length === 0 || cycleLength <= 0) return next;

  const seedStart = normalizedStart > normalizedYearStart ? normalizedStart : normalizedYearStart;
  const previousDate = formatISO(subDays(new Date(`${seedStart}T00:00:00`), 1), { representation: "date" });

  let cycleCursor = 1;
  if (previousDate >= normalizedYearStart) {
    const priorDays = eachDayOfInterval({
      start: new Date(`${normalizedYearStart}T00:00:00`),
      end: new Date(`${previousDate}T00:00:00`),
    });

    for (const dateObj of priorDays) {
      const iso = formatISO(dateObj, { representation: "date" });
      const day = next[iso];
      if (!day || shouldSkipCycle(day)) continue;
      if (day.cycleDay) cycleCursor = (day.cycleDay % cycleLength) + 1;
    }
  }

  for (const date of sorted) {
    if (date < seedStart) continue;
    const day = next[date];
    if (!day) continue;

    if (shouldSkipCycle(day)) {
      next[date] = { ...day, cycleDay: null };
      continue;
    }

    if (day.isLocked && day.cycleDay) {
      cycleCursor = (day.cycleDay % cycleLength) + 1;
      continue;
    }

    next[date] = { ...day, cycleDay: cycleCursor };
    cycleCursor = (cycleCursor % cycleLength) + 1;
  }

  return next;
}
