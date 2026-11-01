import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {localHarness,readEvents} from './lib/local-harness.mjs';
import {sampleInput} from '../public/domain/stages.js';
import {officialBase} from '../src/ai.mjs';
import {validateDirection} from '../public/domain/contracts.js';
if(process.env.ENABLE_LIVE_AI!=='1')throw Error('真实付费验证需显式设置 ENABLE_LIVE_AI=1。');
const privateConfig=JSON.parse(await readFile(new URL('../.local/deepseek.json',import.meta.url),'utf8'));
const env={API_KEY:process.env.API_KEY||privateConfig.apiKey,API_BASE:officialBase(privateConfig.apiBase)};
const output=new URL('../qa/live/',import.meta.url);await mkdir(output,{recursive:true});
const report={checkedAt:new Date().toISOString(),fictitious:true,productionTouched:false,requests:[],cases:[]};
const started=Date.now(),nativeFetch=globalThis.fetch;let currentCase='',phase='';
globalThis.fetch=async(url,init)=>{
 if(url!=='https://api.deepseek.com/chat/completions'||report.requests.length>=30)throw Error('Live request boundary');
 const b=JSON.parse(init.body),record={case:currentCase,phase,requested:b.model,startedAt:new Date().toISOString()};report.requests.push(record);const time=Date.now();
 try{const r=await nativeFetch(url,init);record.httpStatus=r.status;
  if(r.ok){const data=await r.clone().json();record.returned=data.model;record.finishReason=data.choices?.[0]?.finish_reason;record.usage=data.usage;
   const input=JSON.parse(b.messages[1].content);if(input.personalModel){try{validateDirection(JSON.parse(data.choices?.[0]?.message?.content),input.personalModel,input.answers,input.evidence);}catch(e){record.validationIssue=e.message;await writeFile(new URL(currentCase+'-diagnostic-'+report.requests.length+'.json',output),JSON.stringify({input,content:data.choices?.[0]?.message?.content},null,2));}}
  }
  record.durationMs=Date.now()-time;console.log(JSON.stringify(record));return r;
 }catch{record.durationMs=Date.now()-time;record.transportFailed=true;console.log(JSON.stringify(record));throw Error('Official API connection failed');}
};
const last=async response=>{const events=await readEvents(response),e=events.at(-1);for(const event of events.filter(x=>x.status==='failed')){report.cases.at(-1)?.steps.push({phase:event.phase,provider:event.provider,validationIssue:event.publicSummary});}if(e.type==='error'){const err=Error(e.message);err.code=e.code;throw err;}return e;};
async function profile(h,a,previous=null,review=false){
 phase=review?'review':'profile';let result=await last(await h.request(review?'/api/review':'/api/profile/analyze',{answers:a,aiConsent:true,requestId:crypto.randomUUID(),...(previous?{previousProfileId:previous.id,confirmations:Object.fromEntries(previous.interestHypotheses.map(x=>[x.id,'accepted']))}:{})}));
 for(let i=0;result.nextQuestion&&i<2;i++){
  phase='followup';a={...a,followup:i===0?'目前还不知道':'目前还不知道，仍需通过下一次真实体验核实。'};
  result=await last(await h.request('/api/profile/analyze',{answers:a,previousProfileId:result.profile.id,aiConsent:true,requestId:crypto.randomUUID()}));
 }
 assert(!result.nextQuestion);return {answers:a,profile:result.profile};
}
async function plan(h,p){
 phase='confirm';const confirmed=await h.request('/api/profile/confirm',{profileId:p.id,revision:p.revision,answerVersion:p.answerVersion,confirmations:Object.fromEntries(p.interestHypotheses.map(x=>[x.id,'accepted'])),constraintConfirmations:Object.fromEntries(p.constraints.map(x=>[x.id,true]))});assert.equal(confirmed.status,200);
 phase='direction';const result=await last(await h.request('/api/direction',{profileId:p.id,revision:p.revision,answerVersion:p.answerVersion,aiConsent:true,requestId:crypto.randomUUID()}));assert.equal(result.plan.committee.length,2);assert.deepEqual(result.plan.committee.map(x=>x.model),['deepseek-flash','deepseek-v4-pro']);assert.equal(result.plan.decision.model,'deepseek-v4-pro');assert.equal(result.plan.profileRevision,p.revision);return result.plan;
}
let fatal=false;
try{
 const cases=[['senior',sampleInput()],['early_nontechnical',{stage:'early',concern:'想探索专业学习与表达方向',field:'人文与社会',education:'本科在读',city:'西安',experience:'大一，组织读书分享时我最喜欢整理同学的不同观点，再写成一篇短文。反复调整海报颜色让我疲惫，追问为什么却愿意继续。',process:'追问原因、归纳观点、清楚表达',hours:1,boundary:'课程紧，先做免费、低成本且不影响课程的小体验。',priority:'比较学习与实践方向'}]];
 for(const [name,answers] of cases.filter(([name])=>!process.env.LIVE_CASE||name===process.env.LIVE_CASE)){
  currentCase=name;const h=await localHarness(env),entry={case:name,status:'running',steps:[]},caseStart=Date.now();report.cases.push(entry);
  try{
   const u=await profile(h,answers);entry.steps.push({phase:'profile',revision:u.profile.revision});await writeFile(new URL(name+'-profile-checkpoint.json',output),JSON.stringify(u,null,2));const p=await plan(h,u.profile);entry.steps.push({phase:'plan',metrics:p.metrics,routeTitles:p.routes.map(r=>r.title)});
   const artifact={answers:u.answers,profile:u.profile,plan:p,fictitious:true,notice:'本地官方 API 验证的虚构资料；未更新公开历史案例。'};
   await writeFile(new URL(name+'-deepseek-result.json',output),JSON.stringify(artifact,null,2));
   if(name==='senior'){
    const selected=p.routes.find(r=>r.id===p.primaryRouteId),feedback='虚构验收反馈：尝试了「'+selected.action.title+'」，喜欢归纳信息并解释选择理由，查找资料时容易分心；愿意再尝试，但希望缩小任务。';
    entry.steps.push({phase:'action',title:selected.action.title,feedbackRecorded:true});const reviewed=await profile(h,{...u.answers,feedback},u.profile,true);const newer=await plan(h,reviewed.profile);assert(reviewed.profile.revision>u.profile.revision);
    artifact.review={answers:reviewed.answers,profile:reviewed.profile,plan:newer};entry.steps.push({phase:'review-plan',revision:reviewed.profile.revision,metrics:newer.metrics});await writeFile(new URL(name+'-deepseek-result.json',output),JSON.stringify(artifact,null,2));
   }
   entry.status='passed';
  }catch(e){entry.status='failed';entry.code=e.code||'local_validation';entry.message=e.code?e.message:'真实联调未通过，请查看脱敏阶段记录。';if(['auth','balance','parameter','config'].includes(e.code))fatal=true;process.exitCode=1;}
  finally{entry.durationMs=Date.now()-caseStart;await h.close();console.log(JSON.stringify({case:name,status:entry.status,code:entry.code,durationMs:entry.durationMs}));}
  if(fatal)break;
 }
}finally{
 globalThis.fetch=nativeFetch;report.durationMs=Date.now()-started;
 report.totals=report.requests.reduce((a,r)=>{a.input+=r.usage?.prompt_tokens||0;a.output+=r.usage?.completion_tokens||0;return a;},{input:0,output:0});
 // Verified official 2026-10-31 weekend/off-peak CNY per million tokens. Estimate only.
 report.estimatedCNY=report.requests.reduce((sum,r)=>{const price=r.requested==='deepseek-flash'?[0.02,1,4]:[0.15,4.5,13.5],u=r.usage||{},hit=u.prompt_cache_hit_tokens||0,miss=u.prompt_cache_miss_tokens??Math.max(0,(u.prompt_tokens||0)-hit);return sum+(hit*price[0]+miss*price[1]+(u.completion_tokens||0)*price[2])/1e6;},0);
 report.priceBasis='2026-10-31 周末空闲时段，人民币估算；实际扣款以官方账单为准。https://api-docs.deepseek.com/zh-cn/quick_start/pricing/';
 await writeFile(new URL('deepseek-summary.json',output),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.cases.every(c=>c.status==='passed')?'passed':'failed',requests:report.requests.length,totals:report.totals,estimatedCNY:report.estimatedCNY}));
}
