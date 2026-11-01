import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleChoiceInput,interviewQuestions} from '../public/domain/stages.js';
import {cleanAnswers,validateDirection} from '../public/domain/contracts.js';
import {interviewSeed,questionList,validateAdaptiveQuestions} from '../public/domain/adaptive.js';
import {baseVersion} from '../src/profiling/interview.mjs';
import {analysisDraft} from '../public/domain/continuation.js';
import {localHarness,readEvents} from './lib/local-harness.mjs';
import {adaptiveFixture} from './lib/interview-fixture.mjs';
import {profileFixture,directionFixture,modelReply} from './lib/ai-fixtures.mjs';
const last=async r=>(await readEvents(r)).at(-1),body=answers=>({answers,aiConsent:true,requestId:crypto.randomUUID()});
function mocks(t){const calls=[];t.mock.method(globalThis,'fetch',async(u,init)=>{const b=JSON.parse(init.body),input=JSON.parse(b.messages[1].content);calls.push({model:b.model,input});if(input.task==='adaptive_interview')return modelReply(b.model,adaptiveFixture(input.answers));if(input.answerSourceIds){const id=input.answers.ai_process?'ai_process':'currentSituation',v=input.answers[id],p=profileFixture({...input.answers,experience:v,priority:input.answers.concern});p.interestHypotheses[0].sourceIds=[id];p.insight.sourceIds=[id];return modelReply(b.model,p);}if(input.task==='guide_plan')return modelReply(b.model(input.answers));const d=directionFixture();d.routes[0].title='先就业，保留升学选择';d.routes[0].choiceId='employment';d.coreInsight.personalSourceIds=['ai_process'];d.routes[0].personalSourceIds=['ai_process'];d.routes[0].interestHypothesisIds=['interest_a'];return modelReply(b.model,d);});return calls;}
async function prepare(h){const a=sampleChoiceInput('senior',3),generated=await last(await h.request('/api/interview/questions',body(interviewSeed(a)))),set=generated.questionSet;assert(set,JSON.stringify(generated));return {a:{...a,adaptive:{setId:set.id,baseVersion:set.baseVersion,answers:{ai_process:['organize'],ai_evidence:['unknown']}}},set};}

