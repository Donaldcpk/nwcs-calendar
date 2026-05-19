import { DayType, SchoolDay } from "@/types/school-day";

const skipCycleTypes = new Set<DayType>([DayType.PH, DayType.Holiday, DayType.DH, DayType.SDD]);

export function shouldSkipCycle(day: SchoolDay): boolean {
  return day.isLessonSuspended || skipCycleTypes.has(day.type);
}
