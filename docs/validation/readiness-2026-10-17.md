# 2026-10-17 提交前核验

结论：按首版已声明的范围，技术实现与可复现材料已可供审核；没有发现阻止提交现有项目的核心功能问题。当前处于提交前人工验收阶段。正式报名、资格审核和验收回执尚无证据，不能等同于赛事已接收。

## 本轮检查

代码基线为 `9ca6e94a590a688e3322098a7e5c5764e358efef`；本轮新增演示报告溯源修复和回归测试，具体变更以包含本文的提交为准。

| 检查 | 证据与结果 |
|---|---|
| 格式、严格检查、release 构建 | `moon fmt --check`、`moon check --target js --deny-warn`、`moon build --target js --release --deny-warn` 通过 |
| MoonBit / Node 测试 | 5 个 MoonBit 测试、43 个 Windows Node 测试通过；变异与随机输入为其中一项内的 1,500 组输入 |
| 实际 CLI 演示 | 八项案例同时运行文本和 JSON 命令，字段及退出码均符合独立预期 |
| TeXware 对照 | 76 文件、9,511 字符和 8 组边界组合通过；最大 PL 显示舍入误差为 0.499968 原始单位，小于允许的 1 |
| 源码交付 | `moon package` 通过；检查归档不含工具链、账号凭据、第三方字体与生成报告；解压后重新构建、测试并运行演示 |
| 远端代码基线 | [9ca6e94 的 CI](https://github.com/RinseDuke/moontfm/actions/runs/38999359765) 的 Windows/Linux 作业均成功，八项演示均通过；Linux 另运行原创 PL 与边界 TeXware 对照 |

本地完整真实字体语料对照与 CI 中的原创样例对照不同，不能把本地 76 文件对照表述为 CI 每次都跑了 76 个文件。Windows 作业跳过 Linux 专属步骤，Linux 跳过 Windows 专属步骤，均属于预期条件执行。

机器输出保留于忽略的 `artifacts/demo/report.json` 与 `artifacts/crosscheck/summary.json`；生成文件不作为手工编写的预期结果。Windows 本轮合计 48 项测试；Linux 会跳过六项 Windows 安装脚本测试。

## 发现与修正

1. **演示报告误认外层 Git 仓库。** 无 `.git` 的源码包解压到另一个仓库内时，Git 向上查找会返回外层仓库的 HEAD 与工作区状态。演示脚本现先核对 `git rev-parse --show-toplevel` 是否为当前项目目录，再记录提交信息；不是自身仓库时返回 `null`，仍保留编译产物和输入文件 SHA-256。新增独立临时父仓库回归测试。此问题影响报告溯源，不影响解析或度量结果。
2. **交付材料有旧进度。** 状态页原有 9 个样例、31 个 Node 测试等历史数字，申报书仍承诺后续发布 Mooncakes。已统一为当前实测事实和发布暂缓状态，原始排期继续保留在开发计划中。

MEMORY.md 仅新增未勾选待办，没有更改用户维护的关键决策或已完成内容。

## 与官方公开要求的对应

核对来源：[十月黑客松官网](https://moonbitlang.github.io/Hackathon2026/) 与[官网源码](https://raw.githubusercontent.com/moonbitlang/Hackathon2026/main/src/App.tsx)，读取日期 2026-10-17。

| 公开要求 | 当前材料与待确认项 |
|---|---|
| MoonBit 为主要实现语言 | 解析、校验、度量查询、差异和 JSON 模型在 MoonBit 中；Node CLI 负责文件输入和命令展示 |
| 公开仓库及可追溯开发 | [公开仓库](https://github.com/RinseDuke/moontfm) 有本期连续提交与 CI 记录 |
| README、可运行示例、必要测试、可复现演示 | README、10 个原创 TFM 样例、测试、实现导览及八项实际 CLI 演示 |
| 开源许可证与来源披露 | MIT LICENSE；TeXware 格式参考和真实字体语料来源、许可单独说明 |
| 参赛者理解 AI 辅助产出 | 已提供实现导览；仍需参赛者亲自核查输出并能解释边界 |
| 报名与验收 | 官网列出公开仓库与一页项目说明；材料已具备，未核实正式提交和审核回执 |

官网公布本期报名与验收截止为 **2026-10-31**，并要求加入赛事群、使用 GitHub ID 作为昵称。报名和最终验收的具体附件与入口须以正式章程及群通知为准。

十月官网的公开验收条目没有列出 Mooncakes 发布；另一个[国产基础软件生态开源大赛页面](https://moonbitlang.github.io/OSC2026/)列出了 Mooncakes 发布要求，不能将两个活动的要求混用。本次[正式章程](https://bxup9uklfcb.feishu.cn/wiki/Dx4Bwd6D1i3GfHkajQCcF7SznEd)与[报名表](https://bxup9uklfcb.feishu.cn/share/base/form/shrcnWUMlgpbwHaXgzV7HmNhNhg)未能通过读取工具访问，因此尚不能断言本次正式验收豁免 Mooncakes。继续按用户要求暂缓发布，提交前核实适用规则。

## 用户检查效果

在按 README 构建后运行：

```powershell
node scripts/demo.mjs
node scripts/demo.mjs --case bad-lig-entry
node scripts/demo.mjs --case table-reorder
```

重点看两项：坏连字入口应定位字节 62、实际索引 65535，退出 2；表重排应显示度量相同、原始表有变化，退出 1。完整解释见 [IMPLEMENTATION.md](../IMPLEMENTATION.md)。

首版支持经典 8 位 TFM 和 JS 后端；未覆盖完整连字执行语义、渲染、JFM/OFM 等能力。外部独立审查属于尚未取得结果的内部质量计划，不是本轮已核实的官方必需材料。现阶段不需要为提交继续扩展功能，应先进行人工验收并核对官方手续。
