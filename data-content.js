// CET-6 训练题库 · 听力 / 阅读 / 翻译 / 写作
// 听力采用浏览器语音合成朗读，无需音频文件

window.LISTENING_SETS = [
  {
    id: "L1",
    title: "校园场景 · 短对话与通知",
    level: "基础",
    desc: "4 题 · 对话 + 校园广播",
    items: [
      {
        lines: [
          { sp: "W", t: "I heard you are taking the advanced writing course this term." },
          { sp: "M", t: "I was going to, but it clashes with my lab sessions. I will take it next year instead." }
        ],
        q: "What does the man mean?",
        opts: ["He has dropped the writing course.", "He will take the course next year.", "He finds the course too difficult.", "He has finished his lab work."],
        ans: 1,
        exp: "男士说 it clashes with my lab sessions（与实验课冲突），所以 I will take it next year instead，即明年再修。"
      },
      {
        lines: [
          { sp: "M", t: "Did you manage to get tickets for the concert?" },
          { sp: "W", t: "They sold out in ten minutes. I am on the waiting list, but I am not holding my breath." }
        ],
        q: "What does the woman imply?",
        opts: ["She is confident about getting a ticket.", "She has already bought two tickets.", "She thinks her chance is slim.", "She has given up going entirely."],
        ans: 2,
        exp: "not holding my breath 意为“不抱太大希望”，说明她认为候补成功的可能性很小。"
      },
      {
        lines: [
          { sp: "N", t: "Students who plan to use the library's group study rooms during the exam period must book them at least one day in advance. Each booking lasts a maximum of two hours, and the room will be released if the group is more than fifteen minutes late." }
        ],
        q: "What happens if a group arrives twenty minutes late?",
        opts: ["They must pay a fine.", "Their room may be given to others.", "They can stay for only one hour.", "They have to book again immediately."],
        ans: 1,
        exp: "通知说迟到超过十五分钟 the room will be released，即房间会被释放给他人使用。"
      },
      {
        lines: [
          { sp: "W", t: "Professor Lee, I am worried about my term paper. I have collected a lot of material but I cannot seem to organize it." },
          { sp: "M", t: "That is usually a sign you need to step back and decide what your main argument is. Bring me an outline on Thursday." }
        ],
        q: "What does the professor suggest the student do?",
        opts: ["Collect more materials.", "Change her research topic.", "Clarify her central argument.", "Submit the paper on Thursday."],
        ans: 2,
        exp: "教授说需要先退一步 decide what your main argument is，并周四带来 outline，重点在于理清核心论点。"
      }
    ]
  },
  {
    id: "L2",
    title: "职场与生活 · 办公政策",
    level: "进阶",
    desc: "4 题 · 对话 + 公司公告",
    items: [
      {
        lines: [
          { sp: "M", t: "I see you have started cycling to work. Isn't it dangerous in traffic?" },
          { sp: "W", t: "It felt that way at first, but the new bike lane makes a huge difference. I actually get to the office faster than by bus." }
        ],
        q: "What does the woman say about cycling?",
        opts: ["It is more dangerous than before.", "It saves her time.", "She only does it on weekends.", "She plans to take the bus again."],
        ans: 1,
        exp: "她说 I actually get to the office faster than by bus，说明骑车更省时间。"
      },
      {
        lines: [
          { sp: "W", t: "The company is offering free training in data analysis next month." },
          { sp: "M", t: "Free? That is surprising. But it is on weekday evenings, and I am already struggling to keep up with my current workload." }
        ],
        q: "What is the man's main concern?",
        opts: ["The training is too expensive.", "He has no interest in data.", "He lacks time to attend.", "The course is too advanced."],
        ans: 2,
        exp: "男士强调课程在工作日晚上，而他已经难以应付现有工作量，担忧的是时间。"
      },
      {
        lines: [
          { sp: "N", t: "Starting next Monday, all staff will be able to work from home two days a week. Team meetings will still be held in the office on Wednesdays, and anyone working remotely must remain reachable between nine and five." }
        ],
        q: "What are staff required to do when working from home?",
        opts: ["Join all meetings online.", "Remain reachable during office hours.", "Report to managers every morning.", "Work two days in a row."],
        ans: 1,
        exp: "公告明确要求远程办公者 must remain reachable between nine and five，即在办公时间内保持可联系。"
      },
      {
        lines: [
          { sp: "M", t: "I have read your proposal. The idea is strong, but the budget section is vague. How did you arrive at these numbers?" },
          { sp: "W", t: "I based them on last year's project, but you are right. I should break the costs down more carefully." }
        ],
        q: "What will the woman probably do next?",
        opts: ["Abandon the proposal.", "Ask for a larger budget.", "Revise the cost details.", "Explain the idea again."],
        ans: 2,
        exp: "她承认应该 break the costs down more carefully，接下来会细化并修改预算部分。"
      }
    ]
  },
  {
    id: "L3",
    title: "科普与城市 · 独白理解",
    level: "挑战",
    desc: "4 题 · 观点与数据",
    items: [
      {
        lines: [
          { sp: "W", t: "I read that the city is replacing all its street lights with LED bulbs." },
          { sp: "M", t: "Yes, they cost more upfront, but they use about half the electricity. The savings should cover the cost in three years." }
        ],
        q: "What does the man say about the new street lights?",
        opts: ["They are cheaper to buy.", "They pay for themselves over time.", "They are less bright than before.", "They need frequent replacement."],
        ans: 1,
        exp: "前期更贵，但省电，三年内节省的电费可抵消成本，即“会回本”。"
      },
      {
        lines: [
          { sp: "M", t: "Why did you choose to study urban planning?" },
          { sp: "W", t: "I grew up in a town where the only place teenagers could go was a shopping mall. I wanted to learn how to design better public spaces." }
        ],
        q: "Why did the woman choose her field?",
        opts: ["To work in a shopping mall.", "To improve public spaces.", "To move to a bigger city.", "To follow her parents' advice."],
        ans: 1,
        exp: "她说想 learn how to design better public spaces，这正是她选择城市规划的原因。"
      },
      {
        lines: [
          { sp: "N", t: "Researchers tracked two thousand volunteers for five years and found that those who walked for thirty minutes a day were significantly less likely to develop heart disease. Interestingly, the benefit was the same whether the walk was done in one session or split into three short ones." }
        ],
        q: "What did the research find?",
        opts: ["Long walks are far better than short ones.", "Short walks are equally effective if total time is the same.", "Only young people benefit from walking.", "Five years of exercise prevents all heart disease."],
        ans: 1,
        exp: "研究指出 benefit was the same whether the walk was done in one session or split into three short ones。"
      },
      {
        lines: [
          { sp: "W", t: "The report says recycling rates have fallen, even though more people say they care about the environment." },
          { sp: "M", t: "That gap is the interesting part. People support the idea, but they will not sort their rubbish if it is inconvenient." }
        ],
        q: "How does the man explain the gap?",
        opts: ["People do not really care about recycling.", "Recycling bins are too expensive.", "Convenience matters more than stated attitudes.", "The report's data are unreliable."],
        ans: 2,
        exp: "男士认为人们口头支持，但如果分类不方便就不会去做，说明便利性比态度更能预测行为。"
      }
    ]
  }
];

