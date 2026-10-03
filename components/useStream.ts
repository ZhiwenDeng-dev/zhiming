"use client";

import { useCallback, useRef, useState } from "react";

// 消费 lib/claude.ts 的 NDJSON 流
export function useStream() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async (url: string, body: unknown = {}): Promise<string | null> => {
    abortRef.current?.abort();
    const ac = (abortRef.current = new AbortController());
    setText("");
    setError("");
    setStatus("正在连接");
    setRunning(true);
    let acc = "";
    let final: string | null = null;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ac.signal,
      });
      if (res.status === 204) return null; // peek：没有缓存也没在生成
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `请求失败（${res.status}）`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i);
          buf = buf.slice(i + 1);
          if (!line) continue;
          const e = JSON.parse(line) as { t: string; v?: string };
          if (e.t === "delta") setText((acc += e.v));
          else if (e.t === "reset") setText((acc = ""));
          else if (e.t === "status") setStatus(e.v ?? "");
          else if (e.t === "done") setText((acc = final = e.v ?? acc));
          else if (e.t === "error") throw new Error(e.v);
        }
      }
      if (final === null) throw new Error("连接中断了。内容仍在后台生成，稍后刷新即可看到");
      return final;
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
      return null;
    } finally {
      if (abortRef.current === ac) setRunning(false);
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setText("");
    setError("");
    setRunning(false);
  }, []);

  return { text, status, running, error, start, reset, setText };
}
