// Browser regression against an isolated Worker + in-memory D1 + simulated official API.
// This script never reads a real key or calls a paid model.
import http from 'node:http';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {localHarness} from './lib/local-harness.mjs';
import {profileFixture,directionFixture,modelReply} from './lib/ai-fixtures.mjs';
const root=new URL('../',import.meta.url),output=new URL('qa/live/ui/',root),profileDir=new URL('.tmp/chrome-'+crypto.randomUUID()+'/',root);await mkdir(output,{recursive:true});await mkdir(profileDir,{recursive:true});
const pause=ms=>new Promise(r=>setTimeout(r,ms)),nativeFetch=globalThis.fetch;let mode='stall',h=await localHarness({API_KEY:'mock-only'}),browser,socket;
globalThis.fetch=async(u,options)=>{
 if(u!=='https://api.deepseek.com/chat/completions')return nativeFetch(u,options);
 if(mode==='balance')return new Response('',{status:402});
 if(mode==='stall')return new Promise((resolve,reject)=>{options.signal.addEventListener('abort',()=>reject(Error('canceled')),{once:true});});
 const b=JSON.parse(options.body),input=JSON.parse(b.messages[1].content);return modelReply(b.model,input.answerSourceIds?profileFixture({...input.answers,experience:input.answers.experience||input.answers.process||'用户选择的过程偏好'}):directionFixture());
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
 for(const width of [390,1440]){
  if(report.viewports.length){await h.close();h=await localHarness({API_KEY:'mock-only'});}mode='stall';
  await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===390});await call('Page.navigate',{url:base});await waitFor('!!document.querySelector("[data-command=start]")');await evaluate('localStorage.clear();location.reload()');await waitFor('!!document.querySelector("[data-command=start]")');await capture(width,'home');
  await pause(200);await click('[data-command="start"]');await waitFor('!!document.querySelector("#interview-form")');
  let questions=0;for(;questions<45;questions++){
   if(await evaluate('!!document.querySelector("[data-command=finish-interview]")'))break;
   if(await evaluate('!!document.querySelector("input[name=answer]")'))await evaluate('document.querySelector("input[name=answer]").click()');
   else if(await evaluate('!!document.querySelector("[data-command=skip]")')){await click('[data-command="skip"]');continue;}
   else throw Error('Unknown interview screen: '+await evaluate('document.querySelector("#main").innerText.slice(0,500)'));
   await click('#interview-form button[type="submit"]');
  }assert(questions<45);await click('[data-command="finish-interview"]');
  // Add an explicit optional experience, keeping the actual interview choices.
  await evaluate(`(()=>{const k='life-coordinate-atlas-v5',s=JSON.parse(localStorage.getItem(k));s.answers.experience='组织读书分享时，我喜欢整理同学的不同观点并写成短文。';localStorage.setItem(k,JSON.stringify(s));location.reload();})()`);await waitFor('!!document.querySelector("#ai-consent")');
  await click('#ai-consent');await click('[data-command="understand"]');await waitFor('!!document.querySelector("[data-command=cancel]")');await capture(width,'waiting');await click('[data-command="cancel"]');await waitFor('location.hash==="#/profile"');await pause(100);
  assert.equal(h.db.sql.prepare("SELECT COUNT(*) n FROM atlas_jobs WHERE status='running'").get().n,0);
  mode='balance';await click('[data-command="understand"]');await waitFor('document.querySelector("#main").textContent.includes("服务额度暂时不足")');await capture(width,'balance-error');assert(await evaluate('!!JSON.parse(localStorage.getItem("life-coordinate-atlas-v5")).answers.stage'));assert.equal(await evaluate('document.querySelectorAll(".pipeline-row[data-status=running]").length'),0);
  mode='success';await click('[data-command="retry"]');await waitFor('!!document.querySelector("[data-confirm]")');await capture(width,'profile');await confirm();await waitFor('location.hash==="#/result"');await capture(width,'result');
  await click('[data-command="primary-action"]');await waitFor('!!document.querySelector("[data-note]")');await capture(width,'action');
  await evaluate(`(()=>{const e=document.querySelector('[data-note="continue"]');e.value='喜欢归纳观点，但查资料耗时，愿意再试。';e.dispatchEvent(new Event('input',{bubbles:true}));})()`);await click('[data-command="review"]');await waitFor('!!document.querySelector("[data-confirm]")');await confirm();await waitFor('location.hash==="#/result"');assert.equal(await evaluate('JSON.parse(localStorage.getItem("life-coordinate-atlas-v5")).records.length'),2);
  await call('Page.reload');await waitFor('!!document.querySelector("[data-command=primary-action]")');assert.equal(await evaluate('JSON.parse(localStorage.getItem("life-coordinate-atlas-v5")).records.length'),2);await capture(width,'reviewed');
  report.viewports.push({width,height:900,passed:true,interviewQuestions:questions,cancel:true,balanceFailure:true,retry:true,fullFlow:true,review:true,refresh:true});console.log(JSON.stringify(report.viewports.at(-1)));
 }assert.deepEqual(errors,[]);report.passed=true;
}catch(e){report.passed=false;report.error=e.message;console.error(e.message);process.exitCode=1;}
finally{socket?.close();browser?.kill();globalThis.fetch=nativeFetch;server.closeAllConnections();server.close();await h.close();await writeFile(new URL('summary.json',output),JSON.stringify(report,null,2));}
