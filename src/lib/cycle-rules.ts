import { normalizeDayType } from "@/lib/normalize-day-types";
import { DayType, SchoolDay } from "@/types/school-day";

const skipCycleTypes = new Set<DayType>([DayType.PH, DayType.SH, DayType.SS, DayType.Holiday, DayType.DH, DayType.SDD]);

export function shouldSkipCycle(day: SchoolDay): boolean {
  return day.isLessonSuspended || skipCycleTypes.has(normalizeDayType(day.type));
}
