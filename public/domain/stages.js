export const stages = [
  {id:'school',title:'高中毕业',subtitle:'从好奇出发，认识专业',concerns:['专业如何选择','还不知道喜欢什么','大学里想尝试什么'],focus:'先确认你的学习环境、家庭支持和愿意尝试的任务，再比较专业方向。'},
  {id:'early',title:'大一 / 大二',subtitle:'在体验中，找到热爱',concerns:['专业是否适合我','想探索新的方向','课程与兴趣有些脱节'],focus:'分清基础困难与真实兴趣，比较课程、项目和实践体验。'},
  {id:'junior',title:'大三',subtitle:'让学习连接更多可能',concerns:['深造还是专业实践','怎样积累实践证据','想跨方向但不确定'],focus:'把课程、项目、研究和现实准备窗口放在一起比较。'},
  {id:'senior',title:'大四 / 应届',subtitle:'在取舍中，看清下一步',concerns:['升学与就业如何取舍','缺少实践，不知怎么开始','个人意愿与家庭期待不同'],focus:'先核对毕业、收入、地域与家庭边界，再比较学习和发展方向。'},
  {id:'graduate',title:'已毕业 / 毕业初期',subtitle:'带着经历，重新出发',concerns:['想转向新的领域','工作与兴趣有距离','怎样兼顾收入和学习'],focus:'以可承担的成本验证转向，保留生活与收入边界。'}
];
export const stageOf = id => stages.find(s=>s.id===id)||stages[0];
export const themes = ['基本情况','学习与经历','现实处境','偏好取舍','目标确认'];
const q=(id,theme,title,hint,options,values=options,extra={})=>({id,theme,title,hint,options,values,...extra});
const stageChoices={school:['普通高中','中职 / 技校','国际课程 / 其他','暂未确定'],early:['普通本科','高职 / 专科','海外或其他高校','暂未确定'],junior:['普通本科','高职 / 专科','海外或其他高校','暂未确定'],senior:['普通本科','高职 / 专科','海外或其他高校','暂未确定'],graduate:['本科毕业','专科毕业','研究生或其他学历','暂未确定']};

