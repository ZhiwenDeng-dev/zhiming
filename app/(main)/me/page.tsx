"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, Mark, useApp } from "@/components/client";
import { Chevron, PageTitle } from "@/components/ui";

export default function MePage() {
  const { user, profiles, reload } = useApp();
  const router = useRouter();

  async function remove(id: string, name: string) {
    if (!confirm(`删除「${name}」的档案？相关报告和对话会一起删除，无法恢复。`)) return;
    await api(`/api/profiles/${id}`, { method: "DELETE" });
    await reload();
  }

  return (
    <div>
      <PageTitle en="Profiles" title="档案" sub="自己的和朋友的命盘都在这里，只有你能看到" />

      <div className="px-5">
        <div className="overflow-hidden rounded-[22px] bg-card">
          {profiles.map((p) => (
            <div key={p.id} className="flex items-center border-b border-line last:border-0">
              <Link href={`/p/${p.id}`} className="flex flex-1 items-center gap-4 px-5 py-4 active:bg-paper">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-paper font-serif text-[18px]">{p.name[0]}</div>
                <div className="flex-1">
                  <div className="text-[15px]">
                    {p.name}
                    <span className="ml-2 text-[11px] text-gold">{p.relation}</span>
                  </div>
                  <div className="mt-0.5 font-serif text-[13px] tracking-[0.1em] text-muted">
                    {p.chart.pillars.map((x) => (x.gan === "未知" ? "□□" : x.gan + x.zhi)).join(" ")}
                  </div>
                </div>
                <Chevron />
              </Link>
              {p.relation !== "自己" && (
                <button onClick={() => remove(p.id, p.name)} className="px-4 py-4 text-[12px] text-muted" aria-label={`删除${p.name}`}>
                  删除
                </button>
              )}
            </div>
          ))}
        </div>

        <Link href="/profiles/new" className="mt-4 flex h-12 items-center justify-center rounded-full border border-dashed border-line text-[14px] text-ink-2">
          ＋ 添加家人或朋友
        </Link>

        <div className="mt-12 flex flex-col items-center text-center">
          <Mark className="h-8 w-8" />
          <div className="mt-3 text-[13px] text-ink-2">{user.username}</div>
          <button
            onClick={async () => {
              await api("/api/auth", { json: { action: "logout" } });
              router.replace("/login");
            }}
            className="mt-4 text-[13px] text-muted underline underline-offset-4"
          >
            退出登录
          </button>
          <p className="mt-8 max-w-[260px] text-[11px] leading-relaxed text-muted">命理分析仅供参考，人生在于自身的努力和选择。</p>
        </div>
      </div>
    </div>
  );
}
