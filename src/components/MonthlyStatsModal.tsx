"use client";

import { MonthTypeStatsSummary } from "@/lib/month-type-stats";

interface Props {
  summary: MonthTypeStatsSummary;
  targetMonthLabel: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function MonthlyStatsModal({ summary, targetMonthLabel, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold">{summary.monthLabel} 類型日數統計</h3>
        <p className="mt-1 text-sm text-slate-600">
          前往{targetMonthLabel ? `「${targetMonthLabel}」` : "下一個月"}前，請確認本月統計。
        </p>
        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-slate-600">
              <th className="py-2 pr-4">類型</th>
              <th className="py-2 text-right">日數</th>
            </tr>
          </thead>
          <tbody>
            {summary.rows.map((row) => (
              <tr key={row.label} className="border-b border-slate-100">
                <td className="py-2 pr-4">{row.label}</td>
                <td className="py-2 text-right font-medium">{row.count}</td>
              </tr>
            ))}
            <tr className="font-semibold text-slate-900">
              <td className="py-2 pr-4">本月總日數</td>
              <td className="py-2 text-right">{summary.totalDays}</td>
            </tr>
          </tbody>
        </table>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="rounded border px-3 py-2 text-sm" onClick={onCancel}>
            取消
          </button>
          <button type="button" className="rounded bg-violet-600 px-3 py-2 text-sm text-white" onClick={onConfirm}>
            確認{targetMonthLabel ? `並前往 ${targetMonthLabel}` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
