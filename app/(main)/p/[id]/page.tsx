"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { DayMaster, DayunStrip, ElementBars, Pillars } from "@/components/ChartView";
import { useApp } from "@/components/client";
import { NotesCard } from "@/components/NotesCard";
import { Card, Chevron, TopBar } from "@/components/ui";
import { REPORTS } from "@/lib/reports";

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { profiles, setCurrent } = useApp();
  const p = profiles.find((x) => x.id === id);
  if (!p) return <TopBar title="档案不存在" back="/me" />;
  const c = p.chart;

  return (
    <div>
      <TopBar title="" back />
      <div className="rise px-5 pb-6">
        <div className="text-[11px] tracking-[0.25em] text-gold">BAZI CHART · {p.relation}</div>
        <h1 className="mt-1 font-serif text-[30px] font-semibold">{p.name}</h1>
        <p className="mt-1 text-[13px] text-muted">
          {c.solar} · {c.lunar}
          {p.place ? ` · ${p.place}` : ""}
        </p>
      </div>

      <div className="space-y-4 px-5">
        <Card>
          <div className="mb-4 flex items-center justify-between text-[13px]">
            <span className="font-medium">四柱命盘</span>
            <span>
              日主 <DayMaster profile={p} />
            </span>
          </div>
          <Pillars profile={p} />
          {c.warnings.length > 0 && (
            <p className="mt-4 rounded-xl bg-gold-soft px-3 py-2 text-[12px] text-ink-2">
              提示：{c.warnings.join("、")}
              {c.warnings.some((w) => w.includes("节气") || w.includes("立春")) && "，出生时刻接近换月/换年，钟点越准越好"}
            </p>
          )}
        </Card>

        <Card>
          <div className="mb-4 text-[13px] font-medium">五行分布</div>
          <ElementBars profile={p} />
        </Card>

        <Card>
          <div className="mb-1 text-[13px] font-medium">大运 · 每十年一个篇章</div>
          <DayunStrip profile={p} />
        </Card>

        {c.shensha.length > 0 && (
          <Card>
            <div className="mb-3 text-[13px] font-medium">神煞</div>
            <div className="flex flex-wrap gap-2">
              {c.shensha.map((s) => (
                <span key={s.name} className="rounded-full bg-paper px-3 py-1.5 text-[12px] text-ink-2" title={s.where}>
                  {s.name}
                  <span className="ml-1 text-muted">{s.where.replace("见于", "")}</span>
                </span>
              ))}
            </div>
          </Card>
        )}

        <NotesCard pid={p.id} name={p.relation === "自己" ? "你" : p.name} />

        <Card href={`/p/${p.id}/analysis`} className="flex items-center justify-between">
          <div>
            <div className="text-[10px] tracking-[0.2em] text-gold">FOUNDATION</div>
            <div className="mt-1 font-serif text-[19px] font-semibold">命理底稿</div>
            <div className="mt-1 text-[12px] text-muted">强弱、格局、喜忌、大运定性，所有解读以此为准</div>
          </div>
          <Chevron />
        </Card>

        <div className="pt-4 text-[13px] font-medium text-ink-2">深度解读</div>
        {(["book", "annual", "yinyang"] as const).map((k) => (
          <Card key={k} href={`/p/${p.id}/${k}`} className="flex items-center justify-between">
            <div>
              <div className="text-[10px] tracking-[0.2em] text-gold uppercase">{REPORTS[k].en}</div>
              <div className="mt-1 font-serif text-[19px] font-semibold">{REPORTS[k].title}</div>
              <div className="mt-1 text-[12px] text-muted">{REPORTS[k].desc}</div>
            </div>
            <Chevron />
          </Card>
        ))}

        <Link
          href="/chat"
          onClick={() => setCurrent(p.id)}
          className="mt-2 flex h-12 items-center justify-center rounded-full bg-ink text-[15px] font-medium text-paper"
        >
          就这张命盘问一问
        </Link>
      </div>
    </div>
  );
}
