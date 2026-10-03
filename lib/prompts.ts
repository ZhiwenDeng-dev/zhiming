// 产品侧 prompt 只做两件事：指明调用哪个 skill 的哪个模块 + 提供数据。
// 推算规则在 bazi skill，加工规范在 skills/zhiming，占卦在 skills/iching；这里不写任何推算或写作规则。
import type { Month, Today } from "./paipan";
import { notesBlock, type Note } from "./notes";
import type { ChatMsg, Profile } from "./store";

const HEAD = (module: string) =>
  `调用 bazi skill（八字推算）和 zhiming skill（知命加工规范），执行 zhiming 的「${module}」。不要收集信息、不要排盘、不要跑脚本，下面的数据就是全部输入。`;

export function personBlock(p: Profile, label = "命主", analysis?: string, notes: Note[] = []) {
  const birth = `${p.calendar === "lunar" ? `农历 ${p.date}${p.leap ? "（闰月）" : ""}` : `阳历 ${p.date}`} ${p.time ?? "时辰未知"}`;
  const extra = [
    p.place && `出生地 ${p.place}`,
    p.formerName && `曾用名 ${p.formerName}${p.renameYear ? `（${p.renameYear} 年改名）` : "（改名时间不详）"}`,
    p.deceasedYear && `已故，去世于 ${p.deceasedYear} 年`,
  ].filter(Boolean);
  const nb = notesBlock(notes, label);
  return `【${label}】${p.name}（${p.relation}），${p.sex}，${birth}${extra.length ? `，${extra.join("，")}` : ""}
【${label}排盘结果（bazi skill 的 pai_pan.py 输出）】
${p.chart.raw}${analysis ? `\n\n【${label}命盘底稿（bazi skill 推算结论，以此为准）】\n${analysis}` : ""}${nb ? `\n\n${nb}` : ""}`;
}

const todayLine = (t: Today) => `【今天】${t.date}，农历 ${t.lunar}；流年 ${t.year}、流月 ${t.month}、流日 ${t.day}`;

const monthTable = (months: Month[]) =>
  `【今年流月表（以节气为界，pai_pan.py 推出）】\n${months.map((m) => `- ${m.range}：${m.gz}月`).join("\n")}`;

export function analysisPrompt(p: Profile, t: Today, notes: Note[] = []) {
  return `${HEAD("模块：底稿")}

${personBlock(p, "命主", undefined, notes)}

${todayLine(t)}`;
}

export function chapterPrompt(p: Profile, analysis: string, notes: Note[], t: Today, months: Month[], key: string, title: string) {
  return `${HEAD("模块：章节")}本章键：${key}（「${title}」），写法见 zhiming 的 references/chapters.md。

${personBlock(p, "命主", analysis, notes)}

${todayLine(t)}
${key.startsWith("annual/") ? `\n${monthTable(months)}` : ""}`;
}

export function dailyPrompt(p: Profile, analysis: string, notes: Note[], t: Today) {
  return `${HEAD("模块：日签")}

${personBlock(p, "命主", analysis, notes)}

${todayLine(t)}`;
}

export function chatPrompt(
  p: Profile,
  analysis: string,
  notes: Note[],
  friends: { p: Profile; analysis: string; notes: Note[] }[],
  t: Today,
  months: Month[],
  history: ChatMsg[],
  question: string,
) {
  const hist = history
    .slice(-12)
    .map((m) => `${m.role === "user" ? "用户" : "你"}：${m.text}`)
    .join("\n\n");
  return `${HEAD("模块：问事")}${friends.length ? "本次涉及其他人，按「派生规则 · 合盘」。" : ""}

${personBlock(p, "命主", analysis, notes)}
${friends.map((f) => "\n" + personBlock(f.p, `相关人·${f.p.name}`, f.analysis, f.notes)).join("\n")}

${todayLine(t)}

${monthTable(months)}

${hist ? `【之前的对话】\n${hist}\n` : ""}
【用户现在问】${question}`;
}

export function divinePrompt(question: string, qigua: string, t: Today, p: Profile | null, analysis: string | null) {
  return `调用 iching skill 解这一卦。下面的起卦结果就是 scripts/qigua.py 的输出，不要重新起卦。表达遵守 zhiming skill 的「表达规范」（占卦例外见 iching skill）。

${todayLine(t)}
【所问之事】${question}
【起卦结果（qigua.py 输出）】
${qigua}
${p ? `\n【问卦人：${p.name}，命盘只作背景参考】\n${analysis ? analysis.split("## 1.")[0].trim() : p.chart.raw}` : ""}`;
}
