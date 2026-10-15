# MoonTFM 选题与查重记录

检索日期：2026 年 10 月 12 日。参赛条件：RinseDuke 单人，新项目；会其他编程语言，尚未使用 MoonBit；计划参加本月赛事。

## 选题结论

选择经典 TeX TFM 字体度量文件的读取、结构校验和语义差异分析。这个方向无需专用硬件、在线服务、模型训练或完整排版引擎，便于用文件和确定性输出演示。范围判断是开发建议，不代表赛事方已经认可选题。

项目价值在于提供 MoonBit 可直接复用的库、结构化诊断和字符度量差异报告。TFM 解析在其他语言中已有成熟实现，不应宣传为全球首创。

## 排除与备选

| 方向 | GitHub 查询与证据 | 判断 |
|---|---|---|
| HEX 固件工具 | `firmware language:MoonBit` 返回 4 个仓库，包括 SongYZZZ/moon-firmware 与 Zzqy-yi/moonbit-firmware-image | 已有高度相似的解析和验证工具，排除 |
| Touchstone 射频文件 | `touchstone MoonBit` 返回 guolei-dev/moonbit-touchstone | 同类方向已有项目，排除 |
| gettext 本地化 | `gettext MoonBit` 返回 YanFangNie/moongettext | 已覆盖 PO/POT、MO 和运行时，排除 |
| BDF 位图字体 | `BDF in:name,description,readme language:MoonBit` 返回 2 个仓库，包括 freetype 移植 | 与字体库可能重合，未进一步确定功能边界 |
| AppleDouble 文件 | `AppleDouble in:name,description,readme MoonBit` 返回 0 | 备选；扩展属性与资源叉会增加首版边界选择难度 |
| GFA 基因组图 | `"gfa" MoonBit` 返回 0 | 备选；生物领域语义与大文件处理增加学习成本 |
| TFM 字体度量 | 下列定向查询未找到明确同类 | 选定；规范明确，有参考工具可交叉验证 |

前两轮默认仓库检索主要覆盖名称、描述和 topics，并非源代码全文。最后一轮明确增加 README 检索，并去掉语言限制做补查，降低语言分类漏检风险。

## TFM 定向结果

以下是 GitHub 公开仓库搜索 API 的实际返回，不是根据普通网页搜索没有结果作出的推断。

| 查询 | 命中数 | 解释 |
|---|---:|---|
| `tfm MoonBit` | 0 | 默认字段检索 |
| `"font metric" MoonBit` | 0 | 默认字段检索 |
| `TFM in:name,description,readme language:MoonBit` | 0 | 包含 README，并限定主语言 |
| `"TeX font" in:name,description,readme MoonBit` | 0 | 跨主语言检索 |
| `TFM MoonBit in:name,description,readme` | 1 | mldong/jeeflow-csharp，主语言 C#；未识别为 TFM 工具，仍记录这一命中 |
| `"font metric" MoonBit in:name,description,readme` | 7 | 泛字体指标命中，包括 Tiago、Prawn、Typst 和其他字体相关项目；不能等同于 7 个 TFM 库 |
| `"TeX font metric" MoonBit in:name,description,readme` | 0 | 更精确的跨主语言查询 |
| `"MoonTFM"` | 0 | 名称检索，完成于第三轮 |

泛字体指标结果中，[Tiago](https://github.com/OverflowCat/tiago) README 描述的是 Typst 图表渲染；[mizchi/font](https://github.com/mizchi/font) 描述 TTF/OTF/TTC/OTC/WOFF/WOFF2 支持；[bikallem/freetype](https://github.com/bikallem/freetype) 是 FreeType 移植。后两者本次读取的仓库页面没有匹配到 TFM 文本。这个观察只能说明公开页面未声明 TFM 支持，不能证明源码绝无相关代码。

## 可复核入口

- [TFM MoonBit 仓库与 README 检索](https://github.com/search?q=TFM+MoonBit+in%3Aname%2Cdescription%2Creadme&type=repositories)
- [精确 TeX font metric 检索](https://github.com/search?q=%22TeX+font+metric%22+MoonBit+in%3Aname%2Cdescription%2Creadme&type=repositories)
- [MoonBit 固件仓库检索](https://github.com/search?q=firmware+language%3AMoonBit&type=repositories)
- [已存在的固件工具](https://github.com/SongYZZZ/moon-firmware)
- [已存在的固件镜像库](https://github.com/Zzqy-yi/moonbit-firmware-image)
- [已存在的 Touchstone 工具](https://github.com/guolei-dev/moonbit-touchstone)
- [已存在的 gettext 工具](https://github.com/YanFangNie/moongettext)

API 查询、返回总数和仓库名称的原始摘要保存在 `research/`。查询包含 `incomplete_results` 字段，失败请求以 error 记录，不把失败算作零命中。首次 Intel HEX、首次 AppleDouble 请求超时；末次重复的 MoonTFM 名称查询遭遇频率限制，之前成功的名称查询仍保留。

## 范围限制与风险

GitHub 仓库搜索不能覆盖私有仓库、尚未公开的参赛项目、未出现关键词的实现或所有未索引源码。本次未进行需要登录的 GitHub code search，也未穷举上述字体库的全部源码。Mooncakes 网页索引检索没有找到明确 TFM 包，但未完成 registry 的完整包索引扫描。结论应写作“截至检索日，公开定向检索未发现明确的 MoonBit TFM 同类项目”，不能写作“保证无重复”。

TFM 用户群较小，需要在 README 中解释字体文件体检和发布前度量变化检查这两个实际场景。验收风险还包括只读文件头导致工作量过小、误把 checksum 当成内容校验和、未正确处理定点数、以及声称完整 TeX 兼容却未验证连字语义。这些风险通过明确首版范围和测试计划控制，冷门本身并不保证通过验收。

## 规范与赛事来源

- [TeXware 官方包说明](https://ctan.org/pkg/texware)：TFtoPL 与 PLtoTF 的用途和上游来源。
- [TFtoPL 源码中的格式说明](https://github.com/TeX-Live/texlive-source/blob/trunk/texk/web2c/tftopl.web)：用于后续实现和复核，独立实现而非整段移植。
- [MoonBit 黑客松官网](https://moonbitlang.github.io/Hackathon2026/)
- [官网当前规则源码](https://github.com/moonbitlang/Hackathon2026/blob/main/src/App.tsx)：十月赛报名与验收截止 2026 年 10 月 31 日，要求公开仓库与一页项目说明。执行细节仍以正式章程和官方通知为准。
