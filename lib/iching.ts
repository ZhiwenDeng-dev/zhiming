// 周易六十四卦查表。爻自下而上，6 老阴(变) 7 少阳 8 少阴 9 老阳(变)

const NAMES =
  "乾 坤 屯 蒙 需 讼 师 比 小畜 履 泰 否 同人 大有 谦 豫 随 蛊 临 观 噬嗑 贲 剥 复 无妄 大畜 颐 大过 坎 离 咸 恒 遁 大壮 晋 明夷 家人 睽 蹇 解 损 益 夬 姤 萃 升 困 井 革 鼎 震 艮 渐 归妹 丰 旅 巽 兑 涣 节 中孚 小过 既济 未济".split(" ");

// 八卦按 [下,中,上] 爻阳=1 编码成 0–7
const TRIGRAMS: Record<number, { name: string; nature: string }> = {
  0b111: { name: "乾", nature: "天" },
  0b000: { name: "坤", nature: "地" },
  0b001: { name: "震", nature: "雷" }, // 下爻阳
  0b010: { name: "坎", nature: "水" },
  0b100: { name: "艮", nature: "山" }, // 上爻阳
  0b110: { name: "巽", nature: "风" },
  0b101: { name: "离", nature: "火" },
  0b011: { name: "兑", nature: "泽" },
};

// 上卦 × 下卦 → 卦序（行：上卦，列：下卦，顺序 乾震坎艮坤巽离兑）
const ORDER = ["乾", "震", "坎", "艮", "坤", "巽", "离", "兑"];
const TABLE = [
  [1, 25, 6, 33, 12, 44, 13, 10],
  [34, 51, 40, 62, 16, 32, 55, 54],
  [5, 3, 29, 39, 8, 48, 63, 60],
  [26, 27, 4, 52, 23, 18, 22, 41],
  [11, 24, 7, 15, 2, 46, 36, 19],
  [9, 42, 59, 53, 20, 57, 37, 61],
  [14, 21, 64, 56, 35, 50, 30, 38],
  [43, 17, 47, 31, 45, 28, 49, 58],
];

export type Hexagram = { no: number; name: string; fullName: string; upper: string; lower: string; yang: boolean[] };

export function hexagram(yang: boolean[]): Hexagram {
  const code = (a: boolean[]) => (a[0] ? 1 : 0) | (a[1] ? 2 : 0) | (a[2] ? 4 : 0);
  const lo = TRIGRAMS[code(yang.slice(0, 3))];
  const up = TRIGRAMS[code(yang.slice(3, 6))];
  const no = TABLE[ORDER.indexOf(up.name)][ORDER.indexOf(lo.name)];
  const name = NAMES[no - 1];
  const fullName = up.name === lo.name ? `${name}为${up.nature}` : `${up.nature}${lo.nature}${name}`;
  return { no, name, fullName, upper: up.name, lower: lo.name, yang };
}

export function cast(lines: number[]) {
  if (lines.length !== 6 || lines.some((v) => ![6, 7, 8, 9].includes(v))) throw new Error("爻值不合法");
  const ben = hexagram(lines.map((v) => v === 7 || v === 9));
  const moving = lines.map((v, i) => (v === 6 || v === 9 ? i : -1)).filter((i) => i >= 0);
  const bian = moving.length ? hexagram(lines.map((v) => v === 7 || v === 6)) : null;
  return { ben, bian, moving };
}

const POS = ["初", "二", "三", "四", "五", "上"];
export const lineName = (i: number, yang: boolean) =>
  i === 0 ? `初${yang ? "九" : "六"}` : i === 5 ? `上${yang ? "九" : "六"}` : `${yang ? "九" : "六"}${POS[i]}`;

// 一次掷三枚铜钱：正面记 3，反面记 2，和为 6/7/8/9
export function tossLine(rand = Math.random) {
  return [0, 0, 0].reduce((s) => s + (rand() < 0.5 ? 2 : 3), 0);
}
