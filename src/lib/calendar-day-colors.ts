import { DayType } from "@/types/school-day";

/** 日曆格、校長查核檢視共用的日子類型底色 */
export const badgeByType: Record<DayType, string> = {
  [DayType.Normal]: "bg-white border-slate-200",
  [DayType.PH]: "bg-amber-100 border-amber-200",
  [DayType.Holiday]: "bg-sky-100 border-sky-200",
  [DayType.SDD]: "bg-indigo-100 border-indigo-200",
  [DayType.DH]: "bg-fuchsia-100 border-fuchsia-200",
  [DayType.Exam]: "bg-orange-100 border-orange-200",
  [DayType.Event]: "bg-emerald-100 border-emerald-200",
};

export const eventListAccent = "border-slate-200 bg-slate-50/90 text-slate-800";
