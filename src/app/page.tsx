"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { isAfter, isBefore, parseISO } from "date-fns";
import { toast } from "sonner";
import { ComplianceDashboard } from "@/components/ComplianceDashboard";
import { SettingsPanel } from "@/components/SettingsPanel";
import { UserAuthStatus } from "@/components/UserAuthStatus";
import { YearGrid } from "@/components/YearGrid";
import { ActionPanel } from "@/components/ActionPanel";
import { useCalendarStore } from "@/store/calendar-store";
import { useCompliance } from "@/hooks/use-compliance";
import { downloadWebSamsCsv } from "@/lib/export-websams";
import { CalendarSnapshotPayload, CalendarSnapshotRecord } from "@/types/calendar-snapshot";

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
  const cycleLength = useCalendarStore((state) => state.cycleLength);
  const replaceCalendarState = useCalendarStore((state) => state.replaceCalendarState);
  const metrics = useCompliance(days);
  const allDates = useMemo(() => Object.keys(days).sort(), [days]);
  const [activeTab, setActiveTab] = useState<"calendar" | "settings">("calendar");
  const [dashboardCollapsed, setDashboardCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragAnchor, setDragAnchor] = useState<string | null>(null);
  const [lastShiftAnchor, setLastShiftAnchor] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<"loading" | "ready" | "saving" | "saved" | "conflict" | "error">("loading");
  const [bootstrapReady, setBootstrapReady] = useState(false);
  const [lastSavedInfo, setLastSavedInfo] = useState<{ at: string; by: string } | null>(null);
  const remoteVersionRef = useRef<number | null>(null);
  const readyRef = useRef(false);
  const skipNextSaveRef = useRef(false);

  useEffect(() => { metrics.warnings.forEach((warning) => toast.warning(warning)); }, [metrics.warnings]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isMeta = event.ctrlKey || event.metaKey;
      if (isMeta && event.key.toLowerCase() === "z" && !event.shiftKey) { event.preventDefault(); useCalendarStore.getState().undo(); }
      if (isMeta && ((event.key.toLowerCase() === "z" && event.shiftKey) || event.key.toLowerCase() === "y")) {
        event.preventDefault();
        useCalendarStore.getState().redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const schoolYearKey = `${schoolYearStart.slice(0, 4)}-${schoolYearEnd.slice(0, 4)}`;

  useEffect(() => {
    let mounted = true;
    readyRef.current = false;
    setBootstrapReady(false);
    setSyncState("loading");

    const bootstrap = async () => {
      await useCalendarStore.persist.rehydrate();
      if (!mounted) return;

      const key = `${useCalendarStore.getState().schoolYearStart.slice(0, 4)}-${useCalendarStore.getState().schoolYearEnd.slice(0, 4)}`;

      try {
        const response = await fetch(`/api/calendar-state?schoolYear=${encodeURIComponent(key)}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("無法載入雲端校曆資料");
        }

        const body = (await response.json()) as { snapshot: CalendarSnapshotRecord | null };
        if (!mounted) return;

        if (body.snapshot) {
          skipNextSaveRef.current = true;
          replaceCalendarState(body.snapshot.payload);
          remoteVersionRef.current = body.snapshot.version;
          setLastSavedInfo({ at: body.snapshot.updatedAt, by: body.snapshot.updatedBy });
        } else {
          remoteVersionRef.current = null;
          setLastSavedInfo(null);
        }
        setSyncState("ready");
      } catch {
        if (!mounted) return;
        setSyncState("error");
        toast.error("載入雲端校曆失敗，已暫時保留目前畫面資料（含本機草稿）。");
      } finally {
        if (!mounted) return;
        readyRef.current = true;
        setBootstrapReady(true);
      }
    };

    void bootstrap();
    return () => {
      mounted = false;
    };
  }, [replaceCalendarState, schoolYearStart, schoolYearEnd]);

  useEffect(() => {
    if (!readyRef.current) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    const payload: CalendarSnapshotPayload = {
      days,
      cycleLength,
      schoolYearStart,
      schoolYearEnd,
      exportMapping,
    };

    const timer = window.setTimeout(async () => {
      setSyncState("saving");
      try {
        const response = await fetch("/api/calendar-state", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schoolYear: schoolYearKey,
            payload,
            expectedVersion: remoteVersionRef.current,
          }),
        });

        if (response.status === 409) {
          const conflictBody = (await response.json()) as { snapshot: CalendarSnapshotRecord | null };
          if (conflictBody.snapshot) {
            skipNextSaveRef.current = true;
            replaceCalendarState(conflictBody.snapshot.payload);
            remoteVersionRef.current = conflictBody.snapshot.version;
            setLastSavedInfo({ at: conflictBody.snapshot.updatedAt, by: conflictBody.snapshot.updatedBy });
          }
          setSyncState("conflict");
          toast.warning("雲端版本較新，已同步為最新資料。");
          return;
        }

        if (!response.ok) {
          throw new Error("儲存失敗");
        }

        const body = (await response.json()) as { snapshot: CalendarSnapshotRecord };
        remoteVersionRef.current = body.snapshot.version;
        setLastSavedInfo({ at: body.snapshot.updatedAt, by: body.snapshot.updatedBy });
        setSyncState("saved");
      } catch {
        setSyncState("error");
        toast.error("雲端儲存失敗，請稍後再試。");
      }
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [days, cycleLength, schoolYearStart, schoolYearEnd, exportMapping, schoolYearKey, replaceCalendarState]);

  const schoolYearLabel = `${schoolYearStart.slice(0, 4)}-${schoolYearEnd.slice(0, 4)}年度`;
  const syncLabel = useMemo(() => {
    if (!bootstrapReady || syncState === "loading") return "正在載入本機與雲端資料...";
    if (syncState === "saving") return "雲端儲存中...";
    if (syncState === "saved" && lastSavedInfo) return `已儲存 ${new Date(lastSavedInfo.at).toLocaleString("zh-HK")}（${lastSavedInfo.by}）`;
    if (syncState === "conflict") return "偵測到他人更新，已同步最新版本";
    if (syncState === "error") return "雲端同步異常，請檢查網路或稍後重試";
    return "已連接雲端共享校曆";
  }, [lastSavedInfo, syncState, bootstrapReady]);

  return (
    <main className={`grid min-h-screen ${dashboardCollapsed ? "grid-cols-[56px_1fr_340px]" : "grid-cols-[220px_1fr_340px]"}`}>
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
          <div className="flex items-center gap-2">
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
            onMouseDownDate={(date, withShift) => {
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
            onClickDate={(date, withShift, withCtrl) => {
              if (withShift && lastShiftAnchor) {
                setSelectedDates(collectDateRange(lastShiftAnchor, date, allDates));
                setActiveDate(date);
                setLastShiftAnchor(date);
                return;
              }
              if (withCtrl) {
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
