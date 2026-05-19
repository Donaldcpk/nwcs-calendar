export enum DayType {
  Normal = "Normal",
  PH = "PH",
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
