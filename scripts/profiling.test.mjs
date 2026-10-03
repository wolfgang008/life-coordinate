import test from 'node:test';
import assert from 'node:assert/strict';
import {checkedModel} from '../src/profiling/engine.mjs';

const env={API_KEY:'x'.repeat(40),API_BASE:'https://api.openai-next.com/v1',PLANNER_MODEL_1:'alpha',PLANNER_FALLBACK_1:'alpha-fast',PLANNER_MODEL_2:'beta',PLANNER_MODEL_3:'gamma',DECISION_MODEL:'decision',DECISION_FALLBACKS:'decision-fast'};
const reply=value=>new Response(JSON.stringify({model:'returned-model',choices:[{message:{content:JSON.stringify(value)}}],usage:{prompt_tokens:10,completion_tokens:12}}),{status:200,headers:{'Content-Type':'application/json'}});

test('规划模型超时后使用配置备用模型，并限制响应预算',async()=>{
  const calls=[];
  const result=await checkedModel('alpha','prompt',{answers:{stage:'school'}},env,AbortSignal.timeout(2000),x=>x,async(_url,options)=>{
    const request=JSON.parse(options.body);calls.push(request);
    if(request.model==='alpha')throw Error('simulated timeout');
    return reply({valid:true});
  },1900);
  assert.equal(result.usedModel,'alpha-fast');assert.equal(result.fallback,true);assert.equal(calls.length,2);
  assert.ok(calls.every(x=>x.max_tokens<=1900));assert.ok(calls.every(x=>!JSON.stringify(x.messages).includes('__maxTokens')));
});

test('结构不合格只在同模型修正一次，然后切到备用模型',async()=>{
  const calls=[];
  const result=await checkedModel('alpha','prompt',{answers:{}},env,AbortSignal.timeout(2000),x=>{if(!x.valid)throw Error('invalid');return x;},async(_url,options)=>{
    const request=JSON.parse(options.body);calls.push(request.model);
    return reply({valid:request.model==='alpha-fast'});
  },1900);
  assert.equal(result.usedModel,'alpha-fast');assert.deepEqual(calls,['alpha','alpha','alpha-fast']);
});

test('综合模型备用序列排除已参与独立判断的模型',async()=>{
  const calls=[];
  const result=await checkedModel('decision','prompt',{independent_opinions:[]},env,AbortSignal.timeout(2000),x=>x,async(_url,options)=>{
    const request=JSON.parse(options.body);calls.push(request.model);
    if(request.model==='decision')throw Error('simulated timeout');
    return reply({valid:true});
  },3000,'decision');
  assert.equal(result.usedModel,'decision-fast');assert.deepEqual(calls,['decision','decision-fast']);
});
