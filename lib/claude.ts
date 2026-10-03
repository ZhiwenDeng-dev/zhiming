import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { SKILL_DIR } from "./paipan";

// 调本机 Claude Code（headless）+ bazi skill 生成解读，NDJSON 流式回给前端
// 事件：{t:"status",v} 进度 | {t:"delta",v} 正文增量 | {t:"reset"} 丢弃已发正文 | {t:"done",v} 终稿 | {t:"error",v}

const WORKSPACE = path.join(/* turbopackIgnore: true */ process.cwd(), "claude-workspace"); // .claude/skills/bazi 软链在这里
const BIN = process.env.CLAUDE_BIN ?? "claude";
const MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-5-5"; // 最强模型；求快可设 CLAUDE_MODEL=sonnet
const TIMEOUT_MS = 10 * 60_000;

const REF_NAMES: Record<string, string> = {
  "classical-texts.md": "经典典籍摘要",
  "wuxing-tables.md": "五行十神表",
  "dayun-rules.md": "大运流年规则",
  "shensha-table.md": "神煞表",
  "shichen-table.md": "时辰表",
  "chapters.md": "知命章节规范",
};

type Ev = { t: "status" | "delta" | "reset" | "done" | "error"; v?: string };
type Sub = (e: Ev) => void;
/** 任务归属与展示：uid 用于排队，label/href 用于全局「正在推算」提示 */
export type Meta = { uid: string; label: string; href: string };
type Job = Meta & {
  subs: Set<Sub>;
  text: string;
  status: string;
  state: "preparing" | "queued" | "running";
  at: number;
  promise: Promise<string>;
};

// 同一份内容正在生成时，后来的请求直接挂到同一个进程上，不重复花钱
// 挂在 globalThis 上：dev 模式下各路由可能各有一份模块实例
const g = globalThis as unknown as { __zmJobs?: Map<string, Job>; __zmQueue?: Queue };
const jobs = (g.__zmJobs ??= new Map<string, Job>());

// ---------- 排队 ----------
// 同一账号一次只推算一件事（上一个出结果才轮到下一个）；全机最多 MAX 个 claude 进程并行，防止家人同时用把机器压垮
const MAX = Number(process.env.CLAUDE_CONCURRENCY ?? 3);
type Queue = { tails: Map<string, Promise<void>>; active: number; waiters: (() => void)[] };
const queue: Queue = (g.__zmQueue ??= { tails: new Map(), active: 0, waiters: [] });

async function acquire(uid: string): Promise<() => void> {
  const prev = queue.tails.get(uid) ?? Promise.resolve();
  let releaseUser!: () => void;
  const mine = new Promise<void>((r) => (releaseUser = r));
  const tail = prev.then(() => mine);
  queue.tails.set(uid, tail);
  await prev;
  if (queue.active >= MAX) await new Promise<void>((r) => queue.waiters.push(r));
  queue.active++;
  return () => {
    queue.active--;
    queue.waiters.shift()?.();
    releaseUser();
    if (queue.tails.get(uid) === tail) queue.tails.delete(uid);
  };
}

/** 某账号进行中的推算，供全局状态条使用 */
export function tasksOf(uid: string) {
  return [...jobs.values()]
    .filter((j) => j.uid === uid)
    .sort((a, b) => a.at - b.at)
    .map(({ label, href, state, status }) => ({ label, href, state, status }));
}

// 产品用到的三个 skill：bazi（八字推算，本机原版不改）+ zhiming（加工规范）+ iching（占卦），后两个随仓库版本管理
export const APP_SKILLS = path.join(/* turbopackIgnore: true */ process.cwd(), "skills");
const SKILLS: Record<string, string> = {
  bazi: SKILL_DIR,
  zhiming: path.join(APP_SKILLS, "zhiming"),
  iching: path.join(APP_SKILLS, "iching"),
};

// 只加载项目级 skill（不带用户级 hooks/插件），所以把它们软链进工作区
function ensureWorkspace() {
  for (const [name, target] of Object.entries(SKILLS)) {
    const link = path.join(WORKSPACE, ".claude/skills", name);
    if (fs.existsSync(link)) continue;
    if (!fs.existsSync(target)) throw new Error(`找不到 ${name} skill：${target}`);
    fs.mkdirSync(path.dirname(link), { recursive: true });
    fs.symlinkSync(target, link);
  }
}

