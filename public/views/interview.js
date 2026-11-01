import {contextQuestions,answerLabels,interviewReadiness,selectedValues} from '../domain/stages.js';
import {questionList,questionAnswer,needsQuestions} from '../domain/adaptive.js';
import {esc,icon,button} from '../components/ui.js';

function frame(s,body,actions,kind='question'){
 const aiReason=kind==='question'&&questionList(s)[s.index]?.source==='ai';
 return `<section class="interview-workspace" data-interview-panel="${kind}"><div class="interview-topbar"><a href="#/">返回首页</a><span>认识当下的你</span>${aiReason?'<button type="button" class="text-button" data-command="question-reason">提问依据</button>':s.sampleSession?'<button type="button" class="text-button" data-command="restore">示例 · 返回个人探索</button>':s.answers.experience?'<button type="button" class="text-button" data-command="view-background">查看背景</button>':'<span class="interview-saved">回答自动保存</span>'}</div><div class="interview-scroll" tabindex="0" aria-label="${kind==='review'?'个人情况核对':'当前问题内容'}">${body}</div><nav class="interview-controls" aria-label="答题操作">${actions}</nav></section>`;
}
function options(q,value,{context=false}={}){
 const selected=selectedValues(value),multiple=q.type==='multi',compact=q.options.every(o=>o.length<=18);
 return `<fieldset class="answer-fieldset"><legend class="sr-only">${esc(q.title)}</legend><div class="answers ${compact?'answers-compact':''} ${q.id==='stage'?'answers-stage':''}">${q.options.map((o,i)=>{const v=q.values?.[i]??o;return `<label class="answer-option"><input type="${multiple?'checkbox':'radio'}" name="${context?'context-'+q.id:'answer'}" ${context?'data-context-question="'+q.id+'"':''} aria-describedby="${context?'context-error':'form-error'}" value="${esc(v)}" ${selected.some(x=>String(x)===String(v))?'checked':''}><span class="radio-mark ${multiple?'checkbox-mark':''}"></span><span class="answer-copy"><strong>${esc(o)}</strong>${q.descriptions?`<small>${esc(q.descriptions[i])}</small>`:''}</span>${icon('check','selected-icon')}</label>`;}).join('')}</div></fieldset>`;
}
function questionHead(step,progress,q){return `<div class="question-meta"><span>${esc(step)}</span><span>${esc(progress)}</span></div><h1 id="question-title" tabindex="-1">${esc(q.title)}</h1><p class="question-hint">${esc(q.hint||'')}</p><p class="choice-instruction">${q.type==='multi'?'可多选，最多 '+q.max+' 项':'选一项'}${q.optional?' · 可跳过':''}</p>`;}
function controls(previous,status,next,errorId='form-error'){
 return `<p class="field-error" id="${errorId}" role="alert"></p><div class="control-row">${previous}<span id="selection-status" role="status" aria-live="polite">${status}</span>${next}</div>`;
}
export function interviewView(s,config={ready:true}){
 const qs=questionList(s),a=s.answers,aiCount=s.interviewSet?.questions.length||0;
 if(s.interviewBusy)return frame(s,`<div class="interview-message"><p class="intro-label">正在根据你的回答准备问题</p><h1 id="question-title" tabindex="-1">进一步了解你的经历</h1><p>已有回答已保存，无需重复填写。</p><div class="question-loading" role="status">正在准备个性化问题…</div></div>`,button('停止等待','cancel-questions',true),'waiting');
 if(needsQuestions(s))return frame(s,`<div class="interview-message"><p class="intro-label">基本情况已保存</p><h1 id="question-title" tabindex="-1">${config.ready?'接下来，深入了解你的经历':'继续梳理现实条件'}</h1><p>当前关注：${esc(a.concern)}。</p><p>${config.ready?'接下来的问题，将根据你的背景与经历生成。':'AI 暂时无法连接。可先完成背景梳理，再查查看基础预览。'}</p>${s.error?`<p class="notice error" role="alert">${esc(s.error)}</p>`:''}<button class="text-button" data-command="edit-background">查看已有回答</button></div>`,`${config.ready?button(s.error?'重新生成问题':'继续','generate-questions'):button('继续梳理背景','skip-questions')}${s.error&&config.ready?button('暂跳过个性化提问','skip-questions',true):''}`,'ready');
 if(s.index>=qs.length&&interviewReadiness(a).ready){
  if(Number.isInteger(s.contextIndex))return contextView(s);
  if(s.supplementOpen)return supplementView(s);
  return reviewView(s,config,qs);
 }
 const q=qs[Math.min(s.index,qs.length-1)],isNew=a.interviewVersion===3;
 const step=isNew?(q.source==='ai'?'深入了解':s.index<4?'基本情况':'现实条件'):'了解你的情况';
 const progress=isNew?(q.source==='ai'?`${s.index-3} / ${aiCount}`:s.index<4?`${s.index+1} / 4`:`${s.index-3-aiCount} / 3`):`${s.index+1} / ${qs.length}`;
 const body=`<section class="question-surface" data-question-id="${esc(q.id)}">${questionHead(step,progress,q)}<form id="interview-form">${options(q,questionAnswer(s,q))}</form></section>`;
 return frame(s,body,controls(`<button type="button" class="text-button" data-command="previous">${s.index===0?'返回':'上一题'}</button>`,q.type==='multi'?'已选 '+selectedValues(questionAnswer(s,q)).length+' 项':'选好后继续',`<button type="submit" form="interview-form" class="button">${a.stage&&s.index===qs.length-1?'核对情况':'下一题'}${icon('arrow')}</button>`));
}
function contextView(s){
 const extra=contextQuestions(s.answers),index=Math.min(Math.max(s.contextIndex,0),extra.length-1),q=extra[index];
 const body=`<section class="question-surface" data-question-id="context-${q.id}">${questionHead('补充背景 · 可选',`${index+1} / ${extra.length}`,q)}${options(q,s.answers[q.id],{context:true})}<button type="button" class="text-button" data-command="context-skip">暂时跳过</button></section>`;
 return frame(s,body,controls(button(index?'上一项':'返回核对',index?'context-previous':'context-close',true),`${index+1} / ${extra.length}`,button(index===extra.length-1?'完成补充':'下一项','context-next'),'context-error'),'context');
}
function supplementView(s){
 return frame(s,`<section class="question-surface"><p class="intro-label">补充说明 · 可选</p><h1 id="question-title" tabindex="-1">还有哪些情况值得补充？</h1><label for="profile-supplement">希望分析时一并考虑的事</label><p class="question-hint">前面的回答已保存；没有补充也可以继续。</p><textarea id="profile-supplement" class="text-input" rows="5" maxlength="1800" placeholder="比如：两周后有一场比赛，我已经和队友报名了。">${esc(s.answers.supplement||'')}</textarea></section>`,button('保存并返回','supplement-close'),'supplement');
}
function reviewView(s,config,qs){
 const a=s.answers,extra=contextQuestions(a),core=new Set(['stage','concern','field','boundary','hours']);
 const label=q=>selectedValues(questionAnswer(s,q)).map(v=>q.options[(q.values||q.options).findIndex(x=>String(x)===String(v))]||String(v)).join('；');
 const row=(q,i)=>`<div class="review-row"><dt>${esc(q.source==='ai'?q.title:answerLabels[q.id]||q.title)}</dt><dd><span>${esc(label(q)||'尚未填写')}</span><button type="button" class="text-button" data-answer-index="${i}" aria-label="修改：${esc(q.title)}">修改</button></dd></div>`;
 const body=`<section class="question-surface interview-review"><div class="question-meta"><span>回答已保存</span><span>核对与补充</span></div><h1 id="question-title" tabindex="-1">确认当前情况</h1><p class="question-hint">核对回答后生成建议；如有遗漏，可在下方补充。</p><dl class="review-facts">${qs.map((q,i)=>core.has(q.id)?row(q,i):'').join('')}</dl><details class="review-details"><summary>查看其他回答（${qs.filter(q=>!core.has(q.id)).length} 项）</summary><dl class="review-facts">${qs.map((q,i)=>!core.has(q.id)?row(q,i):'').join('')}</dl></details><div class="review-extras"><button type="button" class="text-button" data-command="context-start">补充背景<small>已补充 ${extra.filter(q=>selectedValues(a[q.id]).length).length} / ${extra.length} 项</small></button><button type="button" class="text-button" data-command="supplement-open">${a.supplement?'编辑补充说明':'补充说明（可选）'}</button></div>${s.error?`<p class="notice error" role="alert">${esc(s.error)}</p>`:''}${!config.ready?`<p class="notice" role="status">${config.checked===false?'正在连接 AI，回答已保存。':'AI 目前不可用，可以先查看基础预览。'}</p>`:''}</section>`;
 return frame(s,body,`${button('返回上一题','previous',true)}${config.ready?button('生成我的建议','finish-interview'):config.checked===false?button('正在连接…','finish-interview',false,'disabled'):button('查看基础预览','rules')}`,'review');
}
