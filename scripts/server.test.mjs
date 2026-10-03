import test from 'node:test';
import assert from 'node:assert/strict';
import {activeQuestions,buildProfile,demoAnswers,demoPlan,scenarioPlan,parseModelJSON,validatePlan} from '../public/core.js';
import {aiConfig,analyze,guardResult,requestJSON,auditFacts} from '../src/ai.mjs';
import {validateDraft} from '../src/db.mjs';
import {evidence} from '../public/evidence.js';
const env={API_KEY:'test-only'},ids=evidence.sources.map(s=>s.id);
const opinion={summary:'优先用真实任务验证方向。',preferred:'就业验证',risks:['机会有效期需核实'],missing:['实习时间未落实'],evidence_ids:['java'],routes:[{title:'就业验证',feasibility:'可以先核对任务，不认定已获得机会',development:'以可展示成果与反馈检验就业选择',risk:'实际岗位资格仍待核实',lever:'补齐个人贡献的证据',evidence_ids:['java']},{title:'继续深造',feasibility:'准备窗口与当年资格待核实',development:'通过研究体验判断长期投入意愿',risk:'准备期的时间与经济成本',lever:'落实准备窗口并验证研究体验',evidence_ids:['study_policy']}]};
function fixture(){return demoPlan(demoAnswers);}
const response=(model,value)=>Response.json({model,choices:[{message:{content:JSON.stringify(value)}}],usage:{prompt_tokens:10,completion_tokens:10}});
test('访谈按经历与家庭冲突增减问题',()=>{assert(!activeQuestions({...demoAnswers,experience:'none'}).some(q=>q.id==='project'));assert(activeQuestions({...demoAnswers,relocation:'yes'}).some(q=>q.id==='boundary'));});
test('缺失答案、无效选项与超长文字被拒绝',()=>{assert.throws(()=>buildProfile({}));assert.throws(()=>buildProfile({...demoAnswers,city:'字'.repeat(21)}));assert.throws(()=>buildProfile({...demoAnswers,stage:'fake'}));});
test('条件预览保留原画像与规划',()=>{const original=structuredClone(demoAnswers);scenarioPlan(demoAnswers,'away');assert.deepEqual(demoAnswers,original);const p=demoPlan({...demoAnswers,finance:'urgent'});assert.match(p.summary,/收入/);});
test('模型配置保持三个规划模型与独立综合模型',()=>{assert(aiConfig(env).ready);assert(!aiConfig({...env,DECISION_MODEL:'gpt-5.4-mini'}).ready);assert(!aiConfig({...env,PLANNER_MODEL_2:'gpt-5.4-mini'}).ready);assert(!aiConfig({}).ready);});
test('不合法 JSON、虚构来源与重复路线被拒绝',()=>{assert.throws(()=>parseModelJSON('非结构化回答'));assert.throws(()=>parseModelJSON('[]'));const p=fixture();assert(validatePlan(p,ids));p.routes[0].evidence_ids=['invented'];assert.throws(()=>validatePlan(p,ids));const q=fixture();q.routes[1].id=q.routes[0].id;assert.throws(()=>validatePlan(q,ids));});
test('地域、实习和经济硬条件限制被执行',()=>{for(const [gate,answers] of [['relocation',demoAnswers],['internship',demoAnswers],['fulltime_study',{...demoAnswers,finance:'urgent'}]]){const p=fixture();p.routes[1].gates=[gate];p.routes[1].level='alternative';assert.throws(()=>guardResult(p,answers));}});
test('草稿只接受已知选项和有界文字',()=>{assert.deepEqual(validateDraft({answers:{stage:'junior',unknown:'ignored'},index:99}).answers,{stage:'junior'});assert.equal(validateDraft({index:99}).index,20);assert.throws(()=>validateDraft({answers:{city:'字'.repeat(21)}}));});
test('三个独立模型收到同一画像，综合阶段才收到各方判断',async()=>{const calls=[],events=[];const plan=await analyze(demoAnswers,env,e=>events.push(e),new AbortController().signal,async(url,init)=>{const b=JSON.parse(init.body);calls.push(b);return response(b.model,b.model==='gpt-5.4'?fixture():opinion);});assert.equal(calls.length,4);const independent=calls.filter(c=>c.model!=='gpt-5.4').map(c=>JSON.parse(c.messages[1].content));assert.deepEqual(independent[0],independent[1]);assert.deepEqual(independent[1],independent[2]);assert(!('independent_opinions' in independent[0]));assert.equal(JSON.parse(calls.find(c=>c.model==='gpt-5.4').messages[1].content).independent_opinions.length,3);assert.equal(plan.committee.length,3);assert.equal(plan.mode,'live');assert(events.some(e=>e.phase==='decision'&&e.status==='done'));});
test('仅两份成功分析时明示部分失败，不伪造第三份',async()=>{const p=await analyze(demoAnswers,env,()=>{},new AbortController().signal,async(url,init)=>{const b=JSON.parse(init.body);return b.model==='claude-sonnet-4-6'?new Response('',{status:503}):response(b.model,b.model==='gpt-5.4'?fixture():opinion);});assert(p.degraded);assert.equal(p.committee.length,2);});
test('少于两份成功分析时终止，不自动伪装规则结果',async()=>{await assert.rejects(()=>analyze(demoAnswers,env,()=>{},new AbortController().signal,async(url,init)=>{const b=JSON.parse(init.body);return b.model==='gpt-5.4-mini'?response(b.model,opinion):new Response('',{status:503});}),/不足两份/);});
test('无效模型输出重试包含纠正要求，最多一次',async()=>{const counts=new Map();let correction=false;await analyze(demoAnswers,env,()=>{},new AbortController().signal,async(url,init)=>{const b=JSON.parse(init.body),count=(counts.get(b.model)||0)+1;counts.set(b.model,count);if(b.model==='claude-sonnet-4-6'&&count===1)return response(b.model,{});if(b.model==='claude-sonnet-4-6')correction=b.messages[0].content.includes('上一次输出未通过校验');return response(b.model,b.model==='gpt-5.4'?fixture():opinion);});assert.equal(counts.get('claude-sonnet-4-6'),2);assert(correction);});
test('只向授权网关发送密钥，拒绝跳转和其他域名',async()=>{await assert.rejects(()=>requestJSON('model','system',{}, {...env,API_BASE:'https://elsewhere.test/v1'},new AbortController().signal,()=>{throw Error('Should not call');}),/允许列表/);await assert.rejects(()=>requestJSON('model','system',{},env,new AbortController().signal,async(url,init)=>{assert.equal(init.redirect,'manual');return new Response('',{status:302,headers:{Location:'https://elsewhere.test'}});}),/不可用/);});
test('单次请求有超时，父级取消立即停止',async()=>{const fetcher=(url,init)=>new Promise((resolve,reject)=>{init.signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true});});const started=Date.now(),keep=setTimeout(()=>{},1000);try{await assert.rejects(()=>requestJSON('model','system',{},env,new AbortController().signal,fetcher,20),/超时/);assert(Date.now()-started<800);const control=new AbortController();setTimeout(()=>control.abort(),10);await assert.rejects(()=>requestJSON('model','system',{},env,control.signal,fetcher,5000),/取消/);}finally{clearTimeout(keep);}});
test('全局取消不再重试或切换备用模型',async()=>{const control=new AbortController();let calls=0;const fetching=(url,init)=>new Promise((resolve,reject)=>{calls++;init.signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true});});setTimeout(()=>control.abort(),10);await assert.rejects(()=>analyze(demoAnswers,env,()=>{},control.signal,fetching),/取消/);assert.equal(calls,3);});
test('异常超大上游响应被有界拒绝，不作为有效规划',async()=>{await assert.rejects(()=>requestJSON('model','system',{},env,new AbortController().signal,async()=>new Response('x'.repeat(250000))),/格式校验/);});
test('未知有效期不得断言在招，过去的行动时间被拒绝',()=>{assert.throws(()=>auditFacts({summary:'本地有岗位在招（有效期未公布）'},'2026-10-02'),/有效期/);assert.throws(()=>auditFacts({summary:'优先建议你在2025年上半年尝试本地实习'},'2026-10-02'),/已经过去/);assert.throws(()=>auditFacts({summary:'建议你在2026年上半年安排申请'},'2026-10-02'),/已经过去/);assert.doesNotThrow(()=>auditFacts({summary:'需核实岗位是否在招；本周整理项目，2025年的章程仅作历史参考'},'2026-10-02'));});


