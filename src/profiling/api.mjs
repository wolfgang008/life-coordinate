import {sha256,allowance} from '../db.mjs';
import {aiConfig,ModelError} from '../ai.mjs';
import {cleanAnswers,text,applyInterestConfirmations} from '../../public/domain/contracts.js';
import {understand,directions} from './engine.mjs';
async function loadProfile(db,owner,id){if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))throw Error('画像标识格式不正确。');const row=await db.prepare('SELECT * FROM personal_models WHERE id=? AND session_id=? AND expires_at>?').bind(id,owner,Date.now()).first();if(!row)throw Error('画像已过期或不属于当前浏览器，请重新理解。');return {...row,answers:JSON.parse(row.answers_json),profile:JSON.parse(row.model_json),nextQuestion:row.followup_json?JSON.parse(row.followup_json):null};}
export async function atlasApi({request,path,env,ctx,owner,cookie,payload,reply,security,fetcher=fetch}){
  const body=await payload(request),cfg=aiConfig(env);
  if(path==='/api/profile/confirm'){
    const row=await loadProfile(env.DB,owner,body.profileId);if(row.revision!==body.revision||row.answer_version!==body.answerVersion)throw Error('画像版本已经变化，请重新确认。');
    if(!body.confirmations||!body.constraintConfirmations)throw Error('缺少逐项确认。');const p=row.profile;
    for(const h of p.interestHypotheses){const choice=body.confirmations[h.id];if(!['accepted','rejected'].includes(choice))throw Error('请逐项确认或拒绝兴趣推断。');h.confirmation=choice;}
    for(const c of p.constraints){if(body.constraintConfirmations[c.id]!==true)throw Error('请核对现实边界，错误的边界需要先修正。');c.confirmed=true;}
    const saved=await env.DB.prepare('UPDATE personal_models SET model_json=?,confirmed=1 WHERE id=? AND session_id=? AND revision=? AND answer_version=?').bind(JSON.stringify(p),p.id,owner,body.revision,body.answerVersion).run();if(!saved.meta.changes)throw Error('画像版本已经变化。');return reply({profile:p});
  }
  if(body.aiConsent!==true)throw Error('请主动同意本次资料传输。');if(!cfg.ready)return reply({error:'真实 AI 尚未连接，输入已保留。可主动选择本地预览。'},503);
  if(typeof body.requestId!=='string'||!/^[a-f0-9-]{36}$/.test(body.requestId))throw Error('分析请求标识格式不正确。');
  let a,p,previous=null,round=0;
  if(path==='/api/profile/analyze'||path==='/api/review'){
    a=cleanAnswers(body.answers);if(body.previousProfileId){const row=await loadProfile(env.DB,owner,body.previousProfileId);previous=applyInterestConfirmations(row.profile,body.confirmations);if(previous.stage!==a.stage)throw Error('阶段变化需要重新建立画像。');round=row.profile.followupRound||0;if(a.followup&&a.followup!==row.answers.followup)round++;}
    if(path==='/api/review'){if(!previous||!a.feedback)throw Error('缺少原画像或实践反馈。');text(a.feedback,2400);}
  }else{const row=await loadProfile(env.DB,owner,body.profileId);p=row.profile;a=row.answers;if(!row.confirmed||p.revision!==body.revision||p.answerVersion!==body.answerVersion)throw Error('请先确认当前版本的真实画像。');}
  const inputVersion=await sha256(JSON.stringify({a,profile:p,previous,path})),fingerprint=await sha256(owner+'|'+inputVersion+'|learning-20261003|prompts-v5.2-choice|'+(env.PROFILE_MODEL||'gpt-5.4-mini')+'|'+cfg.models.map(m=>m.id).join(',')+'|'+cfg.decision);
  await env.DB.prepare("UPDATE atlas_jobs SET status='failed' WHERE session_id=? AND status='running' AND expires_at<?").bind(owner,Date.now()).run();
  const cached=await env.DB.prepare('SELECT status,result_json FROM atlas_jobs WHERE session_id=? AND fingerprint=? AND expires_at>?').bind(owner,fingerprint,Date.now()).first();
  if(cached?.status==='completed')return reply({type:'result',...JSON.parse(cached.result_json),reused:true,inputVersion});if(cached?.status==='running')return reply({error:'当前浏览器已有分析进行中，请等待完成或取消。'},409);
  const insert=await env.DB.prepare("INSERT OR IGNORE INTO atlas_jobs(session_id,fingerprint,request_id,status,expires_at) VALUES(?,?,?,'running',?)").bind(owner,fingerprint,body.requestId,Date.now()+190000).run();
  if(!insert.meta.changes){const retry=await env.DB.prepare("UPDATE atlas_jobs SET status='running',request_id=?,expires_at=? WHERE session_id=? AND fingerprint=? AND status!='running'").bind(body.requestId,Date.now()+190000,owner,fingerprint).run();if(!retry.meta.changes)return reply({error:'当前浏览器已有分析进行中。'},409);}
  if(!await allowance(env.DB,owner,request.headers.get('CF-Connecting-IP')||'local',env.API_KEY)){await env.DB.prepare("UPDATE atlas_jobs SET status='failed' WHERE session_id=? AND fingerprint=?").bind(owner,fingerprint).run();return reply({error:'今日分析预算已用完，资料已保留。'},429);}
  let canceled=false,task,sequence=0;const control=new AbortController(),signal=AbortSignal.any([control.signal,AbortSignal.timeout(p?180000:45000)]);
  const failJob=()=>env.DB.prepare("UPDATE atlas_jobs SET status='failed',expires_at=? WHERE session_id=? AND fingerprint=? AND request_id=?").bind(Date.now()+86400000,owner,fingerprint,body.requestId).run();
  const stream=new ReadableStream({start(controller){const emit=e=>{if(!canceled)controller.enqueue(new TextEncoder().encode(JSON.stringify({jobId:body.requestId,sequence:++sequence,inputVersion,...e})+'\n'));};task=(async()=>{
    emit({type:'progress',phase:p?'evidence':'profile',status:'running',publicSummary:p?'匹配本阶段的学习资料。':'正在整理你确认的背景，寻找值得验证的兴趣线索。'});let result;
    if(p){const plan=await directions(p,a,env,signal,e=>emit({type:'progress',...e}),fetcher);result={plan};}
    else{const understood=await understand(a,env,signal,{previous,round,fetcher});if(signal.aborted)throw new ModelError('分析已取消。','cancel');const id=crypto.randomUUID(),answerVersion=await sha256(JSON.stringify(a)),profile={...understood.profile,id,revision:(previous?.revision||0)+1,answerVersion,followupRound:round};
      if(previous){profile.changes={newFacts:['followup','correction','feedback'].filter(k=>a[k]&&a[k]!==previous.facts.find(f=>f.id===k)?.value),explanation:a.correction?'已根据你的纠正重新判断，请逐项核对。':a.feedback?'实践体验已进入新画像，一次体验只提供线索。':'新回答已进入画像，原始事实保留。'};}
      await env.DB.prepare('INSERT INTO personal_models(id,session_id,revision,answer_version,answers_json,model_json,followup_json,expires_at) VALUES(?,?,?,?,?,?,?,?)').bind(id,owner,profile.revision,answerVersion,JSON.stringify(a),JSON.stringify(profile),understood.nextQuestion?JSON.stringify(understood.nextQuestion):null,Date.now()+86400000).run();result={profile,nextQuestion:understood.nextQuestion,metrics:understood.metrics};
    }
    if(canceled||signal.aborted)throw new ModelError('分析已取消。','cancel');await env.DB.prepare("UPDATE atlas_jobs SET status='completed',result_json=?,expires_at=? WHERE session_id=? AND fingerprint=? AND request_id=?").bind(JSON.stringify(result),Date.now()+86400000,owner,fingerprint,body.requestId).run();emit({type:'result',...result});
  })().catch(async e=>{await failJob().catch(()=>{});emit({type:'error',message:e instanceof ModelError?e.message:'分析暂未完成。输入和已有规划已保留，请重试。',code:e.code||'service'});}).finally(()=>{if(!canceled)controller.close();});},cancel(){canceled=true;control.abort();}});
  ctx.waitUntil(task);return new Response(stream,{headers:{...security,'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});
}
