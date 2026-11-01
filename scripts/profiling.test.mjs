import test from 'node:test';
import assert from 'node:assert/strict';
import {checkedModel,understand,directions} from '../src/profiling/engine.mjs';
import {sampleInput} from '../public/domain/stages.js';
import {requestJSON,aiConfig} from '../src/ai.mjs';
import {validateDirection,validateProfile} from '../public/domain/contracts.js';
import {profileFixture,directionFixture} from './lib/ai-fixtures.mjs';

const env={API_KEY:'x'.repeat(40),API_BASE:'https://api.deepseek.com'};
const reply=(value,model='deepseek-flash')=>Response.json({model,choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}],usage:{prompt_tokens:10,completion_tokens:12}});

test('规划连接失败只重试同模型一次，并限制响应预算',async()=>{
  const calls=[];
  const result=await checkedModel('deepseek-flash','prompt',{answers:{stage:'school'}},env,AbortSignal.timeout(2000),x=>x,async(_url,options)=>{
    const request=JSON.parse(options.body);calls.push(request);
    if(calls.length===1)throw Error('simulated timeout');
    return reply({valid:true});
  },1900);
  assert.equal(result.usedModel,'deepseek-flash');assert.equal(result.fallback,false);assert.equal(calls.length,2);
  assert.ok(calls.every(x=>x.max_tokens<=3000));assert.ok(calls.every(x=>!JSON.stringify(x.messages).includes('__maxTokens')));
});

test('结构不合格只在同模型修正一次，不切换到另一底座',async()=>{
  const calls=[];
  const result=await checkedModel('deepseek-flash','prompt',{answers:{}},env,AbortSignal.timeout(2000),x=>{if(!x.valid)throw Error('invalid');return x;},async(_url,options)=>{
    const request=JSON.parse(options.body);calls.push(request.model);
    if(calls.length===2)assert.match(request.messages[0].content,/上次结构未通过校验/);
    return reply({valid:calls.length===2});
  },1900);
  assert.equal(result.usedModel,'deepseek-flash');assert.deepEqual(calls,['deepseek-flash','deepseek-flash']);
});

test('综合阶段合法复用 Pro，但必须发起新的请求',async()=>{
  const calls=[];
  const result=await checkedModel('deepseek-v4-pro','prompt',{independent_opinions:[]},env,AbortSignal.timeout(2000),x=>x,async(_url,options)=>{
    const request=JSON.parse(options.body);calls.push(request.model);
    return reply({valid:true},request.model);
  },3000,'decision');
  assert.equal(result.usedModel,'deepseek-v4-pro');assert.deepEqual(calls,['deepseek-v4-pro']);
});

test('官方 JSON 模式关闭思考，不传冲突参数，不保存推理内容',async()=>{
 const result=await requestJSON('deepseek-flash','JSON',{},env,new AbortController().signal,async(url,options)=>{
  assert.equal(url,'https://api.deepseek.com/chat/completions');assert.equal(options.redirect,'manual');
  const b=JSON.parse(options.body);assert.deepEqual(b.thinking,{type:'disabled'});assert.deepEqual(b.response_format,{type:'json_object'});assert(!('reasoning_effort' in b));
  return Response.json({model:b.model,choices:[{finish_reason:'stop',message:{content:'{"ok":true}',reasoning_content:'private-thinking'}}],usage:{prompt_tokens:12,completion_tokens:8}});
 });assert.deepEqual(result.value,{ok:true});assert(!JSON.stringify(result).includes('private-thinking'));assert.equal(result.usage.input,12);
});

for(const [status,code] of [[400,'parameter'],[401,'auth'],[402,'balance'],[422,'parameter'],[404,'unavailable'],[302,'redirect']])test('HTTP '+status+' 明确分类且不重试',async()=>{
 let calls=0;await assert.rejects(()=>checkedModel('deepseek-flash','JSON',{},env,AbortSignal.timeout(3000),v=>v,async()=>{calls++;return new Response('private upstream '+env.API_KEY,{status});}),e=>e.code===code&&!e.message.includes(env.API_KEY)&&!e.message.includes('private upstream'));assert.equal(calls,1);
});

for(const status of [429,500,503])test('HTTP '+status+' 有界同模型重试一次后停止',async()=>{
 let calls=0;await assert.rejects(()=>checkedModel('deepseek-flash','JSON',{},env,AbortSignal.timeout(3000),v=>v,async()=>{calls++;return new Response('',{status,headers:{'Retry-After':'0'}});}),e=>e.retry);assert.equal(calls,2);
});

