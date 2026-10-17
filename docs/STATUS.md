# MoonTFM 当前状态

核验日期：2026-10-17。版本：0.1.0。当前处于首版提交前验收阶段；本页记录技术事实，不代替用户维护 MEMORY.md 的完成标记。

## 功能与验证

- MoonBit 核心提供经典 8 位 TFM 全表解析、结构与引用校验、字符度量查询和差异分析。
- inspect、validate、glyph、diff 四个 CLI 命令支持文本与 JSON，明确区分正常结果、差异、无效输入和运行错误。
- 10 个原创二进制样例、原创 PL、API 与实现导览均已提供。
- 本地格式检查、严格检查与 release 构建通过；5 个 MoonBit 测试和 43 个 Node 测试通过，包括安装脚本、报告溯源和 1,500 组变异或随机输入。
- 实际 CLI 演示 8/8 符合预期；源码包重新解压后也能独立构建、测试并运行演示，无需 npm 依赖或 TeX 运行时。
- TeXware 对照 76 个文件、9,511 个字符和 8 组边界组合通过。机器证据在 `artifacts/crosscheck/summary.json`；已提交的先前记录见 `validation/crosscheck-2026-10-16.json`。
- 远端已核实的代码基线 `9ca6e94` 在 [Windows/Linux CI](https://github.com/RinseDuke/moontfm/actions/runs/38999359765) 均通过，包含 CLI 演示与 Linux TeXware 对照。本轮还修正源码包演示误用外层 Git 仓库信息的问题，后续提交的结果请按 SHA 在 [CI 列表](https://github.com/RinseDuke/moontfm/actions) 核对。

本轮判断、官方要求映射与剩余事项见 [提交前核验](validation/readiness-2026-10-17.md)。检查实际效果可运行 `node scripts/demo.mjs`，原理见 [实现导览](IMPLEMENTATION.md)。

## 范围与剩余事项

本版验证 JS 后端，宿主为 Windows/Linux。完整连字执行与循环语义、seven-bit-safe 声明、头字符串内容、数学字体参数数量、渲染、JFM/OFM 不在首版覆盖范围；报告始终披露 coverage / not_covered。

- 用户人工验收：需由参赛者检查演示效果，并能解释实现与边界。
- 外部独立审查：任务说明已准备，尚未收到 Claude/GLM 报告。这是内部质量计划，并非已核实的官方必需附件。
- 赛事报名、资格审核、入群及最终验收：没有可核实回执，不能标为已提交或已接收。正式章程和群通知的附件要求仍需核对。
- Mooncakes：按用户要求暂缓，不登录、不发布。模块元数据与本地源码打包可用，但不能表述为已发布；是否属于最终验收要求，应以本次参赛的正式章程为准。

技术上可以提交现有首版供审核；正式接收状态只能依据赛事方回执判断。
