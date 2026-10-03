import {readFile,writeFile} from 'node:fs/promises';
import {analyze} from '../src/ai.mjs';
import {sampleAnswers} from '../public/core.js';
const started=Date.now(),events=[];
let privateConfig={};try{privateConfig=JSON.parse((await readFile(new URL('../.local/relay.json',import.meta.url),'utf8')).replace(/^\uFEFF/,''));}catch{}privateConfig.apiKey=process.env.API_KEY||privateConfig.apiKey;privateConfig.apiBase=process.env.API_BASE||privateConfig.apiBase;
if(!privateConfig.apiKey){await writeFile(new URL('../qa/v4-live-smoke.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),status:'not_run',reason:'本机未提供模型密钥，未请求外部服务。'},null,2));console.log('本机未提供模型密钥，未请求外部服务。');process.exit(2);}
const answers={...sampleAnswers('school'),major:'design',city:'杭州',hours:'5'};
try{
 const result=await analyze(answers,{API_KEY:privateConfig.apiKey,API_BASE:privateConfig.apiBase},event=>{events.push(event);console.log(JSON.stringify({phase:event.phase,provider:event.provider,status:event.status,message:event.message}));},AbortSignal.timeout(195000));
 const report={checkedAt:new Date().toISOString(),syntheticProfile:true,elapsedMs:Date.now()-started,passed:true,scope:'一次真实配置网关调用；高中毕业、设计方向示例；未执行生产发布或写入线上学生档案',answers,result,events};
 await writeFile(new URL('../qa/v4-live-smoke.json',import.meta.url),JSON.stringify(report,null,2));
 console.log(JSON.stringify({passed:true,elapsedMs:report.elapsedMs,routeCount:result.routes.length,mode:result.mode,degraded:result.degraded||false}));
}catch(error){
 const report={checkedAt:new Date().toISOString(),syntheticProfile:true,elapsedMs:Date.now()-started,passed:false,code:error.code||'service',message:error.message,events};
 await writeFile(new URL('../qa/v4-live-smoke.json',import.meta.url),JSON.stringify(report,null,2));
 console.log(JSON.stringify({passed:false,code:report.code,message:report.message}));process.exitCode=1;
}
