import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleChoiceInput,interviewQuestions,validQuestionAnswer,toggleQuestionAnswer} from '../public/domain/stages.js';
import {cleanAnswers} from '../public/domain/contracts.js';
import {validateAdaptiveQuestions,adaptiveEvidence,cleanAdaptiveEnvelope} from '../public/domain/adaptive.js';
import {evidencePack} from '../content/learning.js';
import {localHarness,readEvents} from './lib/local-harness.mjs';
import {profileFixture,directionFixture,modelReply} from './lib/ai-fixtures.mjs';
import {adaptiveFixture} from './lib/interview-fixture.mjs';
const body=answers=>({answers,requestId:crypto.randomUUID(),aiConsent:true});
const last=async r=>(await readEvents(r)).at(-1);
function fixtureFor(a){const p=profileFixture({...a,experience:a.ai_process||'根据选择形成的待验证线索'});p.interestHypotheses[0].sourceIds=['ai_process'];p.interestHypotheses[0].quotes=[a.ai_process];p.insight.sourceIds=['ai_process'];return p;}

test('五阶段新访谈保留11项必要背景，支持多选且不要求自由文字',()=>{
 for(const stage of ['school','early','junior','senior','graduate']){const a=sampleChoiceInput(stage,2);assert.equal(interviewQuestions(a).length,11);assert.doesNotThrow(()=>cleanAnswers(a));assert(!a.experience);}
});
test('多选上限、去选与互斥项均生效，现实限制不限制为3项',()=>{
 const a=sampleChoiceInput('senior',2),field=interviewQuestions(a).find(q=>q.id==='field'),boundary=interviewQuestions(a).find(q=>q.id==='boundary');
 let values=[];for(const v of field.options.slice(0,3))values=toggleQuestionAnswer(field,values,v);assert.throws(()=>toggleQuestionAnswer(field,values,field.options[3]),/最多/);values=toggleQuestionAnswer(field,values,'尚未确定');assert.deepEqual(values,['尚未确定']);values=toggleQuestionAnswer(field,values,field.options[0]);assert.deepEqual(values,[field.options[0]]);assert.deepEqual(toggleQuestionAnswer(field,values,field.options[0]),[]);
 assert(validQuestionAnswer(boundary,boundary.options.slice(0,4)));assert(!validQuestionAnswer(field,['计算机与信息','尚未确定']));
});
test('旧单选变为单元素集合，多选顺序规范化，伪造与重复选项拒绝',()=>{
 const a=sampleChoiceInput('senior',2),p=cleanAnswers(a);assert.deepEqual(p.field,['计算机与信息']);assert.deepEqual(cleanAnswers({...a,field:['设计与艺术','计算机与信息']}).field,cleanAnswers({...a,field:['计算机与信息','设计与艺术']}).field);
 for(const v of [['计算机与信息','计算机与信息'],['不存在'],['设计与艺术','尚未确定']])assert.throws(()=>cleanAnswers({...a,field:v}));
});
test('多领域资料合并去重，跨领域不丢非技术入口',()=>{const a=sampleChoiceInput('senior',2),pack=evidencePack({...a,field:['计算机与信息','人文与社会']});assert(pack.some(e=>e.id==='cs50'));assert(pack.some(e=>e.id==='psychology'));assert.equal(new Set(pack.map(e=>e.id)).size,pack.length);});
test('生成题必须引用实际回答，保留未知选项且不能编造经历',()=>{
 const a=cleanAnswers(sampleChoiceInput('early',2));assert.equal(validateAdaptiveQuestions(adaptiveFixture(a),a).questions.length,2);
 for(const change of [r=>r.questions[0].basedOn[0].quote='从未回答的内容',r=>r.questions[0].options.pop(),r=>r.questions[0].title='上次实习时你喜欢什么？',r=>r.questions[0].max=5,r=>r.questions[1].id=r.questions[0].id]){const r=adaptiveFixture(a);change(r);assert.throws(()=>validateAdaptiveQuestions(r,a));}
});
test('AI访谈到画像与双规划：题集缓存、完整回答来源、共享追问预算',async t=>{
 const calls=[];t.mock.method(globalThis,'fetch',async(u,init)=>{const b=JSON.parse(init.body),i=JSON.parse(b.messages[1].content);calls.push({model:b.model,input:i});if(i.task==='adaptive_interview')return modelReply(b.model,adaptiveFixture(i.answers));if(i.answerSourceIds)return modelReply(b.model,fixtureFor(i.answers));const d=directionFixture();d.coreInsight.personalSourceIds=['ai_process'];d.routes[0].personalSourceIds=['ai_process'];return modelReply(b.model,d);});
 const h=await localHarness({API_KEY:'mock'});try{const a=sampleChoiceInput('senior',2);const generated=await last(await h.request('/api/interview/questions',body(a)));assert.equal(generated.type,'result');const set=generated.questionSet;
 const cached=await last(await h.request('/api/interview/questions',body(a)));assert(cached.reused);assert.equal(calls.length,1);
 const answers={...a,adaptive:{setId:set.id,baseVersion:set.baseVersion,answers:{ai_process:['organize','build'],ai_evidence:['unknown']}}};
 const understood=await last(await h.request('/api/profile/analyze',body(answers)));assert.equal(understood.type,'result');assert.equal(understood.profile.followupRound,1);assert.equal(calls[1].input.followupBudget,1);assert.match(calls[1].input.answers.ai_process,/整理线索/);assert(understood.profile.facts.some(f=>f.id==='ai_process'));assert(!understood.profile.facts.some(f=>f.id==='adaptive'));
 const p=understood.profile;await h.request('/api/profile/confirm',{profileId:p.id,revision:p.revision,answerVersion:p.answerVersion,confirmations:{interest_a:'accepted'},constraintConfirmations:{time:true}});const result=await last(await h.request('/api/direction',{profileId:p.id,revision:p.revision,answerVersion:p.answerVersion,requestId:crypto.randomUUID(),aiConsent:true}));assert.equal(result.type,'result');assert.deepEqual(calls.slice(2).map(c=>c.model),['deepseek-flash','deepseek-v4-pro','deepseek-v4-pro']);assert.deepEqual(calls[2].input,calls[3].input);assert.match(calls[2].input.answers.ai_process,/成果/);
 }finally{await h.close();}
});
test('更改基础背景、跨会话与伪造选项不能把AI回答带入画像',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async(u,init)=>{calls++;const b=JSON.parse(init.body),i=JSON.parse(b.messages[1].content);return modelReply(b.model,adaptiveFixture(i.answers));});const h=await localHarness({API_KEY:'mock'});try{const a=sampleChoiceInput('early',2),set=(await last(await h.request('/api/interview/questions',body(a)))).questionSet,adaptive={setId:set.id,baseVersion:set.baseVersion,answers:{ai_process:['organize'],ai_evidence:['unknown']}};
 for(const answers of [{...a,field:['设计与艺术'],adaptive},{...a,adaptive:{...adaptive,answers:{ai_process:['forged'],ai_evidence:['unknown']}}},{...a,adaptive:{...adaptive,answers:{ai_process:['organize']}}}])assert.equal((await h.request('/api/profile/analyze',body(answers))).status,400);
 const other=await localHarness({API_KEY:'mock'});try{assert.equal((await other.request('/api/profile/analyze',body({...a,adaptive}))).status,400);}finally{await other.close();}assert.equal(calls,1);
 }finally{await h.close();}
});
test('出题失败可重试、不生成画像、不留下running任务',async t=>{
 let calls=0,fail=true;t.mock.method(globalThis,'fetch',async(u,init)=>{calls++;if(fail)return new Response('',{status:402});const b=JSON.parse(init.body),i=JSON.parse(b.messages[1].content);return modelReply(b.model,adaptiveFixture(i.answers));});const h=await localHarness({API_KEY:'mock'});try{const a=sampleChoiceInput('early',2),r=await last(await h.request('/api/interview/questions',body(a)));assert.equal(r.code,'balance');assert.equal(calls,1);assert.equal(h.db.sql.prepare("SELECT COUNT(*) n FROM atlas_jobs WHERE status='running'").get().n,0);assert.equal(h.db.sql.prepare('SELECT COUNT(*) n FROM personal_models').get().n,0);fail=false;assert.equal((await last(await h.request('/api/interview/questions',body(a)))).type,'result');}finally{await h.close();}
});

