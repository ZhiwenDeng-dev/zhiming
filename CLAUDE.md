@AGENTS.md

# 知命 H5

对标 FateTell 功能的本地 H5 原型。免费、本地跑、解读由本机 Claude Code + bazi skill 生成。

## 跑起来

```bash
pnpm install
pnpm dev            # 电脑上开发体验：http://localhost:3000
pnpm serve          # 手机体验：构建后监听局域网，手机同 Wi-Fi 访问 http://<本机IP>:3000（dev 模式会拦跨源资源）
                    # 当前仅局域网；外网/云上部署另立阶段（需换数据库 + Claude API + 后台队列）
```

常驻运行（不依赖 Claude Code 窗口）：先等进行中的推算结束（`pgrep -f "include-partial-messages"` 无输出），再

```bash
pnpm build && pkill -f next-server; nohup pnpm start -H 0.0.0.0 -p 3000 > logs/server.log 2>&1 < /dev/null & disown
nohup caffeinate -s -w $(pgrep -f next-server | head -1) >/dev/null 2>&1 & disown   # 服务在跑时 Mac 不睡眠
pnpm check          # 自检
```

前提：本机 `claude` 已登录；`python3` 可用；bazi skill 在 `~/.claude/skills/bazi`（可用 `BAZI_SKILL_DIR` 覆盖）。
可选环境变量：`CLAUDE_MODEL`（默认 `claude-opus-5-5`，最深；求快可设 sonnet）、`CLAUDE_BIN`（默认 `claude`）。

## 结构约定

```
app/(main)/   带底部 Tab 的页面：今日 / 档案 / 问事 / 占卦
app/api/      Route Handlers，所有数据读写和 Claude 调用都在这里
lib/          服务端逻辑：store（文件存储）、auth、paipan（调脚本）、claude（调 CLI + 排队）、prompts（只拼数据）、notes、calibration、iching（前端画卦）
skills/       随仓库的 skill：zhiming（加工规范）、iching（占卦），见「三层分工」
components/   前端共用组件
claude-workspace/  Claude CLI 的 cwd，首次调用自动创建 .claude/skills/bazi 软链（gitignore）
scripts/selfcheck.mjs  自检（周易查表、排盘解析、校准解析、产品与 skill 契约），`pnpm check`
scripts/parity.sh      一致性验收：产品环境 vs 日常 Claude Code 环境推同一份底稿，对比核心结论
data/         运行时数据，gitignore，不进仓库
```

## 数据

一个账号一个目录，账号之间互不可见：

```
data/sessions.json
data/users/<uid>/user.json            账号（scrypt 密码）
data/users/<uid>/profiles/<pid>.json  档案：出生信息 + 排盘结果（自己 1 个，朋友/家人若干）
data/users/<uid>/readings/<pid>/analysis/base.md      命盘底稿（bazi skill 完整分析）
data/users/<uid>/readings/<pid>/<kind>/<chapter>.md   报告章节缓存，生成一次永久复用
data/users/<uid>/chats/<pid>.json     问事对话
data/users/<uid>/divinations.json     占卦记录
```

## 第一原则：推算归 skill，产品只管交互和呈现

- **所有命理推算结果都由 skill 完成**，产品代码和 prompt 不写任何推算或写作规则，只「指明调哪个 skill 的哪个模块 + 传数据」（`lib/prompts.ts`）。
- **产品层只做交互与呈现**，形态对标 FateTell：章节拆分、卡片、问事、状态、视觉。
- skill 有、FateTell 没有的 → 补进产品（已补：曾用名/改名年份、已故/去世年份、历史事件校准）。
- 产品需要、bazi skill 没覆盖的 → 写进 zhiming skill 的「派生规则」，不进产品代码。
- **验收标准**：同一个人、同一个问题，在 Claude Code 里和在产品里结论一致，只是呈现不同。用 `bash scripts/parity.sh <profile.json>` 验收。

### 三层分工

| 层 | 位置 | 管什么 | 规矩 |
|---|---|---|---|
| bazi skill | `~/.claude/skills/bazi`（上游 jinchenma94/bazi-skill，用户本地改版） | 八字推算本身：排盘脚本、第三阶段分析、典籍规则 | **不改**（用户 2026-10-04 明确要求） |
| zhiming skill | `skills/zhiming/`（随本仓库） | 加工规范：底稿输出结构、大白话表达规范、各章节写法、日签/问事格式、派生规则（流月、流日、合盘） | 只加工不推算，结论不得与 bazi 底稿冲突 |
| iching skill | `skills/iching/`（随本仓库） | 周易占卦：`scripts/qigua.py` 起卦 + 朱熹变占取用 | 卦象与取用以脚本为准 |
| 产品 | `app/`、`lib/`、`components/` | 交互、呈现、存储、排队 | 不写推算/写作规则 |

两个仓库内 skill 也软链在 bazi 项目的 `.claude/skills/` 下，在 bazi 目录开 Claude Code 与产品用的是同一套。

### 契约自检（`pnpm check`）
- 前端画卦的 `lib/iching.ts` 与 `qigua.py` 64 卦表一致
- `lib/reports.ts` 每个章节在 `skills/zhiming/references/chapters.md` 都有 `### 报告/章节` 规范
- 问事备注块分隔符 `<<<NOTES` 两边一致

## 规则

1. **实现方式**
   - 排盘：四柱、大运、神煞以 bazi skill 的 `pai_pan.py` 输出为准；流月表也由脚本推出（`lib/paipan.ts` 的 `months`）。
   - 底稿：每个档案先跑 zhiming「模块：底稿」（内部调 bazi skill 第三阶段 + 读典籍），建档时后台自动生成；其余内容都以底稿为输入。
   - 底稿重推会清空该档案全部章节缓存，避免新旧结论矛盾。
   - 个人备注与校准（`lib/notes.ts`）：问事中用户说出的现实信息自动记下；底稿第 8 节往事供用户核对，重推底稿时按 bazi skill 第 7 步校准。
   - 占卦：服务端跑 iching 的 `qigua.py`，结果交给 iching skill 解读，命盘底稿只作背景。
2. Claude 调用只给 `Skill,Read` 两个工具，`--permission-mode dontAsk`，Read 只放行 bazi skill 目录（已验证 `/etc/hosts` 等被拒），`--setting-sources project`（不加载用户级 hooks/插件）。用户输入会进 prompt，这道权限是防提示注入的底线，不要放宽。
3. 报告按章节按需生成并缓存；改 prompt 后需删除对应缓存文件才会重算。
3.1 推算排队（`lib/claude.ts`）：同一账号一次只跑一个推算，后提交的显示「排队中」；全机最多 `CLAUDE_CONCURRENCY`（默认 3）个 claude 进程。推算在服务端跑完并落盘，前端离开页面不中断，回来自动接上；`/api/tasks` 供底部「正在推算」胶囊轮询。
3.2 JSON 文件的读改写一律走 `updateJson`（同文件串行），不要直接 read 再 write。锁只在单进程内有效，所以同一份 `data/` 只能有一个服务进程在跑（不要 dev 和 start 同时开）。
4. 面向用户的解读一律大白话、接地气，规范在 zhiming skill「表达规范」；只有命理底稿保留专业写法，因为它是推算依据。与 bazi 项目根 CLAUDE.md 第 6 条一致。
5. 不复制 FateTell 的品牌名、Logo、图片素材；只对标功能和视觉调性。
