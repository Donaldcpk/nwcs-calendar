# Changelog

All notable changes to this project are documented in this file.

The format follows Keep a Changelog, and this project follows Semantic Versioning.

## [Unreleased]

## [0.2.2] – 2026-05-20

### Added
- Mac ⌘ + 點擊多選（與 Ctrl 相同）；日曆每月橫幅與跨月紫色邊線。
- 「按活動」檢視依日子類型上色。

### Changed
- S&S 改為整個學年（如 2026-27）統一計算，上限 79/80；PH 週末不計入 S&S。

## [0.2.1] – 2026-05-20

### Security
- 從 README、`.env.example`、`docs/DEPLOYMENT.md` 移除學校 email、專屬網域等可識別私人資訊；敏感值僅保留在 Vercel / `.env.local`。

## [0.2.0] – 2026-05-20

### Added
- `.env.example` 與 `docs/DEPLOYMENT.md`。
- 推送完整 Next.js 校曆 MVP。

### Changed
- 取代 Vercel 上舊版 Create React App 部署目標（需於 Vercel 後台確認 Framework 為 Next.js 並 Redeploy）。

## [0.1.0] – 2026-05-19

### Added
- 初始化 Next.js + TailwindCSS 前端基礎。
- 建立 SchoolDay 資料模型與 Zustand 全域狀態。
- 新增 Cycle Engine、Compliance Tracker、三欄式年曆 UI。
- 新增 Undo/Redo、localStorage 持久化、WebSAMS CSV 匯出。
- 新增核心單元測試（cycle/compliance）。
