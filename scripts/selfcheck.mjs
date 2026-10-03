// 最小自检：周易查表 + 排盘解析。运行：pnpm check
import assert from "node:assert/strict";
import { cast, hexagram } from "../lib/iching.ts";
import { paipan } from "../lib/paipan.ts";
import { NOTES_MARK, predictionsOf } from "../lib/calibration.ts";
import { REPORTS } from "../lib/reports.ts";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const H = (s) => hexagram([...s].map((c) => c === "1")); // 自下而上
assert.equal(H("111111").fullName, "乾为天");
assert.equal(H("000000").fullName, "坤为地");
assert.equal(H("111000").fullName, "地天泰"); // 下乾上坤
assert.equal(H("000111").fullName, "天地否");
assert.equal(H("101010").fullName, "水火既济");
assert.equal(H("010101").fullName, "火水未济");
assert.equal(H("100010").name, "屯");
assert.equal(H("010001").name, "蒙");
assert.equal(H("110111").name, "履");
assert.equal(H("011111").name, "姤");
const all = new Set();
for (let i = 0; i < 64; i++) all.add(hexagram([0, 1, 2, 3, 4, 5].map((b) => !!(i >> b & 1))).no);
assert.equal(all.size, 64, "64 卦一一对应");
const c = cast([9, 7, 7, 8, 8, 6]);
assert.deepEqual(c.moving, [0, 5]);
assert.equal(c.ben.fullName, "地天泰");
assert.equal(c.bian.fullName, "山风蛊");

const chart = await paipan({ calendar: "solar", date: "1990-05-15", time: "12:00", sex: "男" });
assert.deepEqual(chart.pillars.map((p) => p.gan + p.zhi), ["庚午", "辛巳", "庚辰", "壬午"]);
assert.equal(chart.dayun.direction, "顺排");
assert.equal(chart.dayun.rows[1].gz, "壬午");
assert.ok(chart.shensha.some((s) => s.name === "天乙贵人"));
const noHour = await paipan({ calendar: "lunar", date: "1988-12-29", time: null, sex: "女" });
assert.equal(noHour.pillars[3].gan, "未知");
assert.ok(noHour.warnings.includes("时辰未知"));
const preds = predictionsOf(`## 7. 流年\nx\n## 8. 待校准的历史事件\n\n请核对：\n\n1. **2018年（24岁，戊戌年，交乙亥运）应是人生转折点：换城市。** 依据：换运年，比肩到位。\n2. **2017 年（18 岁，丁酉年）**：酉金冲日支卯，应当有一次离家。\n3. **2023年（29岁，癸卯年）配偶宫应有明显变动。** 依据：卯酉相冲。\n\n## 9. 建议`);
assert.deepEqual(preds, ["2018年（24岁）可能是人生转折点：换城市", "2017 年（18 岁）：可能有一次离家", "2023年（29岁）感情婚姻可能有明显变动"]);
// 产品与 skill 的契约
// 1. 前端画卦用的 64 卦表 = iching skill 脚本
const py = JSON.parse(execFileSync("python3", ["skills/iching/scripts/qigua.py", "--table"], { encoding: "utf8" }));
for (let c = 0; c < 64; c++) {
  const ts = hexagram([0, 1, 2, 3, 4, 5].map((b) => !!((c >> b) & 1)));
  assert.equal(ts.no, py[c].no, `卦序不一致 code=${c}`);
  assert.equal(ts.fullName, py[c].full, `卦名不一致 code=${c}`);
}
// 2. 每个报告章节在 zhiming skill 里都有写作规范
const chapters = fs.readFileSync("skills/zhiming/references/chapters.md", "utf8");
for (const r of Object.values(REPORTS))
  for (const c of r.chapters) assert.ok(chapters.includes(`### ${r.kind}/${c.key} `), `zhiming 缺少章节规范：${r.kind}/${c.key}`);
// 3. 问事备注块分隔符两边一致
assert.ok(fs.readFileSync("skills/zhiming/SKILL.md", "utf8").includes(NOTES_MARK), "zhiming SKILL.md 与 NOTES_MARK 不一致");
console.log("selfcheck ok");
