"use client";

import { useEffect, useState } from "react";
import { api, useApp } from "@/components/client";
import { Button, ErrorNote, Markdown, PageTitle, Thinking } from "@/components/ui";
import { useStream } from "@/components/useStream";
import { cast, lineName, tossLine } from "@/lib/iching";
import type { Divination } from "@/lib/store";

const EXAMPLES = ["要不要接受这份 offer？", "这次合作能顺利吗？", "TA 现在对我是什么想法？"];

// 一爻：阳爻实线，阴爻断线；动爻点金
function Line({ v, fresh, small }: { v: number; fresh?: boolean; small?: boolean }) {
  const yang = v === 7 || v === 9;
  const moving = v === 6 || v === 9;
  const color = moving ? "var(--gold)" : "var(--ink)";
  return (
    <div className={`flex items-center ${small ? "h-[3px] gap-1" : "h-3 gap-3"} ${fresh ? "rise" : ""}`}>
      {yang ? (
        <div className="h-full flex-1 rounded-[2px]" style={{ background: color }} />
      ) : (
        <>
          <div className="h-full flex-1 rounded-[2px]" style={{ background: color }} />
          <div className={small ? "w-1.5" : "w-6"} />
          <div className="h-full flex-1 rounded-[2px]" style={{ background: color }} />
        </>
      )}
    </div>
  );
}

function Hex({ lines, fresh, small }: { lines: number[]; fresh?: boolean; small?: boolean }) {
  // 自下而上画
  return (
    <div className={`flex w-full flex-col-reverse ${small ? "gap-[3px]" : "gap-2.5"}`}>
      {lines.map((v, i) => (
        <Line key={i} v={v} small={small} fresh={fresh && i === lines.length - 1} />
      ))}
    </div>
  );
}

function Coin({ face, spinning }: { face: boolean; spinning: boolean }) {
  return (
    <div
      className={`flex h-14 w-14 items-center justify-center rounded-full border-2 font-serif text-[15px] ${spinning ? "coin-flip" : ""} ${
        face ? "border-gold bg-gold-soft text-gold" : "border-line bg-card text-ink-2"
      }`}
    >
      <div className="h-4 w-4 rounded-[2px] border border-current" />
    </div>
  );
}

