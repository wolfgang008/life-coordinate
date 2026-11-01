import test from 'node:test';
import assert from 'node:assert/strict';
import {localHarness,readEvents} from './lib/local-harness.mjs';
import {profileFixture,directionFixture,modelReply} from './lib/ai-fixtures.mjs';
import {sampleInput} from '../public/domain/stages.js';
const env={API_KEY:'test-only'};
const body=answers=>({answers,aiConsent:true,requestId:crypto.randomUUID()});
const last=async r=>(await readEvents(r)).at(-1);
const confirm=(h,p)=>h.request('/api/profile/confirm',{profileId:p.id,revision:p.revision,answerVersion:p.answerVersion,confirmations:Object.fromEntries(p.interestHypotheses.map(x=>[x.id,'accepted'])),constraintConfirmations:Object.fromEntries(p.constraints.map(x=>[x.id,true]))});
const planBody=p=>({profileId:p.id,revision:p.revision,answerVersion:p.answerVersion,aiConsent:true,requestId:crypto.randomUUID()});

test('主 API 完整闭环、缓存去重、反馈重评与旧方案共存',async t=>{
 const calls=[];t.mock.method(globalThis,'fetch',async(url,init)=>{const b=JSON.parse(init.body),i=JSON.parse(b.messages[1].content);calls.push({model:b.model,input:i,prompt:b.messages[0].content});return modelReply(b.model,i.answerSourceIds?profileFixture(i.answers):directionFixture());});
 const h=await localHarness(env);try{
  const a=sampleInput(),original=await last(await h.request('/api/profile/analyze',body(a)));assert.equal(original.type,'result');const p=original.profile;assert.equal(p.modelProvenance.requested,'deepseek-flash');
  assert.equal((await confirm(h,p)).status,200);const b=planBody(p),result=await last(await h.request('/api/direction',b));assert.equal(result.type,'result');
  assert.equal(calls.length,4);assert.deepEqual(calls.map(c=>c.model),['deepseek-flash','deepseek-flash','deepseek-v4-pro','deepseek-v4-pro']);assert.deepEqual(calls[1].input,calls[2].input);assert.notEqual(calls[1].prompt,calls[2].prompt);assert.equal(calls[3].input.independent_opinions.length,2);assert.equal(result.plan.degraded,false);
  const cached=await last(await h.request('/api/direction',{...b,requestId:crypto.randomUUID()}));assert(cached.reused);assert.equal(calls.length,4);
  const reviewed=await last(await h.request('/api/review',{...body({...a,feedback:'写完一页记录，喜欢整理观点，但查找材料很费力。'}),previousProfileId:p.id,confirmations:{interest_a:'rejected'}}));assert.equal(reviewed.profile.revision,2);assert.equal(calls[4].model,'deepseek-flash');assert.equal(calls[4].input.previous.interestHypotheses[0].confirmation,'rejected');assert.match(calls[4].input.answers.feedback,/材料/);
  assert.equal((await confirm(h,reviewed.profile)).status,200);const replanned=await last(await h.request('/api/direction',planBody(reviewed.profile)));assert.equal(replanned.type,'result');assert.equal(calls.length,8);assert.equal(result.plan.profileRevision,1);assert.equal(replanned.plan.profileRevision,2);assert.equal(h.db.sql.prepare("SELECT COUNT(*) n FROM atlas_jobs WHERE status='completed'").get().n,4);
 }finally{await h.close();}
});

test('真实追问最多两轮，未知答案与用户纠正进入模型输入',async t=>{
 const calls=[];t.mock.method(globalThis,'fetch',async(u,init)=>{const b=JSON.parse(init.body),i=JSON.parse(b.messages[1].content);calls.push(i);return modelReply(b.model,profileFixture(i.answers,{question:true}));});const h=await localHarness(env);try{
  let a=sampleInput(),r=await last(await h.request('/api/profile/analyze',body(a)));assert(r.nextQuestion.options.includes('目前还不知道'));
  for(let i=1;i<=2;i++){a={...a,followup:i===1?'目前还不知道':'整理观点',correction:'我更喜欢把观点写清楚，不喜欢频繁访谈。'};r=await last(await h.request('/api/profile/analyze',{...body(a),previousProfileId:r.profile.id}));assert.equal(r.profile.followupRound,i);}
  assert.equal(r.nextQuestion,null);assert.deepEqual(calls.map(c=>c.followupBudget),[2,1,0]);assert.match(calls[2].answers.correction,/写清楚/);
 }finally{await h.close();}
});

