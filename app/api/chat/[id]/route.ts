import crypto from "node:crypto";
import fs from "node:fs/promises";
import { ensureAnalysis } from "@/lib/analysis";
import { currentUser, unauthorized } from "@/lib/auth";
import { isRunning, streamClaude } from "@/lib/claude";
import { months, today } from "@/lib/paipan";
import { splitNotes } from "@/lib/calibration";
import { addNotes, getNotes, type Note } from "@/lib/notes";
import { chatPrompt } from "@/lib/prompts";
import { chatFile, getProfile, readJson, updateJson, type ChatMsg, type Profile } from "@/lib/store";

type Ctx = RouteContext<"/api/chat/[id]">;

// 对话记录 + 仍在生成中的提问 id（前端据此重新接上进度）
export async function GET(_req: Request, ctx: Ctx) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const file = chatFile(user.id, (await ctx.params).id);
  const msgs = await readJson<ChatMsg[]>(file, []);
  const pending = msgs.filter((m) => m.role === "user" && m.id && isRunning(`${file}:${m.id}`)).map((m) => m.id);
  return Response.json({ msgs, pending });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await currentUser();
  if (!user) return unauthorized();
  await fs.rm(chatFile(user.id, (await ctx.params).id), { force: true });
  return Response.json({ ok: true });
}

// 新提问：{ message, friendIds }；重新接上或重试某条未答的提问：{ retryId }
export async function POST(req: Request, ctx: Ctx) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const body = (await req.json()) as { message?: string; friendIds?: string[]; retryId?: string };

  const profile = await getProfile(user.id, id);
  if (!profile) return Response.json({ error: "档案不存在" }, { status: 404 });

  const file = chatFile(user.id, id);
  const msgs = await readJson<ChatMsg[]>(file, []);
  let userMsg: ChatMsg | undefined;

  if (body.retryId) {
    userMsg = msgs.find((m) => m.id === body.retryId && m.role === "user");
    if (!userMsg) return Response.json({ error: "找不到这条提问" }, { status: 404 });
    const answered = msgs.some((m) => m.replyTo === body.retryId);
    if (answered) return Response.json({ error: "这条已经回答过了" }, { status: 409 });
  } else {
    const question = String(body.message ?? "").trim().slice(0, 1000);
    if (!question) return Response.json({ error: "说点什么吧" }, { status: 400 });
    const fids = (body.friendIds ?? []).filter((f) => f !== id).slice(0, 3);
    const names = (await Promise.all(fids.map((f) => getProfile(user.id, f)))).filter(Boolean).map((p) => p!.name);
    userMsg = { id: crypto.randomUUID(), role: "user", text: question, at: new Date().toISOString(), friends: names, friendIds: fids };
    // 先落盘：离开页面再回来也能看到这条提问和进度
    const m = userMsg;
    await updateJson<ChatMsg[]>(file, [], (all) => [...all, m]);
  }

  const q = userMsg;
  const key = `${file}:${q.id}`;
  // 上下文只取这条之前、已经有回答的问答对
  const before = msgs.slice(0, msgs.indexOf(q) >= 0 ? msgs.indexOf(q) : msgs.length);
  const answeredIds = new Set(before.filter((m) => m.replyTo).map((m) => m.replyTo));
  const history = before.filter((m) => m.role === "assistant" || !m.id || answeredIds.has(m.id)); // 无 id 为旧格式记录

  const build = async (status: (v: string) => void) => {
    const friends = (await Promise.all((q.friendIds ?? []).map((f) => getProfile(user.id, f)))).filter(Boolean) as Profile[];
    // 主角和带上的朋友都以各自的命盘底稿为依据（缺的先补生成）
    const people = [profile, ...friends];
    const [analyses, notes] = await Promise.all([
      Promise.all(people.map((p) => ensureAnalysis(user.id, p, status))),
      Promise.all(people.map((p) => getNotes(user.id, p.id))),
    ]);
    const fs_ = friends.map((p, i) => ({ p, analysis: analyses[i + 1], notes: notes[i + 1] }));
    const t = await today();
    return chatPrompt(profile, analyses[0], notes[0], fs_, t, await months(+t.date.slice(0, 4)), history, q.text);
  };

  const meta = { uid: user.id, label: `问事 · ${q.text.slice(0, 12)}${q.text.length > 12 ? "…" : ""}`, href: "/chat" };
  return streamClaude(
    key,
    build,
    async (text) => {
      const { body, raw } = splitNotes(text);
      const noted = await saveExtracted(user.id, id, raw);
      await updateJson<ChatMsg[]>(file, [], (all) => [
        ...all,
        { role: "assistant", text: body, at: new Date().toISOString(), replyTo: q.id, ...(noted.length ? { noted } : {}) },
      ]);
    },
    meta,
  );
}

// 解析回答末尾的备注块并落盘；格式不对就忽略，不影响回答本身
async function saveExtracted(uid: string, pid: string, raw: string | null): Promise<string[]> {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw.trim().replace(/^```(json)?|```$/g, "").trim()) as Partial<Note>[];
    const items = (Array.isArray(arr) ? arr : [])
      .filter((n) => n && typeof n.text === "string" && (n.kind === "fact" || n.kind === "event"))
      .slice(0, 5)
      .map((n) => ({
        kind: n.kind as Note["kind"],
        text: n.text!,
        year: typeof n.year === "number" ? n.year : undefined,
        source: "chat" as const,
      }));
    const before = new Set((await getNotes(uid, pid)).map((n) => n.text));
    await addNotes(uid, pid, items);
    return items.filter((n) => !before.has(n.text)).map((n) => (n.year ? `${n.year} 年${n.text}` : n.text));
  } catch {
    return [];
  }
}
