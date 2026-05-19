# Changelog

All notable changes to this project are documented in this file.

The format follows Keep a Changelog, and this project follows Semantic Versioning.

## [Unreleased]

## [0.2.0] – 2026-05-20

### Added
- `.env.example` 與 `docs/DEPLOYMENT.md`（GitHub / Vercel / Supabase 對照）。
- 推送完整 Next.js 校曆 MVP 至 `Donaldcpk/nwcs-calendar`。

### Changed
- 取代 Vercel 上舊版 Create React App 部署目標（需於 Vercel 後台確認 Framework 為 Next.js 並 Redeploy）。

## [0.1.0] – 2026-05-19

### Added
- 初始化 Next.js + TailwindCSS 前端基礎。
- 建立 SchoolDay 資料模型與 Zustand 全域狀態。
- 新增 Cycle Engine、Compliance Tracker、三欄式年曆 UI。
- 新增 Undo/Redo、localStorage 持久化、WebSAMS CSV 匯出。
- 新增核心單元測試（cycle/compliance）。
