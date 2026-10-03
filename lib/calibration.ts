// 纯函数，无依赖（前后端与自检脚本共用）

/** 问事回答末尾的备注块分隔符；服务端截掉后存入备注，前端流式显示时也要隐藏 */
export const NOTES_MARK = "<<<NOTES";

/** 拆开回答正文与备注块；流式中途出现的半截分隔符也一并隐藏 */
export function splitNotes(text: string): { body: string; raw: string | null } {
  const i = text.indexOf(NOTES_MARK);
  if (i >= 0) return { body: text.slice(0, i).trimEnd(), raw: text.slice(i + NOTES_MARK.length) };
  const tail = text.match(/<{1,3}N?O?T?E?S?$/);
  return { body: tail ? text.slice(0, tail.index).trimEnd() : text, raw: null };
}

// ---------- 底稿第 8 节「待校准的历史事件」→ 给普通人看的核对条目 ----------

const GZ = "[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]";

/** 把一条推断改写成大白话：去掉干支、术语依据，只留「哪年、几岁、会发生什么」 */
export function plainPrediction(line: string) {
  let s = line.replace(/^\s*(\d+\.|[-*])\s*/, "").replace(/\*\*/g, "");
  s = s.split(/依据[:：]/)[0];
  // 括号里只留年龄
  s = s.replace(/[（(]([^）)]*)[）)]/g, (_, inner: string) => {
    const age = inner.split(/[，,、]/).map((x) => x.trim()).filter((x) => /岁/.test(x));
    return age.length ? `（${age.join("，")}）` : "";
  });
  s = s.replace(new RegExp(`${GZ}(、${GZ})*年?`, "g"), "");
  // 「年份：推断」之间夹着的命理解释（如 酉金冲日支卯，应当…）只保留「应…」之后
  const m = s.match(/^([^：:应]*?[：:]?)\s*[^：:应]*?(应当?|会|大概率)(.*)$/);
  if (m && /\d{4}/.test(m[1])) s = `${m[1].replace(/[：:]?$/, "")}：${m[2]}${m[3]}`;
  s = s.replace(/配偶宫/g, "感情婚姻").replace(/应当?(?=[有是在换当会])|应当/, "可能");
  return s.replace(/[，,]\s*[）)]/g, "）").replace(/\s+/g, " ").replace(/[。.\s]+$/, "").trim();
}

export function predictionsOf(analysis: string | null): string[] {
  if (!analysis) return [];
  const sec = analysis.split(/\n## /).find((s) => /^8[.、．]?\s*待校准/.test(s));
  if (!sec) return [];
  return sec
    .split("\n")
    .slice(1) // 第一行是节标题
    .filter((l) => /^\s*(\d+\.|[-*])\s+/.test(l))
    .map(plainPrediction)
    .filter(Boolean)
    .slice(0, 6);
}
