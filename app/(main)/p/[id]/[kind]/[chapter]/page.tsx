"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { useApp } from "@/components/client";
import { ErrorNote, Markdown, Thinking, TopBar } from "@/components/ui";
import { useStream } from "@/components/useStream";
import { reportOf } from "@/lib/reports";

export default function ChapterPage() {
  const { id, kind, chapter } = useParams<{ id: string; kind: string; chapter: string }>();
  const { profiles } = useApp();
  const p = profiles.find((x) => x.id === id);
  const report = reportOf(kind);
  const idx = report?.chapters.findIndex((c) => c.key === chapter) ?? -1;
  const c = report?.chapters[idx];
  const s = useStream();
  const url = `/api/profiles/${id}/readings/${kind}/${chapter}`;

  useEffect(() => {
    if (c) s.start(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  if (!p || !report || !c) return <TopBar title="找不到" back />;
  const prev = report.chapters[idx - 1];
  const next = report.chapters[idx + 1];

  return (
    <div>
      <TopBar
        title={report.title}
        back={`/p/${id}/${kind}`}
        right={
          !s.running && s.text ? (
            <button onClick={() => confirm("重新推演这一章？当前内容会被替换。") && s.start(url + "?regen=1")} className="text-[13px] text-muted">
              重写
            </button>
          ) : null
        }
      />
      <article className="px-6 pt-4">
        <div className="text-[12px] tracking-[0.2em] text-gold">
          第 {idx + 1} 章 · {p.name}
        </div>
        <h1 className="mt-2 font-serif text-[30px] leading-tight font-semibold">{c.title}</h1>
        {c.subtitle && <p className="mt-2 font-serif text-[15px] text-muted">{c.subtitle}</p>}
        <div className="my-7 h-px w-10 bg-gold" />

        {s.text ? (
          <Markdown text={s.text} streaming={s.running} />
        ) : s.running ? (
          <div>
            <Thinking status={s.status} />
            <p className="text-[12px] text-muted">首次解读需要一点时间，可以离开此页，内容会在后台生成好。</p>
          </div>
        ) : null}
        {s.error && <ErrorNote message={s.error} onRetry={() => s.start(url)} />}

        {!s.running && s.text && (
          <p className="mt-10 text-center text-[11px] text-muted">命理分析仅供参考，人生在于自身的努力和选择。</p>
        )}
      </article>

      {!s.running && (
        <nav className="mt-10 grid grid-cols-2 gap-3 px-5">
          {prev ? (
            <Link href={`/p/${id}/${kind}/${prev.key}`} className="rounded-2xl bg-card p-4">
              <div className="text-[11px] text-muted">上一章</div>
              <div className="mt-1 truncate font-serif text-[15px]">{prev.title}</div>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`/p/${id}/${kind}/${next.key}`} className="rounded-2xl bg-card p-4 text-right">
              <div className="text-[11px] text-muted">下一章</div>
              <div className="mt-1 truncate font-serif text-[15px]">{next.title}</div>
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
