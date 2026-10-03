export const evidence = {
  checked: '2026-10-02',
  scope: '人工整理的官方来源快照；以西安院校和陕西高校就业网刊载的岗位为参考，含历史样本，不代表整个就业市场，也不保证仍在招。目标年度、专业目录、工作地点和个人资格须回到原页核实。',
  sources: [
    {id:'study_policy',title:'教育部｜2027 年硕士研究生招生管理规定',url:'https://www.moe.gov.cn/srcsite/A15/moe_778/s3261/202609/t20260923_1451734.html',kind:'官方政策入口',city:'全国',status:'2027 年政策；其他招生年度须重新核实',summary:'官方招生政策入口。升学规划需核对适用年度、报考资格和目标院校章程，不以成绩或模型共识推算录取机会。',skills:['招生年度核对','报考资格核对','目标院校章程'],gate:'只适用于对应招生年度；个人资格与专业要求需要单独确认。'},
    {id:'study_sample',title:'西安交通大学｜2026 年硕士招生章程（历史样本）',url:'https://yz.xjtu.edu.cn/info/1082/4281.htm',kind:'历史院校样本',city:'陕西 · 西安',status:'2026 年历史章程，不作为 2027 / 2028 年报考依据',summary:'学校研招网公布的历史章程，可用于比较全日制与非全日制培养、报考条件和专业目录。目标年度招生安排与个人资格须重新核实。',skills:['培养方式比较','报考资格核对','专业目录核对'],gate:'不能套用历史报名时间或据此认定未来招生资格与录取概率。'},
    {id:'java',title:'NTT DATA 西安分公司｜2026 届 Java 开发历史样本',url:'https://yau.bysjy.com.cn/detail/career?id=674876',kind:'历史校招技能样本',city:'陕西 · 西安',status:'2026 届历史校招信息，仅作技能与资格对照，不作为当前投递入口',summary:'延安大学就业平台刊载的西安岗位样本，涉及 Java、Spring / Spring MVC、JavaScript 与 SQL 数据库。用于对照项目材料，不能据此认定当前有适配机会。',skills:['Java','Spring','JavaScript','SQL','项目说明'],gate:'原样本限定 2026 届相关专业全日制本科或硕士，并有英语要求；不能套用到其他毕业年份。'},
    {id:'ai',title:'西安朝前智能｜算法实习历史样本',url:'https://job.xidian.edu.cn/job/view/id/1519765',kind:'历史实习技能样本',city:'陕西 · 西安',status:'高校就业网已标记过期，仅作技能对照，不作为投递入口',summary:'西安电子科技大学就业网刊载的历史样本，涉及 Python、Linux / Git、LLM Agent、模型评估及 NLP / CV 成果。用于比较任务要求，不认定当前在招。',skills:['Python','Linux / Git','LLM Agent','模型评估','实践成果'],gate:'原样本限定相关院校、专业及在校身份，要求至少三个月、每周四天实习；个人资格须单独核实。'},
    {id:'data',title:'西安交大｜IBM 西安研发中心实践案例（历史）',url:'https://news.xjtu.edu.cn/info/1003/72229.htm',kind:'历史培养与实践案例',city:'陕西 · 西安',status:'2015 年历史案例，仅作任务理解，不作为当前招生或实习入口',summary:'学校新闻网记录的研究生联合培养案例，包含软件开发、测试、数据挖掘与分析等实践。可用于理解数据相关任务，不能据此认定当前仍有该培养或实习机会。',skills:['程序设计','软件测试','数据挖掘与分析','实践反馈'],gate:'历史案例为研究生联合培养，不能套用于本科资格；当前培养安排和机会须重新核实。'},
    {id:'campus',title:'字节跳动｜2027 校园招聘与实习 FAQ',url:'https://jobs.bytedance.com/campus/page-6272Gc',kind:'招聘规则',city:'具体岗位以原页为准',status:'2027 届校招规则，投递窗口以官方为准',summary:'校招覆盖 2026 年 9 月至 2027 年 8 月毕业、最高学历毕业后无全职经历的学生；普通实习面向在校生，通常要求至少三个月。',skills:['毕业时间核对','实习时间安排'],gate:'毕业年份和在校身份需要单独核实，不能用“大四”直接判断资格。'},
    {id:'past',title:'国家大学生就业服务平台｜2026 Java 实习历史岗位',url:'https://fg.ncss.cn/student/jobs/MroUkuX6thw61M5A8cDZUB/detail.html',kind:'历史技能样本',city:'北京',status:'已下线，不作为投递入口',summary:'该历史岗位强调 Java、数据结构，以及能够证明能力的竞赛、开源和技术表达。仅保留为项目材料对照。',skills:['Java','数据结构','项目说明','开源'],gate:'已下线；不能推断当前招聘机会。'}
  ]
};
