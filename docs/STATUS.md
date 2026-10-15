# MoonTFM 当前状态

更新日期：2026-10-15。

## 已实现

- 纯 MoonBit 的经典 8 位 TFM 全表解析、结构和引用校验。
- 原始定点数与字符存在性、查询、字符度量差异及其他表变化。
- inspect、validate、glyph、diff 四个命令，文本和 JSON，明确退出码。
- 9 个原创二进制样例、原创 PL、MoonBit API 单元测试、CLI 与变异输入测试。
- Windows 项目内工具链安装脚本，固定编译器版本；GitHub Actions 的 Windows/Linux 工作流。
- API、JSON、范围边界、样例来源与许可、复现及交叉验证文档。

## 验证证据

- 本地格式、严格检查、release 构建通过，编译器无警告。
- 5 个 MoonBit 测试、31 个 Node/CLI 测试通过；包括 1,500 组确定性变异或随机输入。
- TeXware 对照 76 个文件、9,511 个字符通过，机器记录见 `validation/crosscheck-2026-10-15.json`。

以上记录针对 JS 后端。完整连字执行语义不属于首版承诺。

## 外部交付状态

- 公开仓库：[RinseDuke/moontfm](https://github.com/RinseDuke/moontfm) 已创建，准备推送首版并核对 CI。
- 远端 CI：已编写工作流，尚未获得远端运行成功的证据。
- Mooncakes：已准备版本 0.1.0 的模块元数据，`moon package --list` 本地检查通过；`moon publish --dry-run` 因缺少 credentials.json 要求登录，尚未发布。不得把本地模块名表述为已发布包。
- 外部独立审查：任务说明已准备，尚未收到 Claude/GLM 的独立报告。
- 赛事报名/验收：尚无已提交、已接收的证据。须通过参赛者可访问的官方入口完成并保留回执。

后续更新这些状态必须依据实际操作结果。原始时间表保留在 `ACCEPTANCE_PLAN.md`，不再以原始计划日期推断实现状态。
