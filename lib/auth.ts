import crypto from "node:crypto";
import path from "node:path";
import { cookies } from "next/headers";
import { DATA_DIR, readJson, updateJson, userDir, writeJson } from "./store";

type User = { id: string; username: string; salt: string; hash: string; createdAt: string };

const COOKIE = "zm_session";
const usernamesFile = path.join(DATA_DIR, "usernames.json");
const sessionsFile = path.join(DATA_DIR, "sessions.json");

const hashPw = (pw: string, salt: string) => crypto.scryptSync(pw, salt, 32).toString("hex");

export class AuthError extends Error {}

export async function register(username: string, password: string) {
  username = username.trim();
  if (username.length < 1 || username.length > 20) throw new AuthError("昵称 1–20 个字");
  if (password.length < 4) throw new AuthError("密码至少 4 位");
  const id = crypto.randomUUID();
  let taken = false;
  // 占昵称和写入在同一把锁里完成，避免两人同时注册同名
  await updateJson<Record<string, string>>(usernamesFile, {}, (names) => {
    if (names[username]) {
      taken = true;
      return names;
    }
    return { ...names, [username]: id };
  });
  if (taken) throw new AuthError("这个昵称已被注册，换一个或直接登录");
  const salt = crypto.randomBytes(16).toString("hex");
  const user: User = { id, username, salt, hash: hashPw(password, salt), createdAt: new Date().toISOString() };
  await writeJson(path.join(userDir(id), "user.json"), user);
  await startSession(id);
  return { id, username };
}

export async function login(username: string, password: string) {
  const names = await readJson<Record<string, string>>(usernamesFile, {});
  const id = names[username.trim()];
  const user = id ? await readJson<User | null>(path.join(userDir(id), "user.json"), null) : null;
  const ok =
    user && crypto.timingSafeEqual(Buffer.from(hashPw(password, user.salt), "hex"), Buffer.from(user.hash, "hex"));
  if (!user || !ok) throw new AuthError("昵称或密码不对");
  await startSession(user.id);
  return { id: user.id, username: user.username };
}

async function startSession(uid: string) {
  const token = crypto.randomBytes(24).toString("hex");
  await updateJson<Record<string, string>>(sessionsFile, {}, (s) => ({ ...s, [token]: uid }));
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await updateJson<Record<string, string>>(sessionsFile, {}, (s) => {
      const rest = { ...s };
      delete rest[token];
      return rest;
    });
  }
  jar.delete(COOKIE);
}

export async function currentUser(): Promise<{ id: string; username: string } | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const uid = (await readJson<Record<string, string>>(sessionsFile, {}))[token];
  if (!uid) return null;
  const user = await readJson<User | null>(path.join(userDir(uid), "user.json"), null);
  return user && { id: user.id, username: user.username };
}

export const unauthorized = () => Response.json({ error: "请先登录" }, { status: 401 });
