"use client";

import { signOut, useSession } from "next-auth/react";

export function UserAuthStatus() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <p className="text-xs text-slate-500">讀取登入狀態...</p>;
  }

  const email = session?.user?.email ?? "未知使用者";

  return (
    <div className="flex items-center gap-2">
      <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">{email}</span>
      <button
        type="button"
        className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        登出
      </button>
    </div>
  );
}
