import { DayType } from "@/types/school-day";
import { normalizeDayType } from "@/lib/normalize-day-types";

/** 日曆格、校長查核檢視共用的日子類型底色 */
export const badgeByType: Record<DayType, string> = {
  [DayType.Normal]: "bg-white border-slate-200",
  [DayType.PH]: "bg-amber-100 border-amber-200",
  [DayType.SH]: "bg-sky-100 border-sky-200",
  [DayType.SS]: "bg-slate-100 border-slate-300",
  [DayType.Holiday]: "bg-sky-100 border-sky-200",
  [DayType.SDD]: "bg-indigo-100 border-indigo-200",
  [DayType.DH]: "bg-fuchsia-100 border-fuchsia-200",
  [DayType.Exam]: "bg-orange-100 border-orange-200",
  [DayType.Event]: "bg-emerald-100 border-emerald-200",
};

export const eventListAccent = "border-slate-200 bg-slate-50/90 text-slate-800";

/** 有活動名稱但類型仍為 Normal 時的高亮樣式 */
export const hasEventsHighlight = "ring-1 ring-emerald-400 border-emerald-300 bg-emerald-50/40";

export function cellBadgeClass(type: DayType, hasEvents: boolean): string {
  const base = badgeByType[normalizeDayType(type)] ?? badgeByType[DayType.Normal];
  if (hasEvents && normalizeDayType(type) === DayType.Normal) {
    return `${base} ${hasEventsHighlight}`;
  }
  return base;
}
