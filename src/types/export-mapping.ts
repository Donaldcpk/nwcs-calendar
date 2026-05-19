export interface ExportMapping {
  date: string;
  dayType: string;
  cycleDay: string;
  suspendLessons: string;
  countsAs190: string;
  locked: string;
  events: string;
}

export const defaultExportMapping: ExportMapping = {
  date: "Date",
  dayType: "DayType",
  cycleDay: "CycleDay",
  suspendLessons: "SuspendLessons",
  countsAs190: "CountsAs190",
  locked: "Locked",
  events: "Events",
};
