import {readFile,writeFile} from 'node:fs/promises';
async function edit(path,changes){let s=await readFile(path,'utf8');for(const [from,to] of changes){if(!s.includes(from))throw Error(path+' missing: '+from.slice(0,70));s=s.replaceAll(from,to);}await writeFile(path,s);}
await edit('public/app/main.js',[
 ["if(el.id==='answer'){persistAnswer(el);const q=interviewQuestions(s.answers)[s.index];", "if(el.id==='experience-detail'){s.answers.experience=el.value;save();}if(el.id==='answer'){persistAnswer(el);const q=interviewQuestions(s.answers,s.interviewDeep)[s.index];"],
 ["go(s.answers.experience?'profile':'home')", "go(s.profile||interviewReadiness(s.answers).ready?'profile':s.answers.stage?'interview':'home')"],
 ["s.index=0;s.profile=null;consent=false;go('interview')", "s.index=0;s.interviewDeep=false;s.profile=null;s.nextQuestion=null;s.confirmations={};s.constraints={};consent=false;go('interview')"],
 ["case'no-experience':s.answers.experience='目前还没有明确经历，希望从日常线索或微体验开始。';next();break;", ""],
 ["请逐项确认或拒绝兴趣线索。", "先告诉我们，哪些兴趣线索像你，哪些不像你。"],
 ["请逐项核对现实边界；需要改动时先纠正。", "再核对一下现实条件；有不准确的地方可以先修改。"],
 ["这个追问会影响判断。你可以回答，或主动选择暂时不知道。", "还有一个问题可能影响建议。你可以补充，也可以选择现在还不知道。"],
 ["请先主动同意本次资料传输。", "先确认本次回答可以用于 AI 分析，再继续。"],
 ["已有规划与行动记录会保留。", "继续上次的回答，或重新开始。已有方向和行动记录都会保留。"],
 ["纠正这项理解", "告诉我们哪里理解错了"],
 ["写下哪项事实或推断不准确，以及你的真实想法。纠正将进入新画像，旧方向保留并标为待更新。", "一两句话就够：哪一点不像你，你实际的想法是什么？我们会据此更新画像，并保留之前的方向记录。"],
 ["根据纠正重新理解", "带着补充重新理解"],
 ["取消修改", "暂时不改"],
 ["请写下具体纠正。", "写一点实际情况，让我们知道该改哪里。"],
 ["请写一点回答，或选择暂时不知道。", "选一个答案，或选择现在还不知道。"],
 ["const value=$('#followup').value.trim();", "const value=(s.nextQuestion?.format==='choice'?$('input[name=followup-answer]:checked')?.value:$('#followup')?.value||'')?.trim()||'';"],
 ["if(el.id==='ai-consent')consent=el.checked;", "if(el.id==='ai-consent')consent=el.checked;if(el.name==='followup-answer'){s.followupDraft=el.value;save();}"],
 ["case'dismiss-followup':s.nextQuestion=null;error='';save();render();break;", "case'dismiss-followup':s.nextQuestion=null;s.followupDraft='';error='';save();render();break;"],
 ["s.nextQuestion=e.nextQuestion||null;s.confirmations={};", "s.nextQuestion=e.nextQuestion||null;s.followupDraft='';s.confirmations={};"],
 ["理解你的经历", "整理你的背景与兴趣线索"],
 ["匹配学习资料", "寻找可用的学习材料"],
 ["综合方向与取舍", "形成适合当前处境的方向"],
 ["分析已取消，回答与原规划仍保留。", "已停止这次分析。你的回答都在，准备好后可以继续。"],
 ["请留下至少一条真实体验，再重新理解。", "写下一点做过后的感受，再看看它会怎样改变建议。"],
 ["当前匿名会话没有旧版云端记录。", "这个浏览器还没有旧版云端记录。"],
 ["每次更新都会保留旧方向。旧版资料保持只读兼容。", "这里保存着你探索过的方向和行动记录。更新建议时，旧记录也会留着。"],
 ["你的第一份规划还未写下。", "还没有方向记录。先回答几个问题，给自己一个开始。"],
 ["先从真实经历理解具体任务偏好，每项推断都可接受、拒绝或纠正。至少两份不同模型收到相同的确认画像与学习资料，再由独立综合模型比较条件、投入与风险。", "先用选择题确认你的学习状态、实践、家庭与现实条件，再由 AI 整理兴趣线索。画像由你核对后，不同模型会独立比较方向，最后综合可行性、投入和风险，形成建议。"],
 ["少量学习资料支持任务体验，不代替院校当年规则或岗位有效期。条件预览仅改变一个条件，不重新执行 AI，不覆盖原推荐。", "每条建议会说明理由、风险和第一步。你也可以预览一个条件变化后会发生什么；正式升学资格和岗位信息，仍需向官方确认。"],
 ["包含规划、依据与行动记录；不包含模型凭据。可下载或复制保存。", "把方向、依据和行动笔记保存到自己的设备，方便以后回看。"],
 ["本地空间不足，请先导出。当前内容保留在此页面。", "浏览器存储空间不够了。当前内容仍在，先导出一份备份再继续。"],
 ["经历、材料与适用边界", "这条建议的依据"],
 ["暂无适配外部材料。这是探索假设，不支持资格或收入结论。", "暂时没有匹配的学习材料，可以先按行动步骤做一次小尝试。"],
 ["原页尚待核验", "请打开原页确认最新内容"],
 ["打开学习原页", "去看看这份材料"],
 ["本地预览没有分析个人经历。", "这是基础预览，还没有分析你的个人兴趣。"],
 ["没有具体年度院校规则或当前岗位数据，需到官方核实。", "申请资格、机会有效期和费用，请以官方最新信息为准。"],
 ["本次传输同意已结束，请重新确认。", "这次需要重新确认资料用途，再开始分析。"],
 ["先填写自己的经历", "先回答自己的背景选择题"],
 ["从我的经历开始", "开始我的探索"],
 ["新主链保留本地记录与临时分析缓存。旧版缓存和云端记录不会自动删除。", "你的回答和行动笔记保存在这个浏览器里。换设备或清理浏览器前，可以先导出备份；旧版记录也保留在这里。"],
 ["读取旧记录", "查看这份记录"],
 ["旧版规划 · 只读保留", "之前的规划记录"]
]);
await edit('public/views/profile.js',[
 ["join('')}</section>\n    <section class=\"boundaries\"", "join('')}</div>\n    <section class=\"boundaries\""],
 ["${key==='hours'?' / 次':''}", "${key==='hours'?' 小时 / 次':''}"],
 ["分析资料只会临时保留，用来完成本次画像与防止重复请求。", "服务器会临时保留分析资料 24 小时，用于完成本次分析和避免重复请求。你的长期记录默认保存在当前浏览器。"],
 ["<label class=\"sr-only\" for=\"followup\">补充回答</label><textarea id=\"followup\" data-draft=\"followup\" class=\"text-input\" rows=\"3\" maxlength=\"1000\">${esc(s.followupDraft||'')}</textarea>", "${s.nextQuestion.format==='choice'?`<div class=\"answers\" role=\"group\" aria-label=\"补充回答\">${s.nextQuestion.options.map(o=>`<label class=\"answer-option\"><input type=\"radio\" name=\"followup-answer\" value=\"${esc(o)}\" ${s.followupDraft===o?'checked':''}><span class=\"radio-mark\"></span><strong>${esc(o)}</strong>${icon('check','selected-icon')}</label>`).join('')}</div>`:`<label class=\"sr-only\" for=\"followup\">补充回答</label><textarea id=\"followup\" data-draft=\"followup\" class=\"text-input\" rows=\"3\" maxlength=\"1000\">${esc(s.followupDraft||'')}</textarea>`}"],
 ["<section class=\"paper profile-facts\">", "<details class=\"paper profile-facts\"><summary>查看已确认的背景</summary>"],
 ["${answerSummary(a)}</dl></section>", "${answerSummary(a)}</dl></details>"]
]);
await edit('public/views/analysis.js',[
 ["理解经历", "理解你的处境"], ["把线索，连接成方向。", "正在为你比较下一步。"], ["认真读懂你的这一段经历。", "把你的回答，放在一起理解。"],
 ["不同模型独立比较，再结合你的兴趣与现实边界形成建议。", "我们会分别比较不同方向的可行性、投入和风险，再结合你的现实条件给出建议。"],
 ["从具体过程开始，区分事实、兴趣假设与重要未知。", "先整理你确认的背景，再寻找兴趣线索。需要核实的地方，会留给你判断。"],
 ["输入和已有版本保留", "你的回答和已有记录都在"], ["取消本次分析", "先停止，稍后继续"], ["重试本次分析", "再试一次"], ["返回核对", "返回我的回答"]
]);
await edit('public/views/result.js',[
 ["你的方向，还未展开。", "你的下一步，可以从这里开始。"],
 ["把可能的路，放在眼前。", "几条值得考虑的路。"],
 ["最值得验证的改变", "先改变什么，更有帮助"],
 ["点选一个方向，看清理由与代价。", "选一条看看：为什么适合现在的你，又需要付出什么。"],
 ["带着已有的经历", "从当前的条件出发"], ["学习与实践假设", "通过体验继续判断"],
 ["方向会随新经历更新，选择不被锁定。", "这是当前的建议。新的体验和条件，会带来新的选择。"],
 ["如果一个条件改变，会怎样？", "如果现实条件变了，选择会怎么变？"],
 ["原规划", "现在的条件"], ["学习重点与调整条件", "怎么准备，什么时候再判断"],
 ["查看经历与资料依据", "看看建议的依据"], ["查看这条路的第一步", "这条路，可以怎样开始"],
 ["一个小验证", "先做一件小事"], ["开始第一步", "开始这一步"],
 ["部分模型未返回。至少两份不同模型的合法规划参与了综合。", "这次有模型未返回，建议由两份不同模型的有效规划共同形成。你仍可以查看各自的理由。"],
 ["修正理解，再看一次", "条件变了？更新我的方向"],
 ["回答或理解已修改，这份方向待更新。旧结果和行动记录保留。", "你的情况已经更新。这是之前的建议，行动记录仍然保留；可以重新分析最新的方向。"]
]);
await edit('public/views/action.js',[
 ["用一次真实体验，看看自己喜欢的是否是实际任务。", "不用一次做出最终决定。先完成这件小事，看看哪些过程让你想继续。"],
 ["任务材料与依据", "看看需要的材料"],
 ["勾选不自动证明条件已满足。", "完成后留一点感受，会比勾选本身更有帮助。"],
 ["做过之后，留一点真实体验。", "做完后，告诉我们你的感受。"],
 ["不必写完整报告。区分不感兴趣、基础不足与环境不合适。", "一句话也可以。哪里有意思，哪里费劲，愿不愿意再做一次？这些会让下一次建议更贴近你。"],
 ["带着体验，再理解一次", "用这次体验更新建议"], ["保存并返回方向", "保存笔记，回看方向"],
 ["这是旧版方向的行动记录。理解已变化，可保留记录并重新分析。", "这是之前方向的行动记录。你可以继续记笔记，也可以结合新情况重新分析。"]
]);
await edit('public/index.html',[
 ["人生坐标 | AI 学业与职业规划", "人生坐标｜理解你的处境，找到下一步"],
 ["从你的经历、家庭与现实机会出发，探索学业与职业路线。改变关键条件，看见新的可能，找到可以开始的下一步。", "通过个性化选择题了解你的学习、家庭、地域与现实条件，确认 AI 画像，比较适合你的方向，找到可以开始的下一步。"],
 ["先看见可能，再选择方向。", "先看清处境，再找到下一步。"],
 ["正在展开你的人生地形册。", "正在准备你的探索空间。"],
 ["仅本地保存", "回答保存在此浏览器"],
 ["每一步，都让方向更清楚。", "下一步，从更了解自己开始。"],
 ["面向高中毕业至大学毕业阶段。来源覆盖有限，资格与机会有效期请向官方核实。", "面向高中毕业到毕业初期的你。建议帮助你比较与探索；具体申请资格、机会和费用，请以官方信息为准。"]
]);
await edit('public/views/home.js',[["真实 AI "+"'+(config.checked?'正在休息；你的回答仍可保存，稍后再开始分析。'", "真实 AI "+"'+(config.checked?'暂时连接不上；先完成回答，稍后可以继续分析。'"]]);
console.log('已更新六个视图、全站提示与资料说明。');