window.READING_PASSAGES = [
  {
    id: "R1",
    title: "The Quiet Power of Urban Trees",
    level: "中等",
    minutes: 8,
    topic: "城市 · 健康",
    paras: [
      "City trees are usually treated as decoration — pleasant, but optional. A growing body of research suggests that this view is not only wrong but expensive. Trees, it turns out, function more like public health infrastructure than like garden furniture.",
      "In a study covering three mid-sized cities, researchers compared street-tree density with health survey data from more than 40,000 residents. After controlling for income, age and education, they found that every ten percent increase in tree cover along a street was associated with a measurable drop in reported stress and a small but consistent improvement in sleep quality. The effect was strongest among residents who lived in apartments without balconies or gardens.",
      "Explanations go beyond cleaner air. One widely cited mechanism is attention restoration: natural scenes engage the mind softly, allowing the mental effort required by traffic, noise and crowding to recover. Trees also cut traffic noise, lower summer temperatures, and make walking more attractive — each of which has its own documented effect on health.",
      "Yet the benefits are distributed unevenly. In most cities, tree cover is thickest in wealthy neighborhoods and thinnest in dense, low-income ones, where residents often have the least access to parks. Several cities have responded with planting programs that target the hottest and least green blocks. The obstacle is rarely the cost of saplings; it is the long-term budget for watering and pruning, and the complaints that come with fallen leaves, blocked light and broken pavements.",
      "Reframing trees as infrastructure changes the calculation. Roads are not abandoned because they require maintenance, and neither should the urban forest be. The question is not whether a city can afford to plant trees, but whether it can afford the health costs of not planting them."
    ],
    questions: [
      {
        q: "Which statement best expresses the main idea of the passage?",
        opts: ["City trees should be valued as health infrastructure rather than decoration.", "Wealthy neighborhoods have better access to public parks.", "Tree planting programs are too expensive for most cities.", "Air quality is the main reason trees improve health."],
        ans: 0,
        exp: "首段点题，末段明确 reframing trees as infrastructure，全篇围绕“树是基础设施”展开。"
      },
      {
        q: "Why did the researchers control for income, age and education?",
        opts: ["To recruit more residents for the survey.", "To make sure the effect was not caused by other social factors.", "To compare cities of different sizes.", "To measure how many people live in apartments."],
        ans: 1,
        exp: "控制变量是为了排除收入、年龄、教育等混杂因素，使“树木—健康”的关联更可信。"
      },
      {
        q: "The phrase “attention restoration” (Paragraph 3) refers to the idea that nature helps people ______.",
        opts: ["focus harder on difficult tasks", "recover from mental fatigue", "become more aware of noise", "avoid crowded public spaces"],
        ans: 1,
        exp: "原文说自然以“softly”的方式吸引注意，使大脑从交通、噪音、拥挤带来的精神消耗中恢复。"
      },
      {
        q: "What does the author imply in the last paragraph?",
        opts: ["Cities should stop building new roads.", "Maintenance costs make tree planting impractical.", "Health costs of having no trees are also a real expense.", "Saplings are more expensive than most people think."],
        ans: 2,
        exp: "末句把不种树的健康成本也算作支出，暗示“不种”同样要付出代价。"
      }
    ]
  },
  {
    id: "R2",
    title: "When Machines Take the Routine",
    level: "较难",
    minutes: 9,
    topic: "科技 · 就业",
    paras: [
      "Every wave of automation has arrived with predictions of mass unemployment, and every wave so far has produced disruption rather than disappearance. The tractor emptied fields and filled factories; the spreadsheet eliminated countless bookkeeping hours and created an industry of analysts. The reasonable expectation, then, is that artificial intelligence will reshape work rather than end it.",
      "What makes this wave different is where it lands. Earlier machines replaced physical routine; AI reaches into cognitive routine — drafting standard documents, summarizing meetings, writing routine code. These tasks were once the training ground for white-collar careers, the work given to people who had not yet learned to do anything else.",
      "This is why the most useful way to think about automation is by task rather than by occupation. Almost every job is a bundle: a nurse manages equipment, comforts patients, and negotiates with doctors. Only the first of those is easy to automate. Analyses that count occupations therefore tend to overstate the danger, while analyses that ignore tasks miss the real one.",
      "The real risk lies in the entry level. If firms use AI to remove junior tasks, they may save money in the short term while quietly dismantling the career ladder. A law firm that no longer hires junior associates to review documents will, in ten years, find itself without senior lawyers who learned the craft by reviewing documents. The same pattern threatens journalism, design and software development.",
      "The response cannot be to slow the technology down; it is to rebuild the first rung. Some companies now assign juniors to supervise and check AI output — work that requires judgment and teaches the limits of the tool. Others rotate new hires through short projects that machines cannot yet handle. Public policy has a role too, in funding training that is long enough to matter and in protecting workers during transitions. None of this happens automatically. The ladder, once removed, does not grow back."
    ],
    questions: [
      {
        q: "What is the author's point in Paragraph 1?",
        opts: ["Automation has always caused mass unemployment.", "Previous waves changed work rather than eliminating it.", "Predictions about technology are usually accurate.", "Factories were the main beneficiaries of the tractor."],
        ans: 1,
        exp: "首段用拖拉机和电子表格说明：历次自动化带来的是 disruption 而非 disappearance。"
      },
      {
        q: "According to the author, what is distinctive about AI?",
        opts: ["It is cheaper than earlier technologies.", "It replaces cognitive routine tasks as well as physical ones.", "It affects only white-collar occupations.", "It creates more jobs than it destroys."],
        ans: 1,
        exp: "第二段明确指出 AI 进入 cognitive routine，而早期机器只替代体力常规劳动。"
      },
      {
        q: "The “career ladder” metaphor is used to warn that ______.",
        opts: ["junior staff are paid too little", "firms will lose the pipeline of experienced professionals", "law firms hire too many associates", "AI cannot review documents accurately"],
        ans: 1,
        exp: "原文说十年后公司将没有通过做基础工作成长起来的资深律师，即人才成长通道断裂。"
      },
      {
        q: "Which solution would the author most likely support?",
        opts: ["Restricting the use of AI in professional firms.", "Giving newcomers work that builds judgment.", "Counting occupations rather than tasks.", "Reducing the number of junior positions."],
        ans: 1,
        exp: "末段主张 rebuild the first rung：让新人监督和核查 AI 产出、参与需要判断力的项目。"
      }
    ]
  },
  {
    id: "R3",
    title: "Sleep, Memory, and the All-Nighter",
    level: "中等",
    minutes: 8,
    topic: "心理 · 学习",
    paras: [
      "Every exam season, libraries fill with students who believe that staying awake is the same as studying harder. The belief is understandable and almost entirely wrong. Sleep is not a pause in learning; it is one of its stages.",
      "During deep, slow-wave sleep, the brain replays patterns of activity recorded during the day, gradually transferring them from the hippocampus, a fast but temporary store, to the cortex, where they become durable. Rapid-eye-movement sleep appears to support the consolidation of skills and the processing of emotion. Cut either stage short and the material is not simply forgotten — it never finishes being stored.",
      "The classic experiment is simple. Two groups learn the same list of word pairs. One sleeps normally; the other stays awake until morning. Both are tested the next day, and the sleepers recall substantially more. The more striking finding concerns self-assessment: the sleep-deprived group consistently predicts that it has performed well. Lack of sleep does not merely weaken memory; it weakens the ability to notice that memory has weakened.",
      "This has practical consequences. Spacing study across several days and protecting the sleep between sessions will outperform a single long night of cramming, even when total study hours are identical. Short naps can help — twenty minutes is enough to improve alertness — but they do not replace a full night. Caffeine extends wakefulness without restoring the consolidation that sleep would have provided.",
      "So the all-nighter is best understood as a trade: tonight's progress purchased with tomorrow's memory, at a poor exchange rate, and with the added cost of not knowing how bad the deal was."
    ],
    questions: [
      {
        q: "What is the central claim of the passage?",
        opts: ["Students should study longer hours before exams.", "Sleep plays an active role in consolidating memory.", "Caffeine is an effective substitute for sleep.", "Short naps are more valuable than a full night's sleep."],
        ans: 1,
        exp: "首段指出 Sleep is not a pause in learning; it is one of its stages，全文围绕睡眠对记忆巩固的作用。"
      },
      {
        q: "What happens during slow-wave sleep according to the passage?",
        opts: ["Emotions are processed and discharged.", "Memories move from a temporary store to a durable one.", "The brain stops replaying daytime activity.", "Skills are practiced more quickly than in waking life."],
        ans: 1,
        exp: "原文说海马体把信息逐渐转移到皮层，由临时存储变为持久存储。"
      },
      {
        q: "What was the most striking result of the experiment?",
        opts: ["The sleep-deprived group recalled more than expected.", "Both groups performed equally well.", "Sleep-deprived students overestimated their own performance.", "The word pairs were too easy for both groups."],
        ans: 2,
        exp: "原文 the more striking finding concerns self-assessment：缺觉组预测自己表现得很好，即高估自己。"
      },
      {
        q: "The author's attitude toward staying up all night is best described as ______.",
        opts: ["cautiously supportive", "clearly critical", "neutral and descriptive", "uncertain"],
        ans: 1,
        exp: "末段用“poor exchange rate”“added cost”评价通宵复习，态度明显是批评的。"
      }
    ]
  }
];

