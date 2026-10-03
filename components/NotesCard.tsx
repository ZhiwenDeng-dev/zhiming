"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Note } from "@/lib/notes";
import { api } from "./client";
import { Card } from "./ui";

type Data = { notes: Note[]; predictions: string[]; stale: boolean };

// 让解读更准：核对底稿推断的往事（skill 第 7 步校准）+ 记住的现实信息
export function NotesCard({ pid, name }: { pid: string; name: string }) {
  const url = `/api/profiles/${pid}/notes`;
  const [d, setD] = useState<Data | null>(null);
  const [text, setText] = useState("");
  const [year, setYear] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Data>(url).then(setD, () => {});
  }, [url]);

  const reload = async () => setD(await api<Data>(url));

  async function verify(t: string, verified: boolean) {
    setBusy(true);
    await api(url, { json: { text: t, verified } }).catch(() => {});
    await reload();
    setBusy(false);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    await api(url, { json: { text, year: year ? Number(year) : undefined } }).catch(() => {});
    setText("");
    setYear("");
    await reload();
    setBusy(false);
  }

  async function remove(nid: string) {
    await api(`${url}?nid=${nid}`, { method: "DELETE" }).catch(() => {});
    await reload();
  }

  if (!d) return null;
  const answered = new Map(d.notes.filter((n) => n.source === "calibration").map((n) => [n.text, n.verified]));
  const facts = d.notes.filter((n) => n.source !== "calibration");
  const done = d.predictions.filter((p) => answered.has(p)).length;

  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <div className="text-[13px] font-medium">让解读更准</div>
        {d.predictions.length > 0 && (
          <span className="text-[11px] tabular-nums text-muted">
            已核对 {done}/{d.predictions.length}
          </span>
        )}
      </div>

      {/* 往事核对 */}
      <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
        {d.predictions.length
          ? `根据命盘，${name}过去这几年可能经历过下面这些事。对不对，点一下就行。`
          : "命理底稿生成后，这里会出现几件需要核对的往事，核对越多，判断越准。"}
      </p>
      <div className="mt-3 space-y-2.5">
        {d.predictions.map((p) => {
          const v = answered.get(p);
          return (
            <div key={p} className="rounded-2xl bg-paper p-3.5">
              <p className="text-[14px] leading-relaxed text-ink">{p}</p>
              <div className="mt-2.5 flex gap-2">
                {[
                  { ok: true, label: "对上了" },
                  { ok: false, label: "不太对" },
                ].map((b) => (
                  <button
                    key={b.label}
                    disabled={busy}
                    onClick={() => verify(p, b.ok)}
                    className={`h-8 rounded-full px-4 text-[12px] transition active:scale-95 ${
                      v === b.ok ? "bg-ink text-paper" : "border border-line bg-card text-ink-2"
                    }`}
                  >
                    {v === b.ok ? "✓ " : ""}
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 核对过、但已不在当前底稿待核对列表里的（底稿重推后不再重复列出） */}
      {d.notes.some((n) => n.source === "calibration" && !d.predictions.includes(n.text)) && (
        <div className="mt-3 space-y-1.5">
          <div className="text-[11px] text-muted">已核对</div>
          {d.notes
            .filter((n) => n.source === "calibration" && !d.predictions.includes(n.text))
            .map((n) => (
              <div key={n.id} className="flex items-start gap-2 text-[12px] leading-relaxed text-ink-2">
                <span className={`mt-0.5 shrink-0 rounded-full px-1.5 text-[10px] ${n.verified ? "bg-gold-soft text-gold" : "bg-line text-muted"}`}>
                  {n.verified ? "对上了" : "不太对"}
                </span>
                <span className="flex-1">{n.text}</span>
                <button onClick={() => remove(n.id)} className="shrink-0 text-muted" aria-label="撤销这条核对">
                  ×
                </button>
              </div>
            ))}
        </div>
      )}

      {d.stale && (
        <Link href={`/p/${pid}/analysis`} className="mt-3 flex items-center justify-between rounded-2xl bg-gold-soft px-4 py-3 text-[13px]">
          <span className="text-ink-2">有新的核对和信息，重推底稿后才会用来修正判断</span>
          <span className="shrink-0 font-medium text-ink">去重推 ›</span>
        </Link>
      )}

      {/* 记住的现实信息 */}
      <div className="mt-6 text-[13px] font-medium">记住的关于{name}</div>
      <p className="mt-1 text-[12px] text-muted">问事时提到的职业、婚恋、经历会自动记在这里，所有解读都会参考。</p>
      {facts.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {facts.map((n) => (
            <span key={n.id} className="flex items-center gap-1 rounded-full bg-paper py-1.5 pl-3 pr-1.5 text-[12px] text-ink-2">
              {n.year ? `${n.year} 年 ` : ""}
              {n.text}
              <button onClick={() => remove(n.id)} className="flex h-5 w-5 items-center justify-center rounded-full text-muted active:bg-line" aria-label={`删除 ${n.text}`}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <form onSubmit={add} className="mt-3 flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="如：做产品经理 / 已婚有一个孩子"
          maxLength={60}
          className="h-10 min-w-0 flex-1 rounded-xl bg-paper px-3 text-[14px] outline-none placeholder:text-muted"
        />
        <input
          value={year}
          onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          placeholder="年份"
          className="h-10 w-16 rounded-xl bg-paper px-2 text-center text-[14px] outline-none placeholder:text-muted"
        />
        <button disabled={busy || !text.trim()} className="h-10 shrink-0 rounded-xl bg-ink px-4 text-[13px] text-paper disabled:opacity-30">
          记下
        </button>
      </form>
    </Card>
  );
}