for(const content of ['', '   ', '{"broken":', '[]'])test('无效 JSON 内容被拒绝：'+JSON.stringify(content),async()=>{
 let calls=0;await assert.rejects(()=>checkedModel('deepseek-flash','JSON',{},env,AbortSignal.timeout(3000),v=>v,async()=>{calls++;return Response.json({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{content}}]});}),e=>e.code==='output');assert.equal(calls,2);
});
test('完整 JSON 但 finish_reason=length 仍然失败',async()=>{await assert.rejects(()=>requestJSON('deepseek-flash','JSON',{},env,new AbortController().signal,async()=>Response.json({model:'deepseek-flash',choices:[{finish_reason:'length',message:{content:'{"ok":true}'}}]})),e=>e.code==='output');});
test('模型身份不符时拒绝，不用两个 Flash 冒充双模型',async()=>{await assert.rejects(()=>requestJSON('deepseek-v4-pro','JSON',{},env,new AbortController().signal,async()=>reply({ok:true})),e=>e.code==='identity');});
test('URL 白名单校验所有组件，配置检查不抛出且不泄露地址',async()=>{
 for(const base of ['http://api.deepseek.com','https://api.deepseek.com.evil.test','https://api.deepseek.com:444','https://user:pass@api.deepseek.com','https://api.deepseek.com/evil','https://api.deepseek.com?key=secret','https://api.deepseek.com/#bad','invalid']){
  assert.equal(aiConfig({...env,API_BASE:base}).ready,false);let called=false;
  await assert.rejects(()=>requestJSON('deepseek-flash','JSON',{}, {...env,API_BASE:base},new AbortController().signal,async()=>{called=true;}),e=>e.code==='config');assert(!called);
 }
});
test('已取消的请求不调用上游',async()=>{const c=new AbortController();c.abort();let calls=0;await assert.rejects(()=>checkedModel('deepseek-flash','JSON',{},env,c.signal,v=>v,async()=>{calls++;}),e=>e.code==='cancel');assert.equal(calls,0);});

test('响应头已到达但响应体停滞，超时与用户取消仍能终止读取',async()=>{
 const keep=setTimeout(()=>{},2000);try{for(const cancel of [false,true]){const c=new AbortController();if(cancel)setTimeout(()=>c.abort(),15);let canceled=false;const r=new Response(new ReadableStream({cancel(){canceled=true;}}));await assert.rejects(()=>requestJSON('deepseek-flash','JSON',{},env,c.signal,async()=>r,25),e=>e.code===(cancel?'cancel':'timeout'));assert(canceled);}}finally{clearTimeout(keep);}
});
test('输出修正和失败请求的 token 纳入同阶段用量',async()=>{
 let calls=0;const r=await checkedModel('deepseek-flash','JSON',{},env,new AbortController().signal,v=>{if(!v.ok)throw Error('missing');return v;},async()=>reply({ok:++calls===2}));assert.equal(r.attempts,2);assert.equal(r.usage.input,20);assert.equal(r.usage.output,24);
 calls=0;await assert.rejects(()=>checkedModel('deepseek-flash','JSON',{},env,new AbortController().signal,v=>v,async()=>{calls++;return Response.json({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{content:'  '}}],usage:{prompt_tokens:10,completion_tokens:5}});}),e=>e.usage.input===20&&e.usage.output===10);assert.equal(calls,2);
});
test('真实联调暴露的错误状态、文字条件和混淆引用均被守卫拒绝',()=>{
 const a=sampleInput(),p={...validateProfile(profileFixture(a),a),revision:1};for(const c of p.constraints)c.confirmed=true;
 for(const change of [v=>v.routes[0].state='exploring',v=>v.routes[0].requirements=['每周一小时'],v=>v.routes[0].claimRefs=['overview'],v=>v.routes[0].action.materialRefs=['overview'],v=>delete v.routes[0].title]){const v=directionFixture();change(v);assert.throws(()=>validateDirection(v,p,a,[]));}
});
test('父级等待上限与用户主动取消使用不同安全码',async()=>{
 const keep=setTimeout(()=>{},1000);try{await assert.rejects(()=>requestJSON('deepseek-flash','JSON',{},env,AbortSignal.timeout(15),async(u,i)=>new Promise((r,j)=>i.signal.addEventListener('abort',()=>j(Error()),{once:true})),1000),e=>e.code==='timeout');}finally{clearTimeout(keep);}
});
test('Retry-After 秒数、HTTP 日期和极端值均受到等待上限约束',async()=>{
 for(const header of ['2',new Date(Date.now()+60000).toUTCString(),'999999','invalid'])await assert.rejects(()=>requestJSON('deepseek-flash','JSON',{},env,new AbortController().signal,async()=>new Response('',{status:429,headers:{'Retry-After':header}})),e=>e.code==='busy'&&e.retryAfter>=0&&e.retryAfter<=4000&&(header!=='2'||e.retryAfter===2000));
});
test('缺少结束标记的响应不能视为成功',async()=>{await assert.rejects(()=>requestJSON('deepseek-flash','JSON',{},env,new AbortController().signal,async()=>Response.json({model:'deepseek-flash',choices:[{message:{content:'{"ok":true}'}}]})),e=>e.code==='output');});
test('双规划父级等待超时不会被重新标记为主动取消',async()=>{
 const a=sampleInput(),p={...validateProfile(profileFixture(a),a),revision:1};const keep=setTimeout(()=>{},1000);try{await assert.rejects(()=>directions(p,a,env,AbortSignal.timeout(20),()=>{},async(u,i)=>new Promise((r,j)=>i.signal.addEventListener('abort',()=>j(Error()),{once:true}))),e=>e.code==='timeout');}finally{clearTimeout(keep);}
});
