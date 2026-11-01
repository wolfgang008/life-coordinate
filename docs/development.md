# 开发与部署

[返回产品介绍](../README.md)

## 独立本地预览

需要 Node.js 22.13+。在仓库根目录执行 `npm ci`、`npm run build`，然后运行 `node scripts/preview.mjs`。默认端口为 8788，本地数据库自动创建在忽略目录 `.local/`，不接触线上数据库。

真实 AI 模式需要设置 `ENABLE_LIVE_AI=1`，并通过环境变量 `API_KEY` 或 `.local/deepseek.json` 提供自己的密钥。私密文件格式见主 README。`API_BASE` 仅支持 DeepSeek 官方 HTTPS 地址。

PowerShell 可用 `$env:PREVIEW_PORT="8791"` 指定其他端口；macOS / Linux 可用 `PREVIEW_PORT=8791 node scripts/preview.mjs`。未启用真实 AI 时，可以浏览页面；需要生成个性化问题和建议时会提示连接 AI。

Windows 上，已有 `.local/deepseek.json` 时也可运行 `start-ai.cmd`，它会准备忽略的 `.dev.vars`、构建并启动真实 AI 本地预览。

## Wrangler 开发

仓库不包含维护者的线上账户、数据库配置或密钥。先将 [`wrangler.example.toml`](../wrangler.example.toml) 复制为 `wrangler.toml`。本地运行可保留示例数据库 ID；部署前必须换成自己创建的资源。

创建 `.dev.vars`：

```dotenv
API_BASE="https://api.deepseek.com"
API_KEY="YOUR_DEEPSEEK_API_KEY"
```

```bash
npm run db:local
npm run dev
```

打开 `http://127.0.0.1:8788`。`.dev.vars` 由 Wrangler 读取；独立预览读取环境变量或 `.local/deepseek.json`，两者不要混淆。

## 部署到自己的 Cloudflare

1. 登录自己的 Cloudflare 账户：`npx wrangler login`。
2. 创建数据库：`npx wrangler d1 create life-coordinate-db`。
3. 将返回的数据库 ID 填入自己的 `wrangler.toml`，按需修改 Worker 名称。不要使用其他人的账户或数据库。
4. 初始化自己的远端数据库：`npm run db:remote`。
5. 通过交互提示设置密钥：`npx wrangler secret put API_KEY`。
6. 运行 `npm test`，通过后执行 `npm run deploy`。

远端迁移只针对自己的新部署；维护既有实例时，先审查迁移差异。普通界面发布无需重建数据库。现有生产环境配置、密钥与用户记录不属于仓库内容。

## 检查与验收

```bash
npm test
npm run build
```

GitHub Actions 在 Node.js 24 / Ubuntu 下执行安装、测试和构建。真实模型联调独立于自动测试，只有启用相应环境开关后才会调用付费 API。

`scripts/verify-cloudflare.mjs` 默认只读核验维护者的正式站点。验证自己的部署时，先设置 `DEPLOY_URL`；它比对静态资源和配置，不调用模型或创建用户会话。`scripts/deploy-smoke.mjs` 是历史版本脚本，会写测试会话，不能代替当前只读发布核验。

不要提交 `.dev.vars`、`.local/`、`.wrangler/`、密钥或本地数据库。公开问题反馈也请移除个人回答、联系方式和敏感日志。
