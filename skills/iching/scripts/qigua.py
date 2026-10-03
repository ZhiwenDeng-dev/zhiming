#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""周易起卦（零第三方依赖）。

三钱法：每次掷三枚铜钱，正面记 3、反面记 2，和为 6/7/8/9。
  6 老阴（动）  7 少阳  8 少阴  9 老阳（动）
六爻自下而上。动爻阴阳互变得变卦（之卦）。
断卦取用按朱熹《易学启蒙·考变占》。

用法：
  python3 qigua.py --lines 9,7,7,8,8,6     # 已有六爻（自下而上）
  python3 qigua.py --toss                  # 随机起卦
"""
import argparse
import json
import secrets
import sys

NAMES = ("乾 坤 屯 蒙 需 讼 师 比 小畜 履 泰 否 同人 大有 谦 豫 随 蛊 临 观 噬嗑 贲 剥 复 无妄 大畜 颐 大过 坎 离 "
         "咸 恒 遁 大壮 晋 明夷 家人 睽 蹇 解 损 益 夬 姤 萃 升 困 井 革 鼎 震 艮 渐 归妹 丰 旅 巽 兑 涣 节 中孚 小过 既济 未济").split()

# 八卦：按 (下, 中, 上) 爻阳=1 编码
TRIGRAMS = {
    0b111: ("乾", "天"), 0b000: ("坤", "地"), 0b001: ("震", "雷"), 0b010: ("坎", "水"),
    0b100: ("艮", "山"), 0b110: ("巽", "风"), 0b101: ("离", "火"), 0b011: ("兑", "泽"),
}
ORDER = ["乾", "震", "坎", "艮", "坤", "巽", "离", "兑"]
# 行：上卦，列：下卦
TABLE = [
    [1, 25, 6, 33, 12, 44, 13, 10],
    [34, 51, 40, 62, 16, 32, 55, 54],
    [5, 3, 29, 39, 8, 48, 63, 60],
    [26, 27, 4, 52, 23, 18, 22, 41],
    [11, 24, 7, 15, 2, 46, 36, 19],
    [9, 42, 59, 53, 20, 57, 37, 61],
    [14, 21, 64, 56, 35, 50, 30, 38],
    [43, 17, 47, 31, 45, 28, 49, 58],
]
POS = ["初", "二", "三", "四", "五", "上"]


def line_name(i, yang):
    n = "九" if yang else "六"
    if i == 0:
        return "初" + n
    if i == 5:
        return "上" + n
    return n + POS[i]


def hexagram(yang):
    code = lambda a: (1 if a[0] else 0) | (2 if a[1] else 0) | (4 if a[2] else 0)
    lo_name, lo_nat = TRIGRAMS[code(yang[0:3])]
    up_name, up_nat = TRIGRAMS[code(yang[3:6])]
    no = TABLE[ORDER.index(up_name)][ORDER.index(lo_name)]
    name = NAMES[no - 1]
    full = f"{name}为{up_nat}" if up_name == lo_name else f"{up_nat}{lo_nat}{name}"
    return {"no": no, "name": name, "full": full, "upper": up_name, "lower": lo_name, "yang": list(yang)}


def toss():
    return [sum(3 if secrets.randbelow(2) else 2 for _ in range(3)) for _ in range(6)]


def interpret_rule(lines, ben, bian):
    """朱熹变占：返回本次断卦应取的卦爻辞"""
    moving = [i for i, v in enumerate(lines) if v in (6, 9)]
    still = [i for i in range(6) if i not in moving]
    k = len(moving)
    ben_line = lambda i: f"本卦{ben['full']}·{line_name(i, ben['yang'][i])}爻辞"
    bian_line = lambda i: f"变卦{bian['full']}·{line_name(i, bian['yang'][i])}爻辞"
    if k == 0:
        return f"无动爻：以本卦{ben['full']}卦辞断。"
    if k == 1:
        return f"一爻动：以{ben_line(moving[0])}断。"
    if k == 2:
        return f"二爻动：以{ben_line(moving[0])}、{ben_line(moving[1])}断，以上爻（{line_name(moving[1], ben['yang'][moving[1]])}）为主。"
    if k == 3:
        return f"三爻动：以本卦{ben['full']}卦辞与变卦{bian['full']}卦辞合断，本卦为体（现状），变卦为用（走向）。"
    if k == 4:
        return f"四爻动：以{bian_line(still[0])}、{bian_line(still[1])}（两不变爻）断，以下爻（{line_name(still[0], bian['yang'][still[0]])}）为主。"
    if k == 5:
        return f"五爻动：以{bian_line(still[0])}（唯一不变爻）断。"
    if ben["no"] == 1:
        return "六爻皆动：乾卦以「用九」断（见群龙无首，吉）。"
    if ben["no"] == 2:
        return "六爻皆动：坤卦以「用六」断（利永贞）。"
    return f"六爻皆动：以变卦{bian['full']}卦辞断。"


def cast(lines):
    ben = hexagram([v in (7, 9) for v in lines])
    moving = [i for i, v in enumerate(lines) if v in (6, 9)]
    bian = hexagram([v in (7, 6) for v in lines]) if moving else None
    return ben, bian, moving


def main():
    p = argparse.ArgumentParser(description="周易三钱法起卦")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--lines", help="六爻值，自下而上，逗号分隔，如 9,7,7,8,8,6")
    g.add_argument("--toss", action="store_true", help="随机起卦")
    g.add_argument("--table", action="store_true", help=argparse.SUPPRESS)  # 自检用：输出 64 卦表
    a = p.parse_args()

    if a.table:
        print(json.dumps([hexagram([bool(c >> b & 1) for b in range(6)]) for c in range(64)], ensure_ascii=False))
        return

    lines = toss() if a.toss else [int(x) for x in a.lines.split(",")]
    if len(lines) != 6 or any(v not in (6, 7, 8, 9) for v in lines):
        print("六爻值必须是 6 个，且每个为 6/7/8/9", file=sys.stderr)
        sys.exit(1)
    ben, bian, moving = cast(lines)
    desc = "、".join(f"{line_name(i, v in (7, 9))}{'（动）' if v in (6, 9) else ''}" for i, v in enumerate(lines))

    print("## 起卦")
    print(f"- 方式：三钱法{'（随机）' if a.toss else ''}")
    print(f"- 六爻（自下而上）：{','.join(map(str, lines))}")
    print(f"- 爻象：{desc}")
    print()
    print("## 卦象")
    print(f"- 本卦：第{ben['no']}卦 {ben['full']}（上{ben['upper']}下{ben['lower']}）")
    print(f"- 动爻：{'、'.join(line_name(i, lines[i] == 9) for i in moving) if moving else '无'}")
    print(f"- 变卦：{'第%d卦 %s（上%s下%s）' % (bian['no'], bian['full'], bian['upper'], bian['lower']) if bian else '无'}")
    print()
    print("## 断卦取用（朱熹《易学启蒙·考变占》）")
    print(f"- {interpret_rule(lines, ben, bian)}")


if __name__ == "__main__":
    main()
