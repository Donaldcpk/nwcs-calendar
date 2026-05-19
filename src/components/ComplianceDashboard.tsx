import { ComplianceMetrics } from "@/hooks/use-compliance";

interface Props {
  metrics: ComplianceMetrics;
  collapsed: boolean;
  onToggle: () => void;
}

function metricColor(ok: boolean): string {
  return ok ? "text-emerald-600" : "text-rose-600";
}

export function ComplianceDashboard({ metrics, collapsed, onToggle }: Props) {
  if (collapsed) {
    return (
      <aside className="sticky top-0 flex h-screen w-14 flex-col items-center gap-3 border-r border-slate-200 bg-white py-3">
        <button
          type="button"
          onClick={onToggle}
          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
          aria-label="展開 EDB 合規儀表板"
          title="展開 EDB 合規儀表板"
        >
          »
        </button>
        <div className="flex w-full flex-1 flex-col items-center gap-2 px-2">
          <p className={`w-full rounded border px-1 py-1 text-center text-[10px] font-semibold ${metricColor(metrics.schoolDays >= 190)}`}>190</p>
          <p className={`w-full rounded border px-1 py-1 text-center text-[10px] font-semibold ${metricColor(metrics.schoolHolidayQuota <= 90)}`}>90</p>
          <p
            className={`w-full rounded border px-1 py-1 text-center text-[10px] font-semibold ${metricColor(
              metrics.ssSchoolYear.count <= metrics.ssSchoolYear.cap,
            )}`}
            title="S&S 週末（學年合計）"
          >
            S&S
          </p>
          <p className={`w-full rounded border px-1 py-1 text-center text-[10px] font-semibold ${metricColor(metrics.dhDays <= 3)}`}>DH</p>
          <p className={`w-full rounded border px-1 py-1 text-center text-[10px] font-semibold ${metricColor(metrics.sddDays <= 3)}`}>SDD</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="sticky top-0 h-screen overflow-auto border-r border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">EDB 合規儀表板</h2>
        <button
          type="button"
          onClick={onToggle}
          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
          aria-label="收合 EDB 合規儀表板"
          title="收合 EDB 合規儀表板"
        >
          «
        </button>
      </div>
      <div className="mt-3 space-y-2">
        <div className="rounded-lg border p-2"><p className="text-xs text-slate-600">S1-S3 上課日數</p><p className={`text-xl font-bold ${metricColor(metrics.schoolDays >= 190)}`}>{metrics.schoolDays}</p><p className="text-[11px] text-slate-500">目標: ≥ 190</p></div>
        <div className="rounded-lg border p-2"><p className="text-xs text-slate-600">學校假期</p><p className={`text-xl font-bold ${metricColor(metrics.schoolHolidayQuota <= 90)}`}>{metrics.schoolHolidayQuota}</p><p className="text-[11px] text-slate-500">上限: 90</p></div>
        <div className="rounded-lg border p-2"><p className="text-xs text-slate-600">DH</p><p className={`text-xl font-bold ${metricColor(metrics.dhDays <= 3)}`}>{metrics.dhDays}</p><p className="text-[11px] text-slate-500">上限: 3</p></div>
        <div className="rounded-lg border p-2"><p className="text-xs text-slate-600">SDD</p><p className={`text-xl font-bold ${metricColor(metrics.sddDays <= 3)}`}>{metrics.sddDays}</p><p className="text-[11px] text-slate-500">上限: 3</p></div>
        <div className="rounded-lg border p-2">
          <p className="text-xs text-slate-600">S&S（不計入 90 之週末）</p>
          <p className="text-[11px] text-slate-500">
            以整個學年統一計算（不按曆年拆分）；PH 與 S&S 互斥。學年上限：含 2/29 為 80 天，否則 79 天。
          </p>
          <div className="mt-2 flex items-baseline justify-between gap-2 text-sm">
            <span className="text-slate-600">{metrics.ssSchoolYear.label}</span>
            <span className={`font-semibold ${metricColor(metrics.ssSchoolYear.count <= metrics.ssSchoolYear.cap)}`}>
              {metrics.ssSchoolYear.count}/{metrics.ssSchoolYear.cap}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
