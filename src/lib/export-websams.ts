import Papa from "papaparse";
import { defaultExportMapping, ExportMapping } from "@/types/export-mapping";
import { SchoolDayMap } from "@/types/school-day";

export function buildWebSamsCsv(days: SchoolDayMap, mapping: ExportMapping = defaultExportMapping): string {
  const rows = Object.values(days)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((day) => ({
      [mapping.date]: day.date,
      [mapping.dayType]: day.type,
      [mapping.cycleDay]: day.cycleDay ?? "",
      [mapping.suspendLessons]: day.isLessonSuspended ? "Y" : "N",
      [mapping.countsAs190]: day.countsAs190 ? "Y" : "N",
      [mapping.locked]: day.isLocked ? "Y" : "N",
      [mapping.events]: day.events.join("; "),
    }));

  return Papa.unparse(rows);
}

export function downloadWebSamsCsv(
  days: SchoolDayMap,
  mapping: ExportMapping = defaultExportMapping,
  filename = "websams-calendar.csv",
): void {
  const csv = buildWebSamsCsv(days, mapping);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
