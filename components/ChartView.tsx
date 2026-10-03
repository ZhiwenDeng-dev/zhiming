"use client";

import type { Profile } from "@/lib/store";
import { EL_COLOR, ELEMENTS, elementOf, yinyangOf, type Element } from "@/lib/wuxing";

const COLS = ["年柱", "月柱", "日柱", "时柱"];

function Char({ ch, big }: { ch: string; big?: boolean }) {
  const el = elementOf(ch);
  if (!el) return <span className="font-serif text-[22px] text-muted">?</span>;
  return (
    <span className="flex flex-col items-center">
      <span className={`font-serif font-semibold ${big ? "text-[34px]" : "text-[30px]"} leading-none`} style={{ color: EL_COLOR[el] }}>
        {ch}
      </span>
      <span className="mt-1 text-[10px] text-muted">{el}</span>
    </span>
  );
}

export function Pillars({ profile }: { profile: Profile }) {
  const { pillars } = profile.chart;
  return (
    <div className="grid grid-cols-4 gap-2">
      {pillars.map((p, i) => (
        <div key={i} className={`flex flex-col items-center gap-3 rounded-2xl py-4 ${i === 2 ? "bg-gold-soft" : "bg-paper"}`}>
          <div className="text-[11px] text-muted">{i === 2 ? "日柱 · 日主" : COLS[i]}</div>
          <div className="text-[11px] text-ink-2">{p.shishen === "—" ? (profile.sex === "男" ? "元男" : "元女") : p.shishen || " "}</div>
          <Char ch={p.gan} big={i === 2} />
          <Char ch={p.zhi} />
          <div className="min-h-[2.4em] px-1 text-center text-[10px] leading-tight text-muted">{p.canggan === "未知" ? "" : p.canggan.replaceAll("、", " ")}</div>
        </div>
      ))}
    </div>
  );
}

export function countElements(profile: Profile) {
  const counts = Object.fromEntries(ELEMENTS.map((e) => [e, 0])) as Record<Element, number>;
  for (const p of profile.chart.pillars)
    for (const ch of [p.gan, p.zhi]) {
      const el = elementOf(ch);
      if (el) counts[el]++;
    }
  return counts;
}

export function ElementBars({ profile }: { profile: Profile }) {
  const counts = countElements(profile);
  const max = Math.max(...Object.values(counts), 1);
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        {ELEMENTS.map((e) => (
          <div key={e} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[12px] font-medium tabular-nums">{counts[e]}</span>
            <div className="flex h-20 w-full items-end rounded-lg bg-paper">
              <div className="w-full rounded-lg transition-all duration-700" style={{ height: `${(counts[e] / max) * 100}%`, background: EL_COLOR[e], opacity: counts[e] ? 0.85 : 0 }} />
            </div>
            <span className="font-serif text-[14px]" style={{ color: EL_COLOR[e] }}>
              {e}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted">按天干地支本气各计 1 次，只表示出现次数，不等于五行强弱。</p>
    </div>
  );
}

export function DayunStrip({ profile }: { profile: Profile }) {
  const { dayun } = profile.chart;
  const birthYear = +profile.chart.solar.slice(0, 4);
  const age = new Date().getFullYear() - birthYear;
  return (
    <div>
      <div className="mb-3 text-[12px] text-muted">
        {dayun.direction} · {dayun.start}起运
      </div>
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
        {dayun.rows.map((r) => {
          const m = r.ages.match(/(\d+)\D+(\d+)/);
          const from = r.seq === "起运前" ? 0 : m ? +m[1] : 0;
          const to = m ? +m[2] : 0;
          const now = age >= from && age <= to;
          const gz = r.gz.replace(/（.+）/, "");
          return (
            <div key={r.seq} className={`flex w-[68px] shrink-0 flex-col items-center gap-1 rounded-2xl py-3 ${now ? "bg-ink text-paper" : "bg-paper"}`}>
              <div className={`text-[10px] ${now ? "text-paper/70" : "text-muted"}`}>{r.seq === "起运前" ? "小运" : `${birthYear + from}`}</div>
              <div className="font-serif text-[20px] leading-none">{gz[0]}</div>
              <div className="font-serif text-[20px] leading-none">{gz[1]}</div>
              <div className={`text-[10px] ${now ? "text-paper/70" : "text-muted"}`}>{r.seq === "起运前" ? r.ages.split("-")[1] : `${from}–${to}岁`}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DayMaster({ profile }: { profile: Profile }) {
  const g = profile.chart.pillars[2].gan;
  const el = elementOf(g)!;
  return (
    <span>
      <span className="font-serif text-[15px]" style={{ color: EL_COLOR[el] }}>
        {g}
        {el}
      </span>
      <span className="ml-1 text-muted">· {yinyangOf(g)}</span>
    </span>
  );
}
