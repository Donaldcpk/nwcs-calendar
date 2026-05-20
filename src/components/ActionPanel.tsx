"use client";

import { FormEvent, useState } from "react";
import { useStore } from "zustand";
import { calculateComplianceMetrics } from "@/hooks/use-compliance";
import { recalculateCycles } from "@/lib/cycle-engine";
import { calculateSchoolHolidayQuotaWithTrace } from "@/lib/holiday-quota";
import { DayEventChip } from "@/components/DayEventChip";
import { dayTypeLabel, selectableDayTypes } from "@/lib/day-type-label";
import { DayType } from "@/types/school-day";
import { useCalendarStore } from "@/store/calendar-store";

interface BatchPreview {
  beforeSchoolDays: number;
  afterSchoolDays: number;
  beforeHolidayQuota: number;
  afterHolidayQuota: number;
  cycleChanges: Array<{ date: string; from: number | null; to: number | null }>;
}

export function ActionPanel() {
  const activeDate = useCalendarStore((state) => state.activeDate);
  const day = useCalendarStore((state) => (activeDate ? state.days[activeDate] : null));
  const days = useCalendarStore((state) => state.days);
  const selectedDates = useCalendarStore((state) => state.selectedDates);
  const schoolYearStart = useCalendarStore((state) => state.schoolYearStart);
  const schoolYearEnd = useCalendarStore((state) => state.schoolYearEnd);
  const updateDay = useCalendarStore((state) => state.updateDay);
  const applyBatchUpdate = useCalendarStore((state) => state.applyBatchUpdate);
  const setCycleLength = useCalendarStore((state) => state.setCycleLength);
  const cycleLength = useCalendarStore((state) => state.cycleLength);
  const undo = useCalendarStore((state) => state.undo);
  const redo = useCalendarStore((state) => state.redo);
  const pastStates = useStore(useCalendarStore.temporal, (state) => state.pastStates);
  const futureStates = useStore(useCalendarStore.temporal, (state) => state.futureStates);

  const [batchType, setBatchType] = useState<DayType | "">("");
  const [batchEvent, setBatchEvent] = useState("");
  const [batchSuspendLessons, setBatchSuspendLessons] = useState(false);
  const [batchCountsAs190, setBatchCountsAs190] = useState(false);
  const [weekdayPattern, setWeekdayPattern] = useState({
    mon: true,
    tue: false,
    wed: true,
    thu: false,
    fri: true,
    sat: false,
    sun: false,
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [batchPreview, setBatchPreview] = useState<BatchPreview | null>(null);
  const setSelectedDates = useCalendarStore((state) => state.setSelectedDates);

  const onSubmitEvent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!day || !activeDate) return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get("eventName") || "").trim();
    if (!name) return;
    updateDay(activeDate, { events: Array.from(new Set([...(day.events || []), name])) });
    event.currentTarget.reset();
  };

  const openBatchPreview = () => {
    if (selectedDates.length === 0) return;
    const beforeMetrics = calculateComplianceMetrics(days, schoolYearStart, schoolYearEnd);
    const nextDays = { ...days };
    const sortedDates = selectedDates.slice().sort();

    for (const date of sortedDates) {
      const current = nextDays[date];
      if (!current) continue;
      nextDays[date] = {
        ...current,
        ...(batchType ? { type: batchType } : {}),
        ...(batchEvent ? { events: Array.from(new Set([...current.events, batchEvent])) } : {}),
        ...(batchSuspendLessons ? { isLessonSuspended: true } : {}),
        ...(batchCountsAs190 ? { countsAs190: true } : {}),
      };
    }

    const recalculated = recalculateCycles(nextDays, cycleLength, schoolYearStart, sortedDates[0]);
    const afterMetrics = calculateComplianceMetrics(recalculated, schoolYearStart, schoolYearEnd);

    const changes = Object.keys(recalculated)
      .sort()
      .filter((date) => date >= sortedDates[0] && days[date]?.cycleDay !== recalculated[date]?.cycleDay)
      .slice(0, 5)
      .map((date) => ({
        date,
        from: days[date]?.cycleDay ?? null,
        to: recalculated[date]?.cycleDay ?? null,
      }));

    setBatchPreview({
      beforeSchoolDays: beforeMetrics.schoolDays,
      afterSchoolDays: afterMetrics.schoolDays,
      beforeHolidayQuota: beforeMetrics.schoolHolidayQuota,
      afterHolidayQuota: afterMetrics.schoolHolidayQuota,
      cycleChanges: changes,
    });
    setPreviewOpen(true);
  };

  const confirmBatchApply = () => {
    applyBatchUpdate(selectedDates, {
      type: batchType || undefined,
      event: batchEvent || undefined,
      isLessonSuspended: batchSuspendLessons || undefined,
      countsAs190: batchCountsAs190 || undefined,
    });
    setPreviewOpen(false);
  };

  const trace = activeDate ? calculateSchoolHolidayQuotaWithTrace(days).trace[activeDate] : null;

  const applyWeekdayPatternSelection = () => {
    const selected = Object.keys(days)
      .sort()
      .filter((date) => {
        const weekday = new Date(`${date}T00:00:00`).getDay();
        if (weekday === 0) return weekdayPattern.sun;
        if (weekday === 1) return weekdayPattern.mon;
        if (weekday === 2) return weekdayPattern.tue;
        if (weekday === 3) return weekdayPattern.wed;
        if (weekday === 4) return weekdayPattern.thu;
        if (weekday === 5) return weekdayPattern.fri;
        if (weekday === 6) return weekdayPattern.sat;
        return true;
      });
    setSelectedDates(selected);
  };

  return (
    <aside className="sticky top-0 h-screen overflow-auto border-l border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold">操作面板</h2>
      <div className="mt-4 space-y-3 rounded-lg border p-3">
        <button type="button" className="w-full rounded bg-slate-900 px-3 py-2 text-sm text-white" onClick={undo}>⬅️ 復原（{pastStates.length}/5）</button>
        <button type="button" className="w-full rounded bg-slate-700 px-3 py-2 text-sm text-white" onClick={redo}>➡️ 重做（{futureStates.length}）</button>
        <label className="text-sm">Cycle 長度<input type="number" min={2} max={10} value={cycleLength} onChange={(e) => setCycleLength(Number(e.target.value))} className="mt-1 w-full rounded border px-2 py-1" /></label>
      </div>
      <div className="mt-4 space-y-2 rounded-lg border p-3">
        <p className="text-sm font-semibold">批次操作（{selectedDates.length} 日）</p>
        <p className="text-xs text-slate-500">
          多選：拖曳範圍；Shift+點擊區間（含首尾）；Ctrl / ⌘ +點擊切換單日（Mac 用 ⌘）。
        </p>
        <div className="rounded border border-slate-200 p-2">
          <p className="text-xs font-semibold text-slate-600">跳動日數快速選取（例如逢一三五）</p>
          <div className="mt-1 flex flex-wrap gap-2 text-xs">
            {[
              ["mon", "一"],
              ["tue", "二"],
              ["wed", "三"],
              ["thu", "四"],
              ["fri", "五"],
              ["sat", "六"],
              ["sun", "日"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={weekdayPattern[key as keyof typeof weekdayPattern]}
                  onChange={(e) =>
                    setWeekdayPattern((prev) => ({ ...prev, [key]: e.target.checked }))
                  }
                />
                逢{label}
              </label>
            ))}
          </div>
          <button
            type="button"
            className="mt-2 rounded border px-2 py-1 text-xs"
            onClick={applyWeekdayPatternSelection}
          >
            套用跳動日數選取
          </button>
          <button
            type="button"
            className="mt-2 ml-2 rounded border px-2 py-1 text-xs"
            onClick={() =>
              setSelectedDates(
                Object.keys(days)
                  .sort()
                  .filter((date) => new Date(`${date}T00:00:00`).getDay() === 6),
              )
            }
          >
            全部星期六
          </button>
          <button
            type="button"
            className="mt-2 ml-2 rounded border px-2 py-1 text-xs"
            onClick={() =>
              applyBatchUpdate(
                Object.keys(days)
                  .sort()
                  .filter((date) => new Date(`${date}T00:00:00`).getDay() === 6),
                { type: DayType.PH, event: "星期六公眾假期" },
              )
            }
          >
            全部星期六設為 PH
          </button>
        </div>
        <select className="w-full rounded border px-2 py-1" value={batchType} onChange={(e) => setBatchType(e.target.value as DayType | "") }>
          <option value="">選擇日子類型</option>
          {selectableDayTypes.map((type) => (
            <option key={type} value={type}>
              {dayTypeLabel(type)}
            </option>
          ))}
        </select>
        <input className="w-full rounded border px-2 py-1" placeholder="新增活動（可選）" value={batchEvent} onChange={(e) => setBatchEvent(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={batchSuspendLessons} onChange={(e) => setBatchSuspendLessons(e.target.checked)} />
          暫停常規課堂
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={batchCountsAs190} onChange={(e) => setBatchCountsAs190(e.target.checked)} />
          計算為上課日（190）
        </label>
        <button
          type="button"
          className="w-full rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-40"
          disabled={selectedDates.length === 0 || (!batchType && !batchEvent && !batchSuspendLessons && !batchCountsAs190)}
          onClick={openBatchPreview}
        >
          預覽變更影響
        </button>
      </div>
      {day && activeDate ? (
        <div className="mt-4 space-y-3 rounded-lg border p-3">
          <p className="text-sm font-semibold">日期：{activeDate}</p>
          <label className="block text-sm">日子類型<select className="mt-1 w-full rounded border px-2 py-1" value={day.type} onChange={(e) => updateDay(activeDate, { type: e.target.value as DayType })}>{selectableDayTypes.map((type) => <option key={type} value={type}>{dayTypeLabel(type)}</option>)}</select></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={day.isLessonSuspended} onChange={(e) => updateDay(activeDate, { isLessonSuspended: e.target.checked })} />暫停常規課堂</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={day.countsAs190} onChange={(e) => updateDay(activeDate, { countsAs190: e.target.checked })} />計算為上課日（190）</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={day.isLocked} onChange={(e) => updateDay(activeDate, { isLocked: e.target.checked })} />鎖定循環日</label>
          <label className="block text-sm">覆蓋 Cycle Day<input type="number" min={1} value={day.cycleDay ?? ""} onChange={(e) => updateDay(activeDate, { cycleDay: e.target.value ? Number(e.target.value) : null, isLocked: true })} className="mt-1 w-full rounded border px-2 py-1" /></label>
          <form onSubmit={onSubmitEvent}><input name="eventName" placeholder="新增活動名稱" className="w-full rounded border px-2 py-1" /><button type="submit" className="mt-2 w-full rounded bg-emerald-600 px-3 py-2 text-sm text-white">新增活動</button></form>
          <div className="rounded bg-slate-100 p-2">
            <p className="text-xs font-medium text-slate-600">已登記活動</p>
            {(day.events || []).length > 0 ? (
              <ul className="mt-1 space-y-1 p-0">
                {day.events.map((eventName) => (
                  <li key={`${activeDate}-${eventName}`} className="list-none">
                    <DayEventChip date={activeDate} eventName={eventName} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-slate-500">尚無活動</p>
            )}
          </div>
          {trace ? (
            <div className={`rounded p-2 text-xs ${trace.included ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              假期配額追溯：{trace.reason}
            </div>
          ) : (
            <div className="rounded bg-slate-50 p-2 text-xs text-slate-500">
              假期配額追溯：此日目前不屬於 90 天假期配額計算重點。
            </div>
          )}
        </div>
      ) : <p className="mt-4 rounded border p-3 text-sm text-slate-600">請先從中間年曆點選日期。</p>}

      {previewOpen && batchPreview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-xl rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold">變更影響預覽</h3>
            <p className="mt-2 text-sm">
              合規影響：S1-3 上課日將由{" "}
              <span className="font-semibold">{batchPreview.beforeSchoolDays}</span> 變為{" "}
              <span className={`font-semibold ${batchPreview.afterSchoolDays < 190 ? "text-rose-600" : "text-emerald-600"}`}>
                {batchPreview.afterSchoolDays}
              </span>
            </p>
            <p className="mt-1 text-sm">
              90 天配額：School Holidays 將由{" "}
              <span className="font-semibold">{batchPreview.beforeHolidayQuota}</span> 變為{" "}
              <span className={`font-semibold ${batchPreview.afterHolidayQuota > 90 ? "text-rose-600" : "text-emerald-600"}`}>
                {batchPreview.afterHolidayQuota}
              </span>
            </p>
            {batchPreview.afterSchoolDays < 190 ? (
              <p className="mt-1 text-sm text-rose-600">警告：上課日數不足，請取消部分假期。</p>
            ) : null}
            {batchPreview.afterHolidayQuota > 90 ? (
              <p className="mt-1 text-sm text-rose-600">警告：School Holidays 超過 90 天上限。</p>
            ) : null}
            <div className="mt-3 rounded border p-3">
              <p className="text-sm font-semibold">循環周變動預覽（前 5 筆）</p>
              {batchPreview.cycleChanges.length === 0 ? (
                <p className="mt-1 text-sm text-slate-600">本次變更未影響後續 Cycle Day。</p>
              ) : (
                <ul className="mt-1 space-y-1 text-sm text-slate-700">
                  {batchPreview.cycleChanges.map((item) => (
                    <li key={item.date}>
                      {item.date}：Day {item.from ?? "-"} {"->"} Day {item.to ?? "-"}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded border px-3 py-2 text-sm" onClick={() => setPreviewOpen(false)}>
                取消
              </button>
              <button type="button" className="rounded bg-blue-600 px-3 py-2 text-sm text-white" onClick={confirmBatchApply}>
                確認套用
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
