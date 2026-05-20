"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useCalendarStore } from "@/store/calendar-store";
import { CalendarSnapshotPayload, CalendarSnapshotRecord } from "@/types/calendar-snapshot";

export type CloudSyncState = "loading" | "ready" | "saving" | "saved" | "conflict" | "error";

interface PendingConflict {
  snapshot: CalendarSnapshotRecord;
}

interface UseCloudSyncOptions {
  schoolYearKey: string;
  schoolYearStart: string;
  schoolYearEnd: string;
}

export function useCloudSync({ schoolYearKey, schoolYearStart, schoolYearEnd }: UseCloudSyncOptions) {
  const { data: session } = useSession();
  const days = useCalendarStore((s) => s.days);
  const cycleLength = useCalendarStore((s) => s.cycleLength);
  const exportMapping = useCalendarStore((s) => s.exportMapping);
  const replaceCalendarState = useCalendarStore((s) => s.replaceCalendarState);

  const [syncState, setSyncState] = useState<CloudSyncState>("loading");
  const [bootstrapReady, setBootstrapReady] = useState(false);
  const [lastSavedInfo, setLastSavedInfo] = useState<{ at: string; by: string } | null>(null);
  const [pendingConflict, setPendingConflict] = useState<PendingConflict | null>(null);

  const remoteVersionRef = useRef<number | null>(null);
  const readyRef = useRef(false);
  const skipNextSaveRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const saveQueuedRef = useRef(false);
  const debounceTimerRef = useRef<number | null>(null);

  const currentEmail = session?.user?.email?.trim().toLowerCase() ?? "";

  const buildPayload = useCallback(
    (): CalendarSnapshotPayload => ({
      days,
      cycleLength,
      schoolYearStart,
      schoolYearEnd,
      exportMapping,
    }),
    [days, cycleLength, schoolYearStart, schoolYearEnd, exportMapping],
  );

  const performSave = useCallback(
    async (retryVersion?: number) => {
      if (saveInFlightRef.current) {
        saveQueuedRef.current = true;
        return;
      }
      saveInFlightRef.current = true;
      setSyncState("saving");

      const payload = buildPayload();
      const expectedVersion = retryVersion ?? remoteVersionRef.current;

      try {
        const response = await fetch("/api/calendar-state", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schoolYear: schoolYearKey,
            payload,
            expectedVersion,
          }),
        });

        if (response.status === 409) {
          const conflictBody = (await response.json()) as { snapshot: CalendarSnapshotRecord | null };
          const remote = conflictBody.snapshot;
          if (!remote) {
            setSyncState("error");
            toast.error("雲端版本衝突，但無法取得遠端資料。");
            return;
          }

          const remoteBy = remote.updatedBy?.trim().toLowerCase() ?? "";
          if (currentEmail && remoteBy === currentEmail) {
            remoteVersionRef.current = remote.version;
            saveInFlightRef.current = false;
            await performSave(remote.version);
            toast.info("版本同步中，已保留你的編輯。");
            return;
          }

          setPendingConflict({ snapshot: remote });
          setSyncState("conflict");
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
      } finally {
        saveInFlightRef.current = false;
        if (saveQueuedRef.current) {
          saveQueuedRef.current = false;
          void performSave();
        }
      }
    },
    [buildPayload, schoolYearKey, currentEmail],
  );

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
        if (!response.ok) throw new Error("無法載入雲端校曆資料");

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

    if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = window.setTimeout(() => {
      void performSave();
    }, 1200);

    return () => {
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
    };
  }, [days, cycleLength, schoolYearStart, schoolYearEnd, exportMapping, schoolYearKey, performSave]);

  const keepLocalEdits = useCallback(() => {
    const version = pendingConflict?.snapshot.version ?? remoteVersionRef.current ?? undefined;
    setPendingConflict(null);
    setSyncState("saving");
    void performSave(version);
  }, [performSave, pendingConflict]);

  const loadRemoteVersion = useCallback(() => {
    if (!pendingConflict) return;
    skipNextSaveRef.current = true;
    replaceCalendarState(pendingConflict.snapshot.payload);
    remoteVersionRef.current = pendingConflict.snapshot.version;
    setLastSavedInfo({
      at: pendingConflict.snapshot.updatedAt,
      by: pendingConflict.snapshot.updatedBy,
    });
    setPendingConflict(null);
    setSyncState("saved");
    toast.warning("已載入雲端版本，本機未儲存的變更已捨棄。");
  }, [pendingConflict, replaceCalendarState]);

  const syncLabel = useMemo(() => {
    if (!bootstrapReady || syncState === "loading") return "正在載入本機與雲端資料...";
    if (syncState === "saving") return "雲端儲存中...";
    if (syncState === "saved" && lastSavedInfo) {
      return `已儲存 ${new Date(lastSavedInfo.at).toLocaleString("zh-HK")}（${lastSavedInfo.by}）`;
    }
    if (syncState === "conflict" && pendingConflict) return "雲端與本機版本不一致，請選擇保留方式";
    if (syncState === "error") return "雲端同步異常，請檢查網路或稍後重試";
    return "已連接雲端共享校曆";
  }, [bootstrapReady, syncState, lastSavedInfo, pendingConflict]);

  return {
    syncState,
    bootstrapReady,
    syncLabel,
    pendingConflict,
    keepLocalEdits,
    loadRemoteVersion,
    dismissConflict: () => setPendingConflict(null),
  };
}
