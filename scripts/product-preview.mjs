// QA only: a fresh in-memory database; never opens the user's local or remote D1.
import http from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {localHarness} from './lib/local-harness.mjs';
import {adaptiveFixture} from './lib/interview-fixture.mjs';
import {profileFixture,directionFixture,modelReply} from './lib/ai-fixtures.mjs';
const live=process.env.ENABLE_LIVE_AI==='1',nativeFetch=globalThis.fetch;
let config={};if(live)config=JSON.parse((await readFile(new URL('../.local/deepseek.json',import.meta.url),'utf8')).replace(/^\uFEFF/,''));
let mode='success';const calls=[],h=await localHarness({API_KEY:live?(process.env.API_KEY||config.apiKey):'qa-only',API_BASE:'https://api.deepseek.com'});
const output=new URL('../qa/product-audit/',import.meta.url);await mkdir(output,{recursive:true});
globalThis.fetch=async(url,options)=>{
 if(url!=='https://api.deepseek.com/chat/completions')return nativeFetch(url,options);
 const b=JSON.parse(options.body),input=JSON.parse(b.messages[1].content),task=input.task|| (input.answerSourceIds?'profile':input.independent_opinions?'decision':'independent'),call={model:b.model,task,live,started:new Date().toISOString()};calls.push(call);
 if(live){const result=await nativeFetch(url,options);call.status=result.status;if(result.ok){const d=await result.clone().json();call.returned=d.model;call.usage=d.usage;}await writeFile(new URL('live-calls.json',output),JSON.stringify(calls,null,2));return result;}
 if(mode==='balance')return new Response('',{status:402});
 if(mode==='stall')return new Promise((resolve,reject)=>{if(options.signal.aborted)return reject(Error('Cancelled'));options.signal.addEventListener('abort',()=>reject(Error('Cancelled')),{once:true});});
 if(input.task==='adaptive_interview')return modelReply(b.model,adaptiveFixture(input.answers));
 const sourceId=input.answers.ai_process?'ai_process':'experience',value=input.answers[sourceId]||input.answers.experience||'来自测试选择的回答';
 if(input.answerSourceIds){const p=profileFixture({...input.answers,experience:value});p.interestHypotheses[0].sourceIds=[sourceId];p.interestHypotheses[0].quotes=[value];p.insight.sourceIds=[sourceId];return modelReply(b.model,p);}
 const d=directionFixture();d.coreInsight.personalSourceIds=[sourceId];d.routes[0].personalSourceIds=[sourceId];return modelReply(b.model,d);
};
const server=http.createServer(async(req,res)=>{try{
 if(!live&&req.url.startsWith('/__qa/')){if(req.method==='POST'){const pieces=[];for await(const c of req)pieces.push(c);mode=JSON.parse(Buffer.concat(pieces)).mode;}res.setHeader('Content-Type','application/json');res.end(JSON.stringify({mode,calls,productionTouched:false}));return;}
 const pieces=[];for await(const c of req)pieces.push(c);const raw=Buffer.concat(pieces).toString();
 if(!live&&mode==='offline'&&req.url==='/api/config'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ready:false}));return;}
 const r=await h.request(req.url,raw?JSON.parse(raw):undefined);res.writeHead(r.status,Object.fromEntries(r.headers));
 const reader=r.body?.getReader();if(reader){res.on('close',()=>{if(!res.writableEnded)reader.cancel().catch(()=>{});});for(;;){const c=await reader.read();if(c.done||res.destroyed)break;res.write(Buffer.from(c.value));}}res.end();
 }catch{if(!res.headersSent)res.writeHead(500);res.end('QA request failed');}});
const port=Number(process.env.PRODUCT_PREVIEW_PORT||8789);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid preview port');
server.listen(port,'127.0.0.1',()=>console.log('http://127.0.0.1:'+port+' · '+(live?'真实 DeepSeek / 隔离数据库':'模拟 AI / 隔离数据库')));
process.on('SIGINT',async()=>{server.closeAllConnections();server.close();await h.close();process.exit();});
