import { ExportMapping } from "@/types/export-mapping";
import { SchoolDayMap } from "@/types/school-day";

export interface CalendarSnapshotPayload {
  days: SchoolDayMap;
  cycleLength: number;
  schoolYearStart: string;
  schoolYearEnd: string;
  exportMapping: ExportMapping;
}

export interface CalendarSnapshotRecord {
  schoolYear: string;
  payload: CalendarSnapshotPayload;
  version: number;
  updatedAt: string;
  updatedBy: string;
}
