# 部署與倉庫對照

## 倉庫與正式網址

| 項目 | 值 |
|------|-----|
| GitHub | https://github.com/Donaldcpk/nwcs-calendar |
| Vercel（目標） | https://schoolcalendar-nwcs.vercel.app |

## 首次或重新連接 Vercel

1. 在 [Vercel Dashboard](https://vercel.com/dashboard) 開啟專案 `schoolcalendar-nwcs`（或同名專案）。
2. **Settings → Git**：連到 `Donaldcpk/nwcs-calendar`，分支 `main`。
3. **Framework Preset** 應為 **Next.js**（若仍顯示 Create React App，請刪除舊 Build 設定或新建專案並指向此 repo）。
4. **Settings → Environment Variables**：依 `.env.example` 填入全部變數；`NEXTAUTH_URL` 必須為 `https://schoolcalendar-nwcs.vercel.app`。
5. 在 Google Cloud OAuth 加入正式網域與 callback（見根目錄 `README.md`）。
6. 在 Supabase SQL Editor 執行 `docs/supabase-calendar-snapshots.sql`。
7. 觸發 **Redeploy**。

## 上線後驗證

- 開啟 `/login`，應為 Next.js 登入頁（Google + 可選帳密），而非舊版「React App」單一表單。
- 登入後 Network 應看到 `GET /api/calendar-state?schoolYear=...` 回傳 **JSON**（401 未登入、200 已登入），而非 HTML。

## 本地開發

```bash
cp .env.example .env.local
# 編輯 .env.local 填入真實值
npm install
npm run dev
```
