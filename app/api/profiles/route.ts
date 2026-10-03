import crypto from "node:crypto";
import { ensureAnalysis } from "@/lib/analysis";
import { currentUser, unauthorized } from "@/lib/auth";
import { PaipanError, paipan, type BirthInput } from "@/lib/paipan";
import { listProfiles, saveProfile, type Profile } from "@/lib/store";

export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  return Response.json(await listProfiles(user.id));
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const b = await req.json();
  const name = String(b.name ?? "").trim().slice(0, 20);
  if (!name) return Response.json({ error: "请填写名字" }, { status: 400 });
  if (b.sex !== "男" && b.sex !== "女") return Response.json({ error: "请选择性别" }, { status: 400 });

  const existing = await listProfiles(user.id);
  // 每个账号只有一个「自己」
  const relation = b.relation === "自己" && existing.some((p) => p.relation === "自己") ? "朋友" : String(b.relation || "朋友");

  const input: BirthInput = {
    calendar: b.calendar === "lunar" ? "lunar" : "solar",
    date: String(b.date ?? ""),
    leap: !!b.leap,
    time: b.time ? String(b.time) : null,
    sex: b.sex,
    place: b.place ? String(b.place).slice(0, 30) : undefined,
    deceasedYear: year(b.deceasedYear),
  };
  try {
    const chart = await paipan(input);
    const profile: Profile = {
      id: crypto.randomUUID(),
      name,
      relation,
      ...input,
      formerName: b.formerName ? String(b.formerName).trim().slice(0, 20) || undefined : undefined,
      renameYear: year(b.renameYear),
      createdAt: new Date().toISOString(),
      chart,
    };
    await saveProfile(user.id, profile);
    // 建档即在后台按 bazi skill 推演命盘底稿，用户点开报告时通常已就绪
    ensureAnalysis(user.id, profile).catch((e) => console.error("analysis failed", profile.id, e.message));
    return Response.json(profile);
  } catch (e) {
    if (e instanceof PaipanError) return Response.json({ error: e.message }, { status: 400 });
    throw e;
  }
}

const year = (v: unknown) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1900 && n <= 2100 ? n : undefined;
};