// 选择题承担主要信息采集；只有最后一项是可跳过的微开放补充。
export function interviewQuestions(a,deep=false){
  const stageQuestion=q('stage',0,'你现在处在哪一段？','从你此刻的位置开始。后面的题目会根据你的阶段调整。',stages.map(s=>s.title),stages.map(s=>s.id),{descriptions:stages.map(s=>s.subtitle)});
  if(!stages.some(s=>s.id===a.stage))return [stageQuestion];
  const stage=a.stage||'school', early=['school','early'].includes(stage), senior=['senior','graduate'].includes(stage);
  const questions=[
    stageQuestion,
    q('concern',0,'现在最想理清什么？','先选一件此刻最想得到帮助的事。还说不清，也可以慢慢探索。',[...stageOf(stage).concerns,'还说不清']),
    q('education',0,'你目前的学习 / 学历状态是？','先确认你正处在怎样的学习环境里。',stageChoices[stage]),
    q('field',0,'你现在接触或考虑的方向有哪些？','可以选尚未确定；它不会把你锁定在某个专业。',['计算机与信息','设计与艺术','商业与管理','人文与社会','科学与工程','医学与生命','其他方向','尚未确定']),
    q('city',0,'你现在主要在哪座城市学习或生活？','用于理解地域和机会背景，不需要学校名称或详细地址。',['西安','成都','北京 / 上海 / 广州 / 深圳','杭州 / 南京 / 武汉 / 重庆','其他省会或区域中心城市','其他地级市 / 县城 / 乡镇','海外 / 港澳台','暂不透露']),
    q('currentSituation',1,early?'最近你的学习状态更接近哪一种？':senior?'最近你的毕业 / 工作状态更接近哪一种？':'最近你的课程与实践状态更接近哪一种？','先确认你手上已有的现实基础。',stage==='graduate'?['已有工作，想兼顾收入尝试转向','目前求职中，还没有确定机会','已有 offer，在比较不同机会','正在准备升学或考试','暂时说不清']:early?['课程为主，还在尝试不同方向','已有比较喜欢的课程或项目','课程压力较大，暂时没有额外实践','正在找实习 / 实践机会','暂时说不清']:['已有课程或项目成果，缺少行业经历','已有实习 / 兼职，希望判断是否继续','正在准备升学或考试','正在求职 / 已有 offer 需要取舍','暂时说不清']),
    q('experienceType',1,'你最常从哪类事情中获得“愿意再试一次”的感觉？','不要求你已经有正式项目，日常活动也算。',['课程作业或解题','做出一个作品 / 产品','阅读、研究或理解原理','和人沟通、组织或协作','动手操作、实验或修理','目前还没有明显线索']),
    q('process',1,a.experienceType==='目前还没有明显线索'?'先试一次的话，哪类过程让你更好奇？':`在${a.experienceType||'这些事情'}里，你最愿意重复哪种过程？`,'愿意继续、已经擅长和成绩好是不同的事。',['把模糊需求整理成清楚方案','写代码或搭建能运行的东西','查资料并解释一个复杂问题','做视觉表达或内容呈现','和不同的人协调完成一件事','动手试验并观察结果','还说不清，想先试两种任务']),
    q('familyContext',2,'家人或重要的人，目前对你的下一步更接近哪种期待？','这是背景信息，系统不会自动把家人意见当成你的硬约束。',['希望稳定、留在熟悉的地方','支持我去尝试，但担心风险','更看重尽快有收入','主要由我自己决定','还没有认真讨论']),
    q('mobility',2,senior?`如果下一步离开${displayCity(a.city)}，你目前的态度是？`:'探索课程或专业时，你对地域变化的态度是？','偏好与不能改变的条件分开记录。',['希望留在目前城市，但可以商量','可以考虑省内其他城市','可以考虑外地一段时间','愿意去更大的城市尝试','尚未确定']),
    q('boundary',2,'当前有哪些选择，是你确认暂时不能做的？','只记录已确认的硬边界，家庭期待和个人偏好另行考虑。',early?['暂时不能增加付费课程或远距离出行','暂时不能转专业或更换学校','暂时不能搬去外地','暂时没有确认的硬限制','条件尚未核实']:['暂时不能搬去外地','需要保持收入，不能脱产准备','暂时无法连续参加实习或全职实践','暂时没有确认的硬限制','条件尚未核实']),
    ...(early?[q('support',2,'探索时，你目前能获得怎样的支持？','不需要透露家庭资产；这会影响任务的费用和资源需求。',['可用学校资源，优先免费体验','可以承担少量学习或材料费用','费用和时间都需要先与家人商量','希望先完全依靠免费资源','支持情况尚未核实'])]:[q('income',2,'毕业 / 转向期间，你对收入的要求是？','不需要具体资产数字；这会影响是否能脱产准备。',['需要保持或尽快获得收入','可以承担短期准备','已有稳定收入，探索需要兼顾工作','尚未核实'])]),
    q('hours',2,'近期，一次探索任务你能稳定投入多久？','第一行动会控制在这个时间内，不要求挤占正常生活。',['约 1 小时','约 2 小时','约 5 小时','约 10 小时'],[1,2,5,10]),
    q('priority',3,'如果这次只解决一件事，你更想先看清什么？','选一个当前最有价值的判断。',early?['找到愿意重复的任务','比较学习与实践方向','了解适合自己的专业范围','先完成一个低成本尝试']:['找到愿意重复的任务','比较学习与实践方向','判断升学与就业取舍','先完成一个低成本尝试']),
    q('decisionStyle',3,'遇到两个都可行的方向，你通常更看重什么？','它帮助系统理解你的目标函数，不是性格测试。',['稳定和可预期','成长空间和长期上限','离家近、生活成本可控','尽快得到真实反馈','保留更多以后转向的空间'])
  ];
  if(stage==='school')insertAfter(questions,'city',q('schoolPlan',0,'你对接下来升学的准备情况是？','了解你的准备窗口，不推断报考资格或录取结果。',['已有录取或确定的学校方向','有几个学校或专业在比较','还没有具体目标','准备规则尚未核实']));
  if(!early){
    insertAfter(questions,'currentSituation',q('internship',1,'你目前有相关行业实践吗？','课程项目、正式实习和工作经历分开记录。',['还没有行业实习，主要是课程或自学','做过短期实践，尚未形成稳定判断','有相关实习或工作经历','实践与考虑的方向无关','暂时说不清']));
    if(/求职|offer/.test(a.currentSituation||''))insertAfter(questions,'internship',q('offer',1,'你手上的工作机会到哪一步了？','只有确定的机会才作为可行选项；不会假定投递就能录用。',['暂无确定机会','有面试或意向，还未确认','已有明确 offer，可比较条件','已有工作，想判断是否调整','暂不透露']));
    if(/升学|深造|考试/.test((a.concern||'')+(a.currentSituation||'')))insertAfter(questions,/求职|offer/.test(a.currentSituation||'')?'offer':'internship',q('research',1,'你对深造的想法，主要来自哪里？','实际研究体验与学历、就业压力分开看。',['体验过研究过程，愿意继续','接触过论文或课题，还没确定','主要担心就业或学历门槛','主要来自老师或家人的建议','还没有接触过研究过程']));
  }
  if(a.familyContext==='希望稳定、留在熟悉的地方'&&['可以考虑外地一段时间','愿意去更大的城市尝试'].includes(a.mobility))insertAfter(questions,'mobility',q('familyBinding',2,'你愿意外出，而家人倾向留本地：目前沟通到哪一步？','这个分歧会影响路线次序，但不替你做决定。',['已经沟通过，可以尝试一段时间','尚未沟通，需要先明确顾虑','有照护责任，暂时确实不能离开','只是期待不同，没有实际限制']));
  if(a.income==='可以承担短期准备')insertAfter(questions,'income',q('runway',2,'这段准备窗口，目前确认有多长？','只问时间范围，避免推荐超出实际准备成本的路线。',['约 1–3 个月','约 3–6 个月','半年以上','时间仍需核实']));
  if(deep){questions.push(q('academic',4,'目前的学业或技能基础更接近哪种情况？','基础困难与兴趣不合分开处理。',['基础较稳，已有独立成果','基础一般，需要补关键知识','有明显短板，优先解决学业困难','尚未形成可判断的成果','暂时不想补充']));questions.push(q('resources',4,'接下来最可能用上的支持是什么？','选择已有资源，不把想得到的资源当成已拥有。',['老师或学长可以指导','同伴或社团可以一起实践','已有实习或工作环境','可以使用公开课程与学校资料','还没有确定支持']));}
  return questions;
}
function insertAfter(questions,id,question){questions.splice(questions.findIndex(q=>q.id===id)+1,0,question);}
function displayCity(city){return ['西安','成都'].includes(city)?city:'目前的城市';}
export const answerLabels={stage:'人生阶段',concern:'当前困扰',education:'学历与学习状态',field:'专业与领域',city:'当前城市',schoolPlan:'升学准备',currentSituation:'当前状态',internship:'行业实践',offer:'已有机会',research:'深造动机',experienceType:'投入经历类型',task:'愿意先做的任务',process:'愿意重复的过程',familyContext:'家庭期待',mobility:'地域偏好',familyBinding:'家庭沟通与责任',boundary:'已确认硬边界',support:'资源与费用支持',income:'收入边界',runway:'准备窗口',hours:'单次可投入时间',priority:'本次目标',decisionStyle:'取舍偏好',academic:'学业与技能基础',resources:'可用支持',experience:'可选经历补充',correction:'我的纠正',followup:'关键追问回答',feedback:'实践反馈'};
export function composeExperience(a){
  const parts=Object.entries(answerLabels).filter(([k])=>!['stage','concern','experience','correction','followup','feedback'].includes(k)&&a[k]!==undefined&&a[k]!=='').map(([k,label])=>`${label}：${a[k]}`);
  return parts.join('；')+(a.experience?`。补充经历：${a.experience}`:'。目前没有额外文字经历，以上选择是用户主动确认的背景线索。');
}
export function interviewReadiness(a){
  const required=interviewQuestions(a).filter(q=>!q.optional),missing=required.filter(q=>!(q.values||q.options).some(v=>String(v)===String(a[q.id]))).map(q=>q.id);
  return {ready:missing.length===0,missing};
}
export function sampleChoiceInput(stage='senior'){
  let a={stage,concern:stageOf(stage).concerns[0],interviewVersion:1};
  for(let i=0;i<30;i++){
    const missing=interviewQuestions(a).find(q=>!q.optional&&!Object.hasOwn(a,q.id));
    if(!missing)break;
    a=updateInterviewAnswer(a,missing,(missing.values||missing.options)[0]);
  }
  return a;
}
export function updateInterviewAnswer(a,question,value){
  const next={...a,[question.id]:value};
  if(question.id==='stage'&&a.stage!==value){
    for(const key of ['concern','education','currentSituation','schoolPlan','priority'])delete next[key];
  }
  for(const q of interviewQuestions(next,true))if(next[q.id]!==undefined&&!(q.values||q.options).some(v=>String(v)===String(next[q.id])))delete next[q.id];
  const visible=new Set(interviewQuestions(next,true).map(q=>q.id));
  for(const key of ['schoolPlan','internship','offer','research','support','income','familyBinding','runway'])if(!visible.has(key))delete next[key];
  return next;
}
export function sampleInput(){return {stage:'senior',concern:'升学与就业如何取舍',education:'普通本科',field:'计算机与信息',city:'省会或区域中心城市',currentSituation:'已有课程或项目成果，缺少行业经历',experienceType:'做出一个作品 / 产品',task:'把模糊需求整理成清楚方案',feedback:'能把事情讲清楚、组织好',familyContext:'希望稳定、留在熟悉的地方',mobility:'可以考虑外地一段时间',income:'需要尽快获得或保持收入',hours:2,priority:'比较学习与实践方向',decisionStyle:'尽快得到真实反馈',experience:'校园项目中，我更愿意整理需求和调整页面。'};}
