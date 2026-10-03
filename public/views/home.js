import {icon,button,terrain,notice} from '../components/ui.js';
export function homeView(s,config){
  return `<section class="hero">
    <div class="hero-copy">
      <p class="intro-label"><span class="live-dot"></span>人生坐标 · 从认识自己开始</p>
      <h1>先看见自己的处境，<br>再找到下一步。</h1>
      <p class="hero-description">用几道有价值的选择题，告诉我们你现在是谁、<br>身处哪里、在意什么，以及哪些路真的走得通。</p>
      <div class="actions">${button('开始认识自己','start')}<button class="text-button" data-command="example">看一个完整案例 ${icon('book')}</button></div>
      <p class="fine">${icon('shield')}不用注册，也不用先想好答案；每一步都可以回去修改</p>
      ${s.answers.interviewVersion===1||s.answers.stage?'<button class="resume" data-command="resume">继续上次的探索 '+icon('arrow')+'</button>':''}
    </div>
    <div class="hero-atlas" aria-label="从背景选择到方向行动的产品示意">
      <div class="atlas-caption">你的人生地形册 <span>从线索到行动</span></div>
      <svg class="hero-connections" viewBox="0 0 600 500" aria-hidden="true"><path d="M85 360C160 300 250 340 292 230S410 200 488 130"/><path d="M292 230C315 320 418 380 468 390"/><circle cx="85" cy="360" r="6"/></svg>
      <div class="land land-one">${terrain('sage')}<div class="land-caption"><span>先确认你的处境</span><strong>你现在站在哪里</strong></div></div>
      <div class="land land-two">${terrain('mint')}<div class="land-caption"><span>再理解你的偏好</span><strong>哪些过程值得继续</strong></div></div>
      <div class="land land-three">${terrain('gold')}<div class="land-caption"><span>最后走出一小步</span><strong>让体验帮你判断</strong></div></div>
      <span class="origin">从现在开始</span><span class="map-key">${icon('branch')}每条路，都可以重新选择</span>
    </div>
  </section>
  ${config.checked&&!config.ready?notice('AI 分析暂时无法连接。你仍然可以开始回答，内容会自动保存，稍后再继续分析。'):''}
  <section class="promise"><div>${icon('edit')}<h3>先听懂你，再给建议</h3><p>选择会组成你的现实背景，AI 只在信息足够时开始理解。</p></div><div>${icon('branch')}<h3>把可能和代价放在一起</h3><p>家庭、城市、时间和收入边界，都会进入方向比较。</p></div><div>${icon('flag')}<h3>从一件小事验证方向</h3><p>最后留下一个这周就能开始、做完能得到反馈的行动。</p></div></section>`;
}