test('个性化出题先检查资料传输同意和连接状态',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;throw Error('unexpected');});
 for(const bindings of [{},{API_KEY:'mock'}]){const h=await localHarness(bindings);try{const a=sampleChoiceInput('early',2);assert.equal((await h.request('/api/interview/questions',{...body(a),aiConsent:false})).status,400);if(!bindings.API_KEY)assert.equal((await h.request('/api/interview/questions',body(a))).status,503);}finally{await h.close();}}assert.equal(calls,0);
});

test('等价多选顺序复用题集，过期题集不能进入画像',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async(u,init)=>{calls++;const b=JSON.parse(init.body),i=JSON.parse(b.messages[1].content);return modelReply(b.model,adaptiveFixture(i.answers));});
 const h=await localHarness({API_KEY:'mock'});try{const a={...sampleChoiceInput('early',2),field:['计算机与信息','设计与艺术']},set=(await last(await h.request('/api/interview/questions',body(a)))).questionSet;const cached=await last(await h.request('/api/interview/questions',body({...a,field:a.field.slice().reverse()})));assert(cached.reused);assert.equal(calls,1);
 h.db.sql.prepare('UPDATE atlas_jobs SET expires_at=?').run(Date.now()-1);const adaptive={setId:set.id,baseVersion:set.baseVersion,answers:{ai_process:['organize'],ai_evidence:['unknown']}};assert.equal((await h.request('/api/profile/analyze',body({...a,adaptive}))).status,400);assert.equal(calls,1);
 }finally{await h.close();}
});

