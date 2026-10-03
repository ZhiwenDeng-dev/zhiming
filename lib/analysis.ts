import { generate } from "./claude";
import { today } from "./paipan";
import { getNotes } from "./notes";
import { analysisPrompt } from "./prompts";
import { readText, readingFile, writeText, type Profile } from "./store";

// 命盘底稿：bazi skill 第三阶段的完整分析，每个档案一份，所有解读的唯一依据
export const analysisFile = (uid: string, pid: string) => readingFile(uid, pid, "analysis", "base");

export const analysisMeta = (uid: string, p: Profile) => ({ uid, label: `${p.name} · 命理底稿`, href: `/p/${p.id}/analysis` });

export const analysisBuild = (uid: string, p: Profile) => async () =>
  analysisPrompt(p, await today(), await getNotes(uid, p.id));

/** 有缓存直接返回；否则生成（同一档案并发调用只跑一次） */
export async function ensureAnalysis(uid: string, p: Profile, status?: (v: string) => void): Promise<string> {
  const file = analysisFile(uid, p.id);
  const cached = await readText(file);
  if (cached) return cached;
  status?.(`正在研读${p.name}的完整命盘（首次约 2–3 分钟）`);
  return generate(file, analysisBuild(uid, p), (text) => writeText(file, text), analysisMeta(uid, p));
}
