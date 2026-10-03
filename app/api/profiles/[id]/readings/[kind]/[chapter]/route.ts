import fs from "node:fs/promises";
import path from "node:path";
import { analysisBuild, analysisMeta, ensureAnalysis } from "@/lib/analysis";
import { currentUser, unauthorized } from "@/lib/auth";
import { cachedResponse, isRunning, streamClaude, type Meta } from "@/lib/claude";
import { localDate, months, today } from "@/lib/paipan";
import { getNotes } from "@/lib/notes";
import { chapterPrompt, dailyPrompt } from "@/lib/prompts";
import { reportOf } from "@/lib/reports";
import { getProfile, readText, readingFile, writeText } from "@/lib/store";

// 生成（或回放缓存）一章。
// kind=analysis：命盘底稿（bazi skill 完整分析）；kind=daily：chapter 为日期，只允许今天；其余为报告章节
export async function POST(req: Request, ctx: RouteContext<"/api/profiles/[id]/readings/[kind]/[chapter]">) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id, kind, chapter } = await ctx.params;
  const profile = await getProfile(user.id, id);
  if (!profile) return Response.json({ error: "档案不存在" }, { status: 404 });

  let build: (status: (v: string) => void) => Promise<string>;
  let meta: Meta;
  if (kind === "analysis") {
    if (chapter !== "base") return Response.json({ error: "没有这一章" }, { status: 404 });
    build = analysisBuild(user.id, profile);
    meta = analysisMeta(user.id, profile);
  } else if (kind === "daily") {
    if (chapter !== localDate()) return Response.json({ error: "只能抽今天的签" }, { status: 400 });
    build = async (status) =>
      dailyPrompt(profile, await ensureAnalysis(user.id, profile, status), await getNotes(user.id, id), await today());
    meta = { uid: user.id, label: `${profile.name} · 今日签`, href: "/" };
  } else {
    const report = reportOf(kind);
    const c = report?.chapters.find((x) => x.key === chapter);
    if (!report || !c) return Response.json({ error: "没有这一章" }, { status: 404 });
    meta = { uid: user.id, label: `${report.title} · ${c.title}`, href: `/p/${id}/${kind}/${chapter}` };
    build = async (status) => {
      const analysis = await ensureAnalysis(user.id, profile, status);
      const t = await today();
      const ms = kind === "annual" ? await months(+t.date.slice(0, 4)) : [];
      return chapterPrompt(profile, analysis, await getNotes(user.id, id), t, ms, `${kind}/${chapter}`, c.title);
    };
  }

  const file = readingFile(user.id, id, kind, chapter);
  const q = new URL(req.url).searchParams;
  if (q.get("regen")) {
    // 底稿重写后，旧章节的结论可能与新底稿矛盾，一并清掉
    if (kind === "analysis") await fs.rm(path.dirname(path.dirname(file)), { recursive: true, force: true });
    else await fs.rm(file, { force: true });
  } else {
    const cached = await readText(file);
    if (cached) return cachedResponse(cached);
    // 只看缓存，不触发生成；正在生成则接上进度
    if (q.get("peek") && !isRunning(file)) return new Response(null, { status: 204 });
  }
  return streamClaude(file, build, (text) => writeText(file, text), meta);
}
