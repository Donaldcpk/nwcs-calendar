import { DayType } from "@/types/school-day";
import { normalizeDayType } from "@/lib/normalize-day-types";

const labels: Record<DayType, string> = {
  [DayType.Normal]: "Normal",
  [DayType.PH]: "PH",
  [DayType.SH]: "SH",
  [DayType.Holiday]: "SH",
  [DayType.SDD]: "SDD",
  [DayType.DH]: "DH",
  [DayType.Exam]: "Exam",
  [DayType.Event]: "Event",
};

export function dayTypeLabel(type: DayType): string {
  return labels[normalizeDayType(type)] ?? type;
}

/** 下拉選單用：不含已棄用的 Holiday */
export const selectableDayTypes: DayType[] = [
  DayType.Normal,
  DayType.PH,
  DayType.SH,
  DayType.SDD,
  DayType.DH,
  DayType.Exam,
  DayType.Event,
];

export function isSchoolHolidayType(type: DayType): boolean {
  const normalized = normalizeDayType(type);
  return normalized === DayType.SH;
}
