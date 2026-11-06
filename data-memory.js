/* =========================================================
   记忆方法与词根词缀数据
   ========================================================= */
window.MEMORY = (function () {

  /* 艾宾浩斯遗忘曲线（无复习时的留存率，经典实验值） */
  var FORGET_CURVE = [
    { t: "20 分钟", h: 58, d: 0.014 },
    { t: "1 小时", h: 44, d: 0.042 },
    { t: "9 小时", h: 36, d: 0.375 },
    { t: "1 天", h: 33, d: 1 },
    { t: "2 天", h: 28, d: 2 },
    { t: "6 天", h: 25, d: 6 },
    { t: "31 天", h: 21, d: 31 }
  ];

  /* 复习后的留存回升（间隔重复的典型形态） */
  var REVIEW_LIFT = [
    { label: "第 1 次学习", day: 0, h: 100 },
    { label: "第 1 次复习", day: 1, h: 100 },
    { label: "第 2 次复习", day: 3, h: 100 },
    { label: "第 3 次复习", day: 7, h: 100 },
    { label: "第 4 次复习", day: 15, h: 100 },
    { label: "第 5 次复习", day: 30, h: 100 }
  ];

  /* 记忆方法 */
  var TECHNIQUES = [
    {
      id: "recall",
      name: "主动回忆",
      en: "Active Recall",
      level: "最重要",
      claim: "读十遍不如合上书回想一遍。提取记忆的动作本身会强化记忆，这叫「测试效应」。",
      how: "看到英文先自己说出中文，或看到中文想英文。想不起来也要先硬想 5 秒，再看答案。",
      inApp: "词汇卡片正面只给单词，必须点开才显示释义——这就是强制回忆。不要先看答案再「假装认识」。",
      cite: "Roediger & Karpicke, 2006：测试组一周后留存 61%，重复阅读组只有 40%。"
    },
    {
      id: "spacing",
      name: "间隔重复",
      en: "Spaced Repetition",
      level: "最重要",
      claim: "在「快要忘记」的那一刻复习，记忆提升最大。间隔太短是浪费，太长则已经忘了。",
      how: "同一个词不要一次背十遍，而是分散到第 1、3、7、15、30 天各见一次。",
      inApp: "系统按 SM-2 算法自动算下次复习日：记得越牢，间隔拉得越长；忘了就重置回 1 天。",
      cite: "Cepeda et al., 2006：分散练习的长期留存比集中练习高 10–30%。"
    },
    {
      id: "root",
      name: "词根词缀",
      en: "Morphology",
      level: "提速关键",
      claim: "六级 6000 词里有大量同根词。记住 30 个高频词根，等于一次拿下几百个词。",
      how: "遇到生词先拆：前缀定方向（re- 再、sub- 下、trans- 穿过），词根定意思，后缀定词性。",
      inApp: "「记忆方法」页有高频词根表，共 36 组，每组配 3 个六级词汇。建议每天看 5 组。",
      cite: "Nation, 2001：掌握高频词族可使阅读覆盖率提升到 95% 以上。"
    },
    {
      id: "context",
      name: "语境记忆",
      en: "Contextual Learning",
      level: "推荐",
      claim: "孤立记单词容易「认识但不会用」。带句子的词，记忆强度和调用速度都更高。",
      how: "每个词至少记一个搭配或句子，尤其是动词要看它跟什么介词。",
      inApp: "每个词汇卡片都配了英文例句和中文翻译，朗读时会连例句一起读。"
    },
    {
      id: "interleave",
      name: "交错练习",
      en: "Interleaving",
      level: "推荐",
      claim: "同类题连做 30 道会「手感好、考试崩」。混着练虽然当场更难受，但迁移能力更强。",
      how: "不要一天只做选词填空。阅读、听力、翻译交替进行，让大脑反复切换。",
      inApp: "首页的今日任务默认就是四项混排：词汇 → 听力 → 阅读 → 翻译。",
      cite: "Rohrer & Taylor, 2007：交错练习组的迁移测试成绩高 43%。"
    },
    {
      id: "dual",
      name: "听说联动",
      en: "Dual Coding",
      level: "推荐",
      claim: "同时用「看」和「听」两个通道编码，记忆痕迹更牢，而且顺带练了听力辨音。",
      how: "背词时出声读一遍，注意重音位置。眼睛记拼写，耳朵记声音。",
      inApp: "每张卡片右侧的喇叭按钮会用系统语音朗读单词 + 例句，可调语速。"
    },
    {
      id: "sleep",
      name: "睡眠巩固",
      en: "Consolidation",
      level: "常被忽略",
      claim: "记忆是在睡眠中从海马体转移到皮层的。熬夜背的词，第二天掉得特别快。",
      how: "睡前 30 分钟过一遍当天的新词，不要在这段时间刷短视频。保证 7 小时睡眠。",
      inApp: "提醒默认设了晚 20:30 一档，用来做睡前复盘；别把复习拖到凌晨。"
    },
    {
      id: "chunk",
      name: "组块与联想",
      en: "Chunking",
      level: "辅助",
      claim: "工作记忆一次只能装 4±1 个组块。把零散信息编成有意义的块，容量立刻变大。",
      how: "把同义、反义、同主题的词放一起记（如表示「增加」的一组：rise / soar / surge / climb）。",
      inApp: "词库支持按主题筛选（经济、科技、环境等），同一主题的词天然成组。"
    }
  ];

  /* 高频词根词缀 */
  var ROOTS = [
    { r: "spect / spic", cn: "看", words: ["inspect 检查", "prospect 前景", "suspicious 可疑的"] },
    { r: "vis / vid", cn: "看", words: ["visible 可见的", "evidence 证据", "supervise 监督"] },
    { r: "aud", cn: "听", words: ["audience 听众", "audio 音频", "audit 审计"] },
    { r: "dict", cn: "说", words: ["predict 预测", "contradict 反驳", "dedicate 致力于"] },
    { r: "scrib / script", cn: "写", words: ["describe 描述", "prescription 处方", "manuscript 手稿"] },
    { r: "graph", cn: "写、画", words: ["biography 传记", "graphic 图形的", "paragraph 段落"] },
    { r: "port", cn: "携带", words: ["transport 运输", "portable 便携的", "export 出口"] },
    { r: "fer", cn: "带来、拿", words: ["transfer 转移", "infer 推断", "fertile 肥沃的"] },
    { r: "duc / duct", cn: "引导", words: ["conduct 进行", "induce 引起", "deduce 推论"] },
    { r: "ject", cn: "投掷", words: ["reject 拒绝", "project 投射", "inject 注入"] },
    { r: "mit / miss", cn: "送、放", words: ["submit 提交", "transmit 传送", "dismiss 解散"] },
    { r: "tract", cn: "拉、拽", words: ["attract 吸引", "contract 合同", "extract 提取"] },
    { r: "vert / vers", cn: "转", words: ["convert 转换", "reverse 颠倒", "versatile 多才多艺的"] },
    { r: "cap / cept", cn: "拿、取", words: ["capture 捕获", "accept 接受", "intercept 拦截"] },
    { r: "pos / pon", cn: "放置", words: ["compose 组成", "postpone 推迟", "deposit 存款"] },
    { r: "ced / cess", cn: "走、让", words: ["proceed 继续进行", "access 进入", "recession 衰退"] },
    { r: "struct", cn: "建造", words: ["construct 建造", "obstruct 阻碍", "infrastructure 基础设施"] },
    { r: "gen", cn: "产生、种类", words: ["generate 产生", "genuine 真正的", "indigenous 本土的"] },
    { r: "cred", cn: "相信", words: ["credible 可信的", "credit 信用", "incredible 难以置信的"] },
    { r: "fid", cn: "信任", words: ["confident 自信的", "fidelity 忠诚", "diffident 羞怯的"] },
    { r: "man", cn: "手", words: ["manual 手工的", "manipulate 操纵", "manufacture 制造"] },
    { r: "ped", cn: "脚", words: ["pedestrian 行人", "pedal 踏板", "impede 阻碍"] },
    { r: "flu", cn: "流动", words: ["fluent 流利的", "influence 影响", "fluctuate 波动"] },
    { r: "vac", cn: "空", words: ["vacant 空的", "evacuate 疏散", "vacuum 真空"] },
    { r: "terr", cn: "土地", words: ["territory 领土", "terrain 地形", "terrestrial 陆地的"] },
    { r: "mar", cn: "海", words: ["marine 海洋的", "submarine 潜水艇", "maritime 海事的"] },
    { r: "chron", cn: "时间", words: ["chronic 慢性的", "chronology 年表", "synchronize 同步"] },
    { r: "bio", cn: "生命", words: ["biology 生物学", "antibiotic 抗生素", "biography 传记"] },
    { r: "tele", cn: "远", words: ["telescope 望远镜", "telegraph 电报", "telecommunication 电信"] },
    { r: "log", cn: "说、学科", words: ["logic 逻辑", "dialogue 对话", "apology 道歉"] },
    { r: "phon", cn: "声音", words: ["symphony 交响乐", "microphone 麦克风", "phonetic 语音的"] },
    { r: "pre-", cn: "前、预先", words: ["predict 预测", "prevent 预防", "prevail 盛行"] },
    { r: "sub-", cn: "下、次", words: ["subordinate 下级的", "subsidy 补贴", "submerge 淹没"] },
    { r: "trans-", cn: "穿过、转变", words: ["transform 转变", "transparent 透明的", "transplant 移植"] },
    { r: "inter-", cn: "在…之间", words: ["interact 互动", "intercept 拦截", "intermediate 中级的"] },
    { r: "re-", cn: "再、回", words: ["restore 恢复", "reveal 揭示", "retain 保留"] },
    { r: "de-", cn: "向下、去除", words: ["decline 下降", "deplete 耗尽", "deduce 推论"] },
    { r: "ex-", cn: "向外、出", words: ["exclude 排除", "exceed 超过", "explicit 明确的"] },
    { r: "-ify", cn: "使…化（动词）", words: ["clarify 澄清", "verify 核实", "justify 证明正当"] },
    { r: "-ize", cn: "使…化（动词）", words: ["minimize 最小化", "prioritize 优先处理", "standardize 标准化"] },
    { r: "-ous", cn: "充满…的（形容词）", words: ["prosperous 繁荣的", "ambiguous 模糊的", "conscientious 认真的"] },
    { r: "-ity", cn: "性质、状态（名词）", words: ["productivity 生产力", "diversity 多样性", "integrity 诚信"] }
  ];

  return { FORGET_CURVE: FORGET_CURVE, REVIEW_LIFT: REVIEW_LIFT, TECHNIQUES: TECHNIQUES, ROOTS: ROOTS };
})();
