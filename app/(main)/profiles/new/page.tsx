"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api, useApp } from "@/components/client";
import { Button, TopBar } from "@/components/ui";
import type { Profile } from "@/lib/store";
import { SHICHEN } from "@/lib/wuxing";

const RELATIONS = ["伴侣", "家人", "朋友", "同事", "孩子"];

function Seg<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-xl bg-paper p-1">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`h-9 flex-1 rounded-lg text-[14px] transition ${value === o.v ? "bg-card font-medium shadow-sm" : "text-muted"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[56px] items-center gap-4 border-b border-line py-2 last:border-0">
      <div className="w-16 shrink-0 text-[14px] text-ink-2">{label}</div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function Form() {
  const router = useRouter();
  const params = useSearchParams();
  const { profiles, reload, setCurrent } = useApp();
  const isSelf = params.get("self") === "1" || !profiles.some((p) => p.relation === "自己");

  const [name, setName] = useState("");
  const [relation, setRelation] = useState(isSelf ? "自己" : "朋友");
  const [sex, setSex] = useState<"男" | "女">("女");
  const [calendar, setCalendar] = useState<"solar" | "lunar">("solar");
  const [date, setDate] = useState("1995-01-01");
  const [leap, setLeap] = useState(false);
  const [timeMode, setTimeMode] = useState<"exact" | "shichen" | "unknown">("exact");
  const [time, setTime] = useState("12:00");
  const [shichen, setShichen] = useState("午");
  const [place, setPlace] = useState("");
  const [more, setMore] = useState(false);
  const [formerName, setFormerName] = useState("");
  const [renameYear, setRenameYear] = useState("");
  const [deceased, setDeceased] = useState(false);
  const [deceasedYear, setDeceasedYear] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const t = timeMode === "exact" ? time : timeMode === "shichen" ? SHICHEN.find((s) => s.zhi === shichen)!.time : null;
      const p = await api<Profile>("/api/profiles", {
        json: {
          name,
          relation,
          sex,
          calendar,
          date,
          leap,
          time: t,
          place,
          formerName,
          renameYear: renameYear || undefined,
          deceasedYear: deceased ? deceasedYear : undefined,
        },
      });
      await reload();
      if (relation === "自己") setCurrent(p.id);
      router.replace(`/p/${p.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const field = "w-full bg-transparent text-right text-[16px] outline-none placeholder:text-muted";

  return (
    <>
      <TopBar title={isSelf ? "" : "添加档案"} back={profiles.length ? true : undefined} />
      <form onSubmit={submit} className="px-5">
        <div className="pb-6 pt-2">
          <h1 className="font-serif text-[28px] font-semibold">{isSelf ? "先认识一下你" : "为 TA 建一份命盘"}</h1>
          <p className="mt-1.5 text-[13px] text-muted">
            {isSelf ? "出生时间越准，解读越准。只需填写一次。" : "朋友的命盘只有你能看到，问事时可以一起分析。"}
          </p>
        </div>

        <div className="rounded-[22px] bg-card px-5">
          <Row label="名字">
            <input className={field} placeholder={isSelf ? "你的名字" : "TA 的名字"} value={name} onChange={(e) => setName(e.target.value)} />
          </Row>
          {!isSelf && (
            <Row label="关系">
              <div className="no-scrollbar flex justify-end gap-1.5 overflow-x-auto">
                {RELATIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRelation(r)}
                    className={`h-8 shrink-0 rounded-full px-3 text-[13px] ${relation === r ? "bg-ink text-paper" : "bg-paper text-ink-2"}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </Row>
          )}
          <Row label="性别">
            <Seg value={sex} onChange={setSex} options={[{ v: "女", label: "女" }, { v: "男", label: "男" }]} />
          </Row>
        </div>

        <div className="mt-4 rounded-[22px] bg-card px-5">
          <Row label="历法">
            <Seg value={calendar} onChange={setCalendar} options={[{ v: "solar", label: "公历" }, { v: "lunar", label: "农历" }]} />
          </Row>
          <Row label="日期">
            <div className="flex items-center justify-end gap-3">
              {calendar === "lunar" && (
                <label className="flex items-center gap-1 text-[13px] text-ink-2">
                  <input type="checkbox" checked={leap} onChange={(e) => setLeap(e.target.checked)} className="accent-[var(--gold)]" />
                  闰月
                </label>
              )}
              <input type="date" className={`${field} w-auto`} value={date} min="1900-01-01" max="2099-12-31" onChange={(e) => setDate(e.target.value)} required />
            </div>
            {calendar === "lunar" && <p className="mt-1 text-right text-[11px] text-muted">按数字选农历日期，如 四月廿一 → 04-21</p>}
          </Row>
          <Row label="时间">
            <Seg
              value={timeMode}
              onChange={setTimeMode}
              options={[
                { v: "exact", label: "准确时间" },
                { v: "shichen", label: "大概时辰" },
                { v: "unknown", label: "不知道" },
              ]}
            />
          </Row>
          {timeMode === "exact" && (
            <Row label="">
              <input type="time" className={field} value={time} onChange={(e) => setTime(e.target.value)} required />
            </Row>
          )}
          {timeMode === "shichen" && (
            <div className="grid grid-cols-4 gap-1.5 pb-4">
              {SHICHEN.map((s) => (
                <button
                  key={s.zhi}
                  type="button"
                  onClick={() => setShichen(s.zhi)}
                  className={`rounded-xl py-2 text-center ${shichen === s.zhi ? "bg-ink text-paper" : "bg-paper"}`}
                >
                  <div className="font-serif text-[16px]">{s.zhi}时</div>
                  <div className={`text-[10px] ${shichen === s.zhi ? "text-paper/60" : "text-muted"}`}>{s.range}</div>
                </button>
              ))}
            </div>
          )}
          {timeMode === "unknown" && <p className="pb-4 text-[12px] text-muted">没关系，会只用年、月、日六个字来分析，时柱相关内容会略过。</p>}
          <Row label="出生地">
            <input className={field} placeholder="选填，如 浙江杭州" value={place} onChange={(e) => setPlace(e.target.value)} />
          </Row>
        </div>

        {/* bazi skill 还会参考的信息，默认收起 */}
        {more ? (
          <div className="mt-4 rounded-[22px] bg-card px-5">
            <Row label="曾用名">
              <div className="flex items-center justify-end gap-2">
                <input className={field} placeholder="没有可不填" value={formerName} onChange={(e) => setFormerName(e.target.value)} />
                {formerName && (
                  <input
                    className="w-20 bg-paper rounded-lg px-2 py-1 text-center text-[14px] outline-none placeholder:text-muted"
                    inputMode="numeric"
                    placeholder="改名年份"
                    value={renameYear}
                    onChange={(e) => setRenameYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  />
                )}
              </div>
            </Row>
            {!isSelf && (
              <Row label="已故">
                <div className="flex items-center justify-end gap-2">
                  {deceased && (
                    <input
                      className="w-24 bg-paper rounded-lg px-2 py-1 text-center text-[14px] outline-none placeholder:text-muted"
                      inputMode="numeric"
                      placeholder="去世年份"
                      value={deceasedYear}
                      onChange={(e) => setDeceasedYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    />
                  )}
                  <input type="checkbox" checked={deceased} onChange={(e) => setDeceased(e.target.checked)} className="h-5 w-5 accent-[var(--gold)]" />
                </div>
              </Row>
            )}
          </div>
        ) : (
          <button type="button" onClick={() => setMore(true)} className="mt-3 w-full py-2 text-[13px] text-muted">
            ＋ 更多信息（曾用名{isSelf ? "" : "、已故"}，选填）
          </button>
        )}

        {error && <p className="mt-4 px-1 text-[13px] text-[#b5523b]">{error}</p>}
        <Button className="mt-6 w-full" disabled={busy || !name.trim() || !date}>
          {busy ? "正在排盘…" : "排盘"}
        </Button>
        <p className="mt-3 text-center text-[11px] text-muted">出生时间按北京时间填写</p>
      </form>
    </>
  );
}

export default function NewProfilePage() {
  return (
    <Suspense>
      <Form />
    </Suspense>
  );
}
