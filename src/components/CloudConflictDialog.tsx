"use client";

import { CalendarSnapshotRecord } from "@/types/calendar-snapshot";

interface Props {
  snapshot: CalendarSnapshotRecord;
  onKeepLocal: () => void;
  onLoadRemote: () => void;
  onCancel: () => void;
}

export function CloudConflictDialog({ snapshot, onKeepLocal, onLoadRemote, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">雲端版本不一致</h3>
        <p className="mt-2 text-sm text-slate-600">
          雲端已有較新版本（最後由 <span className="font-medium">{snapshot.updatedBy}</span> 於{" "}
          {new Date(snapshot.updatedAt).toLocaleString("zh-HK")} 更新）。請選擇要如何處理你目前的編輯。
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="rounded border px-3 py-2 text-sm" onClick={onCancel}>
            稍後再決定
          </button>
          <button
            type="button"
            className="rounded border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800"
            onClick={onLoadRemote}
          >
            載入雲端版本
          </button>
          <button type="button" className="rounded bg-blue-600 px-3 py-2 text-sm text-white" onClick={onKeepLocal}>
            保留本機編輯
          </button>
        </div>
      </div>
    </div>
  );
}
