import {adaptiveEvidence} from './adaptive.js';
// Server work expires after 24h. Saved browser answers remain the user's own account.
export function analysisDraft(answers,profile,set,{now=Date.now(),created}={}){
 const stamps=[profile?.modelProvenance?.generatedAt||created,set?.generatedAt].filter(Boolean).map(Date.parse);
 if(!stamps.some(time=>!Number.isFinite(time)||now-time>23*3600000))return {answers,profile,restored:false};
 const copy=structuredClone(answers);let previous=(profile?.facts||[]).filter(f=>f.id.startsWith('ai_')).map(f=>f.value);
 if(!previous.length&&set&&copy.adaptive){try{previous=Object.values(adaptiveEvidence(set,copy.adaptive));}catch{}}
 delete copy.adaptive;
 if(previous.length)copy.experience=[copy.experience,'上次保存在本机的回答（未重新核实）：'+previous.join('；')].filter(Boolean).join('\n').slice(0,1800);
 return {answers:copy,profile:null,restored:true};
}