window.TRANSLATIONS = [
  {
    id: "T1",
    cn: "中国的茶文化源远流长，饮茶不仅是一种生活习惯，也是一种社交方式。",
    keys: ["茶文化 tea culture", "源远流长 has a long history / dates back centuries", "不仅……也…… not only ... but also ...", "社交方式 a way of socializing"],
    ref: "Tea culture in China has a long history. Drinking tea is not only a daily habit but also a way of socializing.",
    tip: "中文短句多，英译时可拆成两句；注意“源远流长”不要直译成 long river，用 has a long history 更自然。"
  },
  {
    id: "T2",
    cn: "近年来，越来越多的年轻人选择到中小城市工作和生活，这在一定程度上缓解了大城市的人口压力。",
    keys: ["近年来 in recent years", "中小城市 small and medium-sized cities", "在一定程度上 to some extent", "缓解 relieve / ease", "人口压力 population pressure"],
    ref: "In recent years, more and more young people have chosen to work and live in small and medium-sized cities, which has to some extent eased the population pressure on big cities.",
    tip: "后半句用 which 引导非限制性定语从句承接整句，是六级翻译的常见得分结构。"
  },
  {
    id: "T3",
    cn: "高铁的快速发展使人们的出行更加便捷，也促进了沿线地区的经济繁荣。",
    keys: ["高铁 high-speed rail", "出行 travel", "便捷 convenient", "沿线地区 areas along the lines", "经济繁荣 economic prosperity"],
    ref: "The rapid development of high-speed rail has made travel more convenient and has also promoted economic prosperity in the areas along the lines.",
    tip: "两个并列谓语共用一个主语，用 and also 连接即可，不必重复 the development。"
  },
  {
    id: "T4",
    cn: "教育公平是社会公平的重要基础，政府应确保每个孩子都能接受优质教育。",
    keys: ["教育公平 educational equity", "重要基础 an important foundation", "确保 ensure", "接受优质教育 receive quality education"],
    ref: "Educational equity is an important foundation of social equity, and the government should ensure that every child can receive a quality education.",
    tip: "ensure that + 从句；中文“应”译为 should，避免用 must 使语气过强。"
  },
  {
    id: "T5",
    cn: "随着人口老龄化加剧，如何为老年人提供更好的照护服务已成为一个迫切需要解决的问题。",
    keys: ["人口老龄化 population aging", "加剧 intensify", "照护服务 care services", "迫切需要 urgently need", "解决 address / solve"],
    ref: "As population aging intensifies, how to provide better care services for the elderly has become an issue that urgently needs to be addressed.",
    tip: "“如何……”作主语时用 how to do 结构，谓语用单数 has become。"
  },
  {
    id: "T6",
    cn: "传统节日承载着民族的文化记忆，其习俗在一代代人的传承中不断被赋予新的含义。",
    keys: ["传统节日 traditional festivals", "承载 carry", "文化记忆 cultural memory", "传承 transmission / passing down", "赋予新的含义 give new meaning to"],
    ref: "Traditional festivals carry the cultural memory of a nation, and their customs have been given new meanings as they are passed down from generation to generation.",
    tip: "“在……中”可处理为 as 引导的时间状语从句，使句子更符合英语表达习惯。"
  }
];

