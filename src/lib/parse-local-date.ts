/** Parse YYYY-MM-DD as local calendar date (avoids UTC shift from parseISO). */
export function parseLocalDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00`);
}

export function formatLocalDateIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getLocalWeekday(isoDate: string): number {
  return parseLocalDate(isoDate).getDay();
}

export function eachIsoDateInRange(start: string, end: string): string[] {
  const startDate = parseLocalDate(start);
  const endDate = parseLocalDate(end);
  const dates: string[] = [];
  for (let cursor = startDate; cursor <= endDate; cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)) {
    dates.push(formatLocalDateIso(cursor));
  }
  return dates;
}
