# 部署說明（公開版）

本文件不含學校專屬網域、管理員 email 或金鑰。實際值請只在 **Vercel 環境變數** 與本機 **`.env.local`** 設定（兩者皆不提交 Git）。

## 建議流程

1. 在 Supabase SQL Editor 執行 `docs/supabase-calendar-snapshots.sql`。
2. 在 Google Cloud OAuth 用戶端加入你的正式網域與 callback（見根目錄 `README.md`）。
3. 在 Vercel > Project > Settings > Environment Variables 依 `.env.example` 填入全部變數。
4. `NEXTAUTH_URL` 必須與 Vercel 正式網域一致（含 `https://`）。
5. 觸發 **Redeploy**。

## 上線後驗證

- `/login` 應為 Next.js 登入頁（Google + 可選帳密）。
- 登入後 `GET /api/calendar-state?schoolYear=...` 應回傳 **JSON**（401 未登入、200 已登入），而非 HTML。

## 本地開發

```bash
cp .env.example .env.local
# 編輯 .env.local 填入真實值（勿提交）
npm install
npm run dev
```
