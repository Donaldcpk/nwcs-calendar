"use client";

import { format, getDay, parseISO } from "date-fns";
import { DayType, SchoolDayMap } from "@/types/school-day";
import { buildMonthlyEventSummary } from "@/lib/monthly-event-audit";
import { useMemo, useState } from "react";

interface Props {
  days: SchoolDayMap;
  selectedDates: string[];
  onMouseDownDate: (date: string, withShift: boolean) => void;
  onMouseEnterDate: (date: string) => void;
  onMouseUp: () => void;
  onClickDate: (date: string, withShift: boolean, withCtrl: boolean) => void;
}

const badgeByType: Record<DayType, string> = {
  [DayType.Normal]: "bg-white",
  [DayType.PH]: "bg-amber-100",
  [DayType.Holiday]: "bg-sky-100",
  [DayType.SDD]: "bg-indigo-100",
  [DayType.DH]: "bg-fuchsia-100",
  [DayType.Exam]: "bg-orange-100",
  [DayType.Event]: "bg-emerald-100",
};

export function YearGrid({ days, selectedDates, onMouseDownDate, onMouseEnterDate, onMouseUp, onClickDate }: Props) {
  const entries = Object.values(days).sort((a, b) => a.date.localeCompare(b.date));
  const firstWeekday = entries.length > 0 ? getDay(parseISO(entries[0].date)) : 0;
  const leadingCells = Array.from({ length: firstWeekday });
  const monthOptions = useMemo(() => {
    const unique = new Map<string, string>();
    for (const day of entries) {
      const d = parseISO(day.date);
      const key = format(d, "yyyy-MM");
      if (!unique.has(key)) unique.set(key, format(d, "yyyy年M月"));
    }
    return Array.from(unique.entries()).map(([value, label]) => ({ value, label }));
  }, [entries]);
  const [auditMonth, setAuditMonth] = useState(monthOptions[0]?.value ?? "");
  const [auditView, setAuditView] = useState<"week" | "events">("week");
  const monthEntries = useMemo(
    () => entries.filter((day) => format(parseISO(day.date), "yyyy-MM") === auditMonth),
    [entries, auditMonth],
  );
  const groupedByWeek = useMemo(() => {
    const weeks = new Map<string, typeof monthEntries>();
    for (const day of monthEntries) {
      const d = parseISO(day.date);
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
      <p className="mb-4 text-[11px] text-slate-500">多選：Shift+點擊兩端以選範圍（含首尾）；Ctrl+點擊僅切換單日。可配合 Shift+拖曳延伸範圍。</p>
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
                      <div key={day.date} className={`rounded px-2 py-1 text-xs ${badgeByType[day.type]}`}>
                        <span className="font-semibold">{format(parseISO(day.date), "M/d")}</span>{" "}
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
                <li key={row.activityName} className="rounded border border-slate-100 bg-slate-50/80 px-2 py-1.5 text-sm text-slate-800">
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
      <div className="grid grid-cols-7 gap-2">
        {["日", "一", "二", "三", "四", "五", "六"].map((weekday) => (
          <div key={weekday} className="sticky top-0 z-10 bg-slate-50 py-2 text-center text-xs font-semibold text-slate-600">
            {weekday}
          </div>
        ))}
        {leadingCells.map((_, idx) => (
          <div key={`leading-${idx}`} className="min-h-24 rounded-lg border border-dashed border-slate-200 bg-slate-50/60" />
        ))}
        {entries.map((day) => {
          const selected = selectedDates.includes(day.date);
          const dateObj = parseISO(day.date);
          const weekday = getDay(dateObj);
          const isWeekend = weekday === 0 || weekday === 6;
          const hasSpecial = day.type !== DayType.Normal || day.events.length > 0 || day.isLessonSuspended;
          const dayTextClass = isWeekend && !hasSpecial ? "text-slate-400" : "text-slate-800";
          const metaTextClass = isWeekend && !hasSpecial ? "text-slate-300" : "text-slate-600";
          const isMonthStart = dateObj.getDate() === 1;
          return (
            <button
              key={day.date}
              type="button"
              className={`relative min-h-24 rounded-lg border p-2 pb-6 text-left text-xs shadow-sm transition ${badgeByType[day.type]} ${selected ? "ring-2 ring-blue-500" : "hover:border-blue-300"} ${isMonthStart ? "border-t-2 border-t-dashed border-t-slate-400" : ""}`}
              onMouseDown={(event) => onMouseDownDate(day.date, event.shiftKey)}
              onMouseEnter={() => onMouseEnterDate(day.date)}
              onClick={(event) => onClickDate(day.date, event.shiftKey, event.ctrlKey)}
            >
              {isMonthStart ? <p className="mb-1 text-[10px] font-semibold text-slate-500">{format(dateObj, "yyyy年M月")}</p> : null}
              <p className={`font-semibold ${dayTextClass}`}>{format(dateObj, "M月d日")}</p>
              <p className={`text-[11px] ${metaTextClass}`}>{day.type}</p>
              {day.isLocked && <p className="text-[11px] text-rose-700">已鎖定</p>}
              {day.events.length > 0 ? (
                <div className="mt-1 space-y-0.5">
                  {day.events.map((eventName) => (
                    <p key={`${day.date}-${eventName}`} className="rounded bg-white/70 px-1 py-[1px] text-[11px] text-slate-700">
                      {eventName}
                    </p>
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
    </section>
  );
}
