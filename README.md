# SchoolCalendar

SchoolCalendar 是給香港中學學務團隊使用的校曆管理工具，幫助快速排程並即時監控 EDB 合規指標。

- **GitHub**：https://github.com/Donaldcpk/nwcs-calendar
- **正式環境**：https://schoolcalendar-nwcs.vercel.app
- **部署說明**：見 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## 專案目的
- 讓副校長能在單一畫面同時掌握「宏觀合規」與「微觀日程操作」。
- 以 MVP 快速驗證校曆排程流程（Cycle Day、假期配額、上課日數）並收集回饋。

## 特色功能
- 左側固定 `Compliance Dashboard`：即時顯示 190/90/DH/SDD 指標。
- 中央 `Continuous Yearly View`：9/1 到翌年 8/31 連續週視圖。
- 右側 `Action Panel`：單日設定、活動、停課、是否計算為 190、Cycle 鎖定。
- `Cycle Engine`：變更後重算 Day 1..N，支援鎖定日保留。
- 拖曳與 Shift 區間多選、批次改類型與活動。
- 雲端共享儲存（Supabase）：所有授權 admin 登入可看到同一份進度。
- EDB 合規儀表板可收合，保留更多日曆工作空間。
- Undo/Redo、WebSAMS CSV 匯出。

## 安裝與執行
1. 安裝 Node.js 22+
2. `npm install`
3. `npm run dev`
4. 開啟 [http://localhost:3000](http://localhost:3000)

## 🚀 私有部署與權限設定 (Deployment & Authentication)

### 建議部署架構（Private Repo）
- 程式碼放在 GitHub Private Repository。
- 部署到 Vercel（專案可設定為受保護環境）。
- 支援兩種登入：Google OAuth（`ADMIN_EMAILS` 白名單）與內建管理員帳密（`ADMIN_USERNAME`/`ADMIN_PASSWORD`）。

### 本地與雲端環境變數設定
請參考 `.env.example`，最少需要以下變數：

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `ADMIN_EMAILS`（逗號分隔）
- `ADMIN_USERNAME`（可選；不設定則停用管理員帳密登入）
- `ADMIN_PASSWORD`（可選；需與 `ADMIN_USERNAME` 一起設定才會啟用）
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

本地測試時建立 `.env.local`；Vercel 需在 Project Settings > Environment Variables 設定相同鍵值。

`ADMIN_EMAILS` 建議直接填入（逗號分隔、無空白）：
`nwcs134@ngwahsec.edu.hk,nwcs188@ngwahsec.edu.hk,nwcs217@ngwahsec.edu.hk`

### Google Cloud Console 申請 Client ID / Secret 步驟
1. 前往 [Google Cloud Console](https://console.cloud.google.com/) 建立專案。
2. 進入「API 和服務」>「OAuth 同意畫面」，完成 App 名稱、支援 email、聯絡資訊。
3. 進入「API 和服務」>「憑證」>「建立憑證」>「OAuth 用戶端 ID」。
4. 選擇 `Web application`，加入：
   - Authorized JavaScript origins：
     - `http://localhost:3000`
     - `https://<你的正式網域>`
   - Authorized redirect URIs：
     - `http://localhost:3000/api/auth/callback/google`
     - `https://<你的正式網域>/api/auth/callback/google`
5. 建立後把 `Client ID`、`Client Secret` 填入 `.env.local` 或 Vercel 環境變數。

### 權限管理重點
- email 白名單只讀取 `ADMIN_EMAILS`，系統不會自動新增其他 email（例如 188/217/134）。
- 若要新增/移除 Google 管理員，只需在 Vercel 後台修改 `ADMIN_EMAILS` 並重新部署即可。
- 若要使用管理員帳密登入，必須在 Vercel 明確設定 `ADMIN_USERNAME` 與 `ADMIN_PASSWORD`，且不要把值寫進程式碼。
- 非白名單帳號登入會被導回登入頁並顯示友善提示訊息。

### 手把手部署（Vercel + Supabase + Google）
1. 在 Supabase 專案開啟 SQL Editor，執行 `docs/supabase-calendar-snapshots.sql`。
2. 在 Google Cloud Console 的 OAuth Client，加入正式網域：
   - Authorized JavaScript origins: `https://<你的正式網域>`
   - Authorized redirect URIs: `https://<你的正式網域>/api/auth/callback/google`
3. 在 Vercel > Project > Settings > Environment Variables 新增：
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`（正式網址：`https://schoolcalendar-nwcs.vercel.app`）
   - `ADMIN_EMAILS`（填入 3 個授權 email）
   - `ADMIN_USERNAME`（若要啟用帳密登入才填）
   - `ADMIN_PASSWORD`（若要啟用帳密登入才填）
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. 按 Save 後重新部署（Redeploy）最新版本。

### 上線前安全檢查（一定要做）
1. 在 GitHub 搜尋 `ADMIN_PASSWORD`、`GOOGLE_CLIENT_SECRET`、`SUPABASE_SERVICE_ROLE_KEY`，確認沒有真實值被提交。
2. 實測白名單：
   - 用 `nwcs134@ngwahsec.edu.hk`、`nwcs188@ngwahsec.edu.hk`、`nwcs217@ngwahsec.edu.hk` 登入，應成功。
   - 用其他 Google 帳號登入，應顯示拒絕。
3. 若懷疑曾外洩，立刻輪替（rotate）：
   - Google Client Secret
   - `NEXTAUTH_SECRET`
   - Supabase Service Role Key

### 雲端共享校曆（Supabase）
1. 在 Supabase SQL Editor 執行 `docs/supabase-calendar-snapshots.sql`。
2. 在 Vercel 設定 `SUPABASE_URL` 與 `SUPABASE_SERVICE_ROLE_KEY`。
3. 重新部署後，系統會自動載入/儲存該學年的雲端快照，所有 admin 共用同一份進度。
4. 若兩位 admin 同時編輯，系統會以版本號偵測衝突並同步最新資料，避免覆蓋他人變更。

## 使用說明
- 點選日期：右側編輯當天屬性。
- 拖曳日期：批次選取多日後套用類型/活動。
- `Ctrl/Cmd + Z`：復原；`Ctrl/Cmd + Shift + Z`：重做。
- 頁首會顯示雲端同步狀態與最後更新者。
- 匯出：點選 `Export WebSAMS CSV` 下載檔案。

## 參數與回傳（核心）
- `recalculateCycles(days, cycleLength, schoolYearStart, startDate)`：回傳重排後日曆資料。
- `calculateComplianceMetrics(days)`：回傳 `schoolDays`, `schoolHolidayQuota`, `dhDays`, `sddDays`, `warnings`。

## 測試
- `npm run test`
- `npm run test:run`

## 版本與變更
- SemVer
- Conventional Commits
- Keep a Changelog（見 `CHANGELOG.md`）

## 授權
MIT

## 維護者
SchoolCalendar Team
