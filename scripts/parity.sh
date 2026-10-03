#!/usr/bin/env bash
# 一致性验收：同一个人的「底稿」，分别在产品环境和日常 Claude Code 环境（bazi 项目目录）各推一次，
# 对比核心结论（日主强弱、格局、用神、喜神、忌神、当前大运）。验收标准见 CLAUDE.md「第一原则」。
#
# 用法：bash scripts/parity.sh data/users/<uid>/profiles/<pid>.json
# 耗时：两次 Opus 推算并行，约 3–5 分钟；会消耗订阅额度。
set -euo pipefail
cd "$(dirname "$0")/.."
APP=$(pwd)
PROFILE=${1:?用法：bash scripts/parity.sh <profile.json>}
OUT=$(mktemp -d)
MODEL=${CLAUDE_MODEL:-claude-opus-5-5}
SKILL_DIR=${BAZI_SKILL_DIR:-$HOME/.claude/skills/bazi}

# 与产品 analysisPrompt 相同的输入（lib/prompts.ts）
python3 - "$PROFILE" > "$OUT/prompt.txt" <<'EOF'
import json, subprocess, sys, datetime, os
p = json.load(open(sys.argv[1]))
skill = os.environ.get("BAZI_SKILL_DIR", os.path.expanduser("~/.claude/skills/bazi"))
today = (datetime.datetime.utcnow() + datetime.timedelta(hours=8)).strftime("%Y-%m-%d")
t = subprocess.run(["python3", f"{skill}/scripts/pai_pan.py", "--solar", today, "--hour", "12:00", "--sex", "男"], capture_output=True, text=True).stdout
row = next(l for l in t.splitlines() if l.startswith("| 天干")).split("|")[2:5]
zhi = next(l for l in t.splitlines() if l.startswith("| 地支")).split("|")[2:5]
gz = [a.strip() + b.strip() for a, b in zip(row, zhi)]
cal = f"农历 {p['date']}" if p["calendar"] == "lunar" else f"阳历 {p['date']}"
print(f"""调用 bazi skill（八字推算）和 zhiming skill（知命加工规范），执行 zhiming 的「模块：底稿」。不要收集信息、不要排盘、不要跑脚本，下面的数据就是全部输入。

【命主】{p['name']}（{p['relation']}），{p['sex']}，{cal} {p.get('time') or '时辰未知'}
【命主排盘结果（bazi skill 的 pai_pan.py 输出）】
{p['chart']['raw']}

【今天】{today}；流年 {gz[0]}、流月 {gz[1]}、流日 {gz[2]}""")
EOF

echo "▶ 产品环境（app/claude-workspace，仅项目级 skill）与日常环境（bazi 项目目录，含你的全局设置）并行推算…"
( cd claude-workspace && claude -p --setting-sources project --strict-mcp-config --no-session-persistence \
    --permission-mode dontAsk --tools "Skill,Read" \
    --allowedTools "Read(/$SKILL_DIR/**)" "Read(/$APP/skills/**)" "Read(./.claude/skills/**)" \
    --model "$MODEL" < "$OUT/prompt.txt" > "$OUT/product.md" ) &
( cd .. && claude -p --no-session-persistence --permission-mode dontAsk --tools "Skill,Read" \
    --allowedTools "Read(/$SKILL_DIR/**)" "Read(./.claude/skills/**)" "Read(/$APP/skills/**)" \
    --model "$MODEL" < "$OUT/prompt.txt" > "$OUT/cli.md" ) &
wait

python3 - "$OUT/product.md" "$OUT/cli.md" <<'EOF'
import re, sys
KEYS = ["日主", "格局", "用神", "喜神", "忌神", "当前大运"]
def core(f):
    t = open(f).read()
    rows = {}
    for l in t.splitlines():
        m = re.match(r"\|\s*([^|]+?)\s*\|\s*(.+?)\s*\|$", l)
        if m and m.group(1) in KEYS: rows[m.group(1)] = m.group(2)
    return rows
def tags(k, v):
    # 只比结论（加粗部分）的定性，不比解释里顺带提到的五行
    bold = " ".join(re.findall(r"\*\*(.+?)\*\*", v)) or v
    if k == "日主": return set(re.findall(r"身旺|身弱|从强|从弱", bold))
    if k == "格局": return set(re.findall(r"([正偏七][官杀财印]|食神|伤官|建禄|羊刃|从\S)格", bold)[:1])
    if k == "当前大运": return set(re.findall(r"大吉|小吉|中吉|吉|平|凶", v)[:1])
    return set(re.findall(r"[木火土金水]", bold))
a, b = core(sys.argv[1]), core(sys.argv[2])
ok = True
for k in KEYS:
    ta, tb = tags(k, a.get(k, "")), tags(k, b.get(k, ""))
    same = ta == tb and ta
    ok &= bool(same)
    print(f"{'✓' if same else '✗'} {k:<6} 产品={'/'.join(sorted(ta)) or '缺失'}  日常={'/'.join(sorted(tb)) or '缺失'}")
print("\n结论：", "一致 ✅" if ok else "存在差异 ⚠️（看上面 ✗ 项；全文见下方文件）")
EOF
echo "全文：$OUT/product.md  $OUT/cli.md"
