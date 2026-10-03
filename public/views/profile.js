import {stageOf,answerLabels} from '../domain/stages.js';
import {esc,icon,button,flow,notice} from '../components/ui.js';

const labels={...answerLabels,stage:'人生阶段',concern:'当前想解决的事'};
function answerSummary(a){
  return Object.entries(a)
    .filter(([key,value])=>!['experience','stage','interviewVersion','followup','correction','feedback'].includes(key)&&value!==undefined&&value!=='')
    .map(([key,value])=>`<div><dt>${esc(labels[key]||key)}</dt><dd>${esc(String(value))}${key==='hours'?' 小时 / 次':''}</dd></div>`).join('');
}
export function profileView(s,config){
  const p=s.profile,a=s.answers;
  if(!p)return flow(1)+`<section class="content-narrow">
    <p class="intro-label">${esc(stageOf(a.stage).title)} · 信息已收集</p>
    <h1>先把你的处境拼完整。</h1>
    <p class="lead">下面这些选择，帮助我们理解你现在是谁、身处什么环境，以及哪些路对你来说真的可行。</p>
    <div class="paper">
      <div class="heading-row"><div><h2>你刚刚确认的背景</h2><p class="fine">每一项都可以回去修改，选择不会给你贴标签。</p></div><span class="stamp">${icon('check')}已保存</span></div>
      <dl class="fact-list">${answerSummary(a)}</dl>
      <details class="answer-detail"><summary>查看系统收到的完整信息</summary><blockquote>${esc(a.experience||'目前没有补充文字，先从选择结果开始理解。')}</blockquote></details>
    </div>
    <div class="consent-box">
      <h2>准备好让 AI 读懂这些线索了吗？</h2>
      <p>我们会把你刚刚确认的选择和可选补充，发送到 ${esc(config.apiHost||'AI 服务')}，用于提取兴趣线索、现实边界和关键取舍。服务器会临时保留分析资料 24 小时，用于完成本次分析和避免重复请求。你的长期记录默认保存在当前浏览器。</p>
      <label class="check-label"><input type="checkbox" id="ai-consent" ${s.consent?'checked':''}>我同意本次资料用于 AI 画像分析</label>
      <p class="fine">你也可以先看本地预览；本地预览不会分析个人兴趣，也不会冒充 AI 结论。</p>
    </div>
    ${notice(s.error,true)}
    <div class="actions">${button('开始理解我','understand',false,!config.ready?'disabled':'')}${button('回去修改选择','edit-answers',true)}<button class="text-button" data-command="rules">先看一个基础预览</button></div>
  </section>`;
  const modelName=p.modelProvenance?.returned||p.modelProvenance?.requested||'已连接模型';
  return flow(1)+`<section class="content-narrow">
    <div class="heading-row"><div><p class="intro-label">${s.example?'真实 AI 案例 · 示例人物':'基于你的选择'} · 第 ${p.revision} 版画像</p><h1>这是 AI 目前对你的理解。</h1></div><span class="stamp">${icon('leaf')}可以随时纠正</span></div>
    <p class="lead">先看看这份理解是否贴近你，再决定要不要让它继续生成方向。</p>
    ${p.changes?notice(p.changes.explanation):''}
    <div class="insight-paper"><span class="tag">一句话理解</span><h2>${esc(p.insight.text)}</h2><details><summary>这句话来自哪些回答？</summary>${p.insight.sourceIds.map(id=>`<blockquote>${esc(a[id]||'')}</blockquote>`).join('')||'<p>这是一项待验证的综合判断。</p>'}</details></div>
    <details class="paper profile-facts"><summary>查看已确认的背景</summary><div class="heading-row"><div><h2>你的现实背景</h2><p class="fine">这些是你主动确认的事实，和 AI 的推断分开保存。</p></div><button class="text-button" data-command="edit-answers">修改选择</button></div><dl class="fact-list">${answerSummary(a)}</dl></details>
    <div class="hypotheses"><h2>可能值得继续验证的兴趣线索</h2><p class="fine">它们描述你愿意重复的过程，不是永久的性格或职业标签。</p>${p.interestHypotheses.map(h=>`<article class="hypothesis"><div class="hypothesis-head"><h3>${esc(h.taskPreference)}</h3><span class="tag">${s.confirmations[h.id]==='accepted'?'已确认':s.confirmations[h.id]==='rejected'?'已排除':'请你判断'}</span></div><p>${esc(h.why)}</p><details><summary>依据与验证方法</summary>${(h.quotes||[]).map(q=>`<blockquote>${esc(q)}</blockquote>`).join('')}<p><strong>可以怎样验证：</strong>${esc(h.verification)}</p>${h.counterEvidence?.length?`<p><strong>可能不成立的地方：</strong>${h.counterEvidence.map(esc).join('；')}</p>`:''}</details><div class="confirmation-options" role="group" aria-label="确认${esc(h.taskPreference)}"><button data-confirm="${h.id}" data-value="accepted" aria-pressed="${s.confirmations[h.id]==='accepted'}">${icon('check')} 这很像我</button><button data-confirm="${h.id}" data-value="rejected" aria-pressed="${s.confirmations[h.id]==='rejected'}">这不像我</button><button class="text-button" data-command="correct">${icon('edit')} 我想补充</button></div></article>`).join('')}</div>
    <section class="boundaries"><h2>再核对一次现实边界</h2><p class="fine">只有你确认过的条件，才会限制后面的建议。</p>${p.constraints.map(c=>`<label class="check-label"><input type="checkbox" data-constraint="${c.id}" ${s.constraints[c.id]?'checked':''}><span><b>${({hard:'暂时不能忽略',negotiable:'可以协商',unknown:'还没有核实'})[c.kind]}</b> ${esc(c.value)}</span></label>`).join('')||'<p>目前没有明确边界，建议从低成本、可回退的任务开始。</p>'}${p.criticalUnknowns?.length?`<details><summary>还有哪些信息可能改变建议？</summary>${p.criticalUnknowns.map(u=>`<p>${esc(u.impact)}<br><span class="muted">${esc(u.verifyBy)}</span></p>`).join('')}</details>`:''}</section>
    ${s.nextQuestion?`<section class="followup paper"><span class="tag">只补充一个关键问题</span><h2>${esc(s.nextQuestion.question)}</h2><p>${esc(s.nextQuestion.purpose)}</p><p class="fine">你的回答会影响：${esc(s.nextQuestion.affects)}</p>${s.nextQuestion.format==='choice'?`<div class="answers" role="group" aria-label="补充回答">${s.nextQuestion.options.map(o=>`<label class="answer-option"><input type="radio" name="followup-answer" value="${esc(o)}" ${s.followupDraft===o?'checked':''}><span class="radio-mark"></span><strong>${esc(o)}</strong>${icon('check','selected-icon')}</label>`).join('')}</div>`:`<label class="sr-only" for="followup">补充回答</label><textarea id="followup" data-draft="followup" class="text-input" rows="3" maxlength="1000">${esc(s.followupDraft||'')}</textarea>`}<div class="actions">${button('补充这条信息','followup',true)}<button class="text-button" data-command="dismiss-followup">现在还不知道</button></div></section>`:''}
    ${notice(s.error,true)}
    <p class="fine">你可以逐项确认、排除或纠正。拒绝一条线索，不代表系统会给你贴上相反标签。</p>
    <div class="actions">${button(s.example?'查看案例方向':'确认画像，看看方向','plan')}${button('重新选择背景','revise',true)}</div>
    <details class="meta-details"><summary>查看生成记录</summary><p>模型：${esc(modelName)}<br>生成时间：${p.modelProvenance?.generatedAt?esc(new Date(p.modelProvenance.generatedAt).toLocaleString('zh-CN')):'本次会话'}</p></details>
  </section>`;
}

