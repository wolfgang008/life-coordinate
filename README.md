<p align="center">
  <img src="public/favicon.svg" width="72" alt="人生坐标图标">
</p>

<h1 align="center">人生坐标</h1>

<p align="center">先看见自己的处境，再找到下一步。</p>

<p align="center">
  <a href="https://life.wolfx.top"><strong>打开线上体验</strong></a>
  ·
  <a href="#在本地运行">本地运行</a>
  ·
  <a href="#项目结构">项目结构</a>
</p>

![人生坐标首页](docs/screenshots/home.jpg)

人生坐标是一个面向高中毕业到大学毕业初期的方向探索工具。它不急着给人贴上职业标签，而是先把学习经历、家庭支持、地域、时间和收入这些真实条件放在一起，帮你看清哪些路值得继续验证。

## 一次完整的探索

1. **认识你**：用结构化选择题建立背景，文字经历只是可选补充。
2. **理解与确认**：AI 整理兴趣线索和现实边界，每一项都由用户确认或纠正。
3. **比较方向**：多个模型独立判断，再综合可行性、投入与风险。
4. **走出一小步**：不要求立即作出终身决定，只给出一件本周可完成、可得到反馈的行动。

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/profile.jpg" alt="AI 画像确认界面"></td>
    <td width="50%"><img src="docs/screenshots/result.jpg" alt="方向比较界面"></td>
  </tr>
  <tr>
    <td align="center"><sub>画像先确认，不把推测当成事实</sub></td>
    <td align="center"><sub>把建议、代价和可验证的第一步放在一起</sub></td>
  </tr>
</table>

## 这个产品在意什么

- **建议可以被纠正。** 用户能逐条接受、拒绝或补充 AI 对自己的理解。
- **现实条件不是脚注。** 时间、收入、城市和家庭责任会直接影响方向排序。
- **证据和结论分开。** 画像保留回答来源，外部资料有核验状态，不用模型补齐未知事实。
- **方向是动态的。** 完成一次真实体验后，可以带着新反馈重新判断，旧记录仍然保留。

## 技术实现

- Cloudflare Workers 提供页面、API 与流式分析。
- Cloudflare D1 保存有时限的分析状态与版本记录。
- 前端使用原生 HTML、CSS 和 ES Modules，无前端框架运行时。
- 模型编排将画像理解、独立方向规划与最终决策分开，并有超时、回退、结构校验和会话隔离。

## 在本地运行

需要 Node.js 22.13 或更高版本。

```powershell
npm install
npm run dev
```

打开 `http://127.0.0.1:8788`。本地运行会使用 Wrangler 的本地 D1；首次启动前可先执行：

```powershell
npm run db:local
```

不配置模型密钥也可以浏览首页和完整示例。需要运行真实分析时，在 `.dev.vars` 中提供 `OPENAI_API_KEY`；该文件已被 Git 忽略，不会进入仓库。

## 测试与构建

```powershell
npm test
npm run build
```

当前测试覆盖五个阶段的访谈分支、画像与方向协议、多模型编排、来源和边界校验、D1 会话隔离、并发锁以及旧版本迁移。

发布后可对线上首页、配置和全部静态资源做一次只读核验：

```powershell
npm run verify:live
```

这项核验不创建用户会话，也不调用模型。

## 发布到 Cloudflare

```powershell
npm run db:remote
npm run deploy
```

Worker 的自定义域名是 [`life.wolfx.top`](https://life.wolfx.top)。模型密钥只通过 Wrangler Secret 保存，不要写入 `wrangler.toml` 或任何可跟踪文件。

## 资料与隐私

回答、规划和行动笔记默认保存在用户的浏览器中。只有在用户明确同意后，当次回答才会发往模型服务进行分析。服务端临时记录用于保持版本一致与防止重复请求；页面会提醒用户不要填写姓名、联系方式、详细住址和资产信息。

## 项目结构

```text
public/       前端页面、组件、样式与示例内容
src/          Worker 入口、D1 访问与模型编排
migrations/   D1 数据库迁移
scripts/      构建、测试、预览、发布和线上核验
qa/           验收记录与只读部署报告
```

---

<p align="center"><sub>方向不是一次算出来的。它是在一次次真实体验中慢慢变清楚的。</sub></p>
