# 测试样例与来源

本目录的 9 个二进制 TFM 由 `scripts/fixtures.mjs` 独立构造，使用 MIT 许可证；不是从第三方字体裁剪或转换而来。运行 `node scripts/fixtures.mjs` 可确定性重建。测试中的期望值直接根据手工设定的字段与数值断言，不由 MoonTFM 自己生成。

| 文件 | 用途 |
|---|---|
| minimal.tfm | 60 字节，字符 65，10pt，宽度原始值 524288，高度 734003 |
| wider.tfm | 仅将字符宽度改为 655360 |
| bad-index.tfm | 仅将字符宽度索引改为 250，期望字节 32 越界诊断 |
| truncated.tfm | minimal 最后缺少一字节，期望 byte_offset=59 |
| empty.tfm | bc=1、ec=0 的零字符范围 |
| zero-width.tfm | 字符存在，但引用的非零索引宽度值为零 |
| negative.tfm | 深度 -131072、kern -65536，合法符号值 |
| reordered.tfm | 宽度表扩充与索引变化，实际字符度量仍与 minimal 相等 |
| recipe.tfm | 具有可扩展配方的字符，省略可选片段，保留必需 repeat |

`reference.pl` 也是本项目原创、MIT 许可的输入。使用 TeXware 的 PLtoTF 可生成另一个独立样例，包含三个字符、有效零宽、负数深度、斜体修正、负 kern、next-larger 与扩展配方。生成的 TFM/PL 和参考工具不随仓库分发，默认写入忽略的 `artifacts/`。

真实语料来自 Donald E. Knuth 的 75 个官方 Computer Modern TFM，CTAN 条目为 [cm-tfm](https://ctan.org/pkg/cm-tfm)，下载地址为 [tfm.zip](https://mirrors.ctan.org/fonts/cm/tfm.zip)，许可为 [Knuth License](https://ctan.org/license/knuth)。来源发布说明见 [2022-12 更新](https://www.ctan.org/ctan-ann/id/mailman.2695.1671792671.3715.ctan-ann%40ctan.org)。本次获取日期为 2026-10-15，归档 SHA-256 为 `9c0f99fa34c7d801c40f6b5ff60bc28f200e8ef6ffb2fe75e54ca835c67fc04c`。本仓库只记录来源与哈希，不再分发这些字体。

TeXware 来自 TeX Live 2026 的 `fontware.windows`（revision 77973）及 `kpathsea.windows` 运行库，源代码在 [TeX Live](https://github.com/TeX-Live/texlive-source)，许可遵循其各组件自己的声明。参考二进制仅存于本地忽略的 `.tools/`，不适用本项目 MIT，也不随项目发布。
