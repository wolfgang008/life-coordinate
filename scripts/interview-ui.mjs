// Browser regression against an isolated Worker + in-memory D1 + simulated official API.
// This script never reads a real key or calls a paid model.
import http from 'node:http';
import {adaptiveFixture} from './lib/interview-fixture.mjs';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {localHarness} from './lib/local-harness.mjs';
import {profileFixture,directionFixture,modelReply} from './lib/ai-fixtures.mjs';
const root=new URL('../',import.meta.url),output=new URL('qa/live/interview-ui/',root),profileDir=new URL('.tmp/chrome-'+crypto.randomUUID()+'/',root);await mkdir(output,{recursive:true});await mkdir(profileDir,{recursive:true});
const calls=[];const pause=ms=>new Promise(r=>setTimeout(r,ms)),nativeFetch=globalThis.fetch;let mode='stall',h=await localHarness({API_KEY:'mock-only'}),browser,socket;
globalThis.fetch=async(u,options)=>{
 if(u!=='https://api.deepseek.com/chat/completions')return nativeFetch(u,options);
 if(mode==='balance')return new Response('',{status:402});
 if(mode==='stall')return new Promise((resolve,reject)=>{if(options.signal.aborted){reject(Error('canceled'));return;}options.signal.addEventListener('abort',()=>reject(Error('canceled')),{once:true});});
 const b=JSON.parse(options.body),input=JSON.parse(b.messages[1].content);calls.push({model:b.model,task:input.task|| (input.answerSourceIds?'profile':input.independent_opinions?'decision':'independent')});
 if(input.task==='adaptive_interview')return modelReply(b.model,adaptiveFixture(input.answers));
 if(input.answerSourceIds){const p=profileFixture({...input.answers,experience:input.answers.ai_process});p.interestHypotheses[0].sourceIds=['ai_process'];p.interestHypotheses[0].quotes=[input.answers.ai_process];p.insight.sourceIds=['ai_process'];if(input.answers.feedback&&!input.answers.followup)p.nextQuestion={question:'哪一部分愿意继续？',purpose:'区分反馈中的兴趣线索',affects:'第一行动',options:['整理线索','做出成果','目前还不知道']};return modelReply(b.model,p);}
 const d=directionFixture();d.coreInsight.personalSourceIds=['ai_process'];d.routes[0].personalSourceIds=['ai_process'];return modelReply(b.model,d);
};
const server=http.createServer(async(req,res)=>{try{
 const parts=[];for await(const c of req)parts.push(c);const raw=Buffer.concat(parts).toString(),response=await h.request(req.url,raw?JSON.parse(raw):undefined);res.writeHead(response.status,Object.fromEntries(response.headers));
 const reader=response.body?.getReader();if(reader){res.on('close',()=>{if(!res.writableEnded)reader.cancel().catch(()=>{});});for(;;){const r=await reader.read();if(r.done||res.destroyed)break;res.write(Buffer.from(r.value));}}res.end();
 }catch{if(!res.headersSent)res.writeHead(500);res.end('Test service failed');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,port=9437,report={checkedAt:new Date().toISOString(),simulated:true,paidCalls:0,viewports:[]};
try{
 browser=spawn(process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--disable-extensions','--remote-debugging-port='+port,'--user-data-dir='+fileURLToPath(profileDir),'about:blank'],{stdio:'ignore',windowsHide:true});
 let pages;for(let i=0;i<60;i++){try{pages=await (await nativeFetch('http://127.0.0.1:'+port+'/json/list',{signal:AbortSignal.timeout(1000)})).json();break;}catch{await pause(100);}}assert(pages);
 socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{socket.addEventListener('open',r,{once:true});socket.addEventListener('error',j,{once:true});});
 let next=0;const pending=new Map(),errors=[];socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}});
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++next,timer=setTimeout(()=>{pending.delete(id);reject(Error('Browser command timeout: '+method));},5000);pending.set(id,{resolve:r=>{clearTimeout(timer);resolve(r);},reject:e=>{clearTimeout(timer);reject(e);}});socket.send(JSON.stringify({id,method,params}));});
 async function evaluate(expression){const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
 async function waitFor(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await pause(50);}throw Error('UI timeout: '+expression);}
 async function click(selector){await waitFor('!!document.querySelector('+JSON.stringify(selector)+')');await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(e.disabled)throw Error('Disabled control');e.scrollIntoView({block:'center',behavior:'instant'});e.click();})()`);await pause(100);}
 async function capture(width,name){await evaluate('window.scrollTo(0,0)');await pause(100);const img=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(new URL(width+'-'+name+'.png',output),Buffer.from(img.data,'base64'));assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'horizontal overflow '+name);}
 async function confirm(){for(const selector of ['[data-confirm][data-value="accepted"]','[data-constraint]']){const count=await evaluate('document.querySelectorAll('+JSON.stringify(selector)+').length');for(let i=0;i<count;i++)await evaluate(`document.querySelectorAll(${JSON.stringify(selector)})[${i}].click()`);}await click('[data-command="plan"]');}
 await call('Page.enable');await call('Runtime.enable');
 for(const [width,height] of [[1440,900],[1366,768],[1280,720],[390,844],[375,812],[844,390],[720,450]]){
  if(report.viewports.length){await h.close();h=await localHarness({API_KEY:'mock-only'});}mode='stall';const initialCalls=calls.length;
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await call('Page.navigate',{url:base});await waitFor('!!document.querySelector("[data-command=start]")');await evaluate('localStorage.clear();location.reload()');await pause(150);await waitFor('!!document.querySelector("[data-command=start]")');await click('[data-command="start"]');await waitFor('!!document.querySelector("#interview-form")');
  let questions=0,fieldTested=false;for(;questions<30;questions++){
   if(await evaluate('!!document.querySelector("[data-command=generate-questions]")'))break;
   const geometry=await evaluate(`(()=>{const b=document.querySelector('button[form=interview-form]'),r=b.getBoundingClientRect();return {bottom:r.bottom,top:r.top,within:r.bottom<=innerHeight&&r.top>=0};})()`);
   if(height>500)assert(geometry.within,'next button outside viewport '+width);
   if(await evaluate('!!document.querySelector("input[name=answer][type=checkbox]")')){
    await evaluate('document.querySelectorAll("input[name=answer]")[0].click();document.querySelectorAll("input[name=answer]")[1].click()');
    if(!fieldTested){assert.equal(await evaluate('document.querySelectorAll("input[name=answer]:checked").length'),2);await capture(width+'x'+height,'multiple');
     await evaluate('document.querySelector("input[name=answer]").focus()');for(let i=0;i<2;i++){await call('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});await call('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});assert.equal(await evaluate('document.querySelectorAll("input[name=answer]:checked").length'),i===0?1:2);}
     await evaluate('document.querySelectorAll(".answer-option")[document.querySelectorAll(".answer-option").length-1].scrollIntoView({block:"center"})');await pause(50);
     if(height>500)assert(await evaluate('(()=>{const r=[...document.querySelectorAll(".answer-option")].at(-1).getBoundingClientRect(),bar=document.querySelector(".question-actions").getBoundingClientRect();return r.top>=0&&r.bottom<=bar.top;})()'),'last option obscured by action bar');fieldTested=true;}
   }else await evaluate('document.querySelector("input[name=answer]").click()');
   await click('#interview-form button[type="submit"]');if(await evaluate('!!document.querySelector("#question-title")'))assert(await evaluate('document.activeElement.id==="question-title"'),'focus did not move to question');
  }assert.equal(questions,11);await capture(width+'x'+height,'ready');
  await click('[data-command="generate-questions"]');await click('[data-command="consent-questions"]');await waitFor('!!document.querySelector("[data-command=cancel-questions]")');await click('[data-command="cancel-questions"]');await pause(100);assert.equal(h.db.sql.prepare("SELECT COUNT(*) n FROM atlas_jobs WHERE status='running'").get().n,0);
  mode='balance';await click('[data-command="generate-questions"]');await waitFor('document.querySelector("#main").textContent.includes("服务额度暂时不足")');await capture(width+'x'+height,'generation-error');
  mode='success';await click('[data-command="generate-questions"]');await waitFor('!!document.querySelector("#question-title")&&document.querySelector(".question-meta").textContent.includes("AI")');await capture(width+'x'+height,'ai-question');
  await evaluate('document.querySelectorAll("input[name=answer]")[0].click();document.querySelectorAll("input[name=answer]")[1].click()');assert.equal(await evaluate('document.querySelectorAll("input[name=answer]:checked").length'),2);
  const beforeRefresh=calls.length;await call('Page.reload');await pause(150);await waitFor('!!document.querySelector("#question-title")');assert.equal(calls.length,beforeRefresh);assert.equal(await evaluate('document.querySelectorAll("input[name=answer]:checked").length'),2);
  await click('button[form=interview-form]');await evaluate('document.querySelector("input[value=unknown]").click()');await click('button[form=interview-form]');await click('[data-command="finish-interview"]');await waitFor('!!document.querySelector("#ai-consent")');await click('#ai-consent');await click('[data-command="understand"]');await waitFor('!!document.querySelector("[data-confirm]")');await confirm();await waitFor('location.hash==="#/result"');assert(await evaluate('document.querySelector("#main").textContent.includes("两份独立判断")'));await capture(width+'x'+height,'result');
  await click('[data-command="primary-action"]');await waitFor('!!document.querySelector("[data-note]")');await evaluate(`(()=>{const e=document.querySelector('[data-note="continue"]');e.value='喜欢解释理由，也想比较做出成果的过程。';e.dispatchEvent(new Event('input',{bubbles:true}));})()`);await click('[data-command="review"]');await waitFor('!!document.querySelector("input[name=followup-answer]")');await click('input[name=followup-answer][value="目前还不知道"]');await click('[data-command="followup"]');await waitFor('!!document.querySelector("[data-confirm]")');assert(await evaluate('document.querySelector("#main").textContent.includes("本次新增的实践反馈")'));await confirm();await waitFor('location.hash==="#/result"');assert.equal(await evaluate('JSON.parse(localStorage.getItem("life-coordinate-atlas-v5")).records.length'),2);assert(await evaluate('document.querySelector("#main").textContent.includes("对比上一份规划")'));await capture(width+'x'+height,'reviewed');
  report.viewports.push({width,height,passed:true,interviewQuestions:questions,multiselect:true,keyboardSpace:true,questionFocus:true,lastOptionVisible:true,pinnedAction:height>500,landscape:width===844,zoomEquivalent:width===720,aiGeneration:true,generationCancel:true,balanceRecovery:true,refreshWithoutRecall:true,fullFlow:true,review:true,reviewFollowupPreservesFeedback:true,modelCalls:calls.length-initialCalls});console.log(JSON.stringify(report.viewports.at(-1)));
  if(width===1440){await click('[data-command="revise"]');for(let i=0;i<11;i++)await click('button[form=interview-form]');await click('[data-command="deepen"]');assert(await evaluate('document.querySelector("#question-title").textContent.includes("升学的准备情况")'));report.optionalBackgroundStartsAtFirstMissing=true;}
 }assert.deepEqual(errors,[]);report.passed=true;
}catch(e){report.passed=false;report.error=e.message;console.error(e.message);process.exitCode=1;}
finally{socket?.close();browser?.kill();globalThis.fetch=nativeFetch;server.closeAllConnections();server.close();await h.close();await writeFile(new URL('summary.json',output),JSON.stringify(report,null,2));}
