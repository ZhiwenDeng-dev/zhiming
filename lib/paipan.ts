import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

// 四柱、大运、神煞一律以 bazi skill 的 pai_pan.py 为准，这里只解析它的 Markdown 输出
export const SKILL_DIR = process.env.BAZI_SKILL_DIR ?? path.join(os.homedir(), ".claude/skills/bazi");
const SCRIPT = path.join(SKILL_DIR, "scripts/pai_pan.py");

export type Pillar = { gan: string; zhi: string; shishen: string; canggan: string };
export type Chart = {
  solar: string;
  lunar: string;
  shichen: string;
  pillars: Pillar[]; // 年 月 日 时
  dayun: { direction: string; start: string; rows: { seq: string; ages: string; gz: string }[] };
  current: string; // 当前流年，如 2026年丙午
  shensha: { name: string; where: string }[];
  warnings: string[];
  raw: string; // 去掉逐年流年列表后的原文，供 prompt 使用
};

export type BirthInput = {
  calendar: "solar" | "lunar";
  date: string;
  leap?: boolean;
  time: string | null;
  sex: "男" | "女";
  place?: string;
  deceasedYear?: number; // bazi skill：已故者流年只推到去世那年
};

export class PaipanError extends Error {}

export async function paipan(b: BirthInput): Promise<Chart> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date)) throw new PaipanError("日期格式应为 YYYY-MM-DD");
  if (b.time && !/^\d{2}:\d{2}$/.test(b.time)) throw new PaipanError("时间格式应为 HH:MM");
  const args = [SCRIPT, b.calendar === "lunar" ? "--lunar" : "--solar", b.date, "--sex", b.sex];
  if (b.calendar === "lunar" && b.leap) args.push("--leap");
  if (b.time) args.push("--hour", b.time);
  if (b.place) args.push("--place", b.place);
  if (b.deceasedYear) args.push("--deceased-year", String(b.deceasedYear));
  try {
    const { stdout } = await promisify(execFile)("python3", args, { timeout: 15_000 });
    return parse(stdout);
  } catch (e) {
    const err = e as { stderr?: string; code?: string };
    if (err.code === "ENOENT") throw new PaipanError("本机没有 python3，排盘脚本跑不起来");
    throw new PaipanError(err.stderr?.trim() || "排盘失败，请检查出生信息");
  }
}

function sections(md: string) {
  const out: Record<string, string[]> = {};
  let cur = "";
  for (const line of md.split("\n")) {
    const h = line.match(/^## (.+)/);
    if (h) out[(cur = h[1].trim())] = [];
    else if (cur && line.trim()) out[cur].push(line.trim());
  }
  return out;
}

const cells = (row: string) => row.split("|").slice(1, -1).map((c) => c.trim());
const field = (lines: string[] = [], key: string) =>
  lines.find((l) => l.startsWith(`- ${key}：`))?.slice(key.length + 3) ?? "";

export function parse(md: string): Chart {
  const s = sections(md);
  const rows = Object.fromEntries((s["四柱"] ?? []).filter((l) => l.startsWith("|")).map((l) => {
    const c = cells(l);
    return [c[0], c.slice(1)];
  }));
  const pillars = [0, 1, 2, 3].map((i) => ({
    gan: rows["天干"]?.[i] ?? "未知",
    zhi: rows["地支"]?.[i] ?? "未知",
    shishen: rows["十神"]?.[i] ?? "",
    canggan: rows["藏干"]?.[i] ?? "",
  }));
  if (!pillars[2].gan || pillars[2].gan === "未知") throw new PaipanError("排盘输出无法解析");

  const dy = s["大运"] ?? [];
  const dayunRows = dy
    .filter((l) => l.startsWith("|") && !l.includes("---") && !l.includes("大运序"))
    .map((l) => {
      const [seq, ages, gz] = cells(l);
      return { seq, ages, gz };
    });

  return {
    solar: field(s["输入"], "阳历"),
    lunar: field(s["输入"], "农历"),
    shichen: field(s["输入"], "时辰"),
    pillars,
    dayun: { direction: field(dy, "方向"), start: field(dy, "起运"), rows: dayunRows },
    current: field(s["流年"], "当前"),
    shensha: (s["神煞"] ?? []).map((l) => {
      const [name, where] = l.replace(/^- /, "").split(" — ");
      return { name, where: where ?? "" };
    }),
    warnings: (s["警告"] ?? []).map((l) => l.replace(/^- /, "")).filter((w) => w !== "无"),
    raw: md.split("\n").filter((l) => !/^- \d{4}年/.test(l)).join("\n").trim(),
  };
}

// 今日干支：用脚本排当天正午，取年/月/日柱
export type Today = { date: string; year: string; month: string; day: string; lunar: string };
const todayCache = new Map<string, Today>();
export async function today(date = localDate()) {
  const hit = todayCache.get(date);
  if (hit) return hit;
  const c = await paipan({ calendar: "solar", date, time: "12:00", sex: "男" });
  const gz = (i: number) => c.pillars[i].gan + c.pillars[i].zhi;
  const v = { date, year: gz(0), month: gz(1), day: gz(2), lunar: c.lunar };
  todayCache.set(date, v);
  return v;
}

export function localDate(d = new Date()) {
  // 统一按北京时间取日期
  return new Date(d.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
}

// 流月表：十二节为界（立春起寅月）。月柱取各月节后几天的正午，由脚本推出，不在 prompt 里臆测
// ponytail: 节气日期用常见日期近似（±1 天），只用于给用户看的区间文字；月柱本身以脚本为准
const JIE = [
  ["立春", 2, 4], ["惊蛰", 3, 6], ["清明", 4, 5], ["立夏", 5, 6], ["芒种", 6, 6], ["小暑", 7, 7],
  ["立秋", 8, 8], ["白露", 9, 8], ["寒露", 10, 8], ["立冬", 11, 7], ["大雪", 12, 7], ["小寒", 1, 6],
] as const;
export type Month = { range: string; gz: string };
const monthCache = new Map<number, Month[]>();
export async function months(year: number): Promise<Month[]> {
  const hit = monthCache.get(year);
  if (hit) return hit;
  const list = await Promise.all(
    JIE.map(async ([name, m, d], i) => {
      const y = i === 11 ? year + 1 : year;
      const probe = `${y}-${String(m).padStart(2, "0")}-${String(d + 5).padStart(2, "0")}`;
      const c = await paipan({ calendar: "solar", date: probe, time: "12:00", sex: "男" });
      const [, nm, nd] = JIE[(i + 1) % 12];
      return { range: `${name}（约 ${m} 月 ${d} 日）至约 ${nm} 月 ${nd - 1} 日`, gz: c.pillars[1].gan + c.pillars[1].zhi };
    }),
  );
  monthCache.set(year, list);
  return list;
}
