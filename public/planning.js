// Shared, deterministic domain rules. Imported by both the browser and Worker.
const opt=(value,label,detail='')=>({value,label,detail});
export const stages=[opt('school','高中毕业','专业与大学生活的第一步'),opt('early','大一 / 大二','尝试方向，积累真实体验'),opt('junior','大三','比较升学、实践与职业方向'),opt('senior','大四 / 应届','衔接毕业与下一步'),opt('graduate','已毕业','收入、转向与持续学习')];
export const isEarly=a=>['school','early'].includes(a.stage);
export const isTechnical=a=>['cs','related'].includes(a.major);
export const questions=[
 {id:'stage',group:'起点',title:'你现在站在哪个阶段？',reason:'不同阶段，需要回答的问题和现实门槛不同。',options:stages},
 {id:'major',group:'方向',title:'你正在学习，或想探索哪个领域？',reason:'尚未定专业也可以开始；我们不会把兴趣直接当成职业结论。',options:[opt('cs','计算机 / 软件 / 人工智能'),opt('related','数学 / 信息 / 电子'),opt('design','设计 / 艺术 / 传媒'),opt('business','经济 / 商科 / 管理'),opt('humanities','人文 / 社会科学 / 教育'),opt('science','自然科学 / 工程'),opt('health','医学 / 生命科学'),opt('other','其他 / 还没确定')]},
 {id:'graduation',group:'起点',title:'你预计哪一年大学毕业？',reason:'毕业年份只用于核对机会窗口，不用于推断能力。',options:[...Array.from({length:7},(_,i)=>opt(String(2026+i),String(2026+i)+' 年')),opt('other','其他年份 / 尚未确定')],when:a=>!isEarly(a)},
 {id:'concern',group:'目标',title:'现在最想先弄清楚什么？',reason:'先围绕一个真实问题比较选择。',options:[opt('major','专业：学什么、是否转向？'),opt('explore','兴趣：先尝试什么，才知道适不适合？'),opt('choice','升学与就业：如何取舍？'),opt('role','职业：适合从什么方向开始？'),opt('city','城市：留在本地，还是去外地？')]},
 {id:'city',group:'边界',title:'你希望优先考虑哪座城市？',reason:'填写城市或“暂不确定”即可，不需要学校、姓名与详细地址。',type:'text',placeholder:'例如：西安 / 暂不确定',limit:20},
 {id:'grades',group:'经历',title:'你对这个领域的基础，目前有多熟悉？',reason:'成绩和熟悉程度只是线索，不决定你的上限。',options:[opt('strong','基础较扎实','能解释学过的内容，并尝试应用'),opt('average','了解一部分','需要在真实任务中补缺口'),opt('weak','刚开始接触','先从入门体验开始')]},
 {id:'experience',group:'经历',title:'你有哪些可以回顾的真实体验？',reason:'课程、社团、志愿服务和个人作品，都可以成为判断线索。',options:[opt('none','还没有具体体验'),opt('course','课程 / 个人作品 / 社团任务'),opt('competition','竞赛 / 研究 / 团队项目'),opt('industry','实习 / 工作 / 真实协作')]},
 {id:'project',group:'经历',title:'用一句话说说你做过什么。',reason:'描述任务、你的贡献以及反馈；不需要提供个人身份信息。',type:'text',placeholder:'例如：为社团设计招新海报，收集了同学的修改意见。',limit:240,when:a=>a.experience&&a.experience!=='none'},
 {id:'direction',group:'方向',title:'技术领域里，你想先体验哪种任务？',reason:'这是待验证兴趣，不是能力标签。',options:[opt('backend','软件 / 后端开发'),opt('ai','AI 应用 / 算法相关'),opt('data','数据分析 / 数据开发'),opt('unsure','尚未确定，先体验基础任务')],when:a=>isTechnical(a)},
 {id:'finance',group:'边界',title:'暂时没有收入，你能承受多久？',reason:'只用准备窗口表达约束，无需透露家庭资产。',options:[opt('urgent','需要尽快有收入'),opt('3m','大约三个月'),opt('6m','半年或更久'),opt('unknown','还没有核实')],when:a=>!isEarly(a)},
 {id:'relocation',group:'边界',title:'对于去外地，你的真实边界是？',reason:'地域是现实条件，之后可以调整。',options:[opt('no','目前只能留在本地'),opt('conditional','条件合适可以去'),opt('yes','可以接受外地机会')]},
 {id:'family',group:'边界',title:'家人对你的选择，目前是什么态度？',reason:'分别记录家人的期待和你的想法。',options:[opt('local','希望留在本地'),opt('stable','更重视稳定，其他可以商量'),opt('open','尊重我的选择'),opt('unknown','还没有认真聊过')]},
 {id:'priority',group:'目标',title:'这一阶段，你最想优先获得什么？',reason:'发生取舍时，以你确认的优先级为准。',options:[opt('growth','能力、体验和成长空间'),opt('income','尽快获得收入'),opt('stability','生活与工作的稳定性'),opt('research','深入学习与研究')]},
 {id:'research',group:'经历',title:'你对继续深入学习，有哪些亲身依据？',reason:'区分喜欢知识与喜欢研究过程。',options:[opt('tested','体验过课题或深入阅读，愿意继续'),opt('uncertain','有兴趣，还没验证'),opt('no','还不确定，主要担心其他选择')],when:a=>a.concern==='choice'||a.priority==='research'},
 {id:'availability',group:'边界',title:'如果机会需要，你能安排连续实习吗？',reason:'具体时长必须依据岗位原页核对。当前历史样本包含三个月要求。',options:[opt('yes','可以安排三个月，并能核对课程与住宿'),opt('maybe','还需要协调'),opt('no','暂时不可以')],when:a=>!isEarly(a)},
 {id:'hours',group:'边界',title:'每周能稳定拿出多少时间探索？',reason:'只用来检查任务负担，不替你安排周历。',options:[opt('5','约 5 小时'),opt('10','约 10 小时'),opt('20','约 20 小时或更多')]},
 {id:'boundary',group:'边界',title:'你的想法与家人期待不同时，先守住什么？',reason:'价值取舍由你决定；暂时不确定也可以。',options:[opt('local','先守住本地生活'),opt('trial','可以先短期尝试，再共同评估'),opt('unknown','尚不确定，先沟通')],when:a=>a.family==='local'&&a.relocation!=='no'}
];
export function optionalQuestion(q,a){return q.id==='grades'||(q.id==='direction'&&isEarly(a));}
export function activeQuestions(a={}){return interviewQuestions(a);}
// Core facts come first; extra depth is an explicit choice, never an invented answer.
export function interviewQuestions(a={}){const order=['stage','concern','major'];return questions.filter(q=>!q.when||q.when(a)).sort((x,y)=>Number(optionalQuestion(x,a))-Number(optionalQuestion(y,a))||(order.includes(x.id)?order.indexOf(x.id):10+questions.indexOf(x))-(order.includes(y.id)?order.indexOf(y.id):10+questions.indexOf(y)));}
export function requiredQuestions(a={}){return interviewQuestions(a).filter(q=>!optionalQuestion(q,a));}
export function answerLabel(id,value){return questions.find(q=>q.id===id)?.options?.find(o=>o.value===value)?.label||String(value??'尚未填写');}
export function validateAnswers(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('访谈资料格式不正确。');
 const a={};for(const q of questions){if(input[q.id]===undefined)continue;const v=input[q.id];if(typeof v!=='string')throw Error('访谈答案格式不正确。');if(q.type==='text'){if(!v.trim()||v.length>q.limit)throw Error('请检查文字答案的长度。');a[q.id]=v.trim();}else{if(!q.options.some(o=>o.value===v))throw Error('访谈包含无效选项。');a[q.id]=v;}}
 const missing=requiredQuestions(a).filter(q=>!a[q.id]);if(missing.length)throw Error('还需要补充：'+missing[0].title);return Object.fromEntries(interviewQuestions(a).filter(q=>a[q.id]!==undefined).map(q=>[q.id,a[q.id]]));
}
export function buildProfile(input){const a=validateAnswers(input);const conflicts=[],unknowns=[];
 if(a.family==='local'&&a.relocation!=='no')conflicts.push(a.boundary==='trial'?'你愿意短期去外地，家人希望留在本地，需要用实际成本和体验共同评估。':a.boundary==='local'?'你愿意考虑外地，但目前先守住本地生活边界。':'你愿意考虑外地，家人倾向本地，需要确认尝试边界。');
 if(a.priority==='research'&&a.finance==='urgent')conflicts.push('深入研究与尽快收入存在时间上的取舍。');
 if(a.finance==='unknown')unknowns.push('无收入准备窗口尚未核实');if(a.family==='unknown'||a.boundary==='unknown')unknowns.push('家庭与地域边界待沟通');
 if(a.graduation==='other')unknowns.push('毕业年份与资格窗口需核对');if(!isEarly(a)&&a.availability!=='yes')unknowns.push('连续实习安排尚未落实');
 if(!isEarly(a)&&!isTechnical(a))unknowns.push('当前职业来源以技术岗位历史样本为主，不能据此判断本领域就业机会');
 if(isEarly(a))unknowns.push('专业课程和转专业规则需查询目标院校当年规定');
 const city=a.city==='暂不确定'?'目标城市':a.city,field=fieldNames[a.major],early=isEarly(a),concern=concernNames[a.concern];
 const goal={growth:'成长空间',income:'尽快获得收入',stability:'稳定的生活与工作',research:'深入学习与研究'}[a.priority];
 const coreConflict=conflicts[0]||(early?(a.experience==='none'?'对专业的想象还缺少亲身体验，先避免过早定论。':'已有体验提供了线索，但还需要比较课程和真实任务。'):a.experience!=='industry'?'你希望获得'+goal+'，但现有经历还缺少来自行业的验证。':'你希望获得'+goal+'，需要核对下一条路线的投入与现实门槛。');
 const constraint=!early&&a.finance==='urgent'?'先守住收入窗口，不能把长期无收入准备当作默认选项。':a.relocation==='no'||a.boundary==='local'?'保留你确认的本地生活边界，先核对'+city+'的实际条件。':!early&&a.availability!=='yes'?'连续实习时间尚未落实，先做可在现有时间内完成的准备。':unknowns[0]||'首次尝试控制在约 '+a.hours+' 小时以内，资格和成本仍需核实。';
 const lever=early?'做'+fieldTasks[a.major]+'，用实际体验比较是否愿意继续学习。':a.finance==='urgent'?'核对'+city+'两项收入机会的资格与准备成本，先守住可承担的收入窗口。':a.experience!=='industry'?'补齐一份能说明个人贡献的'+field+'成果，再获得行业或使用者反馈。':'核对两项真实机会的资格与投入，找出当前经历和目标要求之间的差距。';
 const hypothesis=early?'你正在探索'+field+'，希望先弄清'+concern+'。':'你在'+city+'考虑'+field+'的下一步，希望优先获得'+goal+'。'+(a.concern==='choice'?'升学与就业的取舍，需要同时看准备窗口和实践依据。':'');
 return {answers:a,facts:interviewQuestions(a).filter(q=>a[q.id]!==undefined).map(q=>({id:q.id,label:q.title.replace(/[？。]$/,''),value:answerLabel(q.id,a[q.id])})),conflicts,unknowns,hypothesis,coreConflict,constraint,lever,inferences:[{value:coreConflict,type:'inference',evidence:['priority','experience','family','relocation'].filter(k=>a[k]!==undefined),user_confirmed:false}],confidence:unknowns.length?'仍有条件待核实':'具备初步讨论依据',confirmed:false};
}
export const demoAnswers={stage:'junior',major:'cs',graduation:'2028',concern:'choice',city:'西安',grades:'average',experience:'course',project:'校园二手交易站，负责后端接口，有代码与本地演示。',direction:'backend',finance:'3m',relocation:'no',family:'local',priority:'growth',research:'uncertain',availability:'maybe',hours:'10'};
export function sampleAnswers(stage='junior'){return validateAnswers({...demoAnswers,stage,...(stage==='school'?{experience:'none',concern:'major',grades:'weak'}:stage==='early'?{concern:'explore'}:stage==='senior'?{graduation:'2027',relocation:'conditional',boundary:'trial',grades:'strong'}:stage==='graduate'?{graduation:'2026',priority:'income',finance:'urgent'}:{})});}
export const todayCN=()=>new Date(Date.now()+8*3600000).toISOString().slice(0,10);
const fieldTasks={cs:'一个能运行的小工具',related:'一份数据或系统小实验',design:'一份面向真实需求的设计作品',business:'一份小型用户需求或商业问题分析',humanities:'一次访谈与主题观察记录',science:'一个安全的基础实验或工程问题分析',health:'一份公开科普资料的比较记录',other:'一个你愿意尝试的小任务'};
const concernNames={major:'专业选择与调整',explore:'适合自己的学习方向',choice:'升学与就业的取舍',role:'未来的职业方向',city:'地域与生活的选择'};
const experienceNames={course:'课程与作品',competition:'团队或研究经历',industry:'实践经历'};
const fieldNames={cs:'软件与技术',related:'信息与系统',design:'设计与传媒',business:'商业与管理',humanities:'人文与社会',science:'科学与工程',health:'医学与生命科学',other:'当前领域'};
export function validateExperienceEvidence(raw=[]){if(!Array.isArray(raw)||raw.length>4)throw Error('行动证据格式不正确。');return raw.map(x=>{if(!x||typeof x!=='object'||typeof x.routeId!=='string'||!/^[a-z0-9_-]{1,30}$/.test(x.routeId))throw Error('行动证据路线格式不正确。');const notes={};for(const k of ['source','proof','feedback','next']){const v=x.notes?.[k]??'';if(typeof v!=='string'||v.length>1200)throw Error('行动记录过长。');notes[k]=v;}if(!Array.isArray(x.completed)||x.completed.length>5||x.completed.some(n=>!Number.isInteger(n)||n<0||n>4))throw Error('行动证据进度格式不正确。');return {routeId:x.routeId,routeTitle:String(x.routeTitle||'').slice(0,100),completed:[...new Set(x.completed)],notes};});}
export function unmetGates(route,answers){
 const labels={relocation:'地域与家庭边界',internship:'连续实习安排',fulltime_study:'无收入准备窗口'};
 return (route.gates||[]).filter(g=>g==='relocation'?(answers.relocation==='no'||answers.boundary==='local'):g==='internship'?(isEarly(answers)||answers.availability!=='yes'):g==='fulltime_study'?(isEarly(answers)||['urgent','unknown'].includes(answers.finance)):false).map(g=>({gate:g,label:labels[g]}));
}
export function demoPlan(input,context=[]){
 const profile=buildProfile(input),a=profile.answers,early=isEarly(a),technical=isTechnical(a);
 const urgent=a.finance==='urgent'||a.priority==='income',research=a.priority==='research'&&a.research==='tested'&&!urgent;
 const field=fieldNames[a.major],task=fieldTasks[a.major],city=a.city==='暂不确定'?'目标城市':a.city;
 const direction={backend:'软件开发',ai:'AI 应用',data:'数据方向',unsure:field}[a.direction]||field;
 const source=a.direction==='ai'?'ai':a.direction==='data'?'data':'java',records=validateExperienceEvidence(context);
 const action=(title,hours,steps,done,revisit)=>({title,hours:'约 '+hours+' 小时',effort_hours:hours,steps,done,revisit});
 const routes=[{
  id:'practice',level:'primary',title:early?'在'+field+'方向积累基础':urgent?'先在'+city+'核对收入机会':'先在'+city+'验证'+direction+'就业路径',
  why:early?'围绕'+concernNames[a.concern]+'，先用一次亲身体验检验专业想象。':urgent?'你优先需要收入。先对照本地真实资格与报酬条件，控制无收入准备时间。':a.experience==='none'?'先找到一个目标任务，补充亲身体验与反馈，再决定就业方向。':'先用你的'+experienceNames[a.experience]+'对照目标任务，补充反馈，再决定是否扩大就业投入。',
  risk:early?'一次任务只能提供线索，课程与专业规则需要回到院校原页核对。':'机会有效期、学历和在校身份都需向原始来源核实，不保证获得岗位。',
  conditions:early?['核对当前或目标专业的课程要求','尝试范围不超过现有时间预算']:['核对'+city+'的实际岗位资格与地点','用可展示成果说明自己的贡献'],
  evidence_type:technical&&!early?'source':'hypothesis',evidence_ids:technical&&!early?[source,'past']:[],gates:[],
  action:early?action('从'+task+'开始',3,['选一个与目标专业有关的小问题','尝试最小任务，记录喜欢和困难的部分','向在读学生或老师核实学习体验'],'一份体验成果和一条具体反馈。','两次体验感受明显不同，或获得新的课程信息时。'):urgent?action('核对两项'+city+'的收入机会',2,['从原始来源选择两项机会，核对资格与有效期','记录报酬、地点及需要向招聘方确认的问题','只对符合条件的机会进一步咨询'],'两条包含来源、硬条件和待确认事项的记录。','获得招聘反馈，或收入窗口发生变化时。'):action('对照两项'+city+'的目标任务',3,['从原始来源找到两项目标任务，核对资格和有效期','用现有作品对应要求，标记缺少的证明','补一份个人贡献说明，请相关学习者或从业者反馈'],'一页要求与已有成果的对照，以及一条外部反馈。','收到行业反馈，或明确希望长期投入研究时。')
 },{
  id:'study',level:research?'primary':'alternative',title:early?(a.stage==='school'?'比较专业与培养方向':'核对专业调整与深造方向'):'保留继续深造的路径',
  why:early?'比较培养方案、课程内容和亲身体验，判断继续学习或调整方向的依据。':'你对升学的兴趣需要与准备成本、资格和研究体验一起核对；先保留选择，再决定长期投入。',
  risk:early?'专业调整政策因学校不同，尚未核实前不能认定可以转专业。':'报考资格、目标年度与准备窗口尚需核实；短期体验不等于适合长期研究。',
  conditions:early?['查目标院校的培养方案与专业规则','比较真实课程和任务体验']:['核对目标年度报考资格','落实长期无收入准备窗口','用研究体验确认投入意愿'],
  evidence_type:early?'hypothesis':'source',evidence_ids:early?[]:['study_policy','study_sample'],gates:early?[]:['fulltime_study'],
  action:action(early?'比较两份专业培养方案':'核对深造门槛与准备成本',3,early?['从院校原页比较两份培养方案','尝试一项核心课程任务','记录愿意继续学习与需要核实的部分']:['从目标院校原页核对当年资格和培养方式','列出准备成本与现有收入窗口的差距','尝试一份入门研究材料，向老师请教'],'一页有原始来源的条件清单和体验记录。','准备窗口落实，或研究体验改变原先判断时。')
 },{
  id:'adjacent',level:'alternative',title:early?'比较一个相邻专业方向':'去外地拓展'+field+'机会',
  why:early?'保留相邻选择，用不同任务比较适合继续投入的方向。':'你'+(a.relocation==='no'||a.boundary==='local'?'当前优先保留本地边界':'愿意考虑外地')+'。先核对家庭、住宿与实践条件，再判断外地机会是否值得投入。',
  risk:early?'新鲜感不等于长期兴趣，避免仅凭专业名称做判断。':'外地成本和具体机会尚未核实，跨城并不自动带来更好的发展。',
  conditions:early?['先了解相邻专业的真实任务','保持低成本和可回退的尝试']:['确认地域与家庭安排',...(a.stage==='graduate'?[]:['落实连续实习安排']),'核对资格、住宿与生活成本'],
  evidence_type:'hypothesis',evidence_ids:[],gates:early?[]:['relocation',...(a.stage==='graduate'?[]:['internship'])],
  action:action(early?'尝试一个相邻专业任务':'做一份外地选择的条件清单',2,early?['选一个与当前专业有共同基础的任务','完成一小部分，记录缺少的能力','比较两种任务的感受，保留具体反馈']:['列出外地选择所需的地域、时间和成本条件','与家人或相关老师核对可承担的边界','从原始来源核对机会资格，不把未落实条件当事实'],'一份已确认条件与待核实条件分开的清单。','地域安排、实践时间或成本条件有实质变化时。')
 }];
 for(const r of routes)if(unmetGates(r,a).length)r.level='locked';
 if(!routes.some(r=>r.level==='primary'))routes[0].level='primary';
 if(routes[1].level==='primary')routes[0].level='alternative';
 const main=routes.find(r=>r.level==='primary');
 return {mode:'demo',summary:main.title,reason:main.why,coreConflict:profile.coreConflict,confidence:profile.confidence,constraint:profile.constraint,lever:profile.lever,routes,minority:early?'当前与相邻专业都值得比较；先了解课程和真实体验，保留调整空间。':'继续深造和外地实践仍值得考虑；它们的准备窗口与现实门槛，需要先于长期投入核实。',committee:[],followup:profile.unknowns[0]||'',checked:todayCN(),experienceEvidence:records,evidenceReview:records.length?'行动记录已带入。规则模式不分析自由文本含义，请结合记录修正画像。':'依据已确认答案生成的规则示例，不是模型结论。'};
}
export function scenarioPlan(answers,change,baseline){
 const plan=structuredClone(baseline||demoPlan(answers));if(change==='base')return plan;
 const labels={away:'如果地域条件放宽',proof:'如果补齐实践证明',time:'如果实习时间落实',effort:'如果探索时间增加',runway:'如果准备成本已落实'};
 if(!labels[change])throw Error('条件预览选项不正确。');
 const assumed={...answers};if(change==='away'){assumed.relocation='yes';assumed.boundary='trial';}if(change==='time')assumed.availability='yes';if(change==='runway')assumed.finance='6m';
 plan.mode='preview';plan.committee=[];delete plan.decision;
 plan.preview={condition:change,title:labels[change],changes:[],note:'仅预览这个条件的影响。原规划保留，主推荐不变；资格和其他条件仍需核实。'};
 for(const r of plan.routes){
  const before=unmetGates(r,answers),after=unmetGates(r,assumed),removed=before.filter(x=>!after.some(y=>y.gate===x.gate));
  if(removed.length){
   if(r.level==='locked'&&!after.length)r.level='alternative';
   r.scenarioNote=removed.map(x=>x.label).join('、')+'在这个假设下不再阻挡这条路线。'+(after.length?'仍需落实：'+after.map(x=>x.label).join('、')+'。':'可以进一步核对资格与成本，尚不代表获得机会。');
   plan.preview.changes.push({routeId:r.id,title:r.title,note:r.scenarioNote,unlocked:r.level!=='locked',remaining:after.map(x=>x.label)});
  }else if(change==='proof'&&r.id===plan.routes.find(x=>x.level==='primary')?.id){
   r.scenarioNote='补齐成果与反馈后，可以更新这条路线的能力依据；内容与质量仍需你确认，不自动提高推荐等级。';
   plan.preview.changes.push({routeId:r.id,title:r.title,note:r.scenarioNote,unlocked:false,remaining:after.map(x=>x.label)});
  }else if(change==='effort'){
   r.scenarioNote='可尝试更完整的入门体验，先核对学习负担；投入更多时间不直接证明适合。';
   plan.preview.changes.push({routeId:r.id,title:r.title,note:r.scenarioNote,unlocked:false,remaining:[]});
  }
 }
 if(!plan.preview.changes.length)plan.preview.note+=' 当前路线没有受这个条件阻挡。';
 return plan;
}
export function parseModelJSON(raw){if(typeof raw!=='string'||raw.length>50000)throw Error('模型返回内容超出范围。');let p;try{p=JSON.parse(raw.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));}catch{throw Error('模型没有返回可验证的结构化结果。');}if(!p||typeof p!=='object'||Array.isArray(p))throw Error('模型结果格式不正确。');return p;}
export function validatePlan(raw,sourceIds,{legacy=false}={}){const p=typeof raw==='string'?parseModelJSON(raw):raw;const text=(v,n=1000)=>typeof v==='string'&&v.trim().length>0&&v.length<=n;const list=(v,n=8)=>Array.isArray(v)&&v.length<=n&&v.every(s=>text(s,500));
 if(!p||!text(p.summary,140)||!text(p.reason)||!text(p.constraint,300)||!text(p.lever,300)||!text(p.confidence,100)||!text(p.minority)||!Array.isArray(p.routes)||(legacy?(p.routes.length<2||p.routes.length>4):p.routes.length!==3))throw Error('综合结果需要三条不同的路线，以及必要的理由与约束。');
 const ids=new Set();let primary=0;const routes=p.routes.map(r=>{if(!r||!text(r.id,30)||!/^[a-z0-9_-]+$/.test(r.id)||(ids.has(r.id)||["__proto__","prototype","constructor"].includes(r.id)))throw Error('路线标识不正确。');ids.add(r.id);if(!['primary','alternative','locked'].includes(r.level))throw Error('路线状态不正确。');if(r.level==='primary')primary++;if(!text(r.title,100)||!text(r.why)||!text(r.risk)||!list(r.conditions)||!r.conditions.length||!Array.isArray(r.evidence_ids)||r.evidence_ids.length>6||r.evidence_ids.some(id=>!sourceIds.includes(id)))throw Error('路线依据或条件无法核验。');const a=r.action;if(!a||!text(a.title,160)||!text(a.hours,100)||!list(a.steps,5)||a.steps.length<2||!text(a.done,500)||!text(a.revisit,500))throw Error('路线缺少可以开始的行动。');if(!legacy){if(!['source','hypothesis'].includes(r.evidence_type))throw Error('路线需标明来源支持或待验证假设。');if(r.evidence_type==='source'&&!r.evidence_ids.length)throw Error('基于事实的路线缺少来源。');if(r.evidence_type==='hypothesis'&&r.evidence_ids.length)throw Error('假设路线与来源标记不一致。');if(!Array.isArray(r.gates)||r.gates.some(g=>!['relocation','internship','fulltime_study'].includes(g)))throw Error('路线硬条件标签格式不正确。');if(!Number.isFinite(a.effort_hours)||a.effort_hours<=0||a.effort_hours>100)throw Error('行动缺少明确的预计投入时长。');}return {id:r.id,level:r.level,title:r.title,why:r.why,risk:r.risk,conditions:[...r.conditions],evidence_type:r.evidence_type||(r.evidence_ids.length?'source':'hypothesis'),evidence_ids:[...r.evidence_ids],gates:[...(r.gates||[])],action:{title:a.title,hours:a.hours,effort_hours:a.effort_hours??null,steps:[...a.steps],done:a.done,revisit:a.revisit}};});
 if(primary!==1)throw Error('需要且只能有一条当前主路线。');if(new Set(routes.map(r=>r.title.replace(/\s/g,''))).size!==routes.length)throw Error('路线不能重复。');if(p.followup!==undefined&&typeof p.followup!=='string')throw Error('待核实问题格式不正确。');if(p.coreConflict!==undefined&&(typeof p.coreConflict!=='string'||p.coreConflict.length>500))throw Error('核心矛盾格式不正确。');return {summary:p.summary,reason:p.reason,coreConflict:p.coreConflict||'',constraint:p.constraint,lever:p.lever,confidence:p.confidence,minority:p.minority,followup:(p.followup||'').slice(0,300),routes};
}
