// 前后端共用的五行常量，无 Node 依赖

export type Element = "木" | "火" | "土" | "金" | "水";

export const GAN = "甲乙丙丁戊己庚辛壬癸";
export const ZHI = "子丑寅卯辰巳午未申酉戌亥";

const GAN_EL: Record<string, Element> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
  己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};
const ZHI_EL: Record<string, Element> = {
  子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火",
  午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
};

export const ELEMENTS: Element[] = ["木", "火", "土", "金", "水"];

// 克制的墨色系，不用高饱和
export const EL_COLOR: Record<Element, string> = {
  木: "#5E7F5A", 火: "#B5523B", 土: "#8A6A48", 金: "#B8973F", 水: "#3E5F7E",
};

export function elementOf(ch: string): Element | null {
  return GAN_EL[ch] ?? ZHI_EL[ch] ?? null;
}

export function yinyangOf(gan: string): "阳" | "阴" {
  return GAN.indexOf(gan) % 2 === 0 ? "阳" : "阴";
}

// 年干支（按公历年粗算，用于年运报告标题；精确年柱以立春为界，以脚本为准）
export function yearGanzhi(y: number): string {
  const i = (((y - 4) % 60) + 60) % 60;
  return GAN[i % 10] + ZHI[i % 12];
}

export const SHICHEN: { zhi: string; range: string; time: string }[] = [
  { zhi: "子", range: "23–01", time: "00:00" }, { zhi: "丑", range: "01–03", time: "02:00" },
  { zhi: "寅", range: "03–05", time: "04:00" }, { zhi: "卯", range: "05–07", time: "06:00" },
  { zhi: "辰", range: "07–09", time: "08:00" }, { zhi: "巳", range: "09–11", time: "10:00" },
  { zhi: "午", range: "11–13", time: "12:00" }, { zhi: "未", range: "13–15", time: "14:00" },
  { zhi: "申", range: "15–17", time: "16:00" }, { zhi: "酉", range: "17–19", time: "18:00" },
  { zhi: "戌", range: "19–21", time: "20:00" }, { zhi: "亥", range: "21–23", time: "22:00" },
];
