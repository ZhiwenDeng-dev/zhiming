"use client";

import Link from "next/link";
import { useApp } from "./client";

export function ProfileSwitcher() {
  const { profiles, current, setCurrent } = useApp();
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-5">
      {profiles.map((p) => {
        const on = p.id === current?.id;
        return (
          <button
            key={p.id}
            onClick={() => setCurrent(p.id)}
            className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-[13px] transition ${on ? "bg-ink text-paper" : "bg-card text-ink-2"}`}
          >
            {p.name}
            <span className={`text-[11px] ${on ? "text-paper/60" : "text-muted"}`}>{p.relation}</span>
          </button>
        );
      })}
      <Link href="/profiles/new" className="flex h-9 shrink-0 items-center rounded-full border border-dashed border-line px-4 text-[13px] text-muted">
        ＋ 添加
      </Link>
    </div>
  );
}