export default function DivinePage() {
  const { current } = useApp();
  const [question, setQuestion] = useState("");
  const [lines, setLines] = useState<number[]>([]);
  const [coins, setCoins] = useState([true, false, true]);
  const [spinning, setSpinning] = useState(false);
  const [history, setHistory] = useState<Divination[]>([]);
  const [open, setOpen] = useState<Divination | null>(null);
  const s = useStream();
  const stage = lines.length === 0 && !question.trim() ? "ask" : lines.length < 6 ? "toss" : "read";

  useEffect(() => {
    api<Divination[]>("/api/divine").then(setHistory, () => {});
  }, []);

  function toss() {
    if (spinning || lines.length >= 6) return;
    setSpinning(true);
    const v = tossLine();
    // 正面数：6→0 7→1 8→2 9→3（正面记 3）
    const heads = v - 6;
    setTimeout(() => {
      setCoins([0, 1, 2].map((i) => i < heads));
      setSpinning(false);
      const next = [...lines, v];
      setLines(next);
      if (next.length === 6) interpret(next);
    }, 900);
  }

  async function interpret(ls: number[]) {
    const r = await s.start("/api/divine", { question, lines: ls, profileId: current?.id });
    if (r !== null) api<Divination[]>("/api/divine").then(setHistory, () => {});
  }

  function restart() {
    setLines([]);
    setQuestion("");
    s.reset();
  }

  const hex = lines.length === 6 ? cast(lines) : null;

  if (open) {
    const h = cast(open.lines);
    return (
      <div>
        <div className="px-5 pt-8">
          <button onClick={() => setOpen(null)} className="text-[13px] text-muted">
            ← 返回
          </button>
        </div>
        <div className="px-6 pt-6">
          <div className="text-[12px] text-muted">{new Date(open.at).toLocaleString("zh-CN")}</div>
          <h1 className="mt-1 font-serif text-[24px] font-semibold">{open.question}</h1>
          <div className="mx-auto my-8 w-36">
            <Hex lines={open.lines} />
          </div>
          <p className="mb-6 text-center font-serif text-[18px]">
            {h.ben.fullName}
            {h.bian && <span className="text-muted"> → {h.bian.fullName}</span>}
          </p>
          <Markdown text={open.answer} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageTitle en="I Ching" title="占卦" sub="悬而未决，不如问卦。一事一问，心诚则明。" />

      <div className="px-5">
        {lines.length === 0 && (
          <div className="rise rounded-[22px] bg-card p-5">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              maxLength={200}
              placeholder="写下一件具体的事，例如：下个月搬家合适吗？"
              className="w-full resize-none bg-transparent font-serif text-[18px] leading-relaxed outline-none placeholder:font-sans placeholder:text-[15px] placeholder:text-muted"
            />
            <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
              {EXAMPLES.map((e) => (
                <button key={e} onClick={() => setQuestion(e)} className="h-7 shrink-0 rounded-full bg-paper px-3 text-[12px] text-ink-2">
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        {stage !== "ask" && (
          <div className="mt-5 rounded-[22px] bg-card p-6">
            {lines.length > 0 && <p className="mb-5 font-serif text-[17px]">「{question}」</p>}
            <div className="mx-auto w-40">
              <Hex lines={lines} fresh />
              {Array.from({ length: 6 - lines.length }).map((_, i) => (
                <div key={i} className="mt-2.5 h-3 rounded-[2px] border border-dashed border-line" />
              ))}
            </div>

            {lines.length < 6 ? (
              <div className="mt-8 flex flex-col items-center">
                <div className="flex gap-4" style={{ perspective: 600 }}>
                  {coins.map((f, i) => (
                    <Coin key={i} face={f} spinning={spinning} />
                  ))}
                </div>
                <p className="mt-5 text-[12px] text-muted">
                  第 {lines.length + 1} 爻 / 共 6 爻 · {lines.length === 0 ? "默念所问之事，然后掷钱" : lineName(lines.length - 1, lines.at(-1) === 7 || lines.at(-1) === 9) + " 已定"}
                </p>
                <Button className="mt-4 px-12" onClick={toss} disabled={spinning || !question.trim()}>
                  {spinning ? "…" : "掷钱"}
                </Button>
              </div>
            ) : (
              hex && (
                <div className="mt-6 text-center">
                  <div className="text-[11px] tracking-[0.2em] text-gold">第 {hex.ben.no} 卦</div>
                  <div className="mt-1 font-serif text-[26px] font-semibold">{hex.ben.fullName}</div>
                  {hex.bian && (
                    <div className="mt-1 text-[13px] text-muted">
                      动爻 {hex.moving.map((i) => lineName(i, lines[i] === 9)).join("、")} → 变卦 {hex.bian.fullName}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}

        {lines.length === 6 && (
          <div className="mt-5 rounded-[22px] bg-card p-6">
            {s.text ? <Markdown text={s.text} streaming={s.running} /> : s.running ? <Thinking status={s.status} /> : null}
            {s.error && <ErrorNote message={s.error} onRetry={() => interpret(lines)} />}
            {!s.running && s.text && (
              <Button variant="ghost" className="mt-6 w-full" onClick={restart}>
                再问一事
              </Button>
            )}
          </div>
        )}

        {lines.length === 0 && history.length > 0 && (
          <div className="mt-8">
            <div className="mb-3 px-1 text-[13px] font-medium text-ink-2">问过的事</div>
            <div className="overflow-hidden rounded-[22px] bg-card">
              {history.map((d) => {
                const h = cast(d.lines);
                return (
                  <button key={d.id} onClick={() => setOpen(d)} className="flex w-full items-center gap-4 border-b border-line px-5 py-3.5 text-left last:border-0 active:bg-paper">
                    <div className="w-7 shrink-0">
                      <Hex lines={d.lines} small />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px]">{d.question}</div>
                      <div className="mt-0.5 text-[11px] text-muted">
                        {h.ben.fullName} · {new Date(d.at).toLocaleDateString("zh-CN")}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
