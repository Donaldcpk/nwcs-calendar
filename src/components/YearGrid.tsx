"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { DayEventChip } from "@/components/DayEventChip";
import { badgeByType } from "@/lib/calendar-day-colors";
import { buildMonthlyEventSummary } from "@/lib/monthly-event-audit";
import { getLocalWeekday, parseLocalDate } from "@/lib/parse-local-date";
import { DayType, SchoolDayMap } from "@/types/school-day";

interface Props {
  days: SchoolDayMap;
  selectedDates: string[];
  onMouseDownDate: (date: string, withShift: boolean, withModifier: boolean) => void;
  onMouseEnterDate: (date: string) => void;
  onMouseUp: () => void;
  onClickDate: (date: string, withShift: boolean, withModifier: boolean) => void;
}

function hasRangeModifier(event: { ctrlKey: boolean; metaKey: boolean }): boolean {
  return event.ctrlKey || event.metaKey;
}

export function YearGrid({ days, selectedDates, onMouseDownDate, onMouseEnterDate, onMouseUp, onClickDate }: Props) {
  const entries = Object.values(days).sort((a, b) => a.date.localeCompare(b.date));

  const months = useMemo(() => {
    const grouped = new Map<string, typeof entries>();
    for (const day of entries) {
      const key = format(parseLocalDate(day.date), "yyyy-MM");
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)?.push(day);
    }
    return Array.from(grouped.entries()).map(([key, monthDays]) => ({
      key,
      label: format(parseLocalDate(monthDays[0].date), "yyyy年M月"),
      days: monthDays,
      leadingCount: getLocalWeekday(monthDays[0].date),
    }));
  }, [entries]);

  const monthOptions = useMemo(
    () => months.map((month) => ({ value: month.key, label: month.label })),
    [months],
  );

  const [auditMonth, setAuditMonth] = useState(monthOptions[0]?.value ?? "");
  const [auditView, setAuditView] = useState<"week" | "events">("week");

  const activeMonth = months.find((month) => month.key === auditMonth) ?? months[0];
  const monthEntries = activeMonth?.days ?? [];

  const groupedByWeek = useMemo(() => {
    const weeks = new Map<string, typeof monthEntries>();
    for (const day of monthEntries) {
      const d = parseLocalDate(day.date);
      const weekKey = `${format(d, "yyyy-MM")}-W${Math.ceil(d.getDate() / 7)}`;
      if (!weeks.has(weekKey)) weeks.set(weekKey, []);
      weeks.get(weekKey)?.push(day);
    }
    return Array.from(weeks.entries());
  }, [monthEntries]);

  const eventSummary = useMemo(() => buildMonthlyEventSummary(monthEntries), [monthEntries]);

  return (
    <section className="h-screen overflow-auto bg-slate-50 p-4" onMouseUp={onMouseUp}>
      <h2 className="mb-1 text-lg font-semibold">全年連續檢視</h2>
      <p className="mb-4 text-[11px] text-slate-500">
        多選：拖曳範圍；Shift+點擊區間；Ctrl / ⌘ +點擊切換單日。活動旁 × 可刪除該事項（無需復原）。
      </p>
      <div className="mb-4 rounded-lg border bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">校長查核檢視（月度）</p>
          <select
            className="rounded border px-2 py-1 text-sm"
            value={auditMonth}
            onChange={(event) => setAuditMonth(event.target.value)}
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="ml-auto flex rounded border border-slate-200 p-0.5 text-xs">
            <button
              type="button"
              className={`rounded px-2 py-1 ${auditView === "week" ? "bg-slate-900 text-white" : "text-slate-600"}`}
              onClick={() => setAuditView("week")}
            >
              按週
            </button>
            <button
              type="button"
              className={`rounded px-2 py-1 ${auditView === "events" ? "bg-slate-900 text-white" : "text-slate-600"}`}
              onClick={() => setAuditView("events")}
            >
              按活動
            </button>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {auditView === "week" ? (
            groupedByWeek.map(([weekKey, weekDays], idx) => (
              <div key={weekKey} className="rounded border border-slate-200 p-2">
                <p className="text-xs font-semibold text-slate-600">第 {idx + 1} 周</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {weekDays
                    .filter((day) => day.type !== DayType.Normal || day.events.length > 0)
                    .map((day) => (
                      <div key={day.date} className={`rounded border px-2 py-1 text-xs ${badgeByType[day.type]}`}>
                        <span className="font-semibold">{format(parseLocalDate(day.date), "M/d")}</span>{" "}
                        <span>{day.type}</span>
                        {day.events.length > 0 ? <span> - {day.events.join("、")}</span> : null}
                      </div>
                    ))}
                  {weekDays.filter((day) => day.type !== DayType.Normal || day.events.length > 0).length === 0 ? (
                    <p className="text-xs text-slate-400">本周無特殊活動或假期</p>
                  ) : null}
                </div>
              </div>
            ))
          ) : eventSummary.length > 0 ? (
            <ul className="list-none space-y-2 p-0">
              {eventSummary.map((row) => (
                <li
                  key={row.activityName}
                  className={`rounded border px-2 py-1.5 text-sm ${row.accentClass}`}
                >
                  {row.displayLine}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">
              本月沒有在至少兩天出現的同名活動。請在右側操作面板為多日套用相同活動名稱，以便此處彙總。
            </p>
          )}
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-2">
        {["日", "一", "二", "三", "四", "五", "六"].map((weekday) => (
          <div
            key={weekday}
            className="sticky top-0 z-10 bg-slate-50 py-2 text-center text-xs font-semibold text-slate-600"
          >
            {weekday}
          </div>
        ))}
      </div>

      {months.map((month) => (
        <div key={month.key} className="mb-6">
          <div
            className="mb-2 flex items-center gap-2 rounded-md border border-violet-200 bg-violet-50 px-3 py-1.5"
            aria-label={`${month.label}`}
          >
            <span className="text-xs font-bold tracking-wide text-violet-800">{month.label}</span>
            <span className="h-px flex-1 bg-violet-200" />
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: month.leadingCount }).map((_, idx) => (
              <div
                key={`${month.key}-leading-${idx}`}
                className="min-h-24 rounded-lg border border-dashed border-slate-200 bg-slate-50/60"
              />
            ))}
            {month.days.map((day) => {
              const selected = selectedDates.includes(day.date);
              const dateObj = parseLocalDate(day.date);
              const weekday = getLocalWeekday(day.date);
              const isWeekend = weekday === 0 || weekday === 6;
              const hasSpecial = day.type !== DayType.Normal || day.events.length > 0 || day.isLessonSuspended;
              const dayTextClass = isWeekend && !hasSpecial ? "text-slate-400" : "text-slate-800";
              const metaTextClass = isWeekend && !hasSpecial ? "text-slate-300" : "text-slate-600";

              return (
                <button
                  key={day.date}
                  type="button"
                  className={`relative min-h-24 rounded-lg border p-2 pb-6 text-left text-xs shadow-sm transition ${badgeByType[day.type]} ${selected ? "ring-2 ring-blue-500 ring-offset-1" : "hover:border-blue-400"}`}
                  onMouseDown={(event) => onMouseDownDate(day.date, event.shiftKey, hasRangeModifier(event))}
                  onMouseEnter={() => onMouseEnterDate(day.date)}
                  onClick={(event) => onClickDate(day.date, event.shiftKey, hasRangeModifier(event))}
                >
                  <p className={`font-semibold ${dayTextClass}`}>{format(dateObj, "M月d日")}</p>
                  <p className={`text-[11px] ${metaTextClass}`}>{day.type}</p>
                  {day.isLocked && <p className="text-[11px] text-rose-700">已鎖定</p>}
                  {day.events.length > 0 ? (
                    <div className="mt-1 space-y-0.5">
                      {day.events.map((eventName) => (
                        <DayEventChip key={`${day.date}-${eventName}`} date={day.date} eventName={eventName} compact />
                      ))}
                    </div>
                  ) : null}
                  {day.cycleDay ? (
                    <span className="absolute bottom-1 right-1 rounded bg-emerald-800 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      D{day.cycleDay}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
