"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [isReady, setIsReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [adminEnabled, setAdminEnabled] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState<string>("正在檢查登入服務...");
  const [lastError, setLastError] = useState<string>("");

  const isAccessDenied = useMemo(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("error") === "AccessDenied";
  }, []);

  useEffect(() => {
    let mounted = true;

    const checkAuthHealth = async () => {
      try {
        const [providersRes, csrfRes] = await Promise.all([
          fetch("/api/auth/providers", { cache: "no-store" }),
          fetch("/api/auth/csrf", { cache: "no-store" }),
        ]);

        if (!providersRes.ok || !csrfRes.ok) {
          throw new Error("登入服務回應異常");
        }

        const providers = (await providersRes.json()) as Record<string, unknown>;
        const hasGoogle = Boolean(providers?.google);
        const hasAdmin = Boolean(providers?.["admin-credentials"]);
        const hasAtLeastOneProvider = hasGoogle || hasAdmin;
        if (!hasAtLeastOneProvider) {
          throw new Error("目前沒有可用的登入方式");
        }

        if (!mounted) return;
        setGoogleEnabled(hasGoogle);
        setAdminEnabled(hasAdmin);
        setIsReady(true);
        if (hasGoogle && hasAdmin) {
          setStatusMessage("登入服務正常，可使用 Google 或管理員帳密登入。");
        } else if (hasGoogle) {
          setStatusMessage("登入服務正常，可使用 Google 登入。");
        } else {
          setStatusMessage("登入服務正常，可使用管理員帳密登入。");
        }
        setLastError("");
      } catch {
        if (!mounted) return;
        setGoogleEnabled(false);
        setAdminEnabled(false);
        setIsReady(false);
        setStatusMessage("登入服務暫時不可用，請稍後再試。");
        setLastError("系統未能確認 Auth 服務狀態。");
      }
    };

    checkAuthHealth();
    return () => {
      mounted = false;
    };
  }, []);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setLastError("");
    setStatusMessage("正在導向 Google 登入...");

    try {
      await signIn("google", { callbackUrl: "/" });
    } catch {
      setStatusMessage("登入發生錯誤，請稍後再試。");
      setLastError("Google 登入觸發失敗");
    } finally {
      // signIn 預期會直接跳轉；若發生例外才會停留在此頁。
      setIsSigningIn(false);
    }
  };

  const handleAdminSignIn = async () => {
    setIsSigningIn(true);
    setLastError("");
    setStatusMessage("正在驗證管理員帳號...");
    try {
      const result = await signIn("admin-credentials", {
        username,
        password,
        redirect: false,
        callbackUrl: "/",
      });
      if (result?.error) {
        setStatusMessage("管理員帳號登入失敗。");
        setLastError("帳號或密碼不正確");
        return;
      }
      window.location.href = result?.url ?? "/";
    } catch {
      setStatusMessage("登入發生錯誤，請稍後再試。");
      setLastError("管理員帳號登入觸發失敗");
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">伍華中學 2026-2027 校曆編排系統</h1>
        <p className="mt-2 text-sm text-slate-600">僅限授權行政人員登入</p>
        {isAccessDenied ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            登入失敗。本系統目前僅限教務處授權之行政人員使用。如有需協助，請聯絡系統管理員。
          </div>
        ) : null}
        <div className={`mt-4 rounded-lg border p-3 text-sm ${isReady ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
          {statusMessage}
          {lastError ? <p className="mt-1 text-xs">詳細：{lastError}</p> : null}
        </div>

        <form className="mt-6 space-y-3" onSubmit={(event) => event.preventDefault()}>
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
            placeholder="管理員帳號"
            autoComplete="username"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
            placeholder="管理員密碼"
            autoComplete="current-password"
          />
          <button
            type="button"
            className="w-full rounded-lg bg-slate-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleAdminSignIn}
            disabled={!isReady || !adminEnabled || isSigningIn || !username.trim() || !password}
          >
            {isSigningIn ? "登入中..." : "使用管理員帳密登入"}
          </button>
          <button
            type="button"
            className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleGoogleSignIn}
            disabled={!isReady || !googleEnabled || isSigningIn}
          >
            {isSigningIn ? "登入中..." : "使用 Google 登入"}
          </button>
        </form>
        <a
          href="/login"
          className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          返回登入頁
        </a>
      </section>
    </main>
  );
}
