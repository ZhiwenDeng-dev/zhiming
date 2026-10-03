import fs from "node:fs";
import { currentUser, unauthorized } from "@/lib/auth";
import { reportOf } from "@/lib/reports";
import { readingFile } from "@/lib/store";

// 报告目录：每章是否已生成
export async function GET(_req: Request, ctx: RouteContext<"/api/profiles/[id]/readings/[kind]">) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id, kind } = await ctx.params;
  const report = reportOf(kind);
  if (!report) return Response.json({ error: "没有这种报告" }, { status: 404 });
  const done = report.chapters.filter((c) => fs.existsSync(readingFile(user.id, id, kind, c.key))).map((c) => c.key);
  return Response.json({ done });
}
