import { isSchoolHolidayType } from "@/lib/day-type-label";
import { normalizeDayType } from "@/lib/normalize-day-types";
import { DayType, SchoolDay } from "@/types/school-day";

/** 校長查核檢視：無活動名稱的 SH 不顯示；其餘非 Normal 或有活動則顯示 */
export function shouldShowInPrincipalAudit(day: SchoolDay): boolean {
  if (day.events.length > 0) return true;
  const type = normalizeDayType(day.type);
  if (type === DayType.Normal) return false;
  if (isSchoolHolidayType(type)) return false;
  return true;
}
