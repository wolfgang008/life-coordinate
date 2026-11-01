// Authorized local verification only: fictitious answers, in-memory database, no deployment.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {localHarness,readEvents} from './lib/local-harness.mjs';
import {sampleChoiceInput} from '../public/domain/stages.js';
import {validateAdaptiveQuestions,adaptiveEvidence} from '../public/domain/adaptive.js';
import {officialBase} from '../src/ai.mjs';
if(process.env.ENABLE_LIVE_AI!=='1')throw Error('真实付费验证需显式启用 ENABLE_LIVE_AI=1。');
const privateConfig=JSON.parse(await readFile(new URL('../.local/deepseek.json',import.meta.url),'utf8'));
const env={API_KEY:process.env.API_KEY||privateConfig.apiKey,API_BASE:officialBase(privateConfig.apiBase)};
const output=new URL('../qa/live/adaptive-interview/',import.meta.url);await mkdir(output,{recursive:true});
const report={checkedAt:new Date().toISOString(),fictitious:true,productionTouched:false,requests:[],cases:[]},nativeFetch=globalThis.fetch;let caseName='',phase='';
globalThis.fetch=async(url,init)=>{
 if(url!=='https://api.deepseek.com/chat/completions'||report.requests.length>=26)throw Error('Local live verification boundary');
 const b=JSON.parse(init.body),record={case:caseName,phase,requested:b.model,startedAt:new Date().toISOString()},time=Date.now();report.requests.push(record);
 try{const r=await nativeFetch(url,init);record.httpStatus=r.status;if(r.ok){const d=await r.clone().json();record.returned=d.model;record.finishReason=d.choices?.[0]?.finish_reason;record.usage=d.usage;}record.durationMs=Date.now()-time;console.log(JSON.stringify(record));return r;}
 catch{record.durationMs=Date.now()-time;record.transportFailed=true;throw Error('Official API connection failed');}
};
const last=async response=>{const events=await readEvents(response),e=events.at(-1);for(const event of events.filter(x=>x.status==='failed'))report.cases.at(-1).issues.push({phase:event.phase,message:event.publicSummary});if(e.type==='error'){const err=Error(e.message);err.code=e.code;throw err;}return e;};
const body=answers=>({answers,aiConsent:true,requestId:crypto.randomUUID()});
async function understand(h,answers,previous=null,review=false){
 phase=review?'review':'profile';let result=await last(await h.request(review?'/api/review':'/api/profile/analyze',{...body(answers),...(previous?{previousProfileId:previous.id,confirmations:Object.fromEntries(previous.interestHypotheses.map(x=>[x.id,'accepted']))}:{})}));
 if(result.nextQuestion){phase='followup';answers={...answers,followup:'目前还不知道，需要一次低成本体验才能进一步判断。'};result=await last(await h.request('/api/profile/analyze',{...body(answers),previousProfileId:result.profile.id}));}
 assert(!result.nextQuestion);assert(result.profile.followupRound<=2);return {answers,profile:result.profile};
}
async function plan(h,p){
 phase='confirm';const confirmed=await h.request('/api/profile/confirm',{profileId:p.id,revision:p.revision,answerVersion:p.answerVersion,confirmations:Object.fromEntries(p.interestHypotheses.map(x=>[x.id,'accepted'])),constraintConfirmations:Object.fromEntries(p.constraints.map(x=>[x.id,true]))});assert.equal(confirmed.status,200);
 phase='direction';const {plan}=await last(await h.request('/api/direction',{profileId:p.id,revision:p.revision,answerVersion:p.answerVersion,aiConsent:true,requestId:crypto.randomUUID()}));assert.deepEqual(plan.committee.map(x=>x.model),['deepseek-flash','deepseek-v4-pro']);assert.equal(plan.decision.model,'deepseek-v4-pro');return plan;
}
try{
 const cases=[['senior_crossfield',{...sampleChoiceInput('senior',2),field:['计算机与信息','设计与艺术'],process:['把模糊需求整理成清楚方案','做视觉表达或内容呈现'],boundary:['暂时不能搬去外地','需要保持收入，不能脱产准备'],hours:2}],['early_humanities',{...sampleChoiceInput('early',2),field:['人文与社会','设计与艺术'],process:['查资料并解释一个复杂问题','做视觉表达或内容呈现'],boundary:['暂时不能增加付费课程或远距离出行','暂时不能转专业或更换学校'],hours:1}]];
 const selectedCases=cases.filter(([name])=>!process.env.LIVE_CASE||name===process.env.LIVE_CASE);if(!selectedCases.length)throw Error('未知联调样本。');report.expectedCases=selectedCases.length;
 for(const [name,a] of selectedCases){caseName=name;const entry={case:name,status:'running',issues:[]},h=await localHarness(env);report.cases.push(entry);try{
  phase='questions';const set=(await last(await h.request('/api/interview/questions',body(a)))).questionSet;validateAdaptiveQuestions(set,a);entry.questions=set.questions.map(q=>({id:q.id,type:q.type,title:q.title,basedOn:q.basedOn}));
  const before=report.requests.length,cached=await last(await h.request('/api/interview/questions',body(a)));assert(cached.reused);assert.equal(report.requests.length,before);entry.cacheReused=true;
  const selected=Object.fromEntries(set.questions.map((q,i)=>[q.id,i===set.questions.length-1?[q.options.find(o=>o.exclusive).id]:q.options.filter(o=>!o.exclusive).slice(0,q.type==='multi'?Math.min(2,q.max):1).map(o=>o.id)])),answers={...a,adaptive:{setId:set.id,baseVersion:set.baseVersion,answers:selected}};adaptiveEvidence(set,answers.adaptive);
  const u=await understand(h,answers);assert(set.questions.every(q=>u.profile.facts.some(f=>f.id===q.id)));entry.adaptiveSourceIds=u.profile.interestHypotheses.flatMap(x=>x.sourceIds).filter(id=>id.startsWith('ai_'));const p=await plan(h,u.profile);entry.routeTitles=p.routes.map(r=>r.title);entry.followupRound=u.profile.followupRound;
  const artifact={fictitious:true,questionSet:set,...u,plan:p};await writeFile(new URL(name+'.json',output),JSON.stringify(artifact,null,2));
  if(name==='senior_crossfield'){const feedback='虚构验收反馈：完成第一行动后，整理结构和解释取舍让我愿意继续；反复调整视觉细节让我疲惫。想先缩小任务，继续保留收入和本地边界。';const reviewed=await understand(h,{...u.answers,feedback},u.profile,true),newer=await plan(h,reviewed.profile);assert(reviewed.profile.revision>u.profile.revision);assert(reviewed.profile.changes.newFacts.includes('feedback'));artifact.review={...reviewed,plan:newer};entry.review={revision:reviewed.profile.revision,routeTitles:newer.routes.map(r=>r.title)};await writeFile(new URL(name+'.json',output),JSON.stringify(artifact,null,2));}
  entry.status='passed';
 }catch(e){entry.status='failed';entry.code=e.code||'validation';entry.message=e.message;process.exitCode=1;}
 finally{await h.close();console.log(JSON.stringify(entry));}if(['auth','balance','parameter','config'].includes(entry.code))break;}
}finally{
 globalThis.fetch=nativeFetch;report.passed=report.cases.length===report.expectedCases&&report.cases.every(c=>c.status==='passed');report.totals=report.requests.reduce((s,r)=>({input:s.input+(r.usage?.prompt_tokens||0),output:s.output+(r.usage?.completion_tokens||0)}),{input:0,output:0});
 await writeFile(new URL('summary.json',output),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,requests:report.requests.length,totals:report.totals}));
}
