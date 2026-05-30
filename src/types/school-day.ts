export enum DayType {
  Normal = "Normal",
  PH = "PH",
  /** 學校假期（School Holiday），計入 90 天配額 */
  SH = "SH",
  /** 非授課週六／日，計入 S&S 79/80 上限 */
  SS = "S&S",
  /** @deprecated 讀取相容，請改用 SH */
  Holiday = "Holiday",
  SDD = "SDD",
  DH = "DH",
  Exam = "Exam",
  Event = "Event",
}

export interface SchoolDay {
  date: string;
  type: DayType;
  cycleDay: number | null;
  isLessonSuspended: boolean;
  countsAs190: boolean;
  isLocked: boolean;
  events: string[];
}

export type SchoolDayMap = Record<string, SchoolDay>;