test('独立模型必须各自提出完整路径，只有短意见时不进入综合',async()=>{
 let decisionCalls=0;await assert.rejects(()=>analyze(demoAnswers,env,()=>{},new AbortController().signal,async(u,init)=>{const b=JSON.parse(init.body),input=JSON.parse(b.messages[1].content);if(input.independent_opinions)decisionCalls++;return response(b.model,{summary:'只给一句建议',preferred:'实践',risks:[],missing:[],evidence_ids:[]});}),/不足两份/);assert.equal(decisionCalls,0);
});
test('综合阶段收到独立路径的可行性、长期发展与杠杆及相同筛选资料包',async()=>{
 const inputs=[];await analyze(demoAnswers,env,()=>{},new AbortController().signal,async(u,init)=>{const b=JSON.parse(init.body),input=JSON.parse(b.messages[1].content);inputs.push(input);return response(b.model,input.independent_opinions?fixture():opinion);});
 const decision=inputs.find(x=>x.independent_opinions);for(const o of decision.independent_opinions){assert.equal(o.routes.length,2);assert(o.routes.every(r=>r.feasibility&&r.development&&r.risk&&r.lever));}for(const input of inputs)assert.deepEqual(input.evidence,decision.evidence);
});

test('路径名称不匹配时给出具体纠正要求，修正后才进入综合',async()=>{
 const counts=new Map(),events=[];let corrected=false;
 const result=await analyze(demoAnswers,env,e=>events.push(e),new AbortController().signal,async(u,init)=>{
  const body=JSON.parse(init.body),input=JSON.parse(body.messages[1].content),count=(counts.get(body.model)||0)+1;counts.set(body.model,count);
  if(input.independent_opinions)return response(body.model,fixture());
  if(body.model==='deepseek-v4-flash'&&count===1)return response(body.model,{...opinion,preferred:opinion.preferred+'，需要先验证'});
  if(body.model==='deepseek-v4-flash')corrected=body.messages[0].content.includes('preferred 必须逐字等于');
  return response(body.model,opinion);
 });
 assert(corrected);assert.equal(counts.get('deepseek-v4-flash'),2);assert.equal(result.committee.length,3);assert.equal(result.degraded,false);
 assert(events.some(e=>e.validationIssue?.includes('preferred 必须逐字等于')));
});
