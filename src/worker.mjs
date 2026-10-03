import {analyze,aiConfig,circuitOpen,ModelError} from './ai.mjs';
import {sessionFor,sha256,saveDraft,readDraft,savePlan,getPlan,history,saveAction,allowance,cleanup,acquireJob,finishJob} from './db.mjs';
import {buildProfile,demoPlan,validateExperienceEvidence} from '../public/core.js';
import {atlasApi} from './profiling/api.mjs';
const embeddedAssets=__EMBEDDED_ASSETS__;
const security={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",'Permissions-Policy':'camera=(), microphone=(), geolocation=()'};
const json=(value,status=200,cookie)=>new Response(JSON.stringify(value),{status,headers:{...security,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});
async function payload(request){const reader=request.body?.getReader();if(!reader)throw Error('缺少请求内容。');let size=0;const parts=[];for(;;){const r=await reader.read();if(r.done)break;size+=r.value.byteLength;if(size>80000){await reader.cancel();throw Error('请求内容过长。');}parts.push(r.value);}const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}let data;try{data=JSON.parse(new TextDecoder().decode(bytes));}catch{throw Error('请求格式不正确。');}if(!data||Array.isArray(data)||typeof data!=='object')throw Error('请求格式不正确。');return data;}
export default {
 async fetch(request,env,ctx){const url=new URL(request.url),path=url.pathname;try{
  if(!path.startsWith('/api/')){const asset=embeddedAssets[path==='/'?'/index.html':path];if(!asset)return new Response('页面不存在。',{status:404,headers:security});if(!['GET','HEAD'].includes(request.method))return new Response('',{status:405,headers:security});return new Response(request.method==='HEAD'?null:asset.content,{headers:{...security,'Content-Type':asset.type,'Cache-Control':path==='/'||path==='/index.html'?'no-store':'no-cache',ETag:asset.etag}});}
  const cfg=aiConfig(env);if(path==='/api/config'&&request.method==='GET')return json({ready:cfg.ready&&!!env.DB,database:!!env.DB,providers:cfg.models.map(m=>({provider:m.provider,name:m.name})),apiHost:new URL(cfg.apiBase).hostname,version:5});
  if(!env.DB)return json({error:'服务暂未连接，仍可使用本地规则规划。'},503);
  if(!['GET','POST','PUT','DELETE'].includes(request.method))return json({error:'请求方法不支持。'},405);
  if(request.method!=='GET'){if(request.headers.get('Origin')!==url.origin)return json({error:'请从本站发起操作。'},403);if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'请求格式不正确。'},415);}
  const session=await sessionFor(request,env.DB),owner=session.id,reply=(v,s=200)=>json(v,s,session.cookie);
  if(['/api/profile/analyze','/api/profile/confirm','/api/direction','/api/review'].includes(path)&&request.method==='POST')return await atlasApi({request,path,env,ctx,owner,cookie:session.cookie,payload,reply,security});
  if(path==='/api/state'&&request.method==='GET'){const plans=await history(env.DB,owner);return reply({scope:(await sha256('public-context:'+owner)).slice(0,24),draft:await readDraft(env.DB,owner),plans,latest:plans[0]?await getPlan(env.DB,owner,plans[0].id):null});}
  if(path==='/api/draft'&&request.method==='PUT'){const body=await payload(request);if(body.cloudConsent!==true)return reply({error:'请先主动开启云端保存。'},400);await saveDraft(env.DB,owner,body);return reply({saved:true});}
  if(path==='/api/plans'&&request.method==='GET')return reply({plans:await history(env.DB,owner)});
  const planMatch=path.match(/^\/api\/plans\/([a-f0-9-]{36})$/);if(planMatch&&request.method==='GET'){const plan=await getPlan(env.DB,owner,planMatch[1]);return plan?reply(plan):reply({error:'未找到属于当前浏览器的规划。'},404);}
  const actionMatch=path.match(/^\/api\/plans\/([a-f0-9-]{36})\/actions$/);if(actionMatch&&request.method==='PUT')return reply(await saveAction(env.DB,owner,actionMatch[1],await payload(request)));
  if(path==='/api/clear'&&request.method==='DELETE'){await env.DB.prepare('DELETE FROM sessions WHERE id=?').bind(owner).run();return json({cleared:true},200,'lc_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'+(url.protocol==='https:'?'; Secure':''));}
  if(path==='/api/demo'&&request.method==='POST'){const body=await payload(request);if(body.confirmed!==true)throw Error('请先确认画像。');const profile=buildProfile(body.answers),plan=demoPlan(profile.answers,validateExperienceEvidence(body.experienceEvidence));if(body.persist!==true)return reply({plan,id:null});const saved=await savePlan(env.DB,owner,profile.answers,plan);return reply({...saved,plan});}
  if(path==='/api/plan'&&request.method==='POST'){
   if(!cfg.ready)return reply({error:'AI 服务暂不可用，可以使用本地规则规划。'},503);
   if(await circuitOpen(env.DB,'__gateway__'))return reply({error:'模型服务正在短暂休整，请稍后重试。画像与已有规划仍然保留。'},503);
   const body=await payload(request);if(body.confirmed!==true||body.aiConsent!==true)throw Error('请确认画像，并同意将本次资料发送给模型服务。');
   const profile=buildProfile(body.answers),records=validateExperienceEvidence(body.experienceEvidence),persist=body.persist===true;
   const fingerprint=await sha256(JSON.stringify({answers:profile.answers,records,persist}));const lock=await acquireJob(env.DB,owner,body.requestId,fingerprint);
   if(!lock.acquired){if(lock.status==='completed'&&lock.planId){const saved=await getPlan(env.DB,owner,lock.planId);if(saved)return reply({reused:true,plan:saved.result,planId:saved.id,created:saved.created});}return reply({error:lock.status==='running'?'当前浏览器已有分析进行中，请等待完成。':'这次请求已经结束，请查看已有结果，或重新发起分析。'},409);}
   let allowed;try{allowed=await allowance(env.DB,owner,request.headers.get('CF-Connecting-IP')||'local',env.API_KEY);}catch(e){await finishJob(env.DB,owner,body.requestId,null,true);throw e;}
   if(!allowed){await finishJob(env.DB,owner,body.requestId,null,true);return reply({error:'今天的分析次数已用完，可以继续查看原规划或使用本地规则规划。'},429);}
   let canceled=false,task;const encoder=new TextEncoder(),abort=new AbortController();
   const stream=new ReadableStream({start(controller){const emit=e=>{if(!canceled)controller.enqueue(encoder.encode(JSON.stringify(e)+String.fromCharCode(10)));};task=(async()=>{const plan=await analyze(profile.answers,env,emit,abort.signal,fetch,records);if(canceled){await finishJob(env.DB,owner,body.requestId,null,true);return;}let saved=null,storageWarning='';if(persist){try{saved=await savePlan(env.DB,owner,profile.answers,plan);}catch{storageWarning='分析已完成，但云端保存失败。结果已返回，请保存在本地或导出。';}}try{await finishJob(env.DB,owner,body.requestId,saved?.id||null);}catch{storageWarning=storageWarning||'分析已完成，请先保存结果；服务状态暂未同步，请勿立即重复提交。';}emit({type:'result',plan,planId:saved?.id||null,created:saved?.created||new Date().toISOString(),...(storageWarning?{storageWarning}:{})});})().catch(async e=>{try{await finishJob(env.DB,owner,body.requestId,null,true);}catch{}emit({type:'error',message:e instanceof ModelError?e.message:'分析暂未完成，画像与旧规划已保留，请稍后重试。',code:e.code||'service'});}).finally(()=>{if(!canceled)controller.close();});},cancel(){canceled=true;abort.abort();}});
   ctx.waitUntil(task);return new Response(stream,{headers:{...security,'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store',...(session.cookie?{'Set-Cookie':session.cookie}:{})}});
  }return reply({error:'接口不存在。'},404);
 }catch(e){const safe=typeof e.message==='string'&&/格式|过长|画像|答案|草稿|记录|路线|浏览器|缺少|版本|还需要|选项|文字|同意/.test(e.message);return json({error:safe?e.message:'操作暂未完成，请稍后重试。'},400);}},
 async scheduled(event,env,ctx){if(env.DB)ctx.waitUntil(cleanup(env.DB));}
};