test('无 Key、非法配置与敏感字段不会暴露到公共配置',async()=>{
 for(const e of [{},{API_KEY:'hidden-key'},{API_KEY:'hidden-key',API_BASE:'https://private.invalid/?secret=hidden-value'}]){const h=await localHarness(e);try{const c=await (await h.request('/api/config')).json();assert.equal(c.ready,!!e.API_KEY&&!e.API_BASE);assert.equal(c.providers.length,2);assert.equal(c.apiHost,'api.deepseek.com');assert(!JSON.stringify(c).includes('hidden'));if(!c.ready){const r=await h.request('/api/profile/analyze',body(sampleInput()));assert.equal(r.status,503);}assert.equal(h.db.sql.prepare('SELECT COUNT(*) n FROM personal_models').get().n,0);}finally{await h.close();}}
});

test('一份独立规划失败，停止综合、释放任务且保留画像，可重试恢复',async t=>{
 let fail=true,decision=0;const calls=[];t.mock.method(globalThis,'fetch',async(u,init)=>{const b=JSON.parse(init.body),i=JSON.parse(b.messages[1].content);calls.push(i);if(i.answerSourceIds)return modelReply(b.model,profileFixture(i.answers));if(i.independent_opinions)decision++;if(fail&&b.model==='deepseek-v4-pro')return new Response('',{status:503});return modelReply(b.model,directionFixture());});const h=await localHarness(env);try{
 const p=(await last(await h.request('/api/profile/analyze',body(sampleInput())))).profile;await confirm(h,p);const b=planBody(p);let r=await last(await h.request('/api/direction',b));assert.equal(r.type,'error');assert.equal(decision,0);assert.equal(h.db.sql.prepare('SELECT COUNT(*) n FROM personal_models').get().n,1);assert.equal(h.db.sql.prepare("SELECT COUNT(*) n FROM atlas_jobs WHERE status='running'").get().n,0);
 fail=false;r=await last(await h.request('/api/direction',{...b,requestId:crypto.randomUUID()}));assert.equal(r.type,'result');assert.equal(decision,1);
 }finally{await h.close();}
});

test('画像版本冲突与跨匿名会话读取被拒绝',async t=>{
 t.mock.method(globalThis,'fetch',async(u,init)=>{const b=JSON.parse(init.body),i=JSON.parse(b.messages[1].content);return modelReply(b.model,profileFixture(i.answers));});const h=await localHarness(env),other=await localHarness(env);try{const p=(await last(await h.request('/api/profile/analyze',body(sampleInput())))).profile;assert.equal((await h.request('/api/profile/confirm',{profileId:p.id,revision:999,answerVersion:p.answerVersion})).status,400);assert.equal((await other.request('/api/direction',planBody(p))).status,400);}finally{await h.close();await other.close();}
});
test('用户拒绝的兴趣线索原样进入两份独立规划，不会被改回接受',async t=>{
 const inputs=[];t.mock.method(globalThis,'fetch',async(u,init)=>{const b=JSON.parse(init.body),i=JSON.parse(b.messages[1].content);inputs.push(i);return modelReply(b.model,i.answerSourceIds?profileFixture(i.answers):directionFixture());});const h=await localHarness(env);try{const p=(await last(await h.request('/api/profile/analyze',body(sampleInput())))).profile;assert.equal((await h.request('/api/profile/confirm',{profileId:p.id,revision:p.revision,answerVersion:p.answerVersion,confirmations:{interest_a:'rejected'},constraintConfirmations:{time:true}})).status,200);const result=await last(await h.request('/api/direction',planBody(p)));assert.equal(result.type,'result');assert.equal(inputs[1].personalModel.interestHypotheses[0].confirmation,'rejected');assert.deepEqual(inputs[1],inputs[2]);}finally{await h.close();}
});
