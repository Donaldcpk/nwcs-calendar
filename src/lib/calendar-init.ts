import { addDays, formatISO, isWeekend } from "date-fns";
import { applySdec2026_2027Seed } from "@/lib/apply-sdec-seed";
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
    const weekend = isWeekend(current);
    days[date] = {
      date,
      type: weekend ? DayType.SS : DayType.Normal,
      cycleDay: null,
      isLessonSuspended: false,
      countsAs190: !weekend,
      isLocked: false,
      events: [],
    };
  }

  return days;
}

/** 建立學年並套用 SDEC 2026-27 預設假期與活動（新裝置／重設時使用） */
export function createSchoolYearDaysWithSdecSeed(start: string, end: string): SchoolDayMap {
  const days = createSchoolYearDays(start, end);
  return applySdec2026_2027Seed(days, true).days;
}
