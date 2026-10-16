# MoonTFM API 与 JSON 契约（0.1.0）

## MoonBit 核心库

根包 `RinseDuke/moontfm` 不依赖文件系统、Node.js 或 TeX。首版只验证了 JS 后端，不承诺其他后端已经通过测试。主要导出：

```mbt nocheck
parse(Bytes) -> Result[Font, Array[Diagnostic]]
validate(Font) -> Array[Diagnostic]
glyph(Font, Int32) -> Glyph?
diff(Font, Font) -> Result[Difference, Array[Diagnostic]]
fixed_to_double(Int32) -> Double
inspect_json(Bytes) -> String
glyph_json(Bytes, Int32) -> String
diff_json(Bytes, Bytes) -> String
```

完整、由编译器生成的签名见根目录 `pkg.generated.mbti`。`Font` 的所有实例应从 `parse` 获取，不要修改其中的表数组。`parse` 先验证布局，返回安全可读的全部表；表索引和其他语义结构问题由 `validate` 检查。因此 `Ok(font)` 不等同于校验通过。

`glyph` 接受字体字节编码 0—255。超出该范围，或已存在字符的度量索引无效时返回 `None`；缺失字符返回 `Some({ exists: false, metrics: None, ... })`。使用独立 API 时先调用 `validate`。`glyph_json` 与 `diff` 会自行校验，拒绝无效输入。

`diff` 逐字符比较存在性和四类度量，另外比较设计字号。`metrics_equal` 包含设计字号相等；它不表示整个字体语义等价。原始头、字符索引、度量表、lig/kern、kern、exten、param 的变化保留在 `other_changes`，即使字符度量相同。`checksum` 变化单独标记，同时也是 `header` 变化。设计字号只变化时没有 `glyph_changes`，但 `metrics_equal` 为 false。

## 数值与数据模型

所有 fix_word 保留原始有符号 32 位整数，以 2^20 为分母。宽、高、深、斜体修正和 kern 等通常以设计字号为单位；设计字号自身以 TeX point 为单位，param 的第一项 slant 是无量纲值。不要将原始整数当作像素或 Unicode 度量。`fixed_to_double` 仅为展示方便，不能替代原始整数比较。

`header[0]` 保留 checksum 的 32 位原始模式，在 MoonBit/JSON 中以有符号整数表示；若需无符号展示，以 `value >>> 0` 转换。它不是本工具计算的内容校验和。`header[1]` 是原始设计字号。其他头信息保持原始字，不解码可选字符串。

`lengths` 的顺序为 `lf, lh, bc, ec, nw, nh, nd, ni, nl, nk, ne, np`。`characters` 包含范围内所有记录，包括缺失字符；其 `byte_offset` 为记录首字节的零基偏移。`lig_kern` 和 `extensibles` 用 `Record { a, b, c, d }` 保留四个无符号字节。参数数组按程序常规从 0 索引，`parameters[0]` 对应规范中的 param[1]。

## JSON schema_version 1

| 字段 | 类型与含义 |
|---|---|
| `schema_version` | 整数 1 |
| `command` | inspect、validate、glyph、diff |
| `status` | ok、invalid；CLI 参数/文件/构建错误为 error |
| `diagnostics` | 诊断数组 |
| `coverage` | 声明实施的校验类别；不是每条规则已执行的轨迹 |
| `not_covered` | 明确未覆盖的检查类别 |
| `data` | 模型、字符、差异对象或 null；diff 无效时为 `{ "input": "before"/"after" }` |

每个诊断固定包含 `code, severity, byte_offset, table, message, character_code, expected_min, expected_max, actual`。不适用的可选值显式为 null。CLI 参数/文件错误的 `byte_offset` 为 null；库产生的诊断位置是原文件零基字节偏移，截断指向实际输入终点。`severity` 首版为 error。索引越界包含合法区间和实际索引；涉及字符的索引诊断包含字符编码。

机器消费者应判断 `code` 和结构字段，不依赖英文 `message` 的逐字内容或 JSON 对象键顺序。schema 1 的字段类型稳定；增加可选字段或诊断 code 不要求消费者拒绝报告。CLI 的 `--json` 保证报告写 stdout，参数和文件错误也使用相同信封；构建工具本身的输出不属于 CLI 报告。

`Glyph.metrics` 为 null 或 `{ width, height, depth, italic }`。差异条目固定为 `{ character_code, kind, before, after }`，kind 为 added、removed、changed；before/after 为度量对象或 null。

## 校验范围

实施：目录字段的 15 位范围、经典 TFM 长度等式、真实字节数、字符范围、至少两字的头、至多 256 个配方、度量表零项、设计字号、定点范围、已存在字符度量索引、lig/kern 入口与跳转、kern 索引、合法连字操作码、字符引用、配方与 next-larger 引用及循环。完整可选 BCPL 头字段存在时校验其长度字节。

刻意保留的差异：末尾多余字节被严格拒绝；所有普通 lig/kern 记录都检查索引和引用，包括不可达记录。这可能比 TeXware 对部分不可达记录的检查更严格。TFtoPL 会修正部分损坏字段后输出 PL；MoonTFM 不修复输入，返回明确错误。

字符的 lig/kern 入口若指向 skip > 128 的记录，会解析一次双字节重启地址并校验范围，包括同时作为右边界声明的首条 skip=255 记录。未被字符引用的纯右边界声明不要求其地址字段有效；末条 skip=255 的左边界地址仍检查。skip=128 是普通停止操作，不作为重启地址解释；重启后的控制记录按停止处理，不递归追跳转。

未实施：连字程序执行、完整连字循环判定、seven-bit-safe 声明核实、头字符串内容规则、数学字体参数数量、渲染、JFM/OFM。某些变体可凭目录识别为不支持，但不声称能识别任意伪装成经典布局的变体。

输入上限 32767 字（131068 字节）。库在读取表或按长度分配数组之前检查目录与实际长度；CLI 最多读取上限再加一个字节以检测过大输入。next-larger 链最多涉及 256 个字符。除下一较大字符循环外，不从结构检查推导排版执行安全性。
