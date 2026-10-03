import crypto from "node:crypto";
import path from "node:path";
import { readJson, safeId, updateJson, userDir } from "./store";

// 个人备注：用户亲口说出的现实信息 + 对历史事件的核对结果
// fact 现状（职业、婚姻、子女、居住…）；event 已发生的事（带年份，可作为校准依据）
export type Note = {
  id: string;
  kind: "fact" | "event";
  text: string;
  year?: number;
  verified?: boolean; // 仅校准：true 对上了，false 不太对
  source: "chat" | "manual" | "calibration";
  at: string;
};

const MAX = 60;
export const notesFile = (uid: string, pid: string) => path.join(userDir(uid), "notes", `${safeId(pid)}.json`);
export const getNotes = (uid: string, pid: string) => readJson<Note[]>(notesFile(uid, pid), []);

const norm = (s: string) => s.replace(/\s|[，。、,.]/g, "");

/** 追加备注，文本相同的视为同一条（校准结果以最新为准） */
export function addNotes(uid: string, pid: string, items: Omit<Note, "id" | "at">[]) {
  const clean = items
    .map((n) => ({ ...n, text: String(n.text ?? "").trim().slice(0, 200) }))
    .filter((n) => n.text && (n.kind === "fact" || n.kind === "event"));
  if (!clean.length) return getNotes(uid, pid);
  return updateJson<Note[]>(notesFile(uid, pid), [], (all) => {
    let next = [...all];
    for (const n of clean) {
      const i = next.findIndex((x) => norm(x.text) === norm(n.text));
      const note: Note = { ...n, id: i >= 0 ? next[i].id : crypto.randomUUID(), at: new Date().toISOString() };
      if (i >= 0) next[i] = note;
      else next.push(note);
    }
    if (next.length > MAX) next = next.slice(-MAX);
    return next;
  });
}

export function deleteNote(uid: string, pid: string, nid: string) {
  return updateJson<Note[]>(notesFile(uid, pid), [], (all) => all.filter((n) => n.id !== nid));
}

/** 放进 prompt 的备注段落 */
export function notesBlock(notes: Note[], label = "命主") {
  if (!notes.length) return "";
  const line = (n: Note) =>
    n.source === "calibration"
      ? `- 【校准】底稿曾推断：${n.text} → 用户反馈：${n.verified ? "对上了" : "不太对"}`
      : `- ${n.year ? `${n.year} 年：` : ""}${n.text}`;
  return `【${label}的现实信息（用户亲口提供，真实可信）】\n${notes.map(line).join("\n")}`;
}
