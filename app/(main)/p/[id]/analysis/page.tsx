"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { useApp } from "@/components/client";
import { ErrorNote, Markdown, Thinking, TopBar } from "@/components/ui";
import { useStream } from "@/components/useStream";

// 命盘底稿：bazi skill 第三阶段完整分析，所有报告与问答都以它为准
export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const { profiles } = useApp();
  const p = profiles.find((x) => x.id === id);
  const s = useStream();
  const url = `/api/profiles/${id}/readings/analysis/base`;

  useEffect(() => {
    s.start(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  if (!p) return <TopBar title="找不到" back />;

  return (
    <div>
      <TopBar
        title="命理底稿"
        back={`/p/${id}`}
        right={
          !s.running && s.text ? (
            <button
              onClick={() => confirm("重新推演底稿？该档案已生成的所有报告章节和日签会一并清空，以免与新结论矛盾。") && s.start(url + "?regen=1")}
              className="text-[13px] text-muted"
            >
              重推
            </button>
          ) : null
        }
      />
      <article className="px-6 pt-4">
        <div className="text-[12px] tracking-[0.2em] text-gold">FOUNDATION · {p.name}</div>
        <h1 className="mt-2 font-serif text-[30px] font-semibold">命理底稿</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          这是给推算用的专业底稿，按 bazi skill 的完整流程推演、查阅典籍规则，术语较多。命之书、年运、日签、问事都以它为准，并已翻成大白话，日常看报告就够了。
        </p>
        <div className="my-7 h-px w-10 bg-gold" />
        {s.text ? (
          <Markdown text={s.text} streaming={s.running} />
        ) : s.running ? (
          <div>
            <Thinking status={s.status} />
            <p className="text-[12px] text-muted">完整推演需要 2–3 分钟，可以离开此页，完成后自动保存。</p>
          </div>
        ) : null}
        {s.error && <ErrorNote message={s.error} onRetry={() => s.start(url)} />}
      </article>
    </div>
  );
}
