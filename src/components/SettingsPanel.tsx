"use client";

import { useState } from "react";
import { toast } from "sonner";
import { fetchHongKongPublicHolidayEvents } from "@/lib/hk-public-holidays";
import { downloadCalendarTemplate } from "@/lib/template-export";
import { parseTemplateWorkbook } from "@/lib/template-import";
import { hkPublicHolidays2026to2027 } from "@/lib/hk-school-holidays-2026-2027";
import { parseSdecMonthlyCsvFile } from "@/lib/parse-sdec-monthly-csv";
import { useCalendarStore } from "@/store/calendar-store";
import { SchoolDayMap } from "@/types/school-day";

export function SettingsPanel() {
  const mapping = useCalendarStore((state) => state.exportMapping);
  const setExportMapping = useCalendarStore((state) => state.setExportMapping);
  const applyPublicHolidays = useCalendarStore((state) => state.applyPublicHolidays);
  const importTemplateUpdates = useCalendarStore((state) => state.importTemplateUpdates);
  const applySdecSeed = useCalendarStore((state) => state.applySdecSeed);
  const applySdecCatalog = useCalendarStore((state) => state.applySdecCatalog);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [holidayPreview, setHolidayPreview] = useState<Array<{ date: string; summary: string }>>([]);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [pendingTemplateUpdates, setPendingTemplateUpdates] = useState<Partial<SchoolDayMap> | null>(null);
  const [pendingTemplateName, setPendingTemplateName] = useState<string>("");

  const fields: Array<{ key: keyof typeof mapping; label: string }> = [
    { key: "date", label: "日期欄位" },
    { key: "dayType", label: "日子類型欄位" },
    { key: "cycleDay", label: "循環日欄位" },
    { key: "suspendLessons", label: "停課欄位" },
    { key: "countsAs190", label: "190計算欄位" },
    { key: "locked", label: "鎖定欄位" },
    { key: "events", label: "活動欄位" },
  ];

  const handleFetchHolidays = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchHongKongPublicHolidayEvents(year);
      setHolidayPreview(result);
    } catch {
      setError("無法載入香港公眾假期資料，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  const handleInjectHolidays = () => {
    if (holidayPreview.length === 0) return;
    const applied = applyPublicHolidays(holidayPreview, overwriteExisting);
    toast.success(`已套用 ${applied} 天公眾假期`);
  };

  const handleApplyOfficialList2026to2027 = () => {
    const applied = applyPublicHolidays(hkPublicHolidays2026to2027, true);
    setHolidayPreview(hkPublicHolidays2026to2027);
    toast.success(`已套用官方清單，共 ${applied} 天`);
  };

  const handleApplySdecCsvSeed = () => {
    const applied = applySdecSeed(overwriteExisting);
    toast.success(`已套用 SDEC 2026-27 月曆資料，共更新 ${applied} 天（假期＋活動）`);
  };

  const handleImportSdecEventCsv = async (file: File | null) => {
    if (!file) return;
    setTemplateLoading(true);
    setError(null);
    try {
      const catalog = await parseSdecMonthlyCsvFile(file);
      const applied = applySdecCatalog(catalog, overwriteExisting);
      toast.success(`已從 SDEC CSV 匯入 ${catalog.activityCatalogRows.length} 項活動／假期，更新 ${applied} 天`);
    } catch {
      setError("SDEC CSV 匯入失敗，請確認格式為：活動名稱,開始日期,結束日期");
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleImportTemplate = async (file: File | null) => {
    if (!file) return;
    setTemplateLoading(true);
    setError(null);
    try {
      const updates = await parseTemplateWorkbook(file);
      setPendingTemplateUpdates(updates);
      setPendingTemplateName(file.name);
    } catch {
      setError("範本匯入失敗，請確認檔案欄位包含日期與日子類型。");
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleApplyTemplate = () => {
    if (!pendingTemplateUpdates) return;
    const applied = importTemplateUpdates(pendingTemplateUpdates, overwriteExisting);
    setPendingTemplateUpdates(null);
    setPendingTemplateName("");
    toast.success(`範本匯入完成，已更新 ${applied} 天`);
  };

  return (
    <section className="h-screen overflow-auto bg-slate-50 p-4">
      <h2 className="mb-4 text-lg font-semibold">設定 / WebSAMS 匯出映射</h2>
      <div className="rounded-lg border bg-white p-4">
        <p className="mb-3 text-sm text-slate-600">可自訂內部欄位輸出到 WebSAMS CSV 的欄名，設定會自動保存。</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {fields.map((field) => (
            <label key={field.key} className="text-sm">
              {field.label}
              <input
                className="mt-1 w-full rounded border px-2 py-1"
                value={mapping[field.key]}
                onChange={(event) => setExportMapping({ [field.key]: event.target.value })}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-lg border bg-white p-4">
        <h3 className="text-base font-semibold">範本匯入（Excel）</h3>
        <p className="mt-1 text-sm text-slate-600">
          可直接匯入現有校曆範本（例如 `2627 School Calendar.xlsx`），系統會自動對應日期、類型、活動與循環日。
        </p>
        <button
          type="button"
          className="mt-3 rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          onClick={downloadCalendarTemplate}
        >
          先下載標準匯入範本
        </button>
        <div className="mt-3 flex items-center gap-3">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="block w-full rounded border bg-white px-2 py-2 text-sm"
            onChange={(event) => handleImportTemplate(event.target.files?.[0] ?? null)}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          支援欄位名稱：Date/日期、Day Type/類型/假期、Cycle Day/循環日、Events/活動/備註。
        </p>
        {templateLoading ? <p className="mt-2 text-sm text-slate-600">正在匯入範本...</p> : null}
        {pendingTemplateUpdates ? (
          <div className="mt-3 rounded border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm font-semibold text-blue-800">下一步：確認套用匯入</p>
            <p className="mt-1 text-sm text-blue-700">
              已讀取檔案 `{pendingTemplateName}`，共 {Object.keys(pendingTemplateUpdates).length} 筆日期資料可套用。
            </p>
            <button
              type="button"
              className="mt-2 rounded bg-blue-600 px-3 py-2 text-sm text-white"
              onClick={handleApplyTemplate}
            >
              確認匯入到日曆
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-4 rounded-lg border bg-white p-4">
        <h3 className="text-base font-semibold">SDEC 2026-27 月曆（假期＋活動）</h3>
        <p className="mt-1 text-sm text-slate-600">
          依 MonthlyCalendar_2026_2027 CSV：學校假期、公眾假期、教師發展日與全年活動。若雲端已有舊資料，請先勾選下方「覆蓋既有資料」。
        </p>
        <button
          type="button"
          className="mt-3 rounded bg-violet-600 px-3 py-2 text-sm text-white hover:bg-violet-700"
          onClick={handleApplySdecCsvSeed}
        >
          套用內建 SDEC 2026-27 完整月曆資料
        </button>
        <div className="mt-3">
          <p className="text-xs text-slate-500">或上傳 `MonthlyCalendar_*_SDEC event.csv`（與校曆存檔「活動一覽」欄位一致）</p>
          <input
            type="file"
            accept=".csv"
            className="mt-1 block w-full rounded border bg-white px-2 py-2 text-sm"
            onChange={(event) => handleImportSdecEventCsv(event.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      <div className="mt-4 rounded-lg border bg-white p-4">
        <h3 className="text-base font-semibold">一鍵抓取香港公眾假期（Preview）</h3>
        <p className="mt-1 text-sm text-slate-600">先載入資料，再一鍵套用為 PH。可選擇是否覆蓋既有資料。</p>
        <button
          type="button"
          className="mt-3 rounded border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-100"
          onClick={handleApplyOfficialList2026to2027}
        >
          套用你提供的 2026-2027 官方假期清單（建議）
        </button>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            className="w-32 rounded border px-2 py-1"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
          />
          <button
            type="button"
            className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-40"
            disabled={loading}
            onClick={handleFetchHolidays}
          >
            {loading ? "載入中..." : "抓取 1823 公眾假期"}
          </button>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={overwriteExisting}
            onChange={(event) => setOverwriteExisting(event.target.checked)}
          />
          覆蓋既有資料（未勾選時為「保留現有設定」）
        </label>
        <button
          type="button"
          className="mt-3 rounded bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-40"
          disabled={holidayPreview.length === 0 || loading}
          onClick={handleInjectHolidays}
        >
          一鍵寫入香港公眾假期為 PH
        </button>
        {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
        {holidayPreview.length > 0 ? (
          <ul className="mt-3 grid grid-cols-2 gap-1 text-sm text-slate-700">
            {holidayPreview.slice(0, 20).map((item) => (
              <li key={`${item.date}-${item.summary}`}>{item.date} {item.summary}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
