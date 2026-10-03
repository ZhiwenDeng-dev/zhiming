"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, useApp } from "@/components/client";
import { TopBar } from "@/components/ui";
import { reportOf } from "@/lib/reports";
import { yearGanzhi } from "@/lib/wuxing";

export default function ReportPage() {
  const { id, kind } = useParams<{ id: string; kind: string }>();
  const { profiles } = useApp();
  const p = profiles.find((x) => x.id === id);
  const report = reportOf(kind);
  const [done, setDone] = useState<string[] | null>(null);

  useEffect(() => {
    api<{ done: string[] }>(`/api/profiles/${id}/readings/${kind}`).then((r) => setDone(r.done), () => setDone([]));
  }, [id, kind]);

  if (!p || !report) return <TopBar title="找不到" back />;
  const year = new Date().getFullYear();
  const title = kind === "annual" ? `${year} ${yearGanzhi(year)}年运` : report.title;

  return (
    <div>
      <TopBar title="" back={`/p/${id}`} />
      <div className="rise px-5 pb-8 pt-2">
        <div className="text-[11px] tracking-[0.25em] text-gold uppercase">{report.en}</div>
        <h1 className="mt-1 font-serif text-[32px] font-semibold">{title}</h1>
        <p className="mt-2 text-[13px] text-muted">
          {p.name} · {report.desc}
        </p>
        {done && (
          <div className="mt-5 flex items-center gap-3">
            <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-line">
              <div className="h-full bg-gold transition-all duration-700" style={{ width: `${(done.length / report.chapters.length) * 100}%` }} />
            </div>
            <span className="text-[11px] tabular-nums text-muted">
              已解锁 {done.length}/{report.chapters.length}
            </span>
          </div>
        )}
      </div>

      <ol className="mx-5 overflow-hidden rounded-[22px] bg-card">
        {report.chapters.map((c, i) => {
          const ok = done?.includes(c.key);
          return (
            <li key={c.key} className="border-b border-line last:border-0">
              <Link href={`/p/${id}/${kind}/${c.key}`} className="flex items-center gap-4 px-5 py-4 active:bg-paper">
                <span className="w-6 font-serif text-[15px] text-gold tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex-1">
                  <span className="block font-serif text-[17px]">{c.title}</span>
                  {c.subtitle && <span className="mt-0.5 block text-[12px] text-muted">{c.subtitle}</span>}
                </span>
                <span className={`text-[11px] ${ok ? "text-gold" : "text-muted"}`}>{ok ? "已生成" : "点击解读"}</span>
              </Link>
            </li>
          );
        })}
      </ol>
      <p className="px-6 pt-4 text-center text-[11px] leading-relaxed text-muted">
        每章首次打开时由 AI 结合你的命盘现场推演，约半分钟到两分钟，之后永久保存。
      </p>
    </div>
  );
}
