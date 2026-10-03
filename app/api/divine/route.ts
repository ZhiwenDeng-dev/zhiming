import { execFile } from "node:child_process";
import crypto from "node:crypto";
import path from "node:path";
import { promisify } from "node:util";
import { analysisFile } from "@/lib/analysis";
import { currentUser, unauthorized } from "@/lib/auth";
import { APP_SKILLS, streamClaude } from "@/lib/claude";
import { cast } from "@/lib/iching";
import { today } from "@/lib/paipan";
import { divinePrompt } from "@/lib/prompts";
import { divinationFile, getProfile, readJson, readText, updateJson, type Divination } from "@/lib/store";

export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  return Response.json(await readJson<Divination[]>(divinationFile(user.id), []));
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { question, lines, profileId } = (await req.json()) as { question: string; lines: number[]; profileId?: string };
  const q = String(question ?? "").trim().slice(0, 200);
  if (!q) return Response.json({ error: "先写下你想问的事" }, { status: 400 });
  try {
    cast(lines); // 先校验爻值
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
  // 卦象与断卦取用以 iching skill 的脚本为准（前端 lib/iching.ts 只用于画卦，自检保证两边一致）
  const { stdout: qigua } = await promisify(execFile)(
    "python3",
    [path.join(APP_SKILLS, "iching/scripts/qigua.py"), "--lines", lines.join(",")],
    { timeout: 10_000 },
  );
  const p = profileId ? await getProfile(user.id, profileId) : null;
  // 占卦以《周易》为本；问卦人有底稿就带上作背景，没有不等
  const analysis = p ? await readText(analysisFile(user.id, p.id)) : null;
  const prompt = divinePrompt(q, qigua.trim(), await today(), p, analysis);
  const id = crypto.randomUUID();
  const file = divinationFile(user.id);

  return streamClaude(
    `${file}:${id}`,
    prompt,
    async (answer) => {
      const d: Divination = { id, question: q, lines, profileId: p?.id, answer, at: new Date().toISOString() };
      await updateJson<Divination[]>(file, [], (all) => [d, ...all].slice(0, 100));
    },
    { uid: user.id, label: `占卦 · ${q.slice(0, 12)}${q.length > 12 ? "…" : ""}`, href: "/divine" },
  );
}
