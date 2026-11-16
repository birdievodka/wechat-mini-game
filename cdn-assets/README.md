# 远程资源发布目录

源素材继续在 `assets` 中维护，并保持 UUID；本目录存放不可变发布清单。构建产物 `releases/` 不入 Git、不再装回微信包。云端目录为 `taoyuan-mini-heroes/resources/<内容哈希版本>/remote/<Bundle>/…`。

1. `npm run build:wechat`：Creator构建，导出远程静态数据，校验本地代码桩/包预算。
2. `npm run cdn:publish`：使用当前登录的 bytedcli 上传当前目录，逐个公开下载并校验 SHA-256；成功更新 `published.json`。
3. `npm run cdn:check` 确认 `release.json` 与 `published.json` 的 version 相同，再生成微信预览或上传。版本由内容计算，不能手改URL指向未发布资源。

`config/cdn.json` 是域名/目录/远程Bundle白名单，`release.json` 是完整文件指纹，`published.json` 是最新验证通过的发布凭证。严禁上传脚本、凭证、调试日志和原始生成源图。远程Bundle的脚本全部留在微信本地包。

手机启用需先把 `https://lf3-static.bytednsdoc.com` 加入小游戏后台的 **downloadFile 合法域名**。开发者工具“不校验合法域名”不能代替正式后台设置。2026-11-15旧测试号未配置；2026-11-16用户确认正式账号AppID为 `wxbddcb8f0462f58cc` 并已配置，项目已切换。微信工具保持域名校验开启，实际下载HTTP200、配乐与Boss按需加载通过；手机实测仍需另记。

本地只保留最新导出；云端不删除旧已发布版本，避免仍在使用旧预览/正式版本的客户端加载失败。新资源文件名/目录随内容版本变化，保留Cocos原生下载缓存，限制并发4；资源内容有变必须重新构建与发布。

加载规则、失败回退和清理记录见 [资源分发说明](../docs/resources-cdn-v94.md)。
