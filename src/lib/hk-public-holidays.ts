interface IcalEvent {
  date: string;
  summary: string;
}

function parseIcs(icsText: string, year: number): IcalEvent[] {
  const lines = icsText.split(/\r?\n/);
  const events: IcalEvent[] = [];
  let date: string | null = null;
  let summary: string | null = null;

  for (const line of lines) {
    if (line.startsWith("DTSTART")) {
      const raw = line.split(":")[1]?.trim() ?? "";
      if (raw.length >= 8) {
        date = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
      }
    }
    if (line.startsWith("SUMMARY:")) {
      summary = line.replace("SUMMARY:", "").trim();
    }
    if (line === "END:VEVENT" && date && summary) {
      if (date.startsWith(String(year))) {
        events.push({ date, summary });
      }
      date = null;
      summary = null;
    }
  }

  return events;
}

export async function fetchHongKongPublicHolidayEvents(year: number): Promise<IcalEvent[]> {
  const urls = [
    "https://www.1823.gov.hk/common/ical/en.ics",
    "https://www.1823.gov.hk/common/ical/tc.ics",
  ];

  for (const url of urls) {
    const response = await fetch(url);
    if (!response.ok) continue;
    const text = await response.text();
    const events = parseIcs(text, year);
    if (events.length > 0) return events;
  }

  throw new Error("Unable to fetch Hong Kong public holidays");
}

export async function fetchHongKongPublicHolidays(year: number): Promise<string[]> {
  const events = await fetchHongKongPublicHolidayEvents(year);
  return events.map((event) => `${event.date} ${event.summary}`);
}
