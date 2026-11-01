// Only background is prefilled. Time, resources and boundaries belong to the visitor.
export const studentStory='我是一名计算机专业的大二学生，会一点 Python，也参加过比赛。最近不知道该继续刷算法题，还是做项目、准备实习。什么都重要，可时间不够，我该先做什么？';
export function studentAnswers(){return {interviewVersion:3,stage:'early',concern:'刷题、项目和实习怎么安排',field:['计算机与信息'],currentSituation:'课程为主，还在尝试不同方向',experience:studentStory};}

export const studentExampleQuestion='参加比赛时，你更投入哪一部分？';
export const studentExampleChoices=[
 {id:'algorithm',label:'想出解法，把题做出来'},
 {id:'project',label:'写出一个能运行的功能'},
 {id:'teamwork',label:'和队友分工，把事情推进'},
 {id:'unsure',label:'还说不清，想再试试'}
];
export const studentExampleConditions='本次可投入 2 小时 · 优先免费资源 · 暂无已确认的限制';
export function studentAnalysisAnswers(choiceId){
 const choice=studentExampleChoices.find(item=>item.id===choiceId);
 if(!choice)throw Error('请选择一项示例回答。');
 return {...studentAnswers(),hours:2,support:'可用学校资源，优先免费体验',boundary:['暂时没有确认的硬限制'],experience:studentStory+'\n示例追问：'+studentExampleQuestion+'\n这位学生的选择：'+choice.label};
}