window.WRITING_TASKS = [
  {
    id: "W1",
    title: "The Importance of Lifelong Learning",
    cn: "终身学习的重要性",
    prompt: "Write an essay on the importance of lifelong learning. You should write at least 150 words but no more than 200 words.",
    outline: [
      "开篇：知识更新加快，学习不再是校园阶段的事",
      "论证：技能过时、职业转换、个人成长三个层面",
      "结尾：把学习变成日常习惯，而非临时任务"
    ],
    model: `In the past, education was something that happened once, usually between the ages of six and twenty-two. That model no longer fits a world in which the half-life of a technical skill is measured in years rather than decades.

The most obvious reason for lifelong learning is economic. Jobs that seemed secure a generation ago have been reshaped or replaced, and the ability to acquire a new skill quickly has become more valuable than any single qualification. A designer who learns to work with AI tools, or a teacher who learns basic data analysis, is not merely keeping up; they are widening the range of problems they can solve.

There is also a deeper, less practical reason. Learning keeps a person's understanding of the world from hardening. Adults who continue to read, argue and revise their opinions tend to be more patient with complexity and less threatened by disagreement.

Lifelong learning does not require a classroom. It requires a habit: one book, one course, or one difficult conversation a week, sustained for years. The point is not to collect certificates but to remain teachable.`,
    highlights: [
      "the half-life of a technical skill is measured in years rather than decades —— 用“半衰期”比喻技能过时，开头有画面感",
      "not merely keeping up; they are widening the range of problems they can solve —— not merely 递进结构",
      "keeps a person's understanding of the world from hardening —— keep sth from doing 结构，表达“思维僵化”",
      "remain teachable —— 简短有力的收尾，比“keep learning”更地道"
    ]
  },
  {
    id: "W2",
    title: "Should College Students Take Part-time Jobs?",
    cn: "大学生是否应该做兼职",
    prompt: "Some people believe college students should take part-time jobs; others think study should come first. Write an essay presenting your view. You should write at least 150 words but no more than 200 words.",
    outline: [
      "引入争议：兼职是“提前接触社会”还是“分散精力”",
      "分析：兼职的价值取决于工作性质与时间投入",
      "结论：有条件地支持，优先选择与专业相关的岗位"
    ],
    model: `Few campus debates divide students as evenly as the question of part-time work. Supporters describe it as a bridge to the real world; critics see it as a distraction from the only job students actually have.

Both sides are partly right, which suggests the real question is not whether to work but what kind of work, and at what cost. A student who spends eight hours a week assisting in a laboratory, editing for a campus publication, or tutoring children is practicing skills that no lecture can fully teach: meeting deadlines, explaining ideas to people who do not share their background, and discovering what they actually enjoy. A student who delivers packages until midnight four nights a week is learning something too — mostly that exhaustion makes it hard to read.

The distinction is not between mental and manual labor, but between work that compounds and work that merely consumes. Compounding work leaves a skill, a portfolio, or a relationship behind. Consuming work leaves only a wage.

My own view is therefore conditional. Part-time work is worth doing when it is related to one's field, limited to roughly ten hours a week, and treated as an addition to study rather than a substitute for it.`,
    highlights: [
      "Few campus debates divide students as evenly as ... —— 高级开篇句式，避免“Nowadays”",
      "work that compounds and work that merely consumes —— compound / consume 对比，全文的论证支点",
      "treated as an addition to study rather than a substitute for it —— rather than 对比结构",
      "conditional —— 用一个词概括立场，观点清晰"
    ]
  },
  {
    id: "W3",
    title: "How Artificial Intelligence Is Changing Education",
    cn: "人工智能如何改变教育",
    prompt: "Write an essay on how artificial intelligence is changing education. You should write at least 150 words but no more than 200 words.",
    outline: [
      "现象：AI 已进入课堂与自学场景",
      "两面：个性化学习的机遇 / 思考外包的风险",
      "主张：把 AI 当作陪练而非答案",
    ],
    model: `Artificial intelligence has entered education quietly, through grammar checkers, translation tools and chatbots that answer questions at two in the morning. Its defenders promise personalized learning for every student; its critics warn of a generation that can produce an essay without having a thought.

The promise is real. A well-designed system can diagnose exactly which step of a math problem a student misunderstands, and adjust the next exercise accordingly — something a teacher with forty students cannot do by hand. For learners in remote areas, a patient tutor available at any hour is a genuine expansion of opportunity.

The risk is equally real, and it is subtler. When a tool produces a fluent answer instantly, the discomfort that normally triggers learning disappears. Students may finish assignments faster while understanding less, and the gap will only become visible in situations where the tool is absent.

The difference lies in how the tool is used. Used as an answer machine, AI replaces thinking. Used as a sparring partner — ask it to critique a draft, to argue the opposite side, to explain a concept three different ways — it multiplies thinking. Schools should teach the second habit explicitly, because students will not discover it on their own.`,
    highlights: [
      "produce an essay without having a thought —— 有力的对比，point 突出",
      "the discomfort that normally triggers learning disappears —— 把“学习的不适感”作为论证核心",
      "Used as an answer machine ... Used as a sparring partner ... —— 平行结构，节奏感强",
      "multiplies thinking —— 与 replaces thinking 形成呼应"
    ]
  },
  {
    id: "W4",
    title: "Dealing with Pressure Before Exams",
    cn: "如何应对考试压力",
    prompt: "Write an essay on how students can deal with pressure before exams. You should write at least 150 words but no more than 200 words.",
    outline: [
      "承认压力普遍存在，且并非全是坏事",
      "方法：可控的复习计划、身体状态、认知重评",
      "收尾：目标是从“害怕失败”转向“专注过程”"
    ],
    model: `Almost every student knows the particular tension of the week before exams: the inability to sit still, the sense that everyone else is working harder, the sudden urge to reorganize one's notes instead of reading them.

Pressure itself is not the enemy. A certain amount of it sharpens attention and makes us prepare. The problem begins when pressure becomes background noise that never stops, because then it consumes the very energy it was supposed to mobilize.

Three things help, and none of them is glamorous. The first is a plan small enough to be believable: instead of "review everything," list the six topics you will actually cover today. The second is physical — sleep, meals, and twenty minutes of walking, which reliably do more for concentration than another hour of anxious scrolling. The third is a change of question. "Will I fail?" has no useful answer; "What is the next thing I need to understand?" does.

None of this removes the pressure. It simply puts the pressure to work, which is the most any of us can ask of it.`,
    highlights: [
      "the sudden urge to reorganize one's notes instead of reading them —— 极具体的生活细节，阅卷老师一看就懂",
      "it consumes the very energy it was supposed to mobilize —— very 强调 + 反讽逻辑",
      "none of them is glamorous —— 坦率，反而增加可信度",
      "puts the pressure to work —— put sth to work 活用，收尾干净"
    ]
  },
  {
    id: "W5",
    title: "Why Reading Classics Still Matters",
    cn: "为什么仍要读经典",
    prompt: "Write an essay on why reading classics still matters in the digital age. You should write at least 150 words but no more than 200 words.",
    outline: [
      "对照：信息越来越多，注意力越来越短",
      "经典的价值：慢、复杂、经过时间筛选",
      "结论：读经典是一种注意力的训练"
    ],
    model: `We live in an age of abundant text and scarce attention. A day's worth of headlines can be read in fifteen minutes, and most of them will be forgotten by evening. It is worth asking what the classics offer that this stream cannot.

The first answer is resistance. A nineteenth-century novel does not adapt itself to our habits; it demands that we adapt to its pace, its long sentences and its willingness to spend three pages on a single room. That demand is the point. Reading something that refuses to be skimmed is a form of attention training, and attention is now the scarcest resource we have.

The second answer is depth of judgment. Classics have survived a brutal filter: generations of readers found them worth returning to. They tend to deal with problems that do not expire — ambition, grief, the gap between who we are and who we meant to be.

None of this requires rejecting the internet. It requires one hour a week in which we choose the slow, difficult book over the convenient summary. That hour is not a luxury; it is maintenance.`,
    highlights: [
      "abundant text and scarce attention —— 对称结构，一句话立住时代背景",
      "it demands that we adapt to its pace —— 拟人化，突出“抵抗感”",
      "problems that do not expire —— 简洁判断句",
      "it is maintenance —— 把阅读比作“维护保养”，收尾有新意"
    ]
  }
];
