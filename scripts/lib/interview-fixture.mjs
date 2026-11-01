export function adaptiveFixture(a){
 const sourceId=a.process?'process':'field',value=Array.isArray(a[sourceId])?a[sourceId][0]:a[sourceId];
 return {questions:['ai_process','ai_evidence'].map((id,i)=>({id,type:i?'single':'multi',max:i?1:2,title:i?'先留下一项怎样的成果，会帮助你判断？':'先做一次体验，你更想从哪些过程开始？',why:'你提到'+value+'，先核对愿意持续投入的部分。',affects:'第一行动与兴趣线索的验证',basedOn:[{sourceId,quote:value}],options:[{id:'organize',label:'整理线索并解释理由',exclusive:false},{id:'build',label:'做出一个可以检查的成果',exclusive:false},{id:'unknown',label:'目前还不知道',exclusive:true}]}))};
}
