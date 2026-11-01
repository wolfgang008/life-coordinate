import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {studentAnswers,studentStory,studentExampleChoices,studentAnalysisAnswers} from '../public/domain/example.js';
import {interviewQuestions,contextQuestions,interviewReadiness,updateInterviewAnswer,sampleChoiceInput} from '../public/domain/stages.js';
import {homeView} from '../public/views/home.js';
import {interviewSeed} from '../public/domain/adaptive.js';
import {baseVersion} from '../src/profiling/interview.mjs';
import {cleanAnswers,validateTimeBasis,validateProfile,validateDirection} from '../public/domain/contracts.js';
import {emptyState,draftSnapshot,elapsedSeconds} from '../public/app/state.js';
import {profileFixture,directionFixture,modelReply} from './lib/ai-fixtures.mjs';
import {interviewView} from '../public/views/interview.js';
import {resultView} from '../public/views/result.js';
import {analysisView} from '../public/views/analysis.js';
import {localPreview} from '../public/domain/rules.js';
import {localHarness} from './lib/local-harness.mjs';

test('大二学生示例只预填身份与真实困惑，时间与现实限制必须由用户确认',()=>{
 const a=studentAnswers();assert.match(studentStory,/大二.*Python/);assert.equal(interviewReadiness(a).ready,false);
 for(const k of ['hours','boundary','support','income','adaptive'])assert.equal(a[k],undefined,k);
 assert.deepEqual(cleanAnswers(a,{seed:true}),interviewSeed(a));assert.equal(interviewSeed(a).experience,studentStory);
 const questions=interviewQuestions(a);assert(questions.find(q=>q.id==='concern').options.includes(a.concern));
});
test('原始困惑改变会使个性化问题失效，时间改变仍保留题集',async()=>{
 const a=studentAnswers(),v=await baseVersion(a);assert.notEqual(await baseVersion({...a,experience:'我想换一个专业，但担心跟不上。'}),v);
 assert.equal(await baseVersion({...a,hours:5}),v);assert.equal(updateInterviewAnswer(a,interviewQuestions(a)[0],'junior').experience,studentStory);
});

