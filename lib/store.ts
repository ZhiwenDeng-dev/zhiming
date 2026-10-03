import fs from "node:fs/promises";
import path from "node:path";
import type { Chart } from "./paipan";

// ponytail: JSON 文件存储，单机自用够了；多人并发写同一文件再换 SQLite
export const DATA_DIR = path.join(process.cwd(), "data");

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(file: string, data: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs.rename(tmp, file);
}

// 同一文件的「读-改-写」串行执行，防止并发请求互相覆盖（单进程内有效）
const g = globalThis as unknown as { __zmLocks?: Map<string, Promise<unknown>> };
const locks = (g.__zmLocks ??= new Map());
export function updateJson<T>(file: string, fallback: T, fn: (v: T) => T): Promise<T> {
  const next = (locks.get(file) ?? Promise.resolve())
    .catch(() => {})
    .then(async () => {
      const v = fn(await readJson(file, fallback));
      await writeJson(file, v);
      return v;
    });
  locks.set(file, next);
  next.finally(() => locks.get(file) === next && locks.delete(file)).catch(() => {});
  return next;
}

export async function readText(file: string): Promise<string | null> {
  try {
    return await fs.readFile(file, "utf8");
  } catch {
    return null;
  }
}

export async function writeText(file: string, text: string) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, text);
}

// id 只允许安全字符，防止路径穿越
export function safeId(id: string) {
  if (!/^[\w-]{1,64}$/.test(id)) throw new Error("bad id");
  return id;
}

export const userDir = (uid: string) => path.join(DATA_DIR, "users", safeId(uid));

// ---------- 档案 ----------

export type Profile = {
  id: string;
  name: string;
  relation: string; // 自己 / 伴侣 / 家人 / 朋友 / 同事 …
  sex: "男" | "女";
  calendar: "solar" | "lunar";
  date: string; // YYYY-MM-DD（农历也用数字）
  leap?: boolean;
  time: string | null; // HH:MM，未知为 null
  place?: string;
  formerName?: string; // bazi skill 第一阶段：曾用名
  renameYear?: number;
  deceasedYear?: number; // 已故者：流年只推到该年
  createdAt: string;
  chart: Chart;
};

const profilesDir = (uid: string) => path.join(userDir(uid), "profiles");

export async function listProfiles(uid: string): Promise<Profile[]> {
  let files: string[] = [];
  try {
    files = await fs.readdir(profilesDir(uid));
  } catch {
    return [];
  }
  const all = await Promise.all(
    files.filter((f) => f.endsWith(".json")).map((f) => readJson<Profile | null>(path.join(profilesDir(uid), f), null)),
  );
  return (all.filter(Boolean) as Profile[]).sort((a, b) =>
    a.relation === "自己" ? -1 : b.relation === "自己" ? 1 : a.createdAt.localeCompare(b.createdAt),
  );
}

export function getProfile(uid: string, pid: string) {
  return readJson<Profile | null>(path.join(profilesDir(uid), `${safeId(pid)}.json`), null);
}

export function saveProfile(uid: string, p: Profile) {
  return writeJson(path.join(profilesDir(uid), `${safeId(p.id)}.json`), p);
}

export async function deleteProfile(uid: string, pid: string) {
  const dir = userDir(uid);
  await Promise.all([
    fs.rm(path.join(dir, "profiles", `${safeId(pid)}.json`), { force: true }),
    fs.rm(path.join(dir, "readings", pid), { recursive: true, force: true }),
    fs.rm(path.join(dir, "chats", `${pid}.json`), { force: true }),
    fs.rm(path.join(dir, "notes", `${pid}.json`), { force: true }),
  ]);
}

// ---------- 报告章节缓存 ----------

export const readingFile = (uid: string, pid: string, kind: string, chapter: string) =>
  path.join(userDir(uid), "readings", safeId(pid), safeId(kind), `${safeId(chapter)}.md`);

// ---------- 问事 ----------

// 用户消息带 id；回答用 replyTo 对应，避免并发时错位
export type ChatMsg = {
  id?: string;
  role: "user" | "assistant";
  text: string;
  at: string;
  friends?: string[];
  friendIds?: string[];
  replyTo?: string;
  noted?: string[]; // 本轮从提问里记下的现实信息
};
export const chatFile = (uid: string, pid: string) => path.join(userDir(uid), "chats", `${safeId(pid)}.json`);

// ---------- 占卦 ----------

export type Divination = {
  id: string;
  question: string;
  lines: number[];
  profileId?: string;
  answer: string;
  at: string;
};
export const divinationFile = (uid: string) => path.join(userDir(uid), "divinations.json");
