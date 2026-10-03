# 可运行产品 Demo

## 在线验收

打开 [https://life.wolfx.top](https://life.wolfx.top)，点击“查看完整案例”，无需填写信息即可快速查看画像确认、方向比较、第一行动与反馈闭环。

在线版本已连接 Cloudflare Worker 与 D1。真实 AI 分析由后端调用模型，密钥不会下发到浏览器。

## 本地运行

环境要求：Node.js 22.13 或更高版本。

```powershell
npm install
npm run db:local
npm run dev
```

浏览器访问命令行显示的本地地址。若要运行真实 AI 分析，请按[项目 README 的快速开始说明](../../README.md#快速开始)创建本地 `.dev.vars`；该文件已被忽略，不应提交任何密钥。

## 验收命令

```powershell
npm test
npm run build
```

测试覆盖访谈分支、画像协议、现实边界、多模型失败处理、会话隔离与数据兼容等关键路径。
