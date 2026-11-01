import {answerText,interviewQuestions,validQuestionAnswer} from './stages.js';
const object=v=>{if(!v||Array.isArray(v)||typeof v!=='object')throw Error('个性化题目格式不正确。');return v;};
const label=(v,max=200)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw Error('个性化题目文字缺少内容或过长。');return v.trim();};
export function interviewBase(a){return Object.fromEntries(Object.entries(a).filter(([k])=>!['adaptive','followup','correction','feedback'].includes(k)&&!k.startsWith('ai_')));}
export function interviewSeed(a){return a.interviewVersion===3?Object.fromEntries(['stage','concern','field','currentSituation','experience','interviewVersion'].filter(k=>a[k]!==undefined).map(k=>[k,a[k]])):interviewBase(a);}
export const needsQuestions=s=>s.answers.interviewVersion===3&&s.index===4&&!s.interviewSet&&!s.skipQuestions;
export function cleanAdaptiveEnvelope(raw){
 object(raw);if(!/^[a-f0-9]{64}$/.test(raw.setId)||!/^[a-f0-9]{64}$/.test(raw.baseVersion))throw Error('个性化题目版本格式不正确。');
 object(raw.answers);const entries=Object.entries(raw.answers);if(entries.length>3)throw Error('个性化回答数量过长。');const answers={};
 for(const [id,values] of entries){if(!/^ai_[a-z0-9_]{1,24}$/.test(id)||!Array.isArray(values)||values.length<1||values.length>3||new Set(values).size!==values.length||values.some(v=>typeof v!=='string'||!/^[a-z][a-z0-9_]{0,30}$/.test(v)))throw Error('个性化选择答案格式不正确。');answers[id]=values.slice().sort();}
 return {setId:raw.setId,baseVersion:raw.baseVersion,answers};
}
export function validateAdaptiveQuestions(raw,a){
 object(raw);if(!Array.isArray(raw.questions)||raw.questions.length<2||raw.questions.length>3)throw Error('个性化访谈需要2至3道题。');
 const ids=new Set(),titles=new Set();const questions=raw.questions.map(q=>{
  object(q);if(!/^ai_[a-z0-9_]{1,24}$/.test(q.id)||ids.has(q.id))throw Error('个性化题目标识无效或重复。');ids.add(q.id);
  const title=label(q.title,160);if(titles.has(title)||interviewQuestions(a,true).some(x=>x.title===title))throw Error('个性化题目不能重复。');titles.add(title);
  if(!['single','multi'].includes(q.type))throw Error('个性化题型不正确。');
  if(!Array.isArray(q.options)||q.options.length<3||q.options.length>6)throw Error('每道题需要3至6个不同选项。');
  const optionIds=new Set(),labels=new Set();const options=q.options.map(o=>{object(o);if(!/^[a-z][a-z0-9_]{0,30}$/.test(o.id)||optionIds.has(o.id))throw Error('选项标识不正确或重复。');optionIds.add(o.id);const value=label(o.label,100);if(labels.has(value))throw Error('选项文字不能重复。');labels.add(value);return {id:o.id,label:value,exclusive:o.exclusive===true};});
  if(!options.some(o=>o.exclusive&&/不知道|尚未|不确定|没有足够|说不清|都不/.test(o.label)))throw Error('个性化题目需要互斥的不确定选项。');
  if(!Array.isArray(q.basedOn)||q.basedOn.length<1||q.basedOn.length>3)throw Error('提问缺少本次回答依据。');
  const basedOn=q.basedOn.map(b=>{object(b);const sourceId=label(b.sourceId,40),quote=label(b.quote,160);if(!Object.hasOwn(a,sourceId)||['adaptive','interviewVersion'].includes(sourceId)||!answerText(a[sourceId]).includes(quote)||quote.length<2)throw Error('提问依据不属于本次回答。');return {sourceId,quote};});
  const max=q.type==='single'?1:q.max;if(!Number.isInteger(max)||max<(q.type==='multi'?2:1)||max>3)throw Error('多选上限需要为2至3。');
  if(!a.experience&&/上次(?:实习|项目|工作)|你曾(?:实习|工作)|在你的(?:实习|项目)中/.test(title))throw Error('题目不能假定用户有未提供的经历。');
  return {id:q.id,title,type:q.type,max,options,basedOn,why:label(q.why,180),affects:label(q.affects,120)};
 });return {questions};
}
export function adaptiveQuestion(q){return {...q,source:'ai',theme:4,type:q.type==='multi'?'multi':'single',options:q.options.map(o=>o.label),values:q.options.map(o=>o.id),exclusive:q.options.filter(o=>o.exclusive).map(o=>o.id),hint:q.why};}
export function questionList(s){const base=interviewQuestions(s.answers,s.interviewDeep),ai=(s.interviewSet?.questions||[]).map(adaptiveQuestion);return s.answers.interviewVersion===3?[...base.slice(0,4),...ai,...base.slice(4)]:[...base,...ai];}
export function questionAnswer(s,q){return q.source==='ai'?s.answers.adaptive?.answers?.[q.id]:s.answers[q.id];}
export function adaptiveEvidence(set,envelope){
 if(envelope.setId!==set.id||envelope.baseVersion!==set.baseVersion)throw Error('个性化题目版本已经变化，请重新生成。');
 if(Object.keys(envelope.answers).length!==set.questions.length)throw Error('请先完成每道个性化选择题。');
 const evidence={};for(const item of set.questions){const q=adaptiveQuestion(item),values=envelope.answers[q.id];if(!validQuestionAnswer(q,q.type==='multi'?values:values?.length===1?values[0]:undefined))throw Error('个性化选择答案不属于本次题目。');evidence[q.id]=item.title+' 回答：'+values.map(id=>item.options.find(o=>o.id===id).label).join('；');}return evidence;
}
