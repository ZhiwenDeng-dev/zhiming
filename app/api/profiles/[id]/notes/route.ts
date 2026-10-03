import fs from "node:fs/promises";
import { analysisFile } from "@/lib/analysis";
import { currentUser, unauthorized } from "@/lib/auth";
import { predictionsOf } from "@/lib/calibration";
import { addNotes, deleteNote, getNotes } from "@/lib/notes";
import { getProfile, readText } from "@/lib/store";

type Ctx = RouteContext<"/api/profiles/[id]/notes">;

// 备注 + 底稿里待核对的历史事件（已转成大白话）
export async function GET(_req: Request, ctx: Ctx) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const analysisPath = analysisFile(user.id, id);
  const [notes, analysis, stat] = await Promise.all([
    getNotes(user.id, id),
    readText(analysisPath),
    fs.stat(analysisPath).catch(() => null),
  ]);
  // 有比底稿更新的核对/备注 → 提示用户重推底稿让它生效
  const stale = !!stat && notes.some((n) => new Date(n.at).getTime() > stat.mtimeMs);
  return Response.json({ notes, predictions: predictionsOf(analysis), stale });
}

// 手动添加：{ text, year? }；核对历史事件：{ text, verified }
export async function POST(req: Request, ctx: Ctx) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  if (!(await getProfile(user.id, id))) return Response.json({ error: "档案不存在" }, { status: 404 });
  const b = (await req.json()) as { text?: string; year?: number; verified?: boolean };
  const text = String(b.text ?? "").trim();
  if (!text) return Response.json({ error: "写点什么吧" }, { status: 400 });
  const calibration = typeof b.verified === "boolean";
  const notes = await addNotes(user.id, id, [
    calibration
      ? { kind: "event", text, verified: b.verified, source: "calibration" }
      : { kind: b.year ? "event" : "fact", text, year: b.year || undefined, source: "manual" },
  ]);
  return Response.json({ notes });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const nid = new URL(req.url).searchParams.get("nid");
  if (!nid) return Response.json({ error: "缺少 nid" }, { status: 400 });
  return Response.json({ notes: await deleteNote(user.id, (await ctx.params).id, nid) });
}
