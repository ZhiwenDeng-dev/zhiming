"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ text, streaming }: { text: string; streaming?: boolean }) {
  return (
    <div className={`prose-zm ${streaming ? "streaming" : ""}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}

export function TopBar({ title, back, right }: { title?: string; back?: string | true; right?: React.ReactNode }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 flex h-12 items-center justify-between bg-paper/80 px-4 backdrop-blur-xl">
      <div className="w-16">
        {back && (
          <button
            onClick={() => (back === true ? router.back() : router.push(back))}
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full active:bg-line"
            aria-label="返回"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
      <h1 className="truncate text-[15px] font-medium">{title}</h1>
      <div className="flex w-16 justify-end">{right}</div>
    </header>
  );
}

export function PageTitle({ en, title, sub }: { en: string; title: string; sub?: string }) {
  return (
    <div className="px-5 pb-4 pt-8">
      <div className="text-[11px] tracking-[0.25em] text-gold uppercase">{en}</div>
      <h1 className="mt-1 font-serif text-[30px] leading-tight font-semibold">{title}</h1>
      {sub && <p className="mt-1.5 text-[13px] text-muted">{sub}</p>}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  const base = "inline-flex h-12 items-center justify-center rounded-full px-6 text-[15px] font-medium transition active:scale-[0.98] disabled:opacity-40";
  const v = variant === "primary" ? "bg-ink text-paper" : "border border-line bg-card text-ink";
  return (
    <button className={`${base} ${v} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Card({ children, className = "", href }: { children: React.ReactNode; className?: string; href?: string }) {
  const cls = `block rounded-[22px] bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] ${className}`;
  return href ? (
    <Link href={href} className={`${cls} transition active:scale-[0.99]`}>
      {children}
    </Link>
  ) : (
    <div className={cls}>{children}</div>
  );
}

const TRIGRAMS = ["☰", "☱", "☲", "☳", "☴", "☵", "☶", "☷"];
const STEPS = ["起盘", "查阅典籍", "推算", "落笔"];

// 由服务端进度文案推断当前阶段
function stepOf(status: string) {
  if (/典籍|查阅|研读/.test(status)) return 1;
  if (/推算|推演/.test(status)) return 2;
  if (/落笔|生成/.test(status)) return 3;
  return 0;
}

/** 推算中的动态加载：八卦环慢转、太极反转、金光呼吸，配阶段与计时 */
export function Thinking({ status }: { status: string }) {
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(start);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const sec = Math.floor((now - start) / 1000);
  const queued = status.includes("排队");
  const step = stepOf(status);

  return (
    <div className="flex flex-col items-center py-6">
      <div className="relative h-36 w-36">
        <div className="zm-breathe absolute inset-6 rounded-full bg-gold/25 blur-2xl" />
        <svg viewBox="0 0 144 144" className="absolute inset-0">
          <g className="zm-spin" style={{ animationDuration: "28s" }}>
            {TRIGRAMS.map((t, i) => {
              const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
              return (
                <text
                  key={t}
                  x={72 + Math.cos(a) * 60}
                  y={72 + Math.sin(a) * 60}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="13"
                  fill="var(--gold)"
                  opacity={0.85}
                  transform={`rotate(${(i / 8) * 360} ${72 + Math.cos(a) * 60} ${72 + Math.sin(a) * 60})`}
                >
                  {t}
                </text>
              );
            })}
          </g>
          <circle cx="72" cy="72" r="46" fill="none" stroke="var(--gold)" strokeWidth="0.8" strokeDasharray="2 5" className="zm-spin-rev" style={{ animationDuration: "16s" }} />
          <circle cx="72" cy="72" r="38" fill="none" stroke="var(--line)" strokeWidth="1" />
          <g className="zm-spin" style={{ animationDuration: queued ? "14s" : "5s" }}>
            <circle cx="72" cy="72" r="30" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1" />
            <path d="M72 42a30 30 0 0 1 0 60a15 15 0 0 1 0-30a15 15 0 0 0 0-30Z" fill="var(--ink)" />
            <circle cx="72" cy="57" r="4.5" fill="var(--paper)" />
            <circle cx="72" cy="87" r="4.5" fill="var(--ink)" />
          </g>
        </svg>
      </div>

      <div className="zm-shimmer mt-4 font-serif text-[16px] text-ink">{status || "正在推算"}…</div>
      <div className="mt-1 text-[11px] tabular-nums text-muted">
        {queued ? "已等待" : "已推算"} {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, "0")}
      </div>

      {!queued && (
        <div className="mt-5 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex items-center gap-1 text-[11px] ${i <= step ? "text-ink" : "text-muted/60"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${i < step ? "bg-gold" : i === step ? "zm-breathe bg-gold" : "bg-line"}`} />
                {label}
              </div>
              {i < STEPS.length - 1 && <span className={`h-px w-4 ${i < step ? "bg-gold" : "bg-line"}`} />}
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 max-w-[240px] text-center text-[11px] leading-relaxed text-muted">可以先去别的页面看看，推算会在后台继续，完成后自动保存。</p>
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl bg-gold-soft p-4 text-[14px] text-ink-2">
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 font-medium text-ink underline underline-offset-4">
          再试一次
        </button>
      )}
    </div>
  );
}

export const Chevron = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