test('生成批次与画像追问共用两轮预算，第二轮后不再追加问题',async t=>{
 const budgets=[];t.mock.method(globalThis,'fetch',async(u,init)=>{const b=JSON.parse(init.body),i=JSON.parse(b.messages[1].content);if(i.task==='adaptive_interview')return modelReply(b.model,adaptiveFixture(i.answers));budgets.push(i.followupBudget);assert(!i.answers.adaptive);assert(!i.answerSourceIds.includes('adaptive'));const p=fixtureFor(i.answers);p.nextQuestion={question:'哪一种体验最想继续？',purpose:'区分仍未确定的偏好',affects:'第一行动',options:['整理线索','做出成果','目前还不知道']};return modelReply(b.model,p);});
 const h=await localHarness({API_KEY:'mock'});try{const a=sampleChoiceInput('early',2),set=(await last(await h.request('/api/interview/questions',body(a)))).questionSet,answers={...a,adaptive:{setId:set.id,baseVersion:set.baseVersion,answers:{ai_process:['organize'],ai_evidence:['unknown']}}};const first=await last(await h.request('/api/profile/analyze',body(answers)));assert(first.nextQuestion);const second=await last(await h.request('/api/profile/analyze',{...body({...answers,followup:'目前还不知道'}),previousProfileId:first.profile.id}));assert.equal(second.profile.followupRound,2);assert.equal(second.nextQuestion,null);assert.deepEqual(budgets,[1,0]);
 }finally{await h.close();}
});

test('反馈后的澄清追问保留本次反馈标记，下一次纠正有独立变化记录',async t=>{
 t.mock.method(globalThis,'fetch',async(u,init)=>{const b=JSON.parse(init.body),i=JSON.parse(b.messages[1].content);if(i.task==='adaptive_interview')return modelReply(b.model,adaptiveFixture(i.answers));return modelReply(b.model,fixtureFor(i.answers));});
 const h=await localHarness({API_KEY:'mock'});try{const a=sampleChoiceInput('early',2),set=(await last(await h.request('/api/interview/questions',body(a)))).questionSet,answers={...a,adaptive:{setId:set.id,baseVersion:set.baseVersion,answers:{ai_process:['organize'],ai_evidence:['unknown']}}},first=await last(await h.request('/api/profile/analyze',body(answers))),withFeedback={...answers,feedback:'整理观点愿意继续，视觉细节容易疲惫。'},reviewed=await last(await h.request('/api/review',{...body(withFeedback),previousProfileId:first.profile.id}));assert.deepEqual(reviewed.profile.changes.newFacts,['feedback']);
 const followup={...withFeedback,followup:'目前还不知道'},clarified=await last(await h.request('/api/profile/analyze',{...body(followup),previousProfileId:reviewed.profile.id}));assert.deepEqual(clarified.profile.changes.newFacts,['feedback','followup']);assert.match(clarified.profile.changes.explanation,/实践体验/);
 const corrected=await last(await h.request('/api/profile/analyze',{...body({...followup,correction:'我更愿意独立整理观点。'}),previousProfileId:clarified.profile.id}));assert.deepEqual(corrected.profile.changes.newFacts,['correction']);
 }finally{await h.close();}
});
