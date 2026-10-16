# 首版交付与发布

版本：0.1.0。模块名：RinseDuke/moontfm。源码许可证：MIT。支持后端：首版验证 JS。

## 可复核的提交材料

项目说明使用根目录 `PROPOSAL.md`；实际运行方法使用 README；API 与局限见 `API.md`；测试与交叉核验见 `VALIDATION.md`；完整当前状态见 `STATUS.md`。四步演示可直接使用 README 中的原创样例，无需网络或 TeX。

准备发布时运行格式检查、严格检查与 release 构建、两组测试及交叉核验。用 `moon info --target js` 生成 API 签名，检查包内文件没有 `.tools`、第三方字体、临时输出或账号凭据，再检查公开仓库的 CI 结果。

## Mooncakes

用户已要求暂缓此项，不主动登录或发布。

本仓库使用当前工具链的 `moon.mod` / `moon.pkg` 格式。`moon package --list` 和 `moon package` 已通过，源码包位于 `_build/publish/RinseDuke-moontfm-0.1.0.zip`。`moon publish --dry-run` 在本机因未登录而停止，不代表已完成发布预检。真正发布需要有 RinseDuke 命名空间权限的 Mooncakes 登录会话；发布前以 `moon publish --help` 和实际工具反馈为准。

当前没有已发布包的验证证据，README 不提供未经核验的 Mooncakes 安装命令。登录或权限不足时保留准备好的源代码和明确待办，不代替用户创建账号或接受服务条款。

## 赛事

以官方当前通知核对公开仓库链接、一页说明、验收入口、演示或附件要求。项目内部目标仍为 10 月 30 日前完成交付准备。仓库可运行、GitHub CI 通过与赛事已接收是三个独立状态；只有正式提交并确认回执后，才能标记报名或验收完成。
