import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {localHarness,readEvents} from './lib/local-harness.mjs';
import {studentAnswers} from '../public/domain/example.js';
import {officialBase} from '../src/ai.mjs';
if(process.env.ENABLE_LIVE_AI!=='1')throw Error('Set ENABLE_LIVE_AI=1 for bounded official API verification.');
const privateConfig=JSON.parse((await readFile(new URL('../.local/deepseek.json',import.meta.url),'utf8')).replace(/^\uFEFF/,''));
const h=await localHarness({API_KEY:process.env.API_KEY||privateConfig.apiKey,API_BASE:officialBase(privateConfig.apiBase)}),nativeFetch=globalThis.fetch;
const out=new URL('../qa/product-audit/',import.meta.url);await mkdir(out,{recursive:true});
const report={fictitious:true,productionTouched:false,requests:[],checks:[]};let phase='questions';
globalThis.fetch=async(url,init)=>{
 if(url!=='https://api.deepseek.com/chat/completions'||report.requests.length>=12)throw Error('Live verification boundary');
 const b=JSON.parse(init.body),entry={phase,requested:b.model,started:new Date().toISOString()};report.requests.push(entry);const started=Date.now();
 const r=await nativeFetch(url,init);entry.status=r.status;entry.durationMs=Date.now()-started;if(r.ok){const d=await r.clone().json();entry.returned=d.model;entry.usage=d.usage;}console.log(JSON.stringify(entry));return r;
};
const last=async r=>{const events=await readEvents(r),result=events.at(-1);if(result.type==='error')throw Error(result.message);return result;};
try{
 const a=studentAnswers(),q=await last(await h.request('/api/interview/questions',{answers:a,requestId:crypto.randomUUID(),aiConsent:true}));assert(q.questionSet?.questions.length>=2);
 a.adaptive={setId:q.questionSet.id,baseVersion:q.questionSet.baseVersion,answers:Object.fromEntries(q.questionSet.questions.map(q=>[q.id,[q.options.find(o=>!o.exclusive).id]]))};
 Object.assign(a,{boundary:['暂时没有确认的硬限制'],support:'可用学校资源，优先免费体验',hours:2});
 phase='profile';const p=await last(await h.request('/api/profile/analyze',{answers:a,quick:true,aiConsent:true,requestId:crypto.randomUUID()}));assert(p.profile?.mode==='guide');
 phase='direction';const r=await last(await h.request('/api/direction',{profileId:p.profile.id,revision:p.profile.revision,answerVersion:p.profile.answerVersion,useProvisional:true,requestId:crypto.randomUUID(),aiConsent:true}));
 assert(r.plan?.routes.length>=2);assert(r.plan.routes.every(r=>r.action.effortHours<=2));assert(r.plan.committee.length===2);assert(r.plan.keyTradeoff);assert(r.plan.routes.every(r=>r.reconsiderWhen));
 report.questions=q.questionSet;report.answers=a;report.profile=p.profile;report.plan=r.plan;report.checks.push('学生原始困惑进入个性化提问与分析','DeepSeek 两个模型独立比较后由 Pro 综合','至少两种选择，行动不超过 2 小时，包含代价与调整条件');
 report.passed=true;console.log(JSON.stringify({passed:true,routes:r.plan.routes.map(r=>({title:r.title,why:r.whyNow,risk:r.mainRisk,action:r.action.title})),tradeoff:r.plan.keyTradeoff}));
}catch(e){report.passed=false;report.error=e.message;console.error(e.message);process.exitCode=1;}
finally{globalThis.fetch=nativeFetch;await h.close();report.completedAt=new Date().toISOString();await writeFile(new URL('student-live.json',out),JSON.stringify(report,null,2));}
