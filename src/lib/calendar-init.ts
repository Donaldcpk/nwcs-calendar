import { addDays, formatISO, getDay, isWeekend } from "date-fns";
import { DayType, SchoolDayMap } from "@/types/school-day";

export interface SchoolYearConfig {
  schoolYearStart: string;
  schoolYearEnd: string;
  cycleLength: number;
}

export const defaultSchoolYearConfig: SchoolYearConfig = {
  schoolYearStart: "2026-09-01",
  schoolYearEnd: "2027-08-31",
  cycleLength: 6,
};

export function createSchoolYearDays(start: string, end: string): SchoolDayMap {
  const days: SchoolDayMap = {};
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);

  for (let current = startDate; current <= endDate; current = addDays(current, 1)) {
    const date = formatISO(current, { representation: "date" });
    const isSunday = getDay(current) === 0;
    days[date] = {
      date,
      type: isSunday ? DayType.PH : DayType.Normal,
      cycleDay: null,
      isLessonSuspended: false,
      countsAs190: !isWeekend(current) && !isSunday,
      isLocked: false,
      events: [],
    };
  }

  return days;
}
