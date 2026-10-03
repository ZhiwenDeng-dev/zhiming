"use client";

import { useEffect, useState } from "react";
import { api, useApp } from "@/components/client";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";
import { Card, Chevron, PageTitle } from "@/components/ui";
import { REPORTS, type ReportKind } from "@/lib/reports";

const KINDS: ReportKind[] = ["book", "annual", "yinyang"];

export default function ReportsPage() {
  const { current } = useApp();
  const [done, setDone] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!current) return;
    Promise.all(
      KINDS.map((k) => api<{ done: string[] }>(`/api/profiles/${current.id}/readings/${k}`).then((r) => [k, r.done.length] as const)),
    ).then((rs) => setDone(Object.fromEntries(rs)), () => {});
  }, [current]);

  if (!current) return null;
  return (
    <div>
      <PageTitle en="Readings" title="报告" sub="不只给答案，也讲清背后的原因" />
      <ProfileSwitcher />
      <div className="space-y-4 px-5 pt-5">
        {KINDS.map((k, i) => {
          const r = REPORTS[k];
          return (
            <Card key={k} href={`/p/${current.id}/${k}`} className="rise relative overflow-hidden !p-6">
              <div style={{ animationDelay: `${i * 60}ms` }}>
                <div className="pointer-events-none absolute -top-4 -right-2 font-serif text-[110px] leading-none text-ink/[0.04]">
                  {r.title[0]}
                </div>
                <div className="text-[10px] tracking-[0.25em] text-gold uppercase">{r.en}</div>
                <div className="mt-2 font-serif text-[24px] font-semibold">{r.title}</div>
                <p className="mt-1.5 max-w-[240px] text-[13px] text-muted">{r.desc}</p>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-[12px] text-ink-2">
                    {r.chapters.length} 章 · 已解锁 {done[k] ?? 0}
                  </span>
                  <Chevron />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
