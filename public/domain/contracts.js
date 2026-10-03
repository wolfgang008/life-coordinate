import {stages,interviewQuestions,interviewReadiness} from './stages.js';
export const schemaVersion=5;
export function text(v,max=600,empty=false){if(typeof v!=='string'||v.length>max||(!empty&&!v.trim()))throw Error('文字字段缺少内容或过长。');return v.trim();}
const obj=v=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('对象格式不正确。');return v;};
export function array(v,max=8,min=0){if(!Array.isArray(v)||v.length>max||v.length<min)throw Error('数组长度不符合协议。');return v;}
export const strings=(v,max=8,len=600)=>array(v,max).map(x=>text(x,len));
const id=v=>{text(v,40);if(!/^[a-z][a-z0-9_-]*$/.test(v)||['constructor','prototype','__proto__'].includes(v))throw Error('标识格式不正确。');return v;};
function unique(items){if(new Set(items.map(x=>x.id)).size!==items.length)throw Error('标识不能重复。');return items;}
export function cleanAnswers(raw){obj(raw);if(!stages.some(s=>s.id===raw.stage))throw Error('阶段格式不正确。');const out={stage:raw.stage};
  for(const [k,max] of Object.entries({concern:180,field:100,education:100,schoolPlan:120,city:100,currentSituation:160,internship:160,offer:160,research:160,experienceType:100,task:160,feedbackType:120,familyContext:120,familyBinding:160,mobility:120,support:160,runway:120,academic:160,resources:160,experience:1800,process:600,boundary:600,income:120,priority:180,decisionStyle:120,followup:1000,correction:1000,feedback:2400}))if(raw[k]!==undefined)out[k]=text(raw[k],max,true);
  text(out.concern,180);text(out.priority,180);
  if(![1,2,5,10].includes(raw.hours))throw Error('可投入时间格式不正确。');out.hours=raw.hours;
  if(!['school','early'].includes(out.stage))text(out.income,120);
  if(raw.interviewVersion!==undefined){
    if(raw.interviewVersion!==1)throw Error('访谈版本格式不正确。');out.interviewVersion=1;
    const visible=new Set(interviewQuestions(out,true).map(q=>q.id));
    for(const key of ['schoolPlan','internship','offer','research','support','income','familyBinding','runway'])if(!visible.has(key))delete out[key];
    for(const q of interviewQuestions(out,true))if(out[q.id]!==undefined&&(q.values||q.options)&&!(q.values||q.options).some(v=>String(v)===String(out[q.id])))throw Error('选择答案不属于当前选项。');
    if(!interviewReadiness(out).ready)throw Error('还需要确认关键背景，请返回补全选择。');
  }else text(out.experience,1800);
  return out;
}
export function answerSources(a){return Object.entries(a).map(([id,value])=>({id,value:String(value)}));}
export function applyInterestConfirmations(profile,confirmations){
  const copy=structuredClone(profile);if(confirmations===undefined)return copy;obj(confirmations);
  const ids=new Set(copy.interestHypotheses.map(h=>h.id));
  for(const [key,value] of Object.entries(confirmations)){
    if(!ids.has(key)||!['accepted','rejected'].includes(value))throw Error('兴趣确认不属于当前画像或格式不正确。');
    copy.interestHypotheses.find(h=>h.id===key).confirmation=value;
  }
  return copy;
}
function refs(v,allowed,min=1){const r=strings(v,8,40);if(r.length<min||r.some(x=>!allowed.includes(x)))throw Error('来源引用不属于本次输入。');return [...new Set(r)];}
export function validateProfile(raw,a){obj(raw);const allowed=Object.keys(a),source=answerSources(a);
  const hypotheses=unique(array(raw.interestHypotheses,3,1).map(h=>{obj(h);const sourceIds=refs(h.sourceIds,allowed);const rawQuotes=strings(h.quotes||[],3,220);const normalize=v=>String(v||'').replace(/[\s，。！？、；：”“‘’「」,.!?;:'"()（）]/g,'').toLowerCase();const validQuotes=rawQuotes.filter(q=>sourceIds.some(src=>normalize(String(a[src])).includes(normalize(q))&&normalize(q).length>=6));const fallbackQuotes=sourceIds.map(src=>String(a[src]||'').trim()).filter(Boolean).flatMap(v=>v.split(/[。！？!?]/).map(x=>x.trim()).filter(Boolean)).slice(0,3);const quotes=validQuotes.length?validQuotes:fallbackQuotes;if(!quotes.length)throw Error('兴趣依据缺少可追溯回答。');if(!['low','medium','high'].includes(h.confidence))throw Error('兴趣置信度格式不正确。');return {id:id(h.id),taskPreference:text(h.taskPreference,100),why:text(h.why,240),sourceIds,quotes,counterEvidence:strings(h.counterEvidence||[],2,180),confidence:h.confidence,verification:text(h.verification,200),confirmation:'pending'};}));
  const insight=obj(raw.insight);const constraints=unique(array(raw.constraints,5).map(c=>{obj(c);if(!['hard','negotiable','unknown'].includes(c.kind))throw Error('边界类型格式不正确。');const sourceIds=refs(c.sourceIds,allowed);if(c.kind==='hard'&&!sourceIds.some(s=>['boundary','income','hours','support'].includes(s)||s==='familyBinding'&&a.familyBinding==='有照护责任，暂时确实不能离开'))throw Error('硬边界只能来自用户明确的现实回答。');return {id:id(c.id),kind:c.kind,value:text(c.value,220),sourceIds,confirmed:false};}));
  const abilityEvidence=unique(array(raw.abilityEvidence,3).map(e=>({id:id(e.id),claim:text(e.claim,220),sourceIds:refs(e.sourceIds,allowed)})));
  return {schemaVersion,stage:a.stage,concern:a.concern,facts:source.map(s=>({id:s.id,value:s.value,sourceIds:[s.id]})),interestHypotheses:hypotheses,abilityEvidence,priorities:strings(raw.priorities,3,100),constraints,insight:{text:text(insight.text,260),sourceIds:refs(insight.sourceIds,allowed)},coreConflict:raw.coreConflict===null?null:text(raw.coreConflict,260),criticalUnknowns:unique(array(raw.criticalUnknowns,3).map(u=>({id:id(u.id),impact:text(u.impact,220),verifyBy:text(u.verifyBy,200)})))};
}
export function validateFollowup(raw){if(raw===null||raw===undefined)return null;obj(raw);const question={question:text(raw.question,220),purpose:text(raw.purpose,200),affects:text(raw.affects,100),sourceType:'ai'};if(raw.options!==undefined){const options=strings(raw.options,6,120);if(options.length<3||new Set(options).size!==options.length)throw Error('追问选择需包含至少三个不同选项。');if(!options.some(o=>/不知道|说不清|尚未确定|不确定|未核实/.test(o))){if(options.length>=6)throw Error('追问需要保留尚未确定的选项。');options.push('目前还不知道');}return {...question,format:'choice',options};}return {...question,format:'text'};}
export function validateDirection(raw,p,a,evidence){obj(raw);const sourceIds=Object.keys(a),hypotheses=p.interestHypotheses.filter(h=>h.confirmation==='accepted').map(h=>h.id),cids=p.constraints.map(c=>c.id),eids=evidence.map(e=>e.id);
  const fallbackSource=p.insight?.sourceIds?.filter(x=>sourceIds.includes(x))||[];const sourceText=p.insight?.text||'基于已确认画像，先用真实任务验证。';
  const prepared={...raw,routes:Array.isArray(raw.routes)?raw.routes.map(r=>{const action=r?.action||{};return {...r,personalSourceIds:Array.isArray(r?.personalSourceIds)&&r.personalSourceIds.length?r.personalSourceIds:fallbackSource,interestHypothesisIds:Array.isArray(r?.interestHypothesisIds)?r.interestHypothesisIds:[],learningFocus:Array.isArray(r?.learningFocus)&&r.learningFocus.length?r.learningFocus:['核对一个真实学习任务'],claimRefs:Array.isArray(r?.claimRefs)?r.claimRefs:[],requirements:Array.isArray(r?.requirements)?r.requirements:[],whyNow:r?.whyNow||sourceText,mainRisk:r?.mainRisk||'仍需通过真实体验核对。',reconsiderWhen:r?.reconsiderWhen||'收到新体验或现实条件变化时。',action:{...action,materialRefs:Array.isArray(action.materialRefs)?action.materialRefs:[],verifiesHypothesisIds:Array.isArray(action.verifiesHypothesisIds)?action.verifiesHypothesisIds:[],steps:Array.isArray(action.steps)&&action.steps.length>=2?action.steps:['完成一次小规模体验。','记录投入、困难与反馈。'],completion:action.completion||'留下可检查的成果和一条具体反馈。',reflection:Array.isArray(action.reflection)?action.reflection:['最愿意继续哪部分？','哪里卡住？','愿不愿再次尝试？'],effortHours:Number.isFinite(action.effortHours)&&action.effortHours>0?action.effortHours:Math.min(a.hours,1)}}}):raw.routes};
  const routes=unique(array(prepared.routes,3,1).map(r=>{obj(r);id(r.id);if(!['recommended','alternative','conditional'].includes(r.state))throw Error('路线状态格式不正确。');const action=obj(r.action),effort=action.effortHours;
    if(!Number.isFinite(effort)||effort<=0||effort>a.hours)throw Error('第一行动超过已确认的时间预算。');
    const interestHypothesisIds=refs(r.interestHypothesisIds,hypotheses,0),verifiedIds=refs(action.verifiesHypothesisIds,hypotheses,0);
    if(verifiedIds.some(x=>!interestHypothesisIds.includes(x)))throw Error('行动引用的兴趣不属于本路线。');
    const requirements=array(r.requirements||[],5).map(c=>{obj(c);if(!cids.includes(c.constraintId))throw Error('条件引用不属于画像。');const constraint=p.constraints.find(x=>x.id===c.constraintId);return {constraintId:c.constraintId,expected:text(c.expected,180),verified:constraint.confirmed&&c.verified===true};});
    if(requirements.some(c=>!c.verified)&&r.state==='recommended')throw Error('主方向不能要求尚未满足的条件。');
    const claimRefs=array(r.claimRefs,4).map(c=>{obj(c);const entry=evidence.find(e=>e.id===c.evidenceId);if(!entry||!entry.excerpts.some(e=>e.id===c.excerptId)||entry.status!=='verified')throw Error('外部事实引用无效。');return {claim:text(c.claim,240),evidenceId:entry.id,excerptId:c.excerptId};});
    const materialRefs=refs(action.materialRefs,eids,0);
    const result={id:r.id,title:text(r.title,80),state:r.state,whyNow:text(r.whyNow,360),personalSourceIds:refs(r.personalSourceIds,sourceIds,0),interestHypothesisIds,learningFocus:strings(r.learningFocus,4,140),mainRisk:text(r.mainRisk,260),reconsiderWhen:text(r.reconsiderWhen,200),claimRefs,requirements,action:{verifiesHypothesisIds:verifiedIds,title:text(action.title||'完成一次小规模验证',140),materialRefs,effortHours:effort,steps:strings(action.steps,4,220),completion:text(action.completion,260),reflection:strings(action.reflection,3,140)}};
    if(result.action.steps.length<2)throw Error('行动至少包含两项具体步骤。');
    const meaning=[result.title,result.whyNow,...result.action.steps].join(' ');
    if(/保证录取|必然录取|保证录用|录取率|年薪|月薪|正在招聘/.test(meaning))throw Error('不得编造资格、概率或收入结论。');
    if(['school','early'].includes(a.stage)&&/全职备考|求职投递|连续实习|寻找岗位/.test(meaning))throw Error('早期阶段不能套用毕业求职任务。');
    if((a.income==='需要保持或尽快获得收入'||a.income==='已有稳定收入，探索需要兼顾工作'||/不能脱产/.test(a.boundary||''))&&r.state!=='conditional'&&/全职备考|脱产备考|辞职备考|辞职转行/.test(meaning))throw Error('方向违反收入边界。');
    if(/不能.{0,8}(外地|搬)|只能.{0,8}(本地|留)/.test(a.boundary||'')&&r.state!=='conditional'&&/搬去|迁居|异地全职|去外地工作/.test(meaning))throw Error('方向违反地域边界。');
    if(a.familyBinding==='有照护责任，暂时确实不能离开'&&r.state!=='conditional'&&/搬去|迁居|异地全职|去外地工作/.test(meaning))throw Error('方向违反已确认的照护与地域边界。');
    return result;
  }));
  if(new Set(routes.map(r=>r.title.replace(/\s/g,''))).size!==routes.length)throw Error('路线名称不能重复。');
  if(routes.filter(r=>r.state==='recommended').length!==1||!routes.some(r=>r.id===raw.primaryRouteId&&r.state==='recommended'))throw Error('只能有一个有效主方向。');
  const insight=obj(prepared.coreInsight||{text:sourceText,personalSourceIds:fallbackSource}),leverage=obj(prepared.leverage||{text:'完成第一行动并记录反馈。',affectsRouteIds:[]});
  const scenarios=unique(array(prepared.scenarios||[],2).map(s=>{obj(s);const patch=obj(s.conditionPatch);const entries=Object.entries(patch);if(!entries.length||entries.length>1||entries.some(([k,v])=>!cids.includes(k)||typeof v!=='boolean'))throw Error('情景只能改变一个已知条件。');return {id:id(s.id),label:text(s.label||'一个条件发生变化',120),conditionPatch:patch,affectedRouteIds:refs(s.affectedRouteIds,routes.map(r=>r.id)),changes:strings(s.changes||['这个条件变化会影响路线的现实可行性。'],3,180),remainingRequirements:strings(s.remainingRequirements||[],5,180)};}));
  const dissent=raw.criticalDissent&&String(raw.criticalDissent.text||'').trim()?{text:text(raw.criticalDissent.text,300),changesDecision:raw.criticalDissent.changesDecision===true}:null;
  const primaryRouteId=routes.some(r=>r.id===prepared.primaryRouteId)?prepared.primaryRouteId:routes.find(r=>r.state==='recommended')?.id||routes[0].id;
  const leverageIds=Array.isArray(leverage.affectsRouteIds)&&leverage.affectsRouteIds.length?leverage.affectsRouteIds:[primaryRouteId];
  return {schemaVersion,profileRevision:p.revision,evidenceVersion:'learning-20261003',mode:'live',primaryRouteId,coreInsight:{text:text(insight.text||sourceText,360),personalSourceIds:refs(insight.personalSourceIds||fallbackSource,sourceIds,0)},keyTradeoff:text(prepared.keyTradeoff||'当前条件与长期方向仍需通过真实体验核对。',260),leverage:{text:text(leverage.text||'完成第一行动并记录反馈。',260),affectsRouteIds:refs(leverageIds,routes.map(r=>r.id))},routes,criticalDissent:dissent,scenarios};
}
export function previewScenario(plan,scenario){const copy=structuredClone(plan);for(const r of copy.routes){if(!scenario.affectedRouteIds.includes(r.id))continue;r.requirements=r.requirements.map(c=>({...c,verified:scenario.conditionPatch[c.constraintId]??c.verified}));if(r.state==='conditional'&&r.requirements.every(c=>c.verified))r.state='alternative';}copy.mode='preview';return copy;}
