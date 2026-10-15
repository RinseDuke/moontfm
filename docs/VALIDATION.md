# 首版验证记录

验证日期：2026-10-15。环境：Windows，Node.js 24.15.0，moon 0.1.20261012（748b63c），moonc 0.10.15+943464bfa。工具链来自 MoonBit 官方站，17 个可执行文件均已与官方 SHA-256 清单核对。固定版本见 `moon-toolchain`。

## 本地检查

实际执行格式检查、`moon check --target js --deny-warn`、`moon build --target js --release --deny-warn`、`moon test --target js --deny-warn` 及 `node --test tests/*.test.mjs`。结果与最终数量见 [当前状态](STATUS.md)。

测试分为三个独立层次：MoonBit 库 API 固定样例、手工构造且有独立期望值的二进制/CLI 测试、TeXware 生成及真实字体交叉核验。另用确定性种子执行 1,500 组变异或随机输入，检查始终产生有界的结构化结果；这是补充检查，不是对所有恶意输入的证明。

截断测试覆盖最小文件从 0 到 59 字节的全部前缀，并逐个断言错误位置；边界测试接受最大 131068 字节经典文件，并拒绝上限外输入。CLI 测试覆盖真实文件、错误参数、错误退出码、JSON、中文/空格/前导连字符路径与过大文件。

## TeXware 对照

参考工具：TFtoPL 3.3、PLtoTF 3.6（TeX Live 2026），kpathsea 6.4.2。以原创 `fixtures/reference.pl` 经 pltotf 生成的文件，加上 CTAN `cm-tfm` 的 75 个官方 TFM，逐一读取 tftopl 的 PL 输出。

比较结果：76 个文件、9,511 个存在字符全部通过；对 0—255 的所有字符编码逐个检查存在性，并比较存在字符的宽、高、深、斜体修正，以及文件 checksum 与设计字号。原始单位为 2^-20；PL 是十进制展示，允许误差不超过 1 个原始单位，观察到的最大误差为 0.49996799998916686，未超过半个原始单位。此舍入容差只用于外部展示值核验，MoonTFM 自身 diff 仍精确比较整数。

原创 PL 另有精确断言：字符 66 存在且宽度 0、高度 655360、深度 -131072、斜体修正 65536；kern 表为 [-65536]，存在一个扩展配方。逐文件 SHA-256、字符数量、参考输出和损坏样例诊断保存在 [机器记录](validation/crosscheck-2026-10-15.json)。第三方语料与参考工具的来源、版本和许可见 [样例说明](../fixtures/README.md)。

参考工具会修改错误输入，不能只以其退出码作判据。实际观察：`bad-index.tfm` 的 tftopl 退出码是 0，同时报告宽度索引过大并重置为零；MoonTFM 返回 INDEX_OUT_OF_RANGE、byte_offset=32，CLI 退出 2。截断样例的 tftopl 返回 1，并报告文件少于声明长度；MoonTFM 返回 TRUNCATED、byte_offset=59，CLI 退出 2。原始诊断已保留。

## 复现

完成 README 中的构建后，装有 TeXware 的系统运行：

```text
node scripts/crosscheck.mjs
node scripts/crosscheck.mjs /path/to/tftopl /path/to/pltotf /path/to/cm-tfm
```

第一条只验证原创 PL，第二条增加目录中全部 `.tfm`。Windows 可传入 `.exe` 的路径。输出位于忽略的 `artifacts/crosscheck/`。如果使用隔离解压的 TeX Live 而遇到 `texmf.cnf` 缺失警告，可建立只含 `TEXMF = {}` 的配置文件，并将 TEXMFCNF 指向其目录；不要忽略参考工具关于字体内容的警告。

CTAN 语料下载入口与归档哈希见样例说明。CI 在 Linux 中安装发行版的 `texlive-binaries`，只执行原创 PL 对照，避免真实字体下载影响基本验证。Windows 与 Linux 都执行相同的 MoonBit 和 Node 测试。远端 CI 状态单独记录，不能用本地通过代替远端成功。

## 远端 CI

[GitHub Actions 成功运行](https://github.com/RinseDuke/moontfm/actions/runs/38763077187)，代码提交 `7a85d29708f0d3359983da3090e6e9fa93806215`。Windows 与 Ubuntu 均完成固定工具链安装、格式检查、严格编译、5 个 MoonBit 测试与 31 个 Node/CLI 测试；Ubuntu 另完成原创 PL 的 TeXware 交叉核验并上传报告。运行使用 Node.js 24.21.0。

Linux 安装已按实际运行修正版本号中加号的 URL 编码，并为官方归档内的工具设置执行权限。仓库最后的验证记录更新只涉及文档，沿用上述代码和工作流的成功证据。

## 未完成的独立证据

本轮由实现者完成规范复核与自动测试，没有冒充 Claude/GLM 的独立审查。外部审查仍可按 `REVIEW_BRIEF.md` 执行。没有证明完整连字执行语义和渲染兼容性，没有进行性能基准或用户规模统计。