test('简化访谈：五阶段均为7项背景，AI在第4题后插入，保留收入和现实限制',()=>{
 for(const stage of ['school','early','junior','senior','graduate']){const a=sampleChoiceInput(stage,3);assert.equal(interviewQuestions(a).length,7);assert.deepEqual(interviewQuestions(a).slice(0,4).map(q=>q.id),['stage','concern','field','currentSituation']);assert.doesNotThrow(()=>cleanAnswers(a));assert(a.boundary);assert(a.hours);assert(!a.education);assert(!a.city);const set={questions:adaptiveFixture(interviewSeed(a)).questions};assert.deepEqual(questionList({answers:a,interviewSet:set}).map(q=>q.id),['stage','concern','field','currentSituation','ai_process','ai_evidence','boundary',['school','early'].includes(stage)?'support':'income','hours']);}
});
test('前4题可单独请求AI，资料缺失不伪造默认学历、城市和可用时间',async t=>{const calls=mocks(t),h=await localHarness({API_KEY:'mock'});try{const seed=interviewSeed(sampleChoiceInput('early',3));assert.doesNotThrow(()=>cleanAnswers(seed,{seed:true}));assert.throws(()=>cleanAnswers(seed));assert.equal((await last(await h.request('/api/interview/questions',body(seed)))).type,'result');assert(!('hours' in calls[0].input.answers));assert(!('education' in calls[0].input.answers));assert(!('city' in calls[0].input.answers));assert.equal((await h.request('/api/interview/questions',body({...seed,currentSituation:'伪造选择'}))).status,400);}finally{await h.close();}});
test('后续时间和限制改变不使前4题生成的题集失效，前4题改变会失效',async()=>{const a=sampleChoiceInput('senior',3);assert.equal(await baseVersion(a),await baseVersion({...a,hours:5,boundary:['需要保持收入，不能脱产准备']}));assert.notEqual(await baseVersion(a),await baseVersion({...a,field:['设计与艺术']}));});
test('直接给建议：不伪造用户确认，模型仅暂用未排除的兴趣推断',async t=>{
 const calls=mocks(t),h=await localHarness({API_KEY:'mock'});try{const {a}=await prepare(h),r=await last(await h.request('/api/profile/analyze',{...body(a),quick:true})),p=r.profile;assert.equal(p.mode,'guide');assert.equal(calls[1].input.followupBudget,0);assert.equal(r.nextQuestion,null);assert.equal(p.interestHypotheses[0].confirmation,'pending');const result=await last(await h.request('/api/direction',{profileId:p.id,revision:p.revision,answerVersion:p.answerVersion,useProvisional:true,aiConsent:true,requestId:crypto.randomUUID()}));assert.equal(result.type,'result');assert(result.plan.provisional);assert(result.plan.jobId);assert.equal(calls[2].input.personalModel.interestHypotheses[0].confirmation,'pending');assert(calls[2].input.personalModel.provisional);const saved=h.db.sql.prepare('SELECT confirmed,model_json FROM personal_models WHERE id=?').get(p.id);assert.equal(saved.confirmed,0);assert.equal(JSON.parse(saved.model_json).interestHypotheses[0].confirmation,'pending');
 }finally{await h.close();}
});
test('旧版未确认画像仍不可直接规划；拒绝的兴趣不能借初步建议重新启用',async t=>{
 mocks(t);const h=await localHarness({API_KEY:'mock'});try{const {a}=await prepare(h),p=(await last(await h.request('/api/profile/analyze',body(a)))).profile;assert.equal((await h.request('/api/direction',{profileId:p.id,revision:p.revision,answerVersion:p.answerVersion,useProvisional:true,aiConsent:true,requestId:crypto.randomUUID()})).status,400);const rejected={...p,provisional:true,interestHypotheses:p.interestHypotheses.map(x=>({...x,confirmation:'rejected'}))},d=directionFixture();d.coreInsight.personalSourceIds=['currentSituation'];d.routes[0].personalSourceIds=['currentSituation'];d.routes[0].interestHypothesisIds=['interest_a'];assert.throws(()=>validateDirection(d,rejected,cleanAnswers(a),[]));}finally{await h.close();}
});
test('反馈直接更新：实际行动取自该会话的规划，伪造行动或跨画像引用被拒绝',async t=>{
 const calls=mocks(t),h=await localHarness({API_KEY:'mock'});try{const {a}=await prepare(h),p=(await last(await h.request('/api/profile/analyze',{...body(a),quick:true}))).profile,plan=(await last(await h.request('/api/direction',{profileId:p.id,revision:p.revision,answerVersion:p.answerVersion,useProvisional:true,aiConsent:true,requestId:crypto.randomUUID()}))).plan;
 const input={...body({...a,feedback:'查资料有意思，写总结比较费劲。'}),quick:true,previousProfileId:p.id,practice:{sourcePlanId:plan.jobId,routeId:plan.primaryRouteId}},reviewed=await last(await h.request('/api/review',input));assert.equal(reviewed.type,'result');const sent=calls.at(-1).input;assert.equal(sent.practiceContext.task,plan.routes[0].action.title);assert.equal(sent.followupBudget,0);assert.match(sent.answers.feedback,/费劲/);assert(reviewed.profile.changes.newFacts.includes('feedback'));
 const before=calls.length;for(const practice of [{sourcePlanId:'a'.repeat(64),routeId:'route_a'},{sourcePlanId:plan.jobId,routeId:'forged'}])assert.equal((await h.request('/api/review',{...input,requestId:crypto.randomUUID(),practice})).status,400);assert.equal(calls.length,before);
 }finally{await h.close();}
});
test('初步建议也必须遵守收入限制，不能把未满足条件当成已满足',()=>{
 const a=cleanAnswers({...sampleChoiceInput('senior',3),boundary:['需要保持收入，不能脱产准备']}),p={...profileFixture({...a,experience:a.currentSituation}),revision:1,provisional:true};p.interestHypotheses[0].confirmation='pending';
 const d=directionFixture();d.coreInsight.personalSourceIds=['currentSituation'];d.routes[0].personalSourceIds=['currentSituation'];d.routes[0].title='脱产备考研究生';assert.throws(()=>validateDirection(d,p,a,[]),/收入/);d.routes[0].title='边工作边了解升学';d.routes[0].requirements=[{constraintId:'time',expected:'准备时间已经满足',verified:true}];assert.throws(()=>validateDirection(d,p,a,[]),/尚未满足/);
});

test('隔天回来更新：保留本地回答和反馈，旧AI回答按自述使用，不冒充仍有效的服务器来源',()=>{
 const a={...sampleChoiceInput('senior',3),feedback:'实际做完后更喜欢整理要求。',adaptive:{setId:'a'.repeat(64),baseVersion:'b'.repeat(64),answers:{ai_process:['organize']}}},now=Date.now(),p={id:crypto.randomUUID(),modelProvenance:{generatedAt:new Date(now-25*3600000).toISOString()},facts:[{id:'ai_process',value:'我愿意先整理信息再解释理由'}]};
 const restored=analysisDraft(a,p,null,{now});assert(restored.restored);assert.equal(restored.profile,null);assert(!restored.answers.adaptive);assert.match(restored.answers.experience,/未重新核实/);assert.match(restored.answers.experience,/整理信息/);assert.equal(restored.answers.feedback,a.feedback);assert(a.adaptive);assert.doesNotThrow(()=>cleanAnswers(restored.answers));
 const fresh=analysisDraft(a,{...p,modelProvenance:{generatedAt:new Date(now).toISOString()}},null,{now});assert(!fresh.restored);assert(fresh.answers.adaptive);
});
