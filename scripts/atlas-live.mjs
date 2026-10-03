import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {understand,directions} from '../src/profiling/engine.mjs';
import {sampleInput} from '../public/domain/stages.js';
const privateConfig=JSON.parse((await readFile(new URL('../.local/relay.json',import.meta.url),'utf8')).replace(/^\uFEFF/,''));
const env={API_KEY:privateConfig.apiKey,API_BASE:privateConfig.apiBase,PROFILE_MODEL:'gpt-5.4-mini'};
const root=new URL('../',import.meta.url);await mkdir(new URL('qa/live/',root),{recursive:true});await mkdir(new URL('public/content/',root),{recursive:true});
const key=process.argv[2]||'senior';
const base=sampleInput();
const cases={
 senior:base,
 school:{stage:'school',concern:'专业如何选择',field:'尚未确定',experience:'高中毕业，办读书分享时我最喜欢采访同学的看法，整理成一篇短文。设计海报不太喜欢，和别人讨论不同观点让我想继续。',process:'追问为什么、把观点写清楚',hours:1,boundary:'先用免费的学习材料，专业还没决定。',priority:'找到愿意继续做的任务'},
 early:{stage:'early',concern:'专业是否适合我',field:'科学与工程',experience:'大一，课上物理基础题很难，但我喜欢动手做一个小实验、测量数据和解释结果。公式记忆让我厌倦，实际测量反而愿意重复。',process:'重复测量、对比误差，知道原因',hours:2,boundary:'课程紧，只能做安全且不需要购买器材的体验。',priority:'比较学习与实践方向'},
 junior:{stage:'junior',concern:'深造还是专业实践',field:'计算机与信息',experience:'大三软件工程，成绩靠前。上次研究助理工作需要反复读论文和做实验，我觉得很消耗，不想继续。反而为图书馆做借书小工具很投入，用户反馈好。',process:'把具体问题写成可运行程序',hours:2,boundary:'本学期每次只能安排两小时，还没核实研究机会。',income:'尚未核实',priority:'比较学习与实践方向'},
 graduate:{stage:'graduate',concern:'工作与兴趣有距离',field:'商业与管理',experience:'毕业半年，做销售助理。最喜欢整理顾客问题和归类反馈，追着成交和频繁打电话让我疲惫。希望学一点调研分析，但要保持收入。',process:'发现反复出现的问题，做一个清楚的归纳',hours:1,boundary:'不能辞职，只能业余学习。',income:'需要保持或尽快获得收入',priority:'明确下一步取舍'},
 coding:{...base,experience:'我在西安读软件工程，大四，成绩不错但没有实习。做校园二手交易网站时，最投入的是调试接口、定位并发错误，解决问题后很有成就感。采访同学和调整视觉让我疲惫，不太愿意重复。',process:'定位错误、分析原理、让程序稳定运行'},
 corrected:{...base,correction:'我不喜欢反复做访谈，也不想把用户研究当长期方向。我喜欢的是把已经明确的需求用页面交互呈现。'},
 none_school:{stage:'school',concern:'还不知道喜欢什么',field:'尚未确定',experience:'目前还没有明确经历，希望从日常线索或微体验开始。',hours:1,boundary:'先尝试免费任务，专业尚未确定。',priority:'先完成一个小尝试'},
 none_early:{stage:'early',concern:'想探索新的方向',field:'尚未确定',experience:'目前还没有明确经历，希望从日常线索或微体验开始。',hours:1,priority:'先完成一个小尝试'},
 none_junior:{stage:'junior',concern:'想跨方向但不确定',field:'尚未确定',experience:'目前还没有明确经历，希望从日常线索或微体验开始。',hours:1,income:'尚未核实',priority:'先完成一个小尝试'},
 none_senior:{stage:'senior',concern:'缺少实践，不知怎么开始',field:'尚未确定',experience:'目前还没有明确经历，希望从日常线索或微体验开始。',hours:1,income:'需要保持或尽快获得收入',priority:'先完成一个小尝试'},
 none_graduate:{stage:'graduate',concern:'怎样兼顾收入和学习',field:'尚未确定',experience:'目前还没有明确经历，希望从日常线索或微体验开始。',hours:1,income:'需要保持或尽快获得收入',priority:'先完成一个小尝试'}
};
const answers=cases[key];if(!answers)throw Error('未知虚构场景');
const started=Date.now();const output={case:key,fictitious:true,started:new Date().toISOString(),steps:[]};
try{
 const u=await understand(answers,env,AbortSignal.timeout(45000));const profile={...u.profile,id:crypto.randomUUID(),revision:1,answerVersion:'synthetic-'+key,followupRound:0};profile.interestHypotheses.forEach(h=>h.confirmation='accepted');profile.constraints.forEach(c=>c.confirmed=true);
 output.steps.push({task:'profile',status:'passed',metrics:u.metrics,insight:profile.insight.text,interests:profile.interestHypotheses.map(h=>h.taskPreference),nextQuestion:u.nextQuestion});console.log(JSON.stringify(output.steps.at(-1)));
 const plan=await directions(profile,answers,env,AbortSignal.timeout(180000),e=>{if(e.status==='failed')console.log(JSON.stringify(e));});
 output.steps.push({task:'plan',status:'passed',metrics:plan.metrics,routeTitles:plan.routes.map(r=>r.title),profileRevision:plan.profileRevision});
 const artifact={answers,profile,plan,fictitious:true,notice:'开发验证使用虚构人物。所有输出经本次真实模型调用及结构守卫。'};
 await writeFile(new URL('qa/live/'+key+'-result.json',root),JSON.stringify(artifact,null,2));
 if(key==='senior')await writeFile(new URL('public/content/senior-example.json',root),JSON.stringify(artifact));
 console.log(JSON.stringify(output.steps.at(-1)));
}catch(e){output.steps.push({status:'failed',code:e.code||'validation',message:e.code?e.message:'内容或连接校验失败。'});console.log(JSON.stringify(output.steps.at(-1)));process.exitCode=1;}
output.durationMs=Date.now()-started;await writeFile(new URL('qa/live/'+key+'-summary.json',root),JSON.stringify(output,null,2));