test('互动案例的不同选择进入分析，示例条件明确且不伪造个性化题集或能力',async t=>{
 for(const choice of studentExampleChoices){const a=studentAnalysisAnswers(choice.id);assert.equal(interviewReadiness(a).ready,true);assert.doesNotThrow(()=>cleanAnswers(a));assert.match(a.experience,new RegExp(choice.label));assert.equal(a.hours,2);assert.equal(a.adaptive,undefined);assert.equal(a.education,undefined);assert.equal(a.process,undefined);}
 assert.throws(()=>studentAnalysisAnswers('not-an-option'));
 const answers=studentAnalysisAnswers('project');let calls=0;
 t.mock.method(globalThis,'fetch',async(url,init)=>{calls++;const body=JSON.parse(init.body),input=JSON.parse(body.messages[1].content);assert.equal(input.answers.experience,answers.experience);assert.equal(input.answers.hours,2);assert.equal(input.followupBudget,0);const p=profileFixture({...input.answers,priority:input.answers.concern});return modelReply(body.model,p);});
 const h=await localHarness({API_KEY:'mock'});try{const response=await h.request('/api/profile/analyze',{answers,quick:true,requestId:crypto.randomUUID(),aiConsent:true});assert.equal(response.status,200);const text=await response.text();assert.match(text,/"profile"/);assert.doesNotMatch(text,/"type":"error"/);assert.equal(calls,1);}finally{await h.close();}
});
test('示例备份保留原探索的进度、答案与选择',()=>{
 const s={...emptyState(),answers:{interviewVersion:3,stage:'junior',experience:'我原来的困惑'},index:3,selected:'route_b'};
 const b=draftSnapshot(s);s.answers.experience='示例';assert.equal(b.answers.experience,'我原来的困惑');assert.equal(b.index,3);assert.equal(b.selected,'route_b');
});
test('初始阶段尚未选择时不把下一步误标为查看建议',()=>{
 const html=interviewView({...emptyState(),answers:{interviewVersion:3}},{ready:true});assert.match(html,/下一题/);assert.doesNotMatch(html,/button[^>]*>看看建议/);
});
test('首页个人探索保留选择主线，示例选项直接触发案例分析而非重复问卷',()=>{
 const html=homeView(emptyState(),{ready:true});assert.match(html,/data-command="start"/);assert.match(html,/选择题/);assert.match(html,/虚构人物，真实 AI 分析/);assert.match(html,/本次可投入 2 小时/);assert.equal((html.match(/data-example-choice=/g)||[]).length,4);assert.doesNotMatch(html,/体验选择题|选择题探索|<textarea|start-story|starting-story/);
});
test('答题完成后先展示可修改的情况摘要和可选补充，再由用户发起分析',()=>{
 const answers=sampleChoiceInput('early',3),html=interviewView({...emptyState(),answers,index:7},{ready:true});
 assert.match(html,/确认当前情况/);assert.match(html,/data-answer-index="0"/);assert.match(html,/data-command="finish-interview"/);assert.match(html,/data-command="supplement-open"/);assert.match(html,/data-command="context-start"/);assert.doesNotMatch(html,/data-context-question=/);assert.doesNotMatch(html,/textarea[^>]*required/);
});
test('补充选择题与文字进入分析，但不使已有个性化题集失效；非法补充选项被拒绝',async()=>{
 const a=sampleChoiceInput('early',3),enriched={...a,supplement:'已经报名了两周后的比赛。'};
 for(const q of contextQuestions(a)){const first=(q.values||q.options)[0];enriched[q.id]=q.type==='multi'?[first]:first;}
 const cleaned=cleanAnswers(enriched);assert.equal(cleaned.education,'普通本科');assert.deepEqual(cleaned.process,['把模糊需求整理成清楚方案']);assert.match(cleaned.supplement,/已经报名/);
 assert.equal(await baseVersion(enriched),await baseVersion(a));assert.throws(()=>cleanAnswers({...enriched,education:'伪造学历选项'}),/不属于当前选项/);
});
test('拒绝把单次小时预算编造成每周时间，保留用户明确表达的周期事实',()=>{
 const a={...sampleChoiceInput('early',3),experience:studentStory};
 assert.throws(()=>validateTimeBasis({insight:'你每周只有2小时'},a),/本次第一行动/);
 assert.doesNotThrow(()=>validateTimeBasis({insight:'你每周只有2小时'},{...a,experience:'我每周有2小时空闲，这次也能拿出2小时。'}));
 const p=profileFixture(a);p.insight.text='你每周只有2小时';assert.throws(()=>validateProfile(p,a),/本次第一行动/);
});
test('持续打卡不能伪装成单次第一行动；正常的小成果可以通过',()=>{
 const a={...sampleChoiceInput('early',3),hours:2,priority:'比较学习方向',experience:studentStory};
 const p={...validateProfile(profileFixture(a),a),revision:1};p.interestHypotheses.forEach(h=>h.confirmation='accepted');
 const d=directionFixture();assert.doesNotThrow(()=>validateDirection(d,p,a,[]));
 d.routes[0].action.steps=['本周做2道算法题','下周再做2道并记录感受'];assert.throws(()=>validateDirection(d,p,a,[]),/单次可完成/);
});
test('示例走基础预览时不会被标成实时 AI 分析',()=>{
 const p=localPreview(studentAnswers()),r={plan:p,sample:true,work:{},id:'sample'};
 const html=resultView({...emptyState(),records:[r]},r);assert.match(html,/基础预览 · 未使用 AI/);assert.doesNotMatch(html,/本次 AI 分析/);assert.match(html,/基础预览说明/);
});
test('模型只改变方向名称的空格时，不声称用户换了方向',()=>{
 const p=localPreview(studentAnswers());p.routes[0].title='Python小功能练习';
 const old={id:'old',plan:structuredClone(p)};old.plan.routes[0].title='Python 小功能练习';
 const r={id:'new',parentId:'old',plan:p};const html=resultView({...emptyState(),records:[r,old]},r);
 assert.match(html,/方向保持不变/);assert.doesNotMatch(html,/之前考虑「Python 小功能练习」/);
});
test('刷新中断的分析给出恢复说明，不冒充仍在运行',()=>{
 const html=analysisView({...emptyState(),busy:false,error:''});assert.match(html,/分析尚未完成/);assert.match(html,/回答和笔记已保存/);assert.match(html,/data-command="retry"/);
});
test('刷新后没有开始时间时等待时长归零，时钟回拨也不会出现负数',()=>{
 assert.equal(elapsedSeconds(0,1793467437000),0);assert.equal(elapsedSeconds(1000,4500),3);assert.equal(elapsedSeconds(5000,1000),0);
});
test('构建只发布当前页面资源；DeepSeek 密钥不会包含在静态资源中',async()=>{
 const h=await localHarness();try{
  const page=await (await h.request('/')).text();assert.match(page,/\/app\/main.js/);
  for(const path of ['/main.js','/home.js','/experience.js','/styles.css','/atlas.css','/focus.css','/polish.css','/dawn.css','/content/senior-example.json'])assert.equal((await h.request(path)).status,404,path);
  const walk=async dir=>{for(const entry of await readdir(dir,{withFileTypes:true})){const path=new URL(entry.name+(entry.isDirectory()?'/':''),dir);if(entry.isDirectory())await walk(path);else{const text=await readFile(path,'utf8');assert.doesNotMatch(text,/ChatGPT|gpt-5|api\.openai\.com|sk-[A-Za-z0-9]{16,}|Bearer\s+[A-Za-z0-9_-]{16,}/i,path.pathname);}}};
  await walk(new URL('../public/',import.meta.url));
 }finally{await h.close();}
});


test('可选背景逐题展示，保留原答案；不会一次展开六组选择题',()=>{
 const answers={...sampleChoiceInput('early',3),education:'普通本科'},s={...emptyState(),answers,index:7,contextIndex:0};
 const first=interviewView(s,{ready:true});assert.match(first,/data-context-question="education"/);assert.doesNotMatch(first,/data-context-question="city"/);assert.match(first,/普通本科/);assert.match(first,/context-next/);
 const second=interviewView({...s,contextIndex:1},{ready:true});assert.match(second,/data-context-question="city"/);assert.doesNotMatch(second,/data-context-question="education"/);assert.match(second,/context-previous/);
});
