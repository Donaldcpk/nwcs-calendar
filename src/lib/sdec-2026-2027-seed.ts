/** 伍華 SDEC 月曆 — 由 parse-sdec-monthly-csv 自 CSV 產生（見 sdec-2026-2027-catalog.ts） */

export type { DateRangeSeed, SingleDateSeed, SddDateSeed } from "@/lib/parse-sdec-monthly-csv";

export {
  sdecSchoolHolidayRanges,
  sdecPublicHolidays,
  sdecTeacherDevelopmentDays,
  sdecSchoolEventRanges,
  sdecActivityCatalogRows,
  getSdec2026_2027Catalog,
} from "@/lib/sdec-2026-2027-catalog";
