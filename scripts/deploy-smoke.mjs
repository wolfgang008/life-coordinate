import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {sampleAnswers,stages} from '../public/core.js';
import {guardResult} from '../src/ai.mjs';

const base='https://life-coordinate.wolfgang13450.workers.dev';
const reportName=process.argv.find(arg=>arg.startsWith('--report='))?.slice(9)||'cloudflare-deploy-smoke-20261002.json';
if(!/^[a-z0-9-]+\.json$/.test(reportName))throw Error('核验报告文件名不正确。');
const report={checkedAt:new Date().toISOString(),url:base,syntheticProfile:true,checks:[],live:{status:'not_run'}};
let cookie='';
async function request(path,method='GET',body,useSession=true){
 const response=await fetch(base+path,{method,redirect:'error',headers:{...(method!=='GET'?{'Content-Type':'application/json',Origin:base}:{}),...(useSession&&cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(path==='/api/plan'?195000:30000)});
 if(useSession&&response.headers.get('Set-Cookie'))cookie=response.headers.get('Set-Cookie').split(';')[0];
 return response;
}
function passed(name,details={}){report.checks.push({name,passed:true,...details});console.log(name+'：通过');}
try{
 const configResponse=await request('/api/config');assert.equal(configResponse.status,200);assert.equal(configResponse.headers.get('Cache-Control'),'no-store');assert.equal(cookie,'');
 const config=await configResponse.json();assert.equal(config.version,4);assert.equal(config.ready,true);assert.equal(config.database,true);passed('生产 AI 与 D1 配置可用',{version:config.version});
 const assets=await Promise.all((await readdir(new URL('../public/',import.meta.url))).map(async name=>{
  const response=await request('/'+name,'GET',null,false);assert.equal(response.status,200,name);
  const text=await response.text(),local=await readFile(new URL('../public/'+name,import.meta.url),'utf8');assert.equal(text,local,name);
  assert.ok(response.headers.get('Content-Security-Policy')?.includes("frame-ancestors 'none'"));assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
  assert.equal(response.headers.get('ETag')?.replace(/^W\//,''),'"'+createHash('sha256').update(local).digest('hex').slice(0,24)+'"');return name;
 }));passed('所有线上静态资源与本次构建一致',{assets});
 for(const {value:stage} of stages){const response=await request('/api/demo','POST',{confirmed:true,persist:false,answers:sampleAnswers(stage)});assert.equal(response.status,200);const result=await response.json();assert.equal(result.id,null);assert.equal(guardResult(result.plan,sampleAnswers(stage)).routes.length,3);}
 passed('五个阶段的线上规则规划');
 const state=await (await request('/api/state')).json();assert.equal(state.plans.length,0);assert.equal(state.draft,null);passed('游客规划不写入云端画像');
 const answers=sampleAnswers('senior');
 const badOrigin=await fetch(base+'/api/draft',{method:'PUT',headers:{'Content-Type':'application/json',Origin:'https://example.invalid',Cookie:cookie},body:JSON.stringify({cloudConsent:true,answers}),signal:AbortSignal.timeout(30000)});assert.equal(badOrigin.status,403);passed('跨站写入被拒绝');
 const rejected=await request('/api/draft','PUT',{answers});assert.equal(rejected.status,400);passed('未同意云端保存时拒绝写入');
 assert.equal((await request('/api/draft','PUT',{answers,index:0,confirmed:true,cloudConsent:true,mode:'demo'})).status,200);
 assert.deepEqual((await (await request('/api/state')).json()).draft.answers,answers);
 const saved=await (await request('/api/demo','POST',{confirmed:true,persist:true,answers})).json();assert.ok(saved.id);
 const route=saved.plan.routes[0];const notes={source:'部署核验：虚构资料',proof:'完成接口核验',feedback:'',next:''};
 const actionResponse=await request('/api/plans/'+saved.id+'/actions','PUT',{routeId:route.id,completed:[0],notes,revision:0});assert.equal(actionResponse.status,200);assert.equal((await actionResponse.json()).revision,1);
 const reopened=await (await request('/api/plans/'+saved.id)).json();assert.deepEqual(reopened.actions[0].completed,[0]);assert.equal(reopened.actions[0].notes.proof,notes.proof);passed('D1 草稿、规划与行动保存读取');
 assert.equal((await request('/api/plans/'+saved.id,'GET',null,false)).status,404);passed('匿名会话之间隔离档案');
 if(process.argv.includes('--live')){
  const started=Date.now();report.live={status:'running',answers};
  const response=await request('/api/plan','POST',{requestId:randomUUID(),confirmed:true,aiConsent:true,persist:false,answers});assert.equal(response.status,200);
  const events=[];let buffered='';const reader=response.body.getReader(),decoder=new TextDecoder();
  for(;;){const chunk=await reader.read();if(chunk.done)break;buffered+=decoder.decode(chunk.value,{stream:true});let index;while((index=buffered.indexOf('\n'))!==-1){const line=buffered.slice(0,index);buffered=buffered.slice(index+1);if(!line.trim())continue;const event=JSON.parse(line);events.push(event);if(event.type==='progress')console.log(event.message);}}
  if(buffered.trim())events.push(JSON.parse(buffered));
  const result=events.find(e=>e.type==='result'),error=events.find(e=>e.type==='error');
  report.live={status:result?'passed':'failed',elapsedMs:Date.now()-started,answers,events};
  assert.ok(result,error?.message||'未返回分析结果');assert.equal(result.plan.mode,'live');assert.equal(result.planId,null);assert.equal(guardResult(result.plan,answers).routes.length,3);assert.ok(result.plan.committee.length>=2);assert.ok(result.plan.coreConflict);
  passed('真实网关到生产 Worker 的 AI 完整分析',{elapsedMs:report.live.elapsedMs,modelCount:result.plan.committee.length,degraded:result.plan.degraded,usage:result.plan.usage});
 }
 report.passed=true;
}catch(error){report.passed=false;report.error=error.message;console.error(error.message);process.exitCode=1;}
finally{
 if(cookie){try{const clear=await request('/api/clear','DELETE');assert.equal(clear.status,200);passed('只清理核验脚本创建的独立测试会话');}catch(error){report.cleanupError=error.message;report.passed=false;process.exitCode=1;}}
 await writeFile(new URL('../qa/'+reportName,import.meta.url),JSON.stringify(report,null,2));
 console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,live:report.live.status}));
}
