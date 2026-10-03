import { currentUser, unauthorized } from "@/lib/auth";
import { deleteProfile, getProfile } from "@/lib/store";

export async function GET(_req: Request, ctx: RouteContext<"/api/profiles/[id]">) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const p = await getProfile(user.id, (await ctx.params).id);
  return p ? Response.json(p) : Response.json({ error: "档案不存在" }, { status: 404 });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/profiles/[id]">) {
  const user = await currentUser();
  if (!user) return unauthorized();
  await deleteProfile(user.id, (await ctx.params).id);
  return Response.json({ ok: true });
}
