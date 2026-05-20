import * as XLSX from "xlsx";

export function downloadCalendarTemplate(): void {
  const rows = [
    { 日期: "2026-09-01", 類型: "Normal", 循環日: 1, 活動: "" },
    { 日期: "2026-09-06", 類型: "PH", 循環日: "", 活動: "公眾假期" },
    { 日期: "2026-09-15", 類型: "Event", 循環日: 4, 活動: "家長晚會" },
    { 日期: "2026-10-02", 類型: "SH", 循環日: "", 活動: "陸運會補假" },
    { 日期: "2026-10-20", 類型: "Exam", 循環日: 2, 活動: "中期測驗週" },
  ];

  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "SchoolCalendarTemplate");

  const noteRows = [
    ["可接受類型值", "Normal / PH / SH / SDD / DH / Exam / Event"],
    ["日期格式", "YYYY-MM-DD（建議）"],
    ["活動欄", "可留空；多個活動可用 ; 分隔"],
  ];
  const noteSheet = XLSX.utils.aoa_to_sheet(noteRows);
  XLSX.utils.book_append_sheet(workbook, noteSheet, "說明");

  XLSX.writeFile(workbook, "SchoolCalendar-Template.xlsx");
}
