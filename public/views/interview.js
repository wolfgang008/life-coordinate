import {interviewQuestions,stageOf,themes,interviewReadiness} from '../domain/stages.js';
import {esc,icon,button,flow} from '../components/ui.js';

function answeredCount(qs,answers){return qs.filter(q=>answers[q.id]!==undefined&&answers[q.id]!=='').length;}
export function interviewView(s){
  const qs=interviewQuestions(s.answers,s.interviewDeep),q=qs[Math.min(s.index,qs.length-1)],a=s.answers;
  if(s.index>=qs.length&&interviewReadiness(a).ready)return flow(0)+`<section class="content-narrow interview-ready"><span class="stamp">${icon('check')}关键背景已确认</span><h1>已经可以开始，看看你的方向。</h1><p class="lead">你确认了学习状态、经历线索和现实条件。接下来，AI 会把这些回答放在一起理解，再由你核对画像。</p><div class="paper"><h2>这次，我们会重点帮你理清</h2><p>${esc(a.concern)}</p><p class="fine">建议会考虑你的家庭期待、地域、资源和时间。暂时说不清的部分，会保留为待验证线索。</p></div><div class="actions">${button('先看看我的画像','finish-interview')}${!s.interviewDeep?button('再补充两项背景','deepen',true):''}${button('返回修改','previous',true)}</div><details><summary>想补充一件具体经历？（可选）</summary><label for="experience-detail">一至三句话就够了：做了什么，哪一部分让你愿意继续？</label><textarea id="experience-detail" class="text-input" rows="3" maxlength="600" placeholder="没有想补充的，也可以直接继续。">${esc(a.experience||'')}</textarea><p class="fine">请避开姓名、联系方式和详细住址。</p></details></section>`;
  const count=answeredCount(qs,a),choice=q.type!=='text';
  return flow(0)+`<div class="interview-layout">
    <aside class="journey-sidebar">
      <span class="stage-label">${icon('compass')}${esc(a.stage?stageOf(a.stage).title:'从认识你开始')}</span>
      <h2>先从你的现实开始。</h2>
      <p>我们会用几道选择题，慢慢拼出一张属于你的方向地图。</p>
      <ol class="theme-list">${themes.map((t,i)=>`<li ${i===q.theme?'aria-current="step"':''} class="${i<q.theme?'done':''}"><span>${i<q.theme?icon('check'):i+1}</span>${t}</li>`).join('')}</ol>
      <div class="side-note">${icon('leaf')}<p>选择会自动保存。<br>你可以随时返回修改。</p></div>
    </aside>
    <section class="question-surface">
      <div class="question-meta"><span>${themes[q.theme]}</span><span>${choice?'选择最接近你的一项':'可选补充'} · 已完成 ${count} 项</span></div>
      <h1>${q.title}</h1><p class="lead">${q.hint}</p>
      <form id="interview-form"><div class="answers">
        ${q.type==='text'?`<label class="sr-only" for="answer">${q.title}</label><textarea id="answer" name="answer" class="text-input story-input" rows="5" maxlength="${q.limit}" placeholder="${esc(q.placeholder)}">${esc(a[q.id]||'')}</textarea><p class="input-count"><span>不写也可以，先用前面的选择继续。</span><span id="char-count">${(a[q.id]||'').length} / ${q.limit}</span></p>`:q.options.map((o,i)=>`<label class="answer-option"><input type="radio" name="answer" value="${esc(q.values?q.values[i]:o)}" ${String(a[q.id])===String(q.values?q.values[i]:o)?'checked':''}><span class="radio-mark"></span><span class="answer-copy"><strong>${esc(o)}</strong>${q.descriptions?`<small>${esc(q.descriptions[i])}</small>`:''}</span>${icon('check','selected-icon')}</label>`).join('')}
      </div><p class="field-error" id="form-error" role="alert"></p>
      <div class="question-actions"><button type="button" class="text-button" data-command="previous">${s.index===0?'返回首页':'上一题'}</button><div>${q.optional?'<button type="button" class="text-button" data-command="skip">跳过补充</button>':''}<button type="submit" class="button">${a.stage&&s.index===qs.length-1?'查看我的信息':'继续'}${icon('arrow')}</button></div></div></form>
    </section>
  </div>`;
}
