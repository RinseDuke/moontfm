# MoonTFM

MoonTFM 是使用 MoonBit 实现的经典 TeX 字体度量文件（`.tfm`）解析、结构校验和字符度量差异分析库，附带命令行工具。字体维护者可以用它检查文件结构，并在发布前定位新增、移除或度量变化的字符。

作者：RinseDuke。用于 MoonBit 2026 年十月黑客松，单人、新项目方向。原创代码与文档采用 MIT 许可证。

公开仓库：[RinseDuke/moontfm](https://github.com/RinseDuke/moontfm)。

当前状态：首版已在 Windows 和 Linux 上完成严格编译和测试，并与 TeXware 交叉核验。核心逻辑全部使用 MoonBit，CLI 的 Node.js 层只负责参数、文件读取、文本展示和退出码。日常运行不需要安装 TeX，也不需要联网。远端 CI、Mooncakes 发布与赛事提交状态见 [当前进度](docs/STATUS.md)。

## 安装和构建

需要 Node.js 22 或更新版本。实际验证环境：Windows、Node.js 24.15.0、moonc `0.10.15+943464bfa`、moon `0.1.20261012`。工具链版本固定在 [moon-toolchain](moon-toolchain)。

Windows PowerShell，在项目根目录执行：

```powershell
./scripts/bootstrap.ps1
moon check --target js --deny-warn
moon build --target js --release --deny-warn
```

bootstrap 仅将工具链安装到忽略的 `.tools/moon/`，并为当前 PowerShell 进程设置 `MOON_HOME` 和 `PATH`，不修改用户 PATH 或配置文件。新开终端后重新执行脚本即可复用已有安装。首次安装需要联网；固定版本在上游的保留时间有限，若下载失效须重新验证并更新版本。

其他系统可以使用 [MoonBit 官方工具链](https://www.moonbitlang.com/download/)，安装与 `moon-toolchain` 一致的版本；Linux 安装步骤也可参考 [CI](.github/workflows/ci.yml)。项目没有额外 Mooncakes 或 npm 依赖，无需执行 `npm install`。

## 四步演示

以下命令已在本地实际运行。`.tfm` 样例由本项目原创脚本生成并提交。

```powershell
node bin/moontfm.mjs inspect fixtures/minimal.tfm
node bin/moontfm.mjs glyph fixtures/minimal.tfm 0x41
node bin/moontfm.mjs validate fixtures/bad-index.tfm
node bin/moontfm.mjs diff fixtures/minimal.tfm fixtures/wider.tfm
```

结果依次为：设计字号 10pt、字符 65 的宽度原始值 524288（0.5 个设计字号单位）、字节 32 的宽度索引 250 越界、字符 65 的宽度由 524288 变为 655360。后两步退出码分别为 2 和 1，这是预期结果。

各命令均可添加 `--json` 获取版本化报告：

```powershell
node bin/moontfm.mjs inspect fixtures/minimal.tfm --json
node bin/moontfm.mjs diff fixtures/minimal.tfm fixtures/reordered.tfm --json
node bin/moontfm.mjs --help
```

`reordered.tfm` 的字符度量不变，报告的 `metrics_equal` 为 `true`；原始表和索引变化仍出现在 `other_changes`。由于存在原始变化，CLI 返回 1，不声称整个字体等价。

| 命令 | 输入 | 输出 |
|---|---|---|
| `inspect` | 一个文件 | 全部表、元数据和诊断 |
| `validate` | 一个文件 | 校验结果；JSON 保留与 inspect 相同的模型 |
| `glyph` | 文件、十进制或十六进制字节编码 | 字符是否存在、四类原始度量 |
| `diff` | 两个文件 | 字符变化、设计字号、其他表变化 |

| 退出码 | 含义 |
|---|---|
| 0 | 操作成功；diff 未发现任何变化 |
| 1 | diff 发现度量、元数据或原始表变化 |
| 2 | TFM 解析或已声明的校验规则失败 |
| 3 | 参数或文件读取错误 |
| 4 | 缺少构建产物或内部运行错误 |

缺失字符是成功查询，返回 `exists: false` 与 `metrics: null`。有效零宽字符返回 `exists: true`。编码属于字体自身的 0—255 字节空间，不直接解释为 Unicode。

## 测试

```powershell
moon fmt --check
moon test --target js --deny-warn
node scripts/fixtures.mjs
node --test tests/*.test.mjs
```

MoonBit 单元测试验证库 API；Node 测试验证编译后的 MoonBit 核心、CLI、独立期望值、完整截断位置、上限输入和 1,500 组确定性变异或随机输入。TeXware 交叉核验覆盖 76 个文件、9,511 个字符，详见 [验证记录](docs/VALIDATION.md)。

## 使用边界

支持经典 8 位、大端 TFM；不支持 JFM、OFM、字体渲染、写入或自动修复。度量保存为有符号 12.20 定点整数，差异判断不经过浮点舍入。checksum 是兼容性标识，不是可以重新计算的文件内容哈希。

结构与引用校验包括长度、表索引、度量范围、lig/kern 控制地址、可扩展配方和 next-larger 循环。**校验通过只代表报告中声明的检查通过，不代表完整 TeX 兼容。** 未执行连字程序，也不证明连字语义无循环、seven-bit-safe 标记正确、头字符串内容合法或数学字体参数数量正确。报告始终附带 `coverage` 和 `not_covered`。

## 文档

- [API 与 JSON 契约](docs/API.md)
- [当前进度与剩余交付](docs/STATUS.md)
- [验证记录与复现方法](docs/VALIDATION.md)
- [样例来源与许可](fixtures/README.md)
- [申报书](PROPOSAL.md)、[选题研究](docs/TOPIC_RESEARCH.md)、[设计](docs/DESIGN.md)、[验收计划](docs/ACCEPTANCE_PLAN.md)
- [外部审查任务](docs/REVIEW_BRIEF.md)

格式依据为 [TeX Live 的 TFtoPL 源码说明](https://github.com/TeX-Live/texlive-source/blob/trunk/texk/web2c/tftopl.web)。MoonTFM 独立实现，不调用外部解析工具完成核心功能；TeXware 仅用于开发验证。第三方测试语料没有纳入本仓库，来源、哈希与许可单独记录。
