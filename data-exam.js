// CET-6 水平自测题库 · 30 题 / 4 个维度
// 用于定位当前水平并生成学习计划，非官方真题

window.EXAM = {
  minutes: 25,
  sections: [
    {
      id: "vocab",
      name: "词汇与表达",
      short: "词汇",
      desc: "12 题 · 选出最符合句意的词",
      weight: 0.30,
      items: [
        {
          q: "The government has promised to ______ the tax burden on low-income families.",
          opts: ["alleviate", "accelerate", "accumulate", "allocate"],
          ans: 0,
          exp: "alleviate the burden 是固定搭配，意为“减轻负担”。accelerate 加速；accumulate 积累；allocate 分配。"
        },
        {
          q: "Despite decades of investigation, the cause of the accident remains ______.",
          opts: ["obscure", "obvious", "optimistic", "explicit"],
          ans: 0,
          exp: "obscure 表示“模糊不清的、鲜为人知的”，与 remains 搭配说明原因仍不清楚。"
        },
        {
          q: "Her argument was so ______ that even her strongest critics were persuaded.",
          opts: ["coherent", "controversial", "arbitrary", "rigid"],
          ans: 0,
          exp: "coherent 意为“连贯的、有条理的”，所以连反对者都被说服。controversial 有争议的，与句意相反。"
        },
        {
          q: "Many coastal species are highly ______ to rising sea temperatures.",
          opts: ["vulnerable", "immune", "identical", "reluctant"],
          ans: 0,
          exp: "be vulnerable to 意为“易受……伤害”。immune to 是“不受影响”，语义相反。"
        },
        {
          q: "The situation is so serious that ______ measures are needed immediately.",
          opts: ["drastic", "subtle", "authentic", "arbitrary"],
          ans: 0,
          exp: "drastic measures 意为“激烈的措施”，与 serious、immediately 呼应。subtle 微妙的，语气不符。"
        },
        {
          q: "He was clearly ______ to admit that his forecast had been wrong.",
          opts: ["reluctant", "willing", "eager", "certain"],
          ans: 0,
          exp: "reluctant to do 表示“不情愿做某事”，与 clearly 构成“明显不情愿”的让步语气。"
        },
        {
          q: "Rising production costs have seriously ______ the company's ability to compete.",
          opts: ["undermined", "enhanced", "justified", "preserved"],
          ans: 0,
          exp: "undermine 意为“削弱、暗中破坏”，与 ability to compete 搭配表示竞争力被削弱。"
        },
        {
          q: "The two explanations are not mutually ______; both may be partly true.",
          opts: ["exclusive", "consistent", "identical", "apparent"],
          ans: 0,
          exp: "mutually exclusive 是固定表达，意为“互相排斥的”。后半句 both may be partly true 提示两者可以并存。"
        },
        {
          q: "The museum's collection of ancient manuscripts is remarkably ______.",
          opts: ["extensive", "intensive", "expensive", "exclusive"],
          ans: 0,
          exp: "an extensive collection 指“藏品丰富”。intensive 意为“密集的、加强的”，不修饰 collection 的规模。"
        },
        {
          q: "We need to ______ the problem from a completely different angle.",
          opts: ["approach", "abandon", "restrain", "fluctuate"],
          ans: 0,
          exp: "approach the problem from an angle 意为“从某个角度看待问题”。confront 不与 from an angle 搭配。"
        },
        {
          q: "The new evidence ______ the theory that the site was once a trading port.",
          opts: ["supports", "prohibits", "restrains", "fluctuates"],
          ans: 0,
          exp: "evidence supports a theory 是常见搭配，表示“证据支持某一理论”。"
        },
        {
          q: "The committee failed to reach a ______ on the proposed budget.",
          opts: ["consensus", "criterion", "deficit", "scrutiny"],
          ans: 0,
          exp: "reach a consensus on sth 意为“就某事达成共识”，是固定搭配。"
        }
      ]
    },
    {
      id: "grammar",
      name: "语法与结构",
      short: "语法",
      desc: "6 题 · 选出正确的语法形式",
      weight: 0.15,
      items: [
        {
          q: "______ the heavy rain, the outdoor concert went ahead as planned.",
          opts: ["Despite", "Although", "Because of", "Unless"],
          ans: 0,
          exp: "空格后是名词短语 the heavy rain，只能用介词 Despite。Although 接从句；Because of 语义相反。"
        },
        {
          q: "It is essential that every applicant ______ the safety regulations before entering the lab.",
          opts: ["follow", "follows", "followed", "will follow"],
          ans: 0,
          exp: "It is essential that 之后的从句用虚拟语气，谓语用动词原形，不受主语单复数影响。"
        },
        {
          q: "The novel, ______ was published in 1998, is still widely read today.",
          opts: ["which", "that", "what", "it"],
          ans: 0,
          exp: "逗号隔开的是非限制性定语从句，先行词为物时只能用 which，不能用 that。"
        },
        {
          q: "Hardly ______ the lecture hall when the fire alarm went off.",
          opts: ["had he entered", "he had entered", "did he enter", "he entered"],
          ans: 0,
          exp: "hardly 位于句首时主句部分倒装，且与 when 搭配时用过去完成时：Hardly had he done... when...。"
        },
        {
          q: "She would rather ______ at home than go to the party.",
          opts: ["stay", "staying", "to stay", "stayed"],
          ans: 0,
          exp: "would rather do sth than do sth，前后都用动词原形。"
        },
        {
          q: "The number of students applying for the program ______ steadily over the past five years.",
          opts: ["has increased", "have increased", "are increasing", "increase"],
          ans: 0,
          exp: "主语中心词是 the number（单数），谓语用单数；over the past five years 提示现在完成时。"
        }
      ]
    },
    {
      id: "reading",
      name: "阅读理解",
      short: "阅读",
      desc: "2 篇文章 · 8 题",
      weight: 0.35,
      texts: [
        {
          id: "E1",
          title: "The Four-Day Week Experiment",
          paras: [
            "Few management ideas travel as fast as the four-day week. A New Zealand trust tested it in 2018, and within five years hundreds of companies across Europe and Asia had run their own trials. Because the idea is usually reported as a story about free time, a more interesting question is often missed: why would paying the same salary for one day less not reduce output?",
            "The trials suggest that it often does not. Most participating firms reported stable or slightly higher productivity, and several kept the policy permanently. The explanation is not that employees worked harder in fewer hours. It is that the shorter week forced managers to remove what had been quietly wasting time: meetings without agendas, constant interruptions, and tasks that mattered only because they had always been done. One consultancy described the change not as shorter work but as compressed work, in which the same value is produced with less friction.",
            "These results deserve attention, but they also deserve caution. Companies that volunteer for a trial are rarely typical. They tend to be knowledge-based, flexible about hours, and already well managed. A hospital, a factory line or a call centre cannot simply compress its schedule; coverage has to be maintained, and the cost lands on staffing rather than on meetings.",
            "The real lesson, then, is not that every organisation should move to four days. It is that a great deal of the working week is padding, and that removing padding is possible even in a five-day schedule. The firms that learned this during the trial kept the gains after the trial ended."
          ]
        },
        {
          id: "E2",
          title: "Why We Underrate Boredom",
          paras: [
            "Boredom has a bad reputation. It is treated as a fault in the environment or in ourselves, something to be eliminated with a screen. Waiting four minutes for a bus now feels like a problem that a phone is expected to solve.",
            "Psychologists tell a more complicated story. Boredom, they argue, is not the absence of stimulation but a signal that the current activity lacks meaning. That signal is unpleasant, and understandably we escape it. Yet research suggests that mild boredom has a use: when the mind is not occupied, it wanders, and a wandering mind makes connections that a focused one would not.",
            "In one well-known experiment, participants were asked to copy numbers from a phone book before completing a test that asked them to list as many uses as possible for a pair of plastic cups. Those who had done the boring task produced more original answers than those who had gone straight to the creativity test. The dull interval, it seems, had primed them to seek novelty.",
            "But the picture is not uniformly positive. Prolonged, involuntary boredom — a job with no tasks, a year of waiting — is associated with depression and impulsive behaviour. The difference appears to lie in meaning and control: a boring gap that we chose and can leave is restorative; a boring life that we cannot change is corrosive.",
            "The practical conclusion is modest. Not every empty moment needs to be filled, and not every silence needs a podcast. Protecting a little boredom may be a cheap way to recover the attention that constant stimulation has spent."
          ]
        }
      ],
      items: [
        {
          text: "E1",
          q: "What does the author suggest is often overlooked in reports on the four-day week?",
          opts: ["Its effect on productivity.", "Its cost to employees.", "Its origin in New Zealand.", "Its popularity in Asia."],
          ans: 0,
          exp: "第一段末尾指出，媒体把它当作“空闲时间”的故事，反而漏掉了 why ... not reduce output，即对生产率的影响。"
        },
        {
          text: "E1",
          q: "According to the passage, why did productivity remain stable in the trials?",
          opts: ["Employees worked longer hours.", "Firms removed inefficient practices.", "Salaries were cut by one fifth.", "New staff were hired for peak days."],
          ans: 1,
          exp: "第二段说明原因不是员工更拼命，而是缩短工时迫使管理者去掉无议程的会议、频繁打断等浪费时间的事。"
        },
        {
          text: "E1",
          q: "What limitation of the trials does the author point out?",
          opts: ["They lasted too short a time.", "They involved atypical, already well-managed firms.", "They depended on government funding.", "They ignored employees' opinions."],
          ans: 1,
          exp: "第三段说志愿参加试验的公司 rarely typical，多为知识型、时间灵活、管理良好的企业，医院、工厂难以照搬。"
        },
        {
          text: "E1",
          q: "What is the author's conclusion?",
          opts: ["All organisations should adopt a four-day week.", "The trials produced no reliable evidence.", "Removing wasted time is valuable even without a shorter week.", "Hospitals should be excluded from such debates."],
          ans: 2,
          exp: "末段明确：真正的启示不是都改四天制，而是 a great deal of the working week is padding，五天制同样可以去掉这些冗余。"
        },
        {
          text: "E2",
          q: "What is the common view of boredom described in Paragraph 1?",
          opts: ["It is a useful source of ideas.", "It is a problem to be removed quickly.", "It is caused only by modern technology.", "It is a sign of low intelligence."],
          ans: 1,
          exp: "第一段说无聊被当作环境或自身的缺陷，something to be eliminated with a screen，即需要立刻消除的问题。"
        },
        {
          text: "E2",
          q: "How do psychologists in the passage regard boredom?",
          opts: ["As a signal that an activity lacks meaning.", "As a form of mental illness.", "As a result of too much information.", "As an entirely unnecessary emotion."],
          ans: 0,
          exp: "第二段：Boredom is not the absence of stimulation but a signal that the current activity lacks meaning。"
        },
        {
          text: "E2",
          q: "The experiment with plastic cups is used to show that ______.",
          opts: ["boring tasks reduce concentration", "mild boredom can encourage original thinking", "creativity cannot be reliably measured", "physical tasks improve memory"],
          ans: 1,
          exp: "抄电话号码（枯燥任务）后，被试在列举杯子用途时答案更原创，说明轻度无聊能激发新颖联想。"
        },
        {
          text: "E2",
          q: "What distinction does the author make in Paragraph 4?",
          opts: ["Between chosen boredom and forced boredom.", "Between physical and mental tiredness.", "Between creative and practical work.", "Between short and long working hours."],
          ans: 0,
          exp: "第四段区分“自己选择且能离开的无聊”（有恢复作用）与“无法改变的长期无聊”（有侵蚀作用），关键在意义与控制感。"
        }
      ]
    },
    {
      id: "listening",
      name: "听力理解",
      short: "听力",
      desc: "4 题 · 点击播放，可重复听",
      weight: 0.20,
      items: [
        {
          lines: [
            { sp: "W", t: "Are you going to the career fair on Friday?" },
            { sp: "M", t: "I would like to, but my internship interview is at the same time. I am trying to see if I can move it." }
          ],
          q: "What is the man trying to do?",
          opts: ["Attend the career fair instead of the interview.", "Reschedule his internship interview.", "Cancel his internship application.", "Find a friend to go with him."],
          ans: 1,
          exp: "男士说面试与招聘会时间冲突，I am trying to see if I can move it，即想改面试时间。"
        },
        {
          lines: [
            { sp: "M", t: "The rent here is higher than I expected. Maybe I should look for a place further from campus." },
            { sp: "W", t: "But then you would spend the difference on transport, and lose an hour a day." }
          ],
          q: "What does the woman point out?",
          opts: ["Rents near campus will fall soon.", "Living farther away has hidden costs.", "The man should buy a car.", "Public transport is unreliable."],
          ans: 1,
          exp: "女士指出省下的房租会花在交通上，还要每天多花一小时，即远离校园有隐性成本。"
        },
        {
          lines: [
            { sp: "N", t: "The writing center will be open until nine during exam week. Appointments can be booked online, but walk-ins are welcome if a tutor is free." }
          ],
          q: "What does the announcement say about the writing center?",
          opts: ["It closes earlier during exam week.", "It only accepts online bookings.", "It accepts walk-ins when a tutor is available.", "It offers free printing services."],
          ans: 2,
          exp: "通知说 walk-ins are welcome if a tutor is free，即有辅导老师空闲时可以现场咨询。"
        },
        {
          lines: [
            { sp: "N", t: "People often say that reading speed is the key to exams. In my experience, students who read more slowly but pause to summarize do better than those who race through the text twice." }
          ],
          q: "What does the speaker believe?",
          opts: ["Speed is the most important reading skill.", "Reading the text twice is always better.", "Understanding matters more than speed.", "Students should avoid summarizing."],
          ans: 2,
          exp: "说话者认为读得慢但停下来总结的学生表现更好，强调理解而非速度。"
        }
      ]
    }
  ]
};
