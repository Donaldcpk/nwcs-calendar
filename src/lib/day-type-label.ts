import { DayType } from "@/types/school-day";
import { normalizeDayType } from "@/lib/normalize-day-types";

const labels: Record<DayType, string> = {
  [DayType.Normal]: "Normal",
  [DayType.PH]: "PH",
  [DayType.SH]: "SH",
  [DayType.SS]: "S&S",
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
  DayType.SS,
  DayType.SDD,
  DayType.DH,
  DayType.Exam,
  DayType.Event,
];

export function isSchoolHolidayType(type: DayType): boolean {
  const normalized = normalizeDayType(type);
  return normalized === DayType.SH;
}

/** 變更日子類型時，若未明確指定 countsAs190，依類型決定預設值 */
export function defaultCountsAs190ForType(type: DayType): boolean {
  const normalized = normalizeDayType(type);
  return normalized === DayType.Normal || normalized === DayType.Exam || normalized === DayType.Event;
}

export function resolveCountsAs190ForTypeChange(type: DayType, explicit?: boolean): boolean {
  if (explicit !== undefined) return explicit;
  return defaultCountsAs190ForType(type);
}
