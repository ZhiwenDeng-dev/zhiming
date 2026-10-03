"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { api, useApp } from "@/components/client";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";
import { ErrorNote, Markdown, Thinking } from "@/components/ui";
import { useStream } from "@/components/useStream";
import { splitNotes } from "@/lib/calibration";
import type { ChatMsg } from "@/lib/store";

function Chat() {
  const { current, profiles } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const s = useStream();
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  // 选的「一起看」只对当前主角有效，切换主角自动清空
  const [picked, setPicked] = useState<{ pid?: string; ids: string[] }>({ ids: [] });
  const friendIds = picked.pid === current?.id ? picked.ids : [];
  const setFriendIds = (ids: string[]) => setPicked({ pid: current?.id, ids });
  const [pendingIds, setPendingIds] = useState<string[]>([]); // 服务端仍在生成的提问
  const [local, setLocal] = useState<ChatMsg | null>(null); // 刚发出、还没落到列表里的提问
  const [attachId, setAttachId] = useState<string | null>(null); // 正在流式接收的已存提问
  const endRef = useRef<HTMLDivElement>(null);
  const sentQ = useRef(false);

  const others = profiles.filter((p) => p.id !== current?.id);
  const url = current ? `/api/chat/${current.id}` : "";

  type ChatState = { msgs: ChatMsg[]; pending: string[] };
  const apply = (r: ChatState) => {
    setMsgs(r.msgs);
    setPendingIds(r.pending);
    return r;
  };

  // 对某条已存的提问接上进度（仍在生成）或重试（已失败）
  async function follow(id: string) {
    setAttachId(id);
    const answer = await s.start(url, { retryId: id });
    apply(await api<ChatState>(url));
    setAttachId(null);
    if (answer !== null) s.reset(); // 失败时保留错误信息给「重新回答」卡片
  }

  useEffect(() => {
    if (!current) return;
    api<ChatState>(`/api/chat/${current.id}`).then(
      (r) => {
        apply(r);
        // 离开过页面：自动接上还在生成的那条
        if (r.pending[0]) follow(r.pending[0]);
      },
      () => setMsgs([]),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, s.text, local]);

  // 上一个推算出结果之前，不接新的提问
  const busy = s.running || pendingIds.length > 0;

  async function send(text: string) {
    if (!current || !text.trim() || busy) return;
    const friends = profiles.filter((p) => friendIds.includes(p.id)).map((p) => p.name);
    setLocal({ role: "user", text: text.trim(), at: new Date().toISOString(), friends });
    setInput("");
    const answer = await s.start(url, { message: text.trim(), friendIds });
    // 提问在服务端已落盘；失败的会以「重新回答」形式出现在列表里
    apply(await api<ChatState>(url));
    setLocal(null);
    if (answer !== null) s.reset();
  }

  // 从「今日」带过来的问题，自动发出
  useEffect(() => {
    const q = params.get("q");
    if (q && current && !sentQ.current) {
      sentQ.current = true;
      router.replace("/chat");
      send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  if (!current) return null;
  const replies = new Map(msgs.filter((m) => m.replyTo).map((m) => [m.replyTo!, m]));

  const suggestions = [
    "我适合做什么样的工作？",
    "我的正缘有什么特征？",
    "哪种人容易成为我的贵人？",
    ...(others[0] ? [`我和${others[0].name}合得来吗？`] : []),
  ];

  return (
    <div className="flex min-h-[calc(100dvh-76px)] flex-col">
      <div className="sticky top-0 z-10 bg-paper/85 pb-3 backdrop-blur-xl">
        <div className="flex items-end justify-between px-5 pb-3 pt-8">
          <div>
            <div className="text-[11px] tracking-[0.25em] text-gold">ASK</div>
            <h1 className="mt-0.5 font-serif text-[28px] font-semibold">问事</h1>
          </div>
          {msgs.length > 0 && !busy && (
            <button
              onClick={async () => {
                if (!confirm(`清空和「${current.name}」相关的对话？`)) return;
                await api(`/api/chat/${current.id}`, { method: "DELETE" });
                setMsgs([]);
              }}
              className="pb-1 text-[13px] text-muted"
            >
              清空
            </button>
          )}
        </div>
        <ProfileSwitcher />
        {others.length > 0 && (
          <div className="no-scrollbar mt-2.5 flex items-center gap-2 overflow-x-auto px-5">
            <span className="shrink-0 text-[12px] text-muted">一起看：</span>
            {others.map((p) => {
              const on = friendIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => setFriendIds(on ? friendIds.filter((x) => x !== p.id) : [...friendIds, p.id].slice(-3))}
                  className={`h-7 shrink-0 rounded-full border px-3 text-[12px] transition ${on ? "border-gold bg-gold-soft text-ink" : "border-line text-muted"}`}
                >
                  {on ? "✓ " : "＋ "}
                  {p.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 space-y-5 px-5 pt-3 pb-28">
        {msgs.length === 0 && !local && (
          <div className="rise pt-6">
            <p className="font-serif text-[20px] leading-relaxed">
              凡有所问，皆有所答。
              <br />
              <span className="text-muted">关于{current.name}，你想知道什么？</span>
            </p>
            <div className="mt-6 space-y-2">
              {suggestions.map((t) => (
                <button key={t} onClick={() => send(t)} className="block w-full rounded-2xl bg-card px-4 py-3.5 text-left text-[14px] active:scale-[0.99]">
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs
          .filter((m) => !m.replyTo)
          .map((m, i) => {
            if (m.role === "assistant") return <Answer key={i} text={m.text} />; // 旧格式记录
            const reply = m.id ? replies.get(m.id) : undefined;
            const streaming = !!m.id && m.id === attachId;
            return (
              <div key={m.id ?? i} className="space-y-5">
                <Question m={m} />
                {reply ? (
                  <Answer text={reply.text} noted={reply.noted} />
                ) : streaming || (m.id && pendingIds.includes(m.id)) ? (
                  <div className="rounded-[20px] rounded-bl-md bg-card px-5 py-4">
                    {streaming && s.text ? <Markdown text={splitNotes(s.text).body} streaming={s.running} /> : <Thinking status={streaming ? s.status : "排队中"} />}
                  </div>
                ) : m.id ? (
                  <div className="rounded-[20px] rounded-bl-md bg-gold-soft px-5 py-4 text-[14px] text-ink-2">
                    <p>这条没有得到回答{s.error ? `：${s.error}` : "，可能是生成中断了。"}</p>
                    <button disabled={s.running} onClick={() => follow(m.id!)} className="mt-2 font-medium text-ink underline underline-offset-4 disabled:opacity-40">
                      重新回答
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}

        {local && (
          <div className="space-y-5">
            <Question m={local} />
            <div className="rounded-[20px] rounded-bl-md bg-card px-5 py-4">
              {s.text ? <Markdown text={splitNotes(s.text).body} streaming={s.running} /> : s.running ? <Thinking status={s.status} /> : null}
              {s.error && <ErrorNote message={s.error} />}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="fixed inset-x-0 bottom-[calc(58px+env(safe-area-inset-bottom))] z-20 mx-auto max-w-[480px] bg-gradient-to-t from-paper via-paper to-paper/0 px-4 pt-4 pb-3"
      >
        <div className="flex items-end gap-2 rounded-[24px] bg-card p-1.5 pl-4 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.15)]">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder={busy ? "正在推算，等上一个结果出来再问" : `问问关于${current.name}的事`}
            className="max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2 text-[15px] outline-none placeholder:text-muted"
          />
          <button
            disabled={!input.trim() || busy}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-paper disabled:opacity-30"
            aria-label="发送"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 19V5m-6 6 6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

function Question({ m }: { m: ChatMsg }) {
  return (
    <div className="flex flex-col items-end">
      <div className="max-w-[82%] rounded-[20px] rounded-br-md bg-ink px-4 py-2.5 text-[15px] leading-relaxed text-paper">{m.text}</div>
      {m.friends?.length ? <div className="mt-1 text-[11px] text-muted">结合 {m.friends.join("、")} 的命盘</div> : null}
    </div>
  );
}

function Answer({ text, noted }: { text: string; noted?: string[] }) {
  return (
    <div>
      <div className="rounded-[20px] rounded-bl-md bg-card px-5 py-4">
        <Markdown text={text} />
      </div>
      {noted?.length ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 px-1 text-[11px] text-muted">
          <span className="text-gold">✓ 已记下</span>
          {noted.map((n) => (
            <span key={n} className="rounded-full bg-gold-soft px-2 py-0.5 text-ink-2">
              {n}
            </span>
          ))}
          <span>以后的解读都会参考</span>
        </div>
      ) : null}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense>
      <Chat />
    </Suspense>
  );
}