function run(prompt: string, emit: (e: Ev) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    ensureWorkspace();
    const child = spawn(
      BIN,
      [
        "-p",
        "--output-format", "stream-json",
        "--verbose",
        "--include-partial-messages",
        "--setting-sources", "project",
        "--strict-mcp-config",
        "--no-session-persistence",
        "--permission-mode", "dontAsk",
        "--tools", "Skill,Read",
        // dontAsk 下 Read 默认全拒；只放行 bazi skill 目录（典籍、规则表），其余文件一律读不到
        "--allowedTools", `Read(/${SKILL_DIR}/**)`, `Read(/${APP_SKILLS}/**)`, "Read(./.claude/skills/**)",
        "--model", MODEL,
      ],
      { cwd: WORKSPACE, stdio: ["pipe", "pipe", "pipe"] },
    );
    const timer = setTimeout(() => child.kill("SIGTERM"), TIMEOUT_MS);
    let buf = "";
    let stderr = "";
    let result: string | null = null;
    let sentText = false;

    child.stdout.on("data", (chunk: Buffer) => {
      buf += chunk.toString();
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 1);
        if (!line.trim()) continue;
        let j: Record<string, unknown>;
        try {
          j = JSON.parse(line);
        } catch {
          continue;
        }
        if (j.type === "stream_event") {
          const ev = j.event as { type: string; delta?: { type: string; text?: string }; content_block?: { type: string; name?: string } };
          if (ev.type === "content_block_start" && ev.content_block?.type === "tool_use") {
            // 工具调用之前的过渡话不算正文
            if (sentText) emit({ t: "reset" });
            sentText = false;
            emit({ t: "status", v: ev.content_block.name === "Skill" ? "正在翻阅命理典籍" : "正在查阅参考资料" });
          } else if (ev.type === "content_block_start" && ev.content_block?.type === "thinking") {
            emit({ t: "status", v: "正在推算" });
          } else if (ev.delta?.type === "text_delta" && ev.delta.text) {
            sentText = true;
            emit({ t: "delta", v: ev.delta.text });
          }
        } else if (j.type === "assistant") {
          // 完整的工具调用：报出具体在读哪份参考资料，便于核对是否按 skill 的典籍推演
          const content = (j.message as { content?: { type: string; name?: string; input?: { file_path?: string; skill?: string } }[] })?.content ?? [];
          for (const b of content) {
            if (b.type !== "tool_use") continue;
            const f = b.input?.file_path ? path.basename(b.input.file_path) : b.input?.skill ?? "";
            console.log(`[claude] ${b.name} ${f}`);
            if (b.name === "Read" && REF_NAMES[f]) emit({ t: "status", v: `正在查阅${REF_NAMES[f]}` });
          }
        } else if (j.type === "result") {
          if (j.subtype === "success" && typeof j.result === "string") result = j.result;
          else stderr += String(j.result ?? j.subtype);
        }
      }
    });
    child.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(new Error(e.message.includes("ENOENT") ? "找不到 claude 命令，请确认本机已安装 Claude Code" : e.message));
    });
    child.on("close", () => {
      clearTimeout(timer);
      if (result?.trim()) resolve(result.trim());
      else reject(new Error(stderr.trim().slice(0, 300) || "生成中断，请重试"));
    });
    child.stdin.end(prompt);
  });
}

// prompt 可以是异步构造的（例如先等命盘底稿生成），构造期间可汇报进度
type Build = string | ((status: (v: string) => void) => Promise<string>);

function startJob(key: string, build: Build, onDone: (text: string) => Promise<void>, meta: Meta): Job {
  const existing = jobs.get(key);
  if (existing) return existing;
  const subs = new Set<Sub>();
  const j: Job = { ...meta, subs, text: "", status: "正在起盘", state: "preparing", at: Date.now(), promise: Promise.resolve("") };
  const emit = (e: Ev) => {
    if (e.t === "delta") j.text += e.v;
    if (e.t === "reset") j.text = "";
    if (e.t === "status") j.status = e.v!;
    subs.forEach((s) => s(e));
  };
  // 先准备 prompt（可能要等命盘底稿，底稿自己排队），再排队拿执行位，避免互相等待死锁
  j.promise = (typeof build === "string" ? Promise.resolve(build) : build((v) => emit({ t: "status", v })))
    .then(async (prompt) => {
      j.state = "queued";
      const ahead = tasksOf(meta.uid).filter((t) => t.state === "running").length;
      if (ahead || queue.active >= MAX) emit({ t: "status", v: ahead ? "排队中 · 等上一个推算出结果" : "排队中 · 推算的人有点多" });
      const release = await acquire(meta.uid);
      j.state = "running";
      emit({ t: "status", v: "正在起盘" });
      try {
        return await run(prompt, emit);
      } finally {
        release();
      }
    })
    .then(async (text) => {
      await onDone(text);
      return text;
    })
    .finally(() => jobs.delete(key));
  jobs.set(key, j);
  return j;
}

/** 正在生成中的 key */
export const isRunning = (key: string) => jobs.has(key);

/** 后台生成（不流式），同 key 复用进行中的任务 */
export function generate(key: string, build: Build, onDone: (text: string) => Promise<void>, meta: Meta): Promise<string> {
  return startJob(key, build, onDone, meta).promise;
}

/**
 * 返回 NDJSON 流。key 相同的请求共享一次生成；客户端断开不影响生成，结束后 onDone 落盘。
 */
export function streamClaude(key: string, build: Build, onDone: (text: string) => Promise<void>, meta: Meta): Response {
  const job = startJob(key, build, onDone, meta);
  const current = job;
  const enc = new TextEncoder();
  let sub: Sub | null = null;
  return new Response(
    new ReadableStream({
      start(ctrl) {
        const send = (e: Ev) => {
          try {
            ctrl.enqueue(enc.encode(JSON.stringify(e) + "\n"));
          } catch {
            /* 客户端已断开 */
          }
        };
        send({ t: "status", v: current.status });
        if (current.text) send({ t: "delta", v: current.text });
        sub = send;
        current.subs.add(send);
        current.promise
          .then((text) => send({ t: "done", v: text }))
          .catch((e: Error) => send({ t: "error", v: e.message }))
          .finally(() => {
            current.subs.delete(send);
            try {
              ctrl.close();
            } catch {}
          });
      },
      cancel() {
        if (sub) current.subs.delete(sub);
      },
    }),
    { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache" } },
  );
}

// 已有缓存时用同样的协议一次性回放
export function cachedResponse(text: string): Response {
  return new Response(JSON.stringify({ t: "done", v: text }) + "\n", {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}
