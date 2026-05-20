"use client";

import { useEffect, useMemo, useState } from "react";
import { isAfter, isBefore, parseISO } from "date-fns";
import { toast } from "sonner";
import { ActionPanel } from "@/components/ActionPanel";
import { CloudConflictDialog } from "@/components/CloudConflictDialog";
import { ComplianceDashboard } from "@/components/ComplianceDashboard";
import { SettingsPanel } from "@/components/SettingsPanel";
import { UserAuthStatus } from "@/components/UserAuthStatus";
import { YearGrid } from "@/components/YearGrid";
import { useCloudSync } from "@/hooks/use-cloud-sync";
import { useCompliance } from "@/hooks/use-compliance";
import { downloadSchoolYearExcelArchive } from "@/lib/export-excel-archive";
import { downloadWebSamsCsv } from "@/lib/export-websams";
import { useCalendarStore } from "@/store/calendar-store";

function collectDateRange(start: string, end: string, allDates: string[]): string[] {
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  const [minDate, maxDate] = isAfter(startDate, endDate) ? [endDate, startDate] : [startDate, endDate];
  return allDates.filter((date) => {
    const d = parseISO(date);
    return !isBefore(d, minDate) && !isAfter(d, maxDate);
  });
}

export default function Home() {
  const days = useCalendarStore((state) => state.days);
  const selectedDates = useCalendarStore((state) => state.selectedDates);
  const setSelectedDates = useCalendarStore((state) => state.setSelectedDates);
  const setActiveDate = useCalendarStore((state) => state.setActiveDate);
  const exportMapping = useCalendarStore((state) => state.exportMapping);
  const schoolYearStart = useCalendarStore((state) => state.schoolYearStart);
  const schoolYearEnd = useCalendarStore((state) => state.schoolYearEnd);
  const metrics = useCompliance(days, schoolYearStart, schoolYearEnd);
  const allDates = useMemo(() => Object.keys(days).sort(), [days]);
  const [activeTab, setActiveTab] = useState<"calendar" | "settings">("calendar");
  const [dashboardCollapsed, setDashboardCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragAnchor, setDragAnchor] = useState<string | null>(null);
  const [lastShiftAnchor, setLastShiftAnchor] = useState<string | null>(null);

  const schoolYearKey = `${schoolYearStart.slice(0, 4)}-${schoolYearEnd.slice(0, 4)}`;
  const {
    syncState,
    bootstrapReady,
    syncLabel,
    pendingConflict,
    keepLocalEdits,
    loadRemoteVersion,
    dismissConflict,
  } = useCloudSync({ schoolYearKey, schoolYearStart, schoolYearEnd });

  useEffect(() => {
    metrics.warnings.forEach((warning) => toast.warning(warning));
  }, [metrics.warnings]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isMeta = event.ctrlKey || event.metaKey;
      if (isMeta && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        useCalendarStore.getState().undo();
      }
      if (isMeta && ((event.key.toLowerCase() === "z" && event.shiftKey) || event.key.toLowerCase() === "y")) {
        event.preventDefault();
        useCalendarStore.getState().redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const schoolYearLabel = `${schoolYearStart.slice(0, 4)}-${schoolYearEnd.slice(0, 4)}年度`;
  const archiveFilename = `NWCS_${schoolYearStart.slice(0, 4)}-${schoolYearEnd.slice(2, 4)}_校曆存檔.xlsx`;

  return (
    <main className={`grid min-h-screen ${dashboardCollapsed ? "grid-cols-[56px_1fr_340px]" : "grid-cols-[220px_1fr_340px]"}`}>
      {pendingConflict ? (
        <CloudConflictDialog
          snapshot={pendingConflict.snapshot}
          onKeepLocal={keepLocalEdits}
          onLoadRemote={loadRemoteVersion}
          onCancel={dismissConflict}
        />
      ) : null}

      <ComplianceDashboard
        metrics={metrics}
        collapsed={dashboardCollapsed}
        onToggle={() => setDashboardCollapsed((prev) => !prev)}
      />
      <div className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between border-b bg-white px-4 py-3">
          <div>
            <h1 className="text-xl font-bold">伍華中學校曆編排系統</h1>
            <p className="text-sm text-slate-600">學年：{schoolYearLabel}（9/1 到翌年 8/31）</p>
            <p className={`text-xs ${syncState === "error" ? "text-rose-600" : "text-slate-500"}`}>{syncLabel}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              className={`rounded px-3 py-2 text-sm ${activeTab === "calendar" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
              onClick={() => setActiveTab("calendar")}
            >
              日曆
            </button>
            <button
              type="button"
              className={`rounded px-3 py-2 text-sm ${activeTab === "settings" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
              onClick={() => setActiveTab("settings")}
            >
              設定
            </button>
            <button
              type="button"
              className="rounded border border-emerald-600 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 hover:bg-emerald-100"
              onClick={() => downloadSchoolYearExcelArchive(days, schoolYearStart, schoolYearEnd, archiveFilename)}
            >
              下載 Excel 存檔
            </button>
            <button
              type="button"
              className="rounded bg-slate-900 px-4 py-2 text-sm text-white"
              onClick={() => downloadWebSamsCsv(days, exportMapping)}
            >
              匯出 WebSAMS CSV
            </button>
            <button
              type="button"
              className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              onClick={() => setDashboardCollapsed((prev) => !prev)}
            >
              {dashboardCollapsed ? "展開 EDB 儀表板" : "收合 EDB 儀表板"}
            </button>
            <UserAuthStatus />
          </div>
        </div>
        {!bootstrapReady ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-slate-50 p-8 text-slate-600">
            <p className="text-sm font-medium">正在同步本機與雲端校曆…</p>
            <p className="text-xs text-slate-500">請稍候，避免在載入完成前編排以免資料錯序。</p>
          </div>
        ) : activeTab === "calendar" ? (
          <YearGrid
            days={days}
            selectedDates={selectedDates}
            onMouseDownDate={(date, withShift, withModifier) => {
              if (withModifier) return;
              if (withShift && lastShiftAnchor) {
                setIsDragging(true);
                setDragAnchor(lastShiftAnchor);
                setSelectedDates(collectDateRange(lastShiftAnchor, date, allDates));
                setActiveDate(date);
                return;
              }
              if (withShift) return;
              setIsDragging(true);
              setDragAnchor(date);
              setLastShiftAnchor(date);
              setSelectedDates([date]);
              setActiveDate(date);
            }}
            onMouseEnterDate={(date) => {
              if (!isDragging || !dragAnchor) return;
              setSelectedDates(collectDateRange(dragAnchor, date, allDates));
            }}
            onMouseUp={() => setIsDragging(false)}
            onClickDate={(date, withShift, withModifier) => {
              if (withShift && lastShiftAnchor) {
                setSelectedDates(collectDateRange(lastShiftAnchor, date, allDates));
                setActiveDate(date);
                setLastShiftAnchor(date);
                return;
              }
              if (withModifier) {
                const exists = selectedDates.includes(date);
                const next = exists ? selectedDates.filter((d) => d !== date) : [...selectedDates, date];
                setSelectedDates(next);
                setActiveDate(date);
                setLastShiftAnchor(date);
                return;
              }
              setSelectedDates([date]);
              setActiveDate(date);
              setLastShiftAnchor(date);
            }}
          />
        ) : (
          <SettingsPanel />
        )}
      </div>
      <ActionPanel />
    </main>
  );
}
