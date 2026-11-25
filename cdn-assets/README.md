# 旧版 CDN 发布归档

自 v11.0.16 起，微信构建直接提供全部分包。当前预览流程见[项目 README](../README.md)。这里保留旧线上客户端使用的不可变发布清单，旧云端文件仍按原 URL 提供。

历史导出位于 `releases/`，仅用于对应旧构建；本地导出目录不入 Git。云端目录为 `taoyuan-mini-heroes/resources/<内容哈希版本>/remote/<Bundle>/…`。

`config/cdn.json` 是域名/目录/远程Bundle白名单，`release.json` 是完整文件指纹，`published.json` 是最新验证通过的发布凭证。严禁上传脚本、凭证、调试日志和原始生成源图。远程Bundle的脚本全部留在微信本地包。

手机启用需先把 `https://lf3-static.bytednsdoc.com` 加入小游戏后台的 **downloadFile 合法域名**。开发者工具“不校验合法域名”不能代替正式后台设置。2026-11-15旧测试号未配置；2026-11-16用户确认正式账号AppID为 `wxbddcb8f0462f58cc` 并已配置，项目已切换。微信工具保持域名校验开启，实际下载HTTP200、配乐与Boss按需加载通过；手机实测仍需另记。

云端保留旧已发布版本，供仍在运行的客户端访问。

加载规则、失败回退和清理记录见 [资源分发说明](../docs/resources-cdn-v94.md)。
