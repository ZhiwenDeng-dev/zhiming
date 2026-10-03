"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Task = { label: string; href: string; state: "preparing" | "queued" | "running"; status: string };

// 全局推算状态：离开推算页面后，在任何页面都能看到进度；完成时提示一下
export function TaskPill({ aboveTabs }: { aboveTabs: boolean }) {
  const pathname = usePathname();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [done, setDone] = useState<Task | null>(null);
  const prev = useRef<Task[]>([]);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const r = await fetch("/api/tasks");
        if (r.ok && alive) {
          const next: Task[] = await r.json();
          const finished = prev.current.find((t) => !next.some((n) => n.href === t.href && n.label === t.label));
          if (finished) {
            setDone(finished);
            setTimeout(() => alive && setDone((d) => (d === finished ? null : d)), 6000);
          }
          prev.current = next;
          setTasks(next);
        }
      } catch {}
      if (alive) timer = setTimeout(poll, document.hidden ? 8000 : 2500);
    };
    poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  const running = tasks.find((t) => t.state === "running") ?? tasks[0];
  const show = running ?? done;
  // 正在推算页面本身已有大号动画，不重复提示
  if (!show || (running && pathname === running.href) || (!running && done && pathname === done.href)) return null;

  return (
    <Link
      href={show.href}
      className={`rise fixed left-1/2 z-40 flex max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-2.5 rounded-full bg-ink py-2 pl-2.5 pr-4 text-[13px] text-paper shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)] ${
        pathname === "/chat"
          ? "bottom-[calc(136px+env(safe-area-inset-bottom))]" // 问事页底部有输入框，再往上让一让
          : aboveTabs
            ? "bottom-[calc(70px+env(safe-area-inset-bottom))]"
            : "bottom-[calc(20px+env(safe-area-inset-bottom))]"
      }`}
    >
      {running ? (
        <svg viewBox="0 0 144 144" className="h-5 w-5 shrink-0">
          <g className="zm-spin" style={{ animationDuration: "3s" }}>
            <circle cx="72" cy="72" r="64" fill="var(--paper)" />
            <path d="M72 8a64 64 0 0 1 0 128a32 32 0 0 1 0-64a32 32 0 0 0 0-64Z" fill="var(--gold)" />
          </g>
        </svg>
      ) : (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[11px]">✓</span>
      )}
      <span className="truncate">
        {running ? (running.state === "running" ? "正在推算" : "排队中") : "推算完成"} · {show.label}
      </span>
      {running && tasks.length > 1 && <span className="shrink-0 text-paper/60">+{tasks.length - 1}</span>}
      {!running && <span className="shrink-0 text-gold">查看</span>}
    </Link>
  );
}
