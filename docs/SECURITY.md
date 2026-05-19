# 安全與隱私

## 勿提交至 Git 的內容

- 管理員 Google email（`ADMIN_EMAILS`）
- `GOOGLE_CLIENT_SECRET`、`NEXTAUTH_SECRET`、`SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_USERNAME` / `ADMIN_PASSWORD`
- 正式網域若需保密，僅設定於 Vercel

## 設定位置

| 環境 | 檔案 / 位置 |
|------|-------------|
| 本地 | `.env.local`（已列入 `.gitignore`） |
| 正式 | Vercel > Project > Environment Variables |

## 若曾誤提交

1. 立即從 README / 程式碼移除並推送修正。
2. 在 GitHub 仍可在舊 commit 看到內容時，考慮輪替相關金鑰，並視需要清理 Git 歷史（`git filter-repo` 或 GitHub secret scanning 建議）。
3. 輪替：Google Client Secret、`NEXTAUTH_SECRET`、Supabase Service Role Key。
