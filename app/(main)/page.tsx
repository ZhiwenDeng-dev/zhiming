"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DayMaster } from "@/components/ChartView";
import { useApp } from "@/components/client";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";
import { Button, Card, Chevron, ErrorNote, Markdown, Thinking } from "@/components/ui";
import { useStream } from "@/components/useStream";
import { REPORTS } from "@/lib/reports";

const WEEK = "日一二三四五六";

export default function TodayPage() {
  const { current, today } = useApp();
  const router = useRouter();
  const s = useStream();
  const [peeked, setPeeked] = useState<string | null>(null); // 已检查过缓存的档案 id
  const [q, setQ] = useState("");
  const url = current && today ? `/api/profiles/${current.id}/readings/daily/${today.date}` : null;

  // 切换档案时先看今天的签是否已抽过
  useEffect(() => {
    if (!url || !current) return;
    s.reset();
    let alive = true;
    // 有缓存直接显示；正在推算则接上进度；都没有才显示「抽签」
    s.start(`${url}?peek=1`).then(() => alive && setPeeked(current.id));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  if (!current) return null;
  const d = today ? new Date(today.date + "T00:00:00") : null;

  return (
    <div>
      <header className="px-5 pb-5 pt-10">
        <div className="text-[12px] tracking-[0.2em] text-gold">
          {today ? `${today.year}年 · ${today.month}月 · ${today.day}日` : " "}
        </div>
        <h1 className="mt-1 font-serif text-[32px] font-semibold">
          {d ? `${d.getMonth() + 1}月${d.getDate()}日` : "今日"}
          <span className="ml-2 text-[16px] font-normal text-muted">{d ? `周${WEEK[d.getDay()]}` : ""}</span>
        </h1>
        <p className="mt-0.5 text-[13px] text-muted">{today?.lunar.replace(/^\d+年/, "农历")}</p>
      </header>

      <ProfileSwitcher />

      <div className="space-y-4 px-5 pt-5">
        {/* 日签 */}
        <Card className="rise overflow-hidden !p-0">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <span className="text-[13px] font-medium">今日签 · {current.name}</span>
            <span className="text-[11px] tracking-widest text-gold">DAILY</span>
          </div>
          <div className="px-5 py-5">
            {s.text ? (
              <Markdown text={s.text.replace(/\n(\*\*忌\*\*)/, "\n\n$1")} streaming={s.running} />
            ) : s.running ? (
              <Thinking status={s.status} />
            ) : s.error ? (
              <ErrorNote message={s.error} onRetry={() => url && s.start(url)} />
            ) : peeked === current.id ? (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="font-serif text-[18px]">静心片刻，抽一支今日签</div>
                <p className="mt-1.5 text-[12px] text-muted">结合你的命盘与今日干支 {today?.day}</p>
                <Button className="mt-5 px-10" onClick={() => url && s.start(url)}>
                  抽签
                </Button>
              </div>
            ) : (
              <div className="h-[140px]" />
            )}
          </div>
        </Card>

        {/* 命主 */}
        <Card href={`/p/${current.id}`} className="flex items-center justify-between">
          <div>
            <div className="text-[12px] text-muted">我的命盘</div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="font-serif text-[22px] tracking-[0.15em]">
                {current.chart.pillars.map((p) => (p.gan === "未知" ? "□" : p.gan)).join("")}
              </span>
            </div>
            <div className="font-serif text-[22px] tracking-[0.15em]">
              {current.chart.pillars.map((p) => (p.zhi === "未知" ? "□" : p.zhi)).join("")}
            </div>
            <div className="mt-2 text-[12px]">
              日主 <DayMaster profile={current} />
            </div>
          </div>
          <Chevron />
        </Card>

        {/* 报告入口 */}
        <div className="grid grid-cols-3 gap-3">
          {(["book", "annual", "yinyang"] as const).map((k) => (
            <Link key={k} href={`/p/${current.id}/${k}`} className="rounded-[20px] bg-card p-4 transition active:scale-[0.98]">
              <div className="text-[10px] tracking-wider text-gold uppercase">{REPORTS[k].en}</div>
              <div className="mt-6 font-serif text-[17px] font-semibold">{REPORTS[k].title}</div>
            </Link>
          ))}
        </div>

        {/* 快速问事 */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) router.push(`/chat?q=${encodeURIComponent(q.trim())}`);
          }}
          className="flex items-center gap-2 rounded-full bg-card p-1.5 pl-5"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="今天有什么想问的？"
            className="h-10 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
          />
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-paper disabled:opacity-30" disabled={!q.trim()} aria-label="去问">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
