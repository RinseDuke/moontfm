# MoonTFM 外部审查任务

这是 RinseDuke 单人参加 MoonBit 十月黑客松的新项目。2026-10-15 已有 MoonBit 实现和本地验证记录，请同时阅读 STATUS、API、VALIDATION，按文末“实现后的复审”检查真实代码和运行结果。下列选题审查要求仍适用，但不要将本地验证当作外部独立审查或官方验收通过。

## 发给 Claude 和 GLM 的任务

请分别独立阅读 README、PROPOSAL、TOPIC_RESEARCH、DESIGN 和 ACCEPTANCE_PLAN，再按以下要求审查：

1. 用公开仓库与 README 检索补查 MoonBit TFM 同类实现。核查查重记录的搜索字段和漏检风险，不用“零命中”推断绝对无重复。
2. 判断字体文件体检和发布前度量差异是否构成真实用途，评估这个项目是否适合一个会其他语言但没用过 MoonBit 的开发者在本月完成。
3. 参照 TFtoPL 官方源码检查 TFM 模型与校验范围，重点看零字符范围、字符存在性、signed fix_word、设计字号、checksum 语义、lig/kern 控制记录、可扩展配方和 next-larger。
4. 检查“结构校验通过”和“完整 TeX 兼容”是否区分清楚；检查差异报告能否区分度量等价和其他表变化。
5. 审查测试是否具有独立期望值，是否能揭示实现错误，而不仅是复述实现逻辑。
6. 指出首版应删减或必须补充的内容，优先保护完整交付、测试和文档。

请按严重程度列出具体问题，每条提供证据或可复現反例、影响和修正建议。将确认的问题与推测分开；引用真实链接或文件位置。没有证据时说明需要的验证，不编造性能数字、通过验收概率或用户规模。

官方参考：[TFtoPL 源码](https://github.com/TeX-Live/texlive-source/blob/trunk/texk/web2c/tftopl.web)、[TeXware](https://ctan.org/pkg/texware)、[赛事官网规则源码](https://github.com/moonbitlang/Hackathon2026/blob/main/src/App.tsx)。

## 实现后的复审

有代码后，请进一步审查有界二进制读取、整数溢出、表引用、循环处理、误报和漏报、JSON schema 与 CLI 退出码、跨平台输入、以及样例文件的来源许可。审查时先运行仓库实际支持的构建与测试，不用文档中的“计划通过”替代运行证据。
