// 报告与章节定义（前后端共用，无 Node 依赖）

// 章节写什么、怎么写在 skills/zhiming/references/chapters.md（键为「报告/章节」）；这里只有产品呈现用的标题
export type Chapter = { key: string; title: string; subtitle: string };
export type ReportKind = "book" | "annual" | "yinyang";
export type Report = { kind: ReportKind; title: string; en: string; desc: string; chapters: Chapter[] };

export const REPORTS: Record<ReportKind, Report> = {
  yinyang: {
    kind: "yinyang",
    title: "阴阳报告",
    en: "Yin & Yang",
    desc: "一面讲你的天赋，一面讲你反复遇到的课题。",
    chapters: [
      {
        key: "yang",
        title: "阳 · 三个天赋",
        subtitle: "你自带、但可能还没用足的力量",
      },
      {
        key: "yin",
        title: "阴 · 三个课题",
        subtitle: "会反复出现，直到你学会换个方式回应",
      },
    ],
  },
  book: {
    kind: "book",
    title: "命之书",
    en: "Book of Fate",
    desc: "十个章节，把你的命盘从里到外讲透。",
    chapters: [
      { key: "chart", title: "命盘总览", subtitle: "宇宙在你出生时留下的坐标" },
      { key: "daymaster", title: "你的本色", subtitle: "你骨子里是什么样的人" },
      { key: "elements", title: "五行 · 气的流动", subtitle: "哪些能量多了，哪些缺了" },
      { key: "fengshui", title: "方位与环境", subtitle: "适合你的地方和空间" },
      { key: "career", title: "事业与财富", subtitle: "你适合怎样赚钱" },
      { key: "love", title: "感情与婚姻", subtitle: "你会遇见什么样的人" },
      { key: "growth", title: "学习与成长", subtitle: "适合你的成长路径" },
      { key: "health", title: "身心健康", subtitle: "身体最需要照顾的地方" },
      { key: "people", title: "贵人与人际", subtitle: "谁会帮你，谁要留心" },
      { key: "cycles", title: "人生四季", subtitle: "每十年一个篇章" },
    ],
  },
  annual: {
    kind: "annual",
    title: "年运报告",
    en: "Book of Abundance",
    desc: "把今年拆成可执行的季节与月份。",
    chapters: [
      { key: "overview", title: "年度总览", subtitle: "今年的主旋律" },
      { key: "career", title: "事业", subtitle: "" },
      { key: "wealth", title: "财富", subtitle: "" },
      { key: "love", title: "感情", subtitle: "" },
      { key: "health", title: "健康", subtitle: "" },
      { key: "months", title: "逐月节奏", subtitle: "按节气走完这一年" },
    ],
  },
};

export const reportOf = (kind: string) => REPORTS[kind as ReportKind] as Report | undefined;
