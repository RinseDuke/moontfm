# 测试与交叉验证

验证环境为 Windows、Node.js 24.15.0、moon 0.1.20261012、moonc 0.10.15+943464bfa。工具链固定版本见根目录 `moon-toolchain`；GitHub Actions 在 Windows 和 Linux 上执行 JS 后端的构建与测试。

## 构建与测试

完成 README 中的工具链安装后，在项目根目录执行：

```powershell
moon fmt --check
moon check --target js --deny-warn
moon build --target js --release --deny-warn
moon test --target js --deny-warn
node scripts/fixtures.mjs
node --test tests/*.test.mjs
node scripts/demo.mjs
```

Windows 测试包含 5 个 MoonBit 测试与 43 个 Node 测试。Linux 跳过六项仅适用于 Windows 的安装脚本测试。八项 CLI 演示分别执行文本和 JSON 命令，核对独立预期字段与退出码，完整报告写入忽略的 `artifacts/demo/`。

测试分为 MoonBit 库 API、手工构造二进制与 CLI 集成、TeXware 对照三个层次。期望值独立于被测解析器；另用确定性种子执行 1,500 组变异或随机输入，检查有界的结构化错误行为。这些输入是补充验证，不构成对所有恶意输入的证明。

截断测试覆盖最小文件从 0 到 59 字节的全部前缀，并逐个断言错误位置；边界测试接受最大 131068 字节经典文件，并拒绝上限外输入。CLI 测试覆盖真实文件、错误参数、退出码、JSON、中文/空格/前导连字符路径与过大文件。安装测试覆盖编译器和标准库版本识别、旧库替换、错误或损坏归档，以及首次安装。演示报告另验证无 Git 元数据的源码副本不会误用外层仓库提交号。

## TeXware 对照

参考工具为 TFtoPL 3.3、PLtoTF 3.6（TeX Live 2026），kpathsea 6.4.2。原创 `fixtures/reference.pl` 经 pltotf 生成一个字体，另使用 CTAN `cm-tfm` 的 75 个官方 TFM。

76 个文件、9,511 个存在字符通过对照：逐个检查 0—255 字节编码的存在性，并比较存在字符的宽、高、深、斜体修正，以及文件 checksum 与设计字号。PL 十进制展示允许误差不超过 1 个原始单位，实测最大误差为 0.49996799998916686。该容差只用于外部展示值核验；MoonTFM 的 diff 精确比较原始整数。

原创 PL 另有精确断言：字符 66 存在且宽度为 0、高度 655360、深度 -131072、斜体修正 65536；kern 表为 [-65536]，存在一个扩展配方。八组边界组合覆盖纯声明、声明作为字符入口、左右边界、普通停止和重启地址。逐文件 SHA-256、字符数量、参考输出和损坏样例诊断见 [机器记录](validation/crosscheck-2026-10-16.json)。来源、版本和许可见 [样例说明](../fixtures/README.md)。

参考工具会修正错误输入，不能只看退出码。例如 `bad-index.tfm` 的 tftopl 退出 0，同时报告宽度索引过大并重置为零；MoonTFM 返回 INDEX_OUT_OF_RANGE、byte_offset=32，CLI 退出 2。坏连字入口样例应报告实际索引 65535、byte_offset=62、character_code=65；截断样例报告 TRUNCATED、byte_offset=59。

## 复现参考工具对照

构建后，安装了 TeXware 的系统可运行：

```text
node scripts/crosscheck.mjs
node scripts/crosscheck.mjs /path/to/tftopl /path/to/pltotf /path/to/cm-tfm
```

第一条验证原创 PL、损坏输入和八组边界组合；第二条增加目录中全部 `.tfm`。Windows 可传入 `.exe` 路径。输出位于忽略的 `artifacts/crosscheck/`。隔离解压的 TeX Live 若缺少 `texmf.cnf`，可建立只含 `TEXMF = {}` 的配置文件，并将 TEXMFCNF 指向其目录；字体内容警告仍须检查。

CI 在 Linux 中安装发行版 `texlive-binaries`，执行原创样例和边界组合对照，不下载 75 个真实字体。Windows 与 Linux 均执行格式检查、严格编译、MoonBit/Node 测试及 CLI 演示。最新结果与生成报告见 [GitHub Actions](https://github.com/RinseDuke/moontfm/actions)。

## 覆盖边界

验证范围为经典 8 位 TFM 的结构与引用，以及字符度量和原始表差异。未验证完整连字执行语义、渲染兼容性、JFM/OFM，也未提供性能基准；这些限制同时出现在 API 文档和机器报告的 `not_covered` 字段中。
