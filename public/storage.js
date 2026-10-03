import {validatePlan,validateExperienceEvidence} from './core.js';
import {evidence} from './evidence.js';
export const storageKey='life-coordinate-v4';
export function emptyStore(){return {version:4,revision:0,answers:{},index:0,confirmed:false,mode:'demo',plans:[],activeId:null,activeRoute:'',replanEvidence:[],parentId:null,sampleBackup:null};}
export function cleanRecord(raw){
 if(!raw||typeof raw!=='object'||typeof raw.id!=='string'||!/^[A-Za-z0-9_-]{1,60}$/.test(raw.id)||!raw.answers||typeof raw.answers!=='object'||Array.isArray(raw.answers))throw Error('规划记录格式不正确。');
 const checked=validatePlan(raw.result,evidence.sources.map(s=>s.id),{legacy:true});
 const result={...checked,mode:raw.result.mode==='live'?'live':'demo',checked:String(raw.result.checked||'').slice(0,20),committee:Array.isArray(raw.result.committee)?raw.result.committee.slice(0,3).map(c=>({provider:String(c.provider||''),model:String(c.model||''),summary:String(c.summary||'')})):[],experienceEvidence:validateExperienceEvidence(raw.result.experienceEvidence||[]),evidenceReview:String(raw.result.evidenceReview||''),degraded:!!raw.result.degraded};
 const work={};for(const route of result.routes){const entry=raw.work?.[route.id]||{};work[route.id]={completed:Array.isArray(entry.completed)?[...new Set(entry.completed.filter(i=>Number.isInteger(i)&&i>=0&&i<route.action.steps.length))]:[],notes:Object.fromEntries(['source','proof','feedback','next'].map(k=>[k,String(entry.notes?.[k]||'').slice(0,1200)])),revision:Number.isInteger(entry.revision)&&entry.revision>=0?entry.revision:0,pending:entry.pending===true};}
 return {id:raw.id,remoteId:typeof raw.remoteId==='string'&&/^[a-f0-9-]{36}$/.test(raw.remoteId)?raw.remoteId:null,answers:{...raw.answers},result,work,example:raw.example===true,created:typeof raw.created==='string'&&!Number.isNaN(Date.parse(raw.created))?raw.created:new Date().toISOString(),parentId:typeof raw.parentId==='string'?raw.parentId:null};
}
export function cleanDraft(raw){if(!raw||typeof raw!=='object'||!raw.answers||typeof raw.answers!=='object'||Array.isArray(raw.answers))throw Error('本地画像格式无法识别。');return {answers:Object.fromEntries(Object.entries(raw.answers).filter(([,v])=>typeof v==='string')),index:Number.isInteger(raw.index)?Math.max(0,Math.min(20,raw.index)):0,confirmed:raw.confirmed===true,mode:raw.mode==='live'?'live':'demo',parentId:typeof raw.parentId==='string'?raw.parentId:null,replanEvidence:validateExperienceEvidence(raw.replanEvidence||[])};}
export function decodeStore(text){if(!text)return emptyStore();const raw=JSON.parse(text);if(!raw||raw.version!==4||!Array.isArray(raw.plans))throw Error('本地资料格式无法识别。');if(raw.plans.length>30)throw Error('本地规划超过 30 份，原始资料已保留，请先导出整理。');return {...emptyStore(),...cleanDraft(raw),revision:Number.isInteger(raw.revision)&&raw.revision>=0?raw.revision:0,plans:raw.plans.map(cleanRecord),activeId:typeof raw.activeId==='string'?raw.activeId:null,activeRoute:typeof raw.activeRoute==='string'?raw.activeRoute:'',sampleBackup:raw.sampleBackup?cleanDraft(raw.sampleBackup):null};}
export function writeStore(storage,state){const current=storage.getItem(storageKey);if(current){const latest=JSON.parse(current);if(latest.revision!==state.revision)throw Error('另一标签页更新了资料，请先重新载入，避免覆盖。');}else if(state.revision!==0)throw Error('另一标签页清除了资料，请先重新载入，避免恢复旧数据。');const next={...state,revision:state.revision+1};storage.setItem(storageKey,JSON.stringify(next));state.revision=next.revision;return next.revision;}
export function collectExperience(record){return record.result.routes.map(r=>({routeId:r.id,routeTitle:r.title,completed:record.work[r.id]?.completed||[],notes:record.work[r.id]?.notes||{}})).filter(x=>x.completed.length||Object.values(x.notes).some(v=>v.trim()));}
export function migrateLegacy(text){
 if(!text)return null;const raw=JSON.parse(text);if(!raw||!raw.answers||typeof raw.answers!=='object'||Array.isArray(raw.answers))throw Error('旧版缓存格式无法识别。');
 const state={...emptyStore(),...cleanDraft({...raw,replanEvidence:[]}),confirmed:false};
 if(raw.result){const work={};for(const r of raw.result.routes||[]){work[r.id]={completed:r.action.steps.map((_,i)=>i).filter(i=>raw.tasks?.[r.id+'-'+i]),notes:Object.fromEntries(['source','proof','feedback','next'].map(k=>[k,raw.worksheet?.[r.id+'-'+k]||''])),revision:0};}const record=cleanRecord({id:crypto.randomUUID(),answers:raw.answers,result:raw.result,work});state.plans=[record];state.activeId=record.id;}
 return state;
}
export function planChanges(previous,current){
 if(!previous)return [];const changes=[];
 for(const key of new Set([...Object.keys(previous.answers),...Object.keys(current.answers)]))if(previous.answers[key]!==current.answers[key])changes.push({kind:'answer',key,before:previous.answers[key]||'未提供',after:current.answers[key]||'本次未提供'});
 for(const r of current.result.routes){const old=previous.result.routes.find(x=>x.id===r.id);if(!old){changes.push({kind:'route',title:r.title,note:'新增路线。'});continue;}
  const fields=[['level','推荐状态'],['title','方向'],['why','理由'],['risk','风险'],['conditions','条件'],['gates','硬门槛'],['evidence_ids','来源'],['evidence_type','依据类型'],['action','下一步与完成标准']].filter(([k])=>JSON.stringify(old[k])!==JSON.stringify(r[k])).map(([,label])=>label);
  if(fields.length)changes.push({kind:'route',title:r.title,note:fields.join('、')+'有所调整。'});
 }
 for(const old of previous.result.routes)if(!current.result.routes.some(r=>r.id===old.id))changes.push({kind:'route',title:old.title,note:'本次未保留这条路线。'});
 for(const [key,label] of [['reason','总体理由'],['coreConflict','核心矛盾'],['constraint','现实限制'],['lever','关键杠杆']])if(previous.result[key]!==current.result[key])changes.push({kind:'route',title:label,note:'判断有所调整，请核对。'});
 return changes;
}
