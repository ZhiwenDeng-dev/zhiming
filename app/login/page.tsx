"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, Mark } from "@/components/client";
import { Button } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/auth", { json: { action: mode, username, password } });
      router.replace("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const input = "h-[52px] w-full rounded-2xl bg-card px-4 text-[16px] outline-none ring-gold/40 placeholder:text-muted focus:ring-2";

  return (
    <div className="flex min-h-dvh flex-col px-6">
      <div className="rise flex flex-1 flex-col items-center justify-center pt-10 text-center">
        <Mark className="h-14 w-14" />
        <h1 className="mt-6 font-serif text-[40px] font-semibold tracking-[0.2em]">知命</h1>
        <p className="mt-2 text-[13px] tracking-[0.3em] text-gold">知命 · 而后造命</p>
        <p className="mt-6 max-w-[260px] text-[14px] leading-relaxed text-ink-2">
          读懂你的八字，看清人生的季节。你的命盘只属于你。
        </p>
      </div>

      <form onSubmit={submit} className="rise space-y-3 pb-10" style={{ animationDelay: "120ms" }}>
        <input className={input} placeholder="昵称" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        <input
          className={input}
          type="password"
          placeholder="密码（至少 4 位）"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
        {error && <p className="px-1 text-[13px] text-[#b5523b]">{error}</p>}
        <Button className="w-full" disabled={busy || !username || !password}>
          {busy ? "请稍候…" : mode === "register" ? "创建账号" : "登录"}
        </Button>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
          className="w-full py-2 text-[13px] text-muted"
        >
          {mode === "register" ? "已有账号？去登录" : "第一次来？创建账号"}
        </button>
        <p className="pt-2 text-center text-[11px] text-muted">数据仅保存在本机，不会上传。</p>
      </form>
    </div>
  );
}
