"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Today } from "@/lib/paipan";
import type { Profile } from "@/lib/store";

export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    method: init?.method ?? (init?.json !== undefined ? "POST" : "GET"),
    headers: init?.json !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `请求失败（${res.status}）`);
  return data as T;
}

type Ctx = {
  user: { id: string; username: string };
  profiles: Profile[];
  current: Profile | null;
  setCurrent: (id: string) => void;
  today: Today | null;
  reload: () => Promise<void>;
};
const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => useContext(AppCtx)!;

const KEY = "zm.current";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<{ user: Ctx["user"]; profiles: Profile[] } | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null; // 服务端渲染或存储被禁用
    }
  });
  const [today, setToday] = useState<Today | null>(null);

  const reload = useCallback(async () => {
    try {
      setState(await api<{ user: Ctx["user"]; profiles: Profile[] }>("/api/me"));
    } catch {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    api<{ user: Ctx["user"]; profiles: Profile[] }>("/api/me").then(setState, () => router.replace("/login"));
    api<Today>("/api/today").then(setToday, () => {});
  }, [router]);

  // 没有任何档案：先建自己的
  useEffect(() => {
    if (state && state.profiles.length === 0 && pathname !== "/profiles/new") router.replace("/profiles/new?self=1");
  }, [state, pathname, router]);

  if (!state) return <Splash />;

  const current = state.profiles.find((p) => p.id === currentId) ?? state.profiles[0] ?? null;
  const setCurrent = (id: string) => {
    setCurrentId(id);
    try {
      localStorage.setItem(KEY, id);
    } catch {}
  };

  return (
    <AppCtx.Provider value={{ ...state, current, setCurrent, today, reload }}>{children}</AppCtx.Provider>
  );
}

export function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Mark className="h-10 w-10 animate-pulse" />
    </div>
  );
}

// 品牌符号：墨点 + 金环，取「一念知命」之意
export function Mark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <circle cx="24" cy="24" r="21" fill="none" stroke="var(--gold)" strokeWidth="1.2" />
      <path d="M24 9c8.3 0 15 6.7 15 15s-6.7 15-15 15c4.1 0 7.5-3.4 7.5-7.5S28.1 24 24 24s-7.5-3.4-7.5-7.5S19.9 9 24 9Z" fill="var(--ink)" />
      <circle cx="24" cy="16.5" r="2.4" fill="var(--paper)" />
      <circle cx="24" cy="31.5" r="2.4" fill="var(--ink)" />
    </svg>
  );
}
