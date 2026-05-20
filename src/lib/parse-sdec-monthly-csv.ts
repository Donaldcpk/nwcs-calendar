/**
 * 解析 SDEC MonthlyCalendar CSV（活動名稱, 開始, 結束）
 * 例：開學日,2026年9月1日,2026年9月1日
 */

export interface DateRangeSeed {
  name: string;
  start: string;
  end: string;
}

export interface SingleDateSeed {
  date: string;
  name: string;
}

export interface SddDateSeed {
  date: string;
  events?: string[];
}

export interface SdecParsedCatalog {
  schoolHolidayRanges: DateRangeSeed[];
  publicHolidays: SingleDateSeed[];
  teacherDevelopmentDays: SddDateSeed[];
  schoolEventRanges: DateRangeSeed[];
  activityCatalogRows: Array<{ 活動名稱: string; 開始日期: string; 結束日期: string; 類別: string }>;
}

const PH_NAMES = new Set([
  "中秋節翌日",
  "國慶日",
  "重陽節",
  "清明節",
  "勞動節",
  "佛誕",
  "端午節",
  "香港特別行政區成立紀念日",
]);

const SH_NAME_HINTS = ["補假", "假期", "暑假", "復活節"];

function parseChineseDate(value: string): string | null {
  const trimmed = value.trim();
  const match = trimmed.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!match) return null;
  const [, y, m, d] = match;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function isSchoolHolidayName(name: string): boolean {
  if (PH_NAMES.has(name)) return false;
  return SH_NAME_HINTS.some((hint) => name.includes(hint));
}

function isTeacherDevelopmentDay(name: string): boolean {
  return name === "教師發展日";
}

function isPublicHolidayName(name: string): boolean {
  return PH_NAMES.has(name);
}

function parseCsvLine(line: string): [string, string, string] | null {
  const parts = line.split(",");
  if (parts.length < 3) return null;
  const name = parts[0].trim();
  const start = parts[1].trim();
  const end = parts[2].trim();
  if (!name || !start || !end) return null;
  if (name.startsWith("(") || name === "開始") return null;
  return [name, start, end];
}

export function parseSdecMonthlyCsv(csvText: string): SdecParsedCatalog {
  const schoolHolidayRanges: DateRangeSeed[] = [];
  const publicHolidays: SingleDateSeed[] = [];
  const teacherDevelopmentDays: SddDateSeed[] = [];
  const schoolEventRanges: DateRangeSeed[] = [];
  const activityCatalogRows: SdecParsedCatalog["activityCatalogRows"] = [];
  const sddDatesSeen = new Set<string>();

  for (const rawLine of csvText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const parsed = parseCsvLine(line);
    if (!parsed) continue;

    const [name, startRaw, endRaw] = parsed;
    const start = parseChineseDate(startRaw);
    const end = parseChineseDate(endRaw);
    if (!start || !end) continue;

    let category = "校園活動";
    if (isPublicHolidayName(name)) {
      category = "公眾假期 PH";
      if (start === end) {
        publicHolidays.push({ date: start, name });
      } else {
        schoolHolidayRanges.push({ name, start, end });
      }
    } else if (isSchoolHolidayName(name)) {
      category = "學校假期 SH";
      schoolHolidayRanges.push({ name, start, end });
    } else if (isTeacherDevelopmentDay(name)) {
      category = "教師發展日 SDD";
      if (start === end && !sddDatesSeen.has(start)) {
        sddDatesSeen.add(start);
        const extraEvents: string[] = [];
        teacherDevelopmentDays.push({ date: start, events: extraEvents });
      }
      schoolEventRanges.push({ name, start, end });
    } else {
      schoolEventRanges.push({ name, start, end });
    }

    activityCatalogRows.push({
      活動名稱: name,
      開始日期: start,
      結束日期: end,
      類別: category,
    });
  }

  return {
    schoolHolidayRanges,
    publicHolidays,
    teacherDevelopmentDays,
    schoolEventRanges,
    activityCatalogRows,
  };
}

export function parseSdecMonthlyCsvFile(file: File): Promise<SdecParsedCatalog> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(parseSdecMonthlyCsv(String(reader.result ?? "")));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
