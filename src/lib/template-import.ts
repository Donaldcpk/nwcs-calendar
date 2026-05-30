import { formatISO, isValid, parse } from "date-fns";
import * as XLSX from "xlsx";
import { normalizeDayType } from "@/lib/normalize-day-types";
import { DayType, SchoolDayMap } from "@/types/school-day";

function countsAs190ForType(type: DayType): boolean {
  const t = normalizeDayType(type);
  return t !== DayType.PH && t !== DayType.SH && t !== DayType.SS;
}

type RawRow = Record<string, unknown>;

const typeMap: Record<string, DayType> = {
  normal: DayType.Normal,
  ph: DayType.PH,
  publicholiday: DayType.PH,
  holiday: DayType.SH,
  schoolholiday: DayType.SH,
  sh: DayType.SH,
  ss: DayType.SS,
  "s&s": DayType.SS,
  sdd: DayType.SDD,
  dh: DayType.DH,
  exam: DayType.Exam,
  event: DayType.Event,
  公眾假期: DayType.PH,
  學校假期: DayType.SH,
  週末: DayType.SS,
  教師發展日: DayType.SDD,
  自行決定假期: DayType.DH,
  測驗: DayType.Exam,
  活動: DayType.Event,
};

function normalizeType(input: string): DayType | null {
  const key = input.replace(/\s+/g, "").toLowerCase();
  return typeMap[key] ?? null;
}

function parseDateValue(value: unknown): string | null {
  if (typeof value === "number") {
    const jsDate = XLSX.SSF.parse_date_code(value);
    if (!jsDate) return null;
    const date = new Date(jsDate.y, jsDate.m - 1, jsDate.d);
    return formatISO(date, { representation: "date" });
  }

  if (typeof value !== "string") return null;
  const str = value.trim();
  if (!str) return null;

  const candidates = [
    parse(str, "yyyy-MM-dd", new Date()),
    parse(str, "d/M/yyyy", new Date()),
    parse(str, "d/M/yy", new Date()),
    parse(str, "yyyy/M/d", new Date()),
    parse(str, "M/d/yyyy", new Date()),
  ];
  const matched = candidates.find((d) => isValid(d));
  if (!matched) return null;
  return formatISO(matched, { representation: "date" });
}

function pick(row: RawRow, keys: string[]): unknown {
  const lowered = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v]));
  for (const key of keys) {
    if (key.toLowerCase().trim() in lowered) return lowered[key.toLowerCase().trim()];
  }
  return undefined;
}

export function parseTemplateWorkbook(file: File): Promise<Partial<SchoolDayMap>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const buffer = reader.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "" });

        const updates: Partial<SchoolDayMap> = {};
        for (const row of rows) {
          const dateRaw = pick(row, ["Date", "日期"]);
          const date = parseDateValue(dateRaw);
          if (!date) continue;

          const typeRaw = String(pick(row, ["Day Type", "DayType", "類型", "假期"]) ?? "").trim();
          const cycleRaw = pick(row, ["Cycle Day", "CycleDay", "循環日"]);
          const eventsRaw = String(pick(row, ["Events", "活動", "備註"]) ?? "").trim();

          const parsedTypeRaw = typeRaw ? normalizeType(typeRaw) : null;
          const parsedType = parsedTypeRaw ? normalizeDayType(parsedTypeRaw) : null;
          const parsedCycle = Number(cycleRaw);
          const cycleDay = Number.isFinite(parsedCycle) && parsedCycle > 0 ? parsedCycle : null;
          const resolvedType = parsedType ?? DayType.Normal;

          updates[date] = {
            date,
            type: resolvedType,
            cycleDay,
            isLessonSuspended: false,
            countsAs190: countsAs190ForType(resolvedType),
            isLocked: false,
            events: eventsRaw ? eventsRaw.split(/[;,/]/).map((i) => i.trim()).filter(Boolean) : [],
          };
        }

        resolve(updates);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
