/* =========================================================
   CET-6 学习系统 · 应用逻辑
   纯前端，数据保存在 localStorage
   ========================================================= */
(function () {
  "use strict";

  /* ---------------- 工具 ---------------- */
  var DAY = 86400000;
  var KEY = "cet6_trainer_v1";

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function dstr(d) {
    d = d || new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function addDays(s, n) {
    var p = s.split("-");
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    d.setDate(d.getDate() + n);
    return dstr(d);
  }
  function diffDays(a, b) {
    var pa = a.split("-"), pb = b.split("-");
    var da = new Date(+pa[0], +pa[1] - 1, +pa[2]);
    var db = new Date(+pb[0], +pb[1] - 1, +pb[2]);
    return Math.round((db - da) / DAY);
  }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function fmtMin(m) { return m >= 60 ? Math.floor(m / 60) + " 小时 " + (m % 60) + " 分" : m + " 分钟"; }
  function dateLabel(s) {
    var p = s.split("-");
    return +p[1] + "月" + +p[2] + "日";
  }

  var toastTimer = null;
  function toast(msg) {
    var el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, 2000);
  }

  /* ---------------- 状态 ---------------- */
  // 2026 年下半年 CET-6：12 月 12 日（周六）15:00–17:25
  var PD = (typeof PLAN !== "undefined" && PLAN) ? PLAN : null;
  var EXAM_DATE = PD ? PD.exam.date : "2026-12-12";

  function defaultState() {
    return {
      v: 1,
      xp: 0,
      streak: { count: 0, last: "", best: 0 },
      days: {},
      vocab: {},
      listening: [],
      reading: [],
      translation: [],
      writing: [],
      exam: { history: [], latest: null },
      plan: null,
      settings: {
        dailyWords: 20,
        dailyMinutes: 40,
        examDate: EXAM_DATE,
        rate: 0.95,
        autoSpeak: true,
        notify: { on: true, times: ["08:00", "12:30", "20:30"], lastFired: "", lastDay: "" }
      }
    };
  }

  var S;
  try {
    S = JSON.parse(localStorage.getItem(KEY)) || defaultState();
  } catch (e) {
    S = defaultState();
  }
  // 兼容旧数据
  if (!S.settings) S.settings = defaultState().settings;
  if (!S.vocab) S.vocab = {};
  if (!S.days) S.days = {};
  if (!S.streak) S.streak = { count: 0, last: "", best: 0 };
  if (!S.exam) S.exam = { history: [], latest: null };
  if (!S.exam.history) S.exam.history = [];
  if (S.plan === undefined) S.plan = null;
  // 旧版本默认日期写错了（12-19），只有仍是这个值时才迁移
  if (S.settings.examDate === "2026-12-19" || !S.settings.examDate) S.settings.examDate = EXAM_DATE;
  // 提醒配置
  if (!S.settings.notify || typeof S.settings.notify !== "object") {
    S.settings.notify = defaultState().settings.notify;
  } else {
    var NT = S.settings.notify;
    if (NT.on == null) NT.on = true;
    if (!Array.isArray(NT.times) || !NT.times.length) NT.times = defaultState().settings.notify.times;
    if (NT.lastFired == null) NT.lastFired = "";
    if (NT.lastDay == null) NT.lastDay = "";
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { }
    syncDigest(false);
  }

  /* 把「到期词数」写进 Cache Storage，Service Worker 在后台也能读到（读不到 localStorage） */
  var lastDigest = 0;
  function syncDigest(force) {
    if (typeof caches === "undefined" || !caches.open) return;
    var now = Date.now();
    if (!force && now - lastDigest < 20000) return;
    lastDigest = now;
    try {
      var info = dueInfo();
      var payload = JSON.stringify({
        due: info.due,
        overdue: info.overdue,
        fresh: info.fresh,
        on: !!(S.settings.notify && S.settings.notify.on),
        times: S.settings.notify ? S.settings.notify.times : [],
        at: now
      });
      caches.open("cet6-data-v1").then(function (c) {
        return c.put("./due.json", new Response(payload, {
          headers: { "Content-Type": "application/json" }
        }));
      }).catch(function () { });
    } catch (e) { }
  }

  function dayRec(d) {
    var k = d || dstr();
    if (!S.days[k]) {
      S.days[k] = { words: 0, new: 0, minutes: 0, quizzes: 0, correct: 0, total: 0, listen: 0, read: 0, trans: 0, write: 0 };
    }
    var r = S.days[k];
    if (r.new == null) r.new = 0;
    return r;
  }

  function currentStreak() {
    var t = dstr();
    if (S.streak.last === t) return S.streak.count;
    if (S.streak.last === addDays(t, -1)) return S.streak.count; // 今天还没学，但昨天学过
    return 0;
  }

  function touch() {
    var t = dstr();
    if (S.streak.last !== t) {
      var y = addDays(t, -1);
      S.streak.count = S.streak.last === y ? (S.streak.count || 0) + 1 : 1;
      S.streak.last = t;
      S.streak.best = Math.max(S.streak.best || 0, S.streak.count);
    }
    save();
  }

  function gainXP(n) {
    S.xp = (S.xp || 0) + n;
    touch();
    updateChrome();
    save();
  }

  /* ---------------- 导航 ---------------- */
  var ICONS = {
    home: '<path d="M3 10.6 12 3l9 7.6V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z"/>',
    vocab: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M8 14h5"/>',
    listening: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="2.5" y="13" width="4.5" height="7" rx="1.6"/><rect x="17" y="13" width="4.5" height="7" rx="1.6"/>',
    reading: '<path d="M12 6.5C9.8 5 6.6 4.3 3.5 4.3v14.4c3.1 0 6.3.7 8.5 2.2 2.2-1.5 5.4-2.2 8.5-2.2V4.3c-3.1 0-6.3.7-8.5 2.2Z"/><path d="M12 6.5V21"/>',
    translation: '<path d="M3 5h11"/><path d="M8.5 3v2"/><path d="M11 5c0 4-3.2 7.5-7 9"/><path d="M6 9c1.2 2.6 3.2 4.4 5.5 5.5"/><path d="M13 20l4-10 4 10"/><path d="M14.6 16.5h4.8"/>',
    writing: '<path d="M12 20h9"/><path d="M16.8 3.4a2 2 0 0 1 2.8 2.8L7.2 18.6 3 20l1.4-4.2Z"/>',
    stats: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-6"/><path d="M22 20H2"/>',
    exam: '<rect x="4" y="3.5" width="16" height="17.5" rx="2"/><path d="M9 3h6v3H9z"/><path d="m8.5 13.5 2.3 2.3 4.7-5"/>',
    plan: '<path d="M6 3v3"/><path d="M18 3v3"/><rect x="3.5" y="5.5" width="17" height="15.5" rx="2"/><path d="M3.5 10.5h17"/><path d="M8 14h3"/><path d="M8 17.5h7"/>',
    review: '<path d="M18 8.5a6 6 0 1 0-2.2 4.6"/><path d="M18 3.5v5h-5"/><path d="M12 8.5V13l3 1.6"/>',
    memory: '<path d="M12 5.2a3.2 3.2 0 0 0-6 1v.6A3 3 0 0 0 4.2 9a3 3 0 0 0 .4 4.6A3 3 0 0 0 6 19a3 3 0 0 0 4.6 1.6 1.2 1.2 0 0 0 1.4-1.2Z"/><path d="M12 5.2a3.2 3.2 0 0 1 6 1v.6A3 3 0 0 1 19.8 9a3 3 0 0 1-.4 4.6A3 3 0 0 1 18 19a3 3 0 0 1-4.6 1.6 1.2 1.2 0 0 1-1.4-1.2Z"/><path d="M9.5 9.5h.01"/><path d="M14.5 9.5h.01"/><path d="M9.5 14h.01"/><path d="M14.5 14h.01"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/>'
  };

  var NAV = [
    { id: "home", label: "今日概览", kicker: "Dashboard", title: "开始今天的学习" },
    { id: "review", label: "复习提醒", kicker: "Review", title: "今天该复习什么" },
    { id: "plan", label: "备考计划", kicker: "Roadmap", title: "剩下的日子怎么走" },
    { id: "exam", label: "水平自测", kicker: "Placement Test", title: "测一测现在什么水平" },
    { id: "vocab", label: "词汇训练", kicker: "Vocabulary", title: "词汇记忆" },
    { id: "memory", label: "记忆方法", kicker: "Memory Science", title: "怎么记才记得住" },
    { id: "listening", label: "听力训练", kicker: "Listening", title: "听力理解" },
    { id: "reading", label: "阅读理解", kicker: "Reading", title: "仔细阅读" },
    { id: "translation", label: "翻译练习", kicker: "Translation", title: "汉译英" },
    { id: "writing", label: "写作训练", kicker: "Writing", title: "短文写作" },
    { id: "stats", label: "学习数据", kicker: "Progress", title: "数据与打卡" },
    { id: "settings", label: "设置", kicker: "Settings", title: "偏好设置" }
  ];

  function buildNav() {
    var nav = $("#nav");
    nav.innerHTML = NAV.map(function (n) {
      return '<button class="nav-item" data-route="' + n.id + '" type="button" title="' + n.label + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + ICONS[n.id] + '</svg>' +
        '<span>' + n.label + '</span></button>';
    }).join("");
    nav.addEventListener("click", function (e) {
      var b = e.target.closest("[data-route]");
      if (b) navigate(b.dataset.route);
    });
  }

  function navigate(id) {
    if (location.hash === "#" + id) render();
    else location.hash = id;
  }

  /* ---------------- 顶栏 ---------------- */
  function updateChrome() {
    var d = new Date();
    var wd = "日一二三四五六"[d.getDay()];
    $("#dateChip").textContent = (d.getMonth() + 1) + "月" + d.getDate() + "日 周" + wd;
    $("#xpChip").textContent = (S.xp || 0) + " XP";
    var cs = currentStreak();
    $("#sideStreak").textContent = "连续 " + cs + " 天";
  }

  /* =========================================================
     今日概览
     ========================================================= */
  function renderHome() {
    var d = dayRec();
    var target = S.settings.dailyWords;
    var info = dueInfo();
    var tasks = [
      { id: "vocab", name: "词汇记忆", meta: "新学 " + d.new + " / " + target + " 词 · 待复习 " + info.due + " 个", done: d.new >= target && info.due === 0 },
      { id: "listening", name: "听力训练", meta: "完成 1 组听力（4 题）", done: d.listen >= 1 },
      { id: "reading", name: "阅读理解", meta: "精读 1 篇短文", done: d.read >= 1 },
      { id: "translation", name: "翻译练习", meta: "完成 1 句汉译英", done: d.trans >= 1 }
    ];
    var doneCount = tasks.filter(function (t) { return t.done; }).length;
    var pct = doneCount / tasks.length;

    var learned = info.mastered;
    var left = Math.max(0, diffDays(dstr(), S.settings.examDate));
    var R = 46, C = 2 * Math.PI * R;

    var tasksHtml = tasks.map(function (t) {
      return '<div class="task-row">' +
        '<div class="task-check ' + (t.done ? "done" : "") + '">' + (t.done ? "✓" : "") + '</div>' +
        '<div><div class="task-name">' + t.name + '</div><div class="task-meta">' + t.meta + '</div></div>' +
        '<div class="task-right">' +
        (t.done
          ? '<span class="tag tag-green">已完成</span>'
          : '<button class="btn btn-sm btn-soft" data-go="' + t.id + '">去练习</button>') +
        '</div></div>';
    }).join("");

    var recent = [];
    if (S.reading.length) recent.push("阅读 " + S.reading[S.reading.length - 1].score + "/" + S.reading[S.reading.length - 1].total);
    if (S.listening.length) recent.push("听力 " + S.listening[S.listening.length - 1].score + "/" + S.listening[S.listening.length - 1].total);

    return '' +
      '<section class="hero">' +
        '<div>' +
          '<div class="hero-kicker">' + (pct >= 1 ? "今日任务已完成" : "今日学习计划") + '</div>' +
          '<div class="hero-title">' + greeting() + '</div>' +
          '<div class="hero-desc">' +
            (pct >= 1
              ? "今天的目标全部达成，保持这个节奏。可以去词库复习，或提前练一篇阅读。"
              : (S.plan
                  ? "距离 " + dateLabel(S.settings.examDate) + " 还有 " + left + " 天。当前目标 " + S.plan.target + " 分，" +
                    (S.plan.focus[0].pct >= 75 ? "四项较均衡，重点是限时训练。" : "重点补" + S.plan.focus[0].short + "和" + S.plan.focus[1].short + "。")
                  : "距离 " + dateLabel(S.settings.examDate) + " 还有 " + left + " 天。先花 25 分钟测一次水平，再按 8 周路线走，比盲目刷题快得多。")) +
          '</div>' +
          '<div class="row" style="margin-top:18px">' +
            '<button class="btn btn-lg" style="background:#fff;color:#2b4f74;border-color:#fff" data-go="' + (S.plan ? "vocab" : "exam") + '">' + (S.plan ? "开始背词" : "先测水平") + '</button>' +
            '<button class="btn btn-lg" style="background:rgba(255,255,255,.12);color:#fff;border-color:rgba(255,255,255,.35)" data-go="reading">做一篇阅读</button>' +
          '</div>' +
        '</div>' +
        '<div class="hero-ring">' +
          '<div class="ring-wrap">' +
            '<svg width="108" height="108" viewBox="0 0 108 108">' +
              '<circle cx="54" cy="54" r="' + R + '" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="7"/>' +
              '<circle cx="54" cy="54" r="' + R + '" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" ' +
                'stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - pct)).toFixed(1) + '"/>' +
            '</svg>' +
            '<div class="ring-center"><div><div class="ring-num">' + doneCount + '/' + tasks.length + '</div><div class="ring-label">今日任务</div></div></div>' +
          '</div>' +
          '<div class="hero-stats">' +
            '<div><div class="hero-stat-num">' + left + ' 天</div><div class="hero-stat-label">距考试</div></div>' +
            '<div><div class="hero-stat-num">' + learned + ' 词</div><div class="hero-stat-label">已掌握</div></div>' +
          '</div>' +
        '</div>' +
      '</section>' +

      planStrip() +
      reviewBanner() +

      '<div class="grid-2">' +
        '<section class="card">' +
          '<div class="card-head"><div><div class="card-title">今日任务</div><div class="card-sub">完成 4 项即可打卡</div></div>' +
          '<span class="tag ' + (pct >= 1 ? "tag-green" : "tag-blue") + '">' + Math.round(pct * 100) + '%</span></div>' +
          '<div class="bar" style="margin-bottom:6px"><div class="bar-fill" style="width:' + (pct * 100) + '%"></div></div>' +
          tasksHtml +
        '</section>' +

        '<div class="stack">' +
          '<div class="grid-2">' +
            '<div class="card stat-card"><div class="stat-num">' + d.minutes + '<span class="stat-unit">分钟</span></div><div class="stat-label">今日时长 · 目标 ' + S.settings.dailyMinutes + '</div></div>' +
            '<div class="card stat-card"><div class="stat-num">' + currentStreak() + '<span class="stat-unit">天</span></div><div class="stat-label">连续打卡</div></div>' +
          '</div>' +
          examCard() +
          '<section class="card">' +
            '<div class="card-head"><div class="card-title">复习提醒</div></div>' +
            '<div class="stack">' +
              reminderRow("待复习词汇", dueWords().length + " 个", "vocab") +
              reminderRow("尚未学习词汇", freshWords().length + " 个", "vocab") +
              reminderRow("已完成模块", (S.reading.length + S.listening.length + S.translation.length + S.writing.length) + " 次", "stats") +
            '</div>' +
          '</section>' +
          '<section class="card" style="padding:16px 18px;background:#fbfcfd">' +
            '<div class="small" style="color:var(--ink-2);font-style:italic">“The secret of getting ahead is getting started.”</div>' +
            '<div class="small muted" style="margin-top:4px">先开始，再谈方法。</div>' +
          '</section>' +
        '</div>' +
      '</div>';
  }

  function planStrip() {
    var w = currentWeekInfo();
    if (!w) return "";
    var t = dstr();
    var started = t >= w.start;
    var toStart = diffDays(t, w.start);
    var prefix = started ? "本周" : (toStart === 1 ? "明天开始" : toStart + " 天后开始");
    return '<section class="card plan-strip">' +
      '<div class="spread" style="gap:14px">' +
        '<div class="row" style="gap:12px;min-width:0">' +
          '<div class="pw-badge">W' + w.n + '</div>' +
          '<div style="min-width:0">' +
            '<div class="card-title">' + prefix + " · " + esc(w.theme) + '</div>' +
            '<div class="card-sub">' + dateLabel(w.start) + " – " + dateLabel(w.end) + " · " + esc(w.goal) + '</div>' +
          '</div>' +
        '</div>' +
        '<button class="btn btn-sm btn-soft" data-go="plan" style="flex:none">看 8 周路线</button>' +
      '</div></section>';
  }

  /* 首页的复习提醒条 */
  function reviewBanner() {
    var info = dueInfo();
    if (!info.learned) return "";
    var t = dstr();
    if (info.due > 0) {
      var tone = info.overdue ? "warn" : "info";
      var title = "今天有 " + info.due + " 个词到期";
      var sub = info.overdue
        ? "其中 " + info.overdue + " 个已经逾期。间隔拖久了，前面几次复习的效果会打折。"
        : "按 SM-2 节奏，现在正好是该复习的时候。约 " + Math.max(2, Math.round(info.due * 0.25)) + " 分钟。";
      return '<section class="card review-banner ' + tone + '">' +
        '<div class="spread" style="gap:14px">' +
          '<div class="row" style="gap:12px;min-width:0">' +
            '<div class="rb-icon">' + (info.overdue ? "!" : "↻") + '</div>' +
            '<div style="min-width:0"><div class="card-title">' + title + '</div>' +
            '<div class="card-sub">' + sub + '</div></div>' +
          '</div>' +
          '<button class="btn btn-sm btn-primary" data-go="vocab" style="flex:none">现在复习</button>' +
        '</div></section>';
    }
    var next = null;
    Object.keys(S.vocab).forEach(function (k) {
      var r = S.vocab[k];
      if (!r || !r.seen || !r.due || r.due <= t) return;
      if (!next || r.due < next) next = r.due;
    });
    if (!next) return "";
    var dd = diffDays(t, next);
    return '<section class="card review-banner calm">' +
      '<div class="spread" style="gap:14px">' +
        '<div class="row" style="gap:12px;min-width:0">' +
          '<div class="rb-icon">✓</div>' +
          '<div style="min-width:0"><div class="card-title">复习队列已清空</div>' +
          '<div class="card-sub">下一次到期是' + (dd <= 1 ? "明天（" + dateLabel(next) + "）" : " " + dd + " 天后（" + dateLabel(next) + "）") + '，可以学点新词</div></div>' +
        '</div>' +
        '<button class="btn btn-sm btn-soft" data-go="review" style="flex:none">看复习安排</button>' +
      '</div></section>';
  }

  function examCard() {
    var latest = S.exam.latest;
    if (!latest) {
      return '<section class="card">' +
        '<div class="card-head"><div><div class="card-title">水平自测</div>' +
        '<div class="card-sub">30 题 · 约 25 分钟</div></div><span class="tag tag-gold">未测评</span></div>' +
        '<div class="small muted" style="margin-bottom:14px;line-height:1.7">先测一次，系统会按实际正确率定等级、找短板，并生成每日计划。</div>' +
        '<button class="btn btn-primary btn-sm btn-block" data-go="exam">开始测评</button></section>';
    }
    var lv = levelOf(latest.score);
    return '<section class="card">' +
      '<div class="card-head"><div><div class="card-title">水平自测</div>' +
      '<div class="card-sub">' + timeAgo(latest.at) + '完成 · ' + lv.name + '</div></div>' +
      '<span class="tag ' + (latest.score >= 500 ? "tag-green" : latest.score >= 425 ? "tag-blue" : "tag-gold") + '">' + latest.score + ' 分</span></div>' +
      '<div class="spread" style="margin-bottom:12px">' +
        '<span class="small" style="color:var(--ink-2)">' + (S.plan ? "当前目标 " + S.plan.target + " 分" : "尚未应用学习计划") + '</span>' +
        '<span class="small muted">答对 ' + latest.right + "/" + latest.total + '</span>' +
      '</div>' +
      '<button class="btn btn-sm btn-block" data-go="exam">查看报告 / 重新测评</button></section>';
  }

  function reminderRow(label, val, go) {
    return '<div class="spread" style="padding:6px 0">' +
      '<span class="small" style="color:var(--ink-2)">' + label + '</span>' +
      '<button class="btn btn-sm btn-ghost" data-go="' + go + '" style="color:var(--accent)">' + val + ' →</button>' +
      '</div>';
  }

  function greeting() {
    var h = new Date().getHours();
    if (h < 6) return "这个点还在学，注意休息";
    if (h < 11) return "早上好，先过一遍单词";
    if (h < 14) return "中午好，来一组听力";
    if (h < 18) return "下午好，做篇阅读吧";
    return "晚上好，今天还差一点";
  }

  /* =========================================================
     词汇训练
     ========================================================= */
  var V = { queue: [], idx: 0, revealed: false, mode: "study", done: 0, stat: { 0: 0, 1: 0, 2: 0, 3: 0 } };

  /* =========================================================
     记忆引擎：SM-2 间隔重复 + 记忆强度模型
     - EF（易度因子）随评分变化，下限 1.3
     - 间隔按 SM-2 递推：1 → 6 → I×EF，答错重置为 1 天
     - 留存率用指数遗忘模型 R = e^(-t/S)，S 由当前间隔反推
     ========================================================= */
  var SM2 = {
    MIN_EASE: 1.3,
    MAX_EASE: 3.0,
    START_EASE: 2.5,
    // 评分档位 → SM-2 quality
    Q: [2, 3, 4, 5],
    LABEL: ["忘记了", "有点模糊", "记得", "很熟练"]
  };

  /* 记录初始化 / 兼容旧记录 */
  function wordRec(w, create) {
    var r = S.vocab[w];
    if (!r) {
      if (!create) return null;
      r = S.vocab[w] = {
        st: 0, ease: SM2.START_EASE, interval: 0, due: dstr(),
        seen: 0, right: 0, wrong: 0, lapses: 0, n: 0, last: "", hist: []
      };
      return r;
    }
    if (r.ease == null) r.ease = SM2.START_EASE;
    if (r.interval == null) r.interval = 0;
    if (r.lapses == null) r.lapses = 0;
    // 旧数据没有 n，用 interval 粗推一次
    if (r.n == null) r.n = r.interval >= 6 ? 2 : r.interval >= 1 ? 1 : 0;
    if (r.last == null) r.last = r.due && r.due < dstr() ? r.due : "";
    if (!r.hist) r.hist = [];
    return r;
  }

  /* 当前记忆留存率（0-1）。以「到期日刚好剩 90%」为基准反推稳定度 */
  function retentionOf(r) {
    if (!r || !r.interval) return null;
    var base = r.last || r.due;
    if (!base) return null;
    var elapsed = diffDays(base, dstr());
    if (elapsed < 0) elapsed = 0;
    // R(t) = exp(-t / S)，令 R(interval)=0.9 → S = interval / ln(1/0.9)
    var st = r.interval / 0.10536;
    return Math.exp(-elapsed / st);
  }

  /* SM-2 主算法：返回本次后的新间隔（天） */
  function sm2Next(r, g) {
    var q = SM2.Q[g];
    var ef = r.ease || SM2.START_EASE;
    var next, n = r.n || 0;

    if (q < 3) {
      // 遗忘：重置节奏，当天/次日重来
      n = 0;
      next = 1;
      r.lapses = (r.lapses || 0) + 1;
    } else if (n === 0) {
      next = 1; n = 1;
    } else if (n === 1) {
      next = 6; n = 2;
    } else {
      // n>=2：间隔 = 上次间隔 × EF，模糊档额外收敛
      next = Math.round((r.interval || 1) * ef * (q === 3 ? 0.72 : q === 5 ? 1.12 : 1));
      n += 1;
    }
    next = clamp(next, 1, 180);

    // EF 更新（SM-2 原式）
    ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    r.ease = clamp(ef, SM2.MIN_EASE, SM2.MAX_EASE);
    r.n = n;
    return next;
  }

  /* 学习状态：0 未学 / 1 学习中 / 2 复习中 / 3 已掌握 */
  function statusOf(r) {
    if (!r || !r.seen) return 0;
    if (r.interval >= 21 && r.n >= 4 && (r.lapses || 0) <= 2) return 3;
    if (r.n >= 2) return 2;
    return 1;
  }

  function dueWords() {
    var t = dstr();
    return VOCAB.filter(function (v) {
      var r = S.vocab[v.w];
      return r && r.due <= t;
    }).sort(function (a, b) {
      var ra = S.vocab[a.w], rb = S.vocab[b.w];
      if (ra.due !== rb.due) return ra.due < rb.due ? -1 : 1;
      // 同一天到期，先复习留存率低的（更危险）
      return (retentionOf(ra) || 1) - (retentionOf(rb) || 1);
    });
  }

  function freshWords() {
    return VOCAB.filter(function (v) { return !S.vocab[v.w]; });
  }

  function overdueWords() {
    var t = dstr();
    return VOCAB.filter(function (v) {
      var r = S.vocab[v.w];
      return r && r.due < t;
    });
  }

  /* 复习概览 */
  function dueInfo() {
    var t = dstr();
    var learned = Object.keys(S.vocab).filter(function (k) { return S.vocab[k] && S.vocab[k].seen; });
    var due = [], over = [], risk = [];
    learned.forEach(function (k) {
      var r = S.vocab[k];
      if (r.due <= t) due.push(k);
      if (r.due < t) over.push(k);
      var rt = retentionOf(r);
      if (rt != null && rt < 0.75) risk.push({ w: k, r: r, rt: rt });
    });
    risk.sort(function (a, b) { return a.rt - b.rt; });
    var mastered = learned.filter(function (k) { return statusOf(S.vocab[k]) === 3; }).length;
    return {
      due: due.length,
      overdue: over.length,
      risk: risk,
      learned: learned.length,
      mastered: mastered,
      fresh: freshWords().length,
      total: VOCAB.length
    };
  }

  /* 未来 N 天复习负载 */
  function forecastLoad(days) {
    var out = [];
    for (var i = 0; i < days; i++) {
      var d = addDays(dstr(), i);
      var n = 0;
      Object.keys(S.vocab).forEach(function (k) {
        var r = S.vocab[k];
        if (!r || !r.seen) return;
        // 逾期未复习的算在今天
        if (i === 0 ? r.due <= d : r.due === d) n++;
      });
      out.push({ date: d, n: n });
    }
    return out;
  }

  /* 队列：到期词与新词交错排布（交错练习比「先全复习再学新词」记得更牢） */
  function buildQueue() {
    var t = dstr();
    var due = dueWords().slice(0, 120);
    var remain = Math.max(0, S.settings.dailyWords - dayRec().new);
    var fresh = freshWords().slice(0, remain > 0 ? remain : 8);
    var out = [], i = 0, j = 0;
    // 每 2 个复习词插 1 个新词，避免连续复习疲劳
    while (i < due.length || j < fresh.length) {
      for (var k = 0; k < 2 && i < due.length; k++) out.push(due[i++]);
      if (j < fresh.length) out.push(fresh[j++]);
      if (i >= due.length && j < fresh.length) { /* 剩余新词继续补 */ }
    }
    return out.slice(0, Math.max(20, S.settings.dailyWords + 15));
  }

  function vStatus(w) {
    var r = S.vocab[w];
    if (!r) return 0;
    return statusOf(r);
  }

  function statusTag(st) {
    if (st >= 3) return '<span class="v-status s3">已掌握</span>';
    if (st === 2) return '<span class="v-status s2">复习中</span>';
    if (st === 1) return '<span class="v-status">学习中</span>';
    return '<span class="v-status">未学习</span>';
  }

  /* 词库行右侧：间隔与到期日 */
  function wordSchedule(w) {
    var r = S.vocab[w];
    if (!r || !r.seen) return '<span class="v-sched">未开始</span>';
    var t = dstr();
    var d = diffDays(t, r.due);
    var txt = d < 0 ? "逾期 " + (-d) + " 天" : d === 0 ? "今天到期" : d + " 天后";
    var cls = d < 0 ? "warn" : d === 0 ? "due" : "";
    return '<span class="v-sched ' + cls + '">' + txt + ' · ' + r.interval + "d</span>";
  }

  function renderVocab() {
    if (!V.queue.length && V.done === 0) V.queue = buildQueue();

    var head = '<div class="spread" style="margin-bottom:16px">' +
      '<div class="filter-row">' +
        '<button class="chip-btn ' + (V.mode === "study" ? "active" : "") + '" data-mode="study">卡片学习</button>' +
        '<button class="chip-btn ' + (V.mode === "list" ? "active" : "") + '" data-mode="list">词库浏览</button>' +
      '</div>' +
      '<div class="small muted">今日已学 ' + dayRec().new + ' / ' + S.settings.dailyWords + ' 新词</div>' +
      '</div>';

    if (V.mode === "list") return head + renderWordList();

    return head +
      '<section class="card" style="padding:26px">' +
        '<div id="flashArea">' + flashHtml() + '</div>' +
      '</section>';
  }

  function flashHtml() {
    if (!V.queue.length || V.idx >= V.queue.length) {
      var total = V.stat[0] + V.stat[1] + V.stat[2] + V.stat[3];
      return '<div style="text-align:center;padding:26px 0">' +
        '<div style="font-size:34px;margin-bottom:10px">✓</div>' +
        '<div style="font-size:17px;font-weight:600">本组完成</div>' +
        '<div class="small muted" style="margin:6px 0 6px">共复习 ' + total + ' 次 · 熟练 ' + V.stat[3] + ' · 记得 ' + V.stat[2] +
          ' · 模糊 ' + V.stat[1] + ' · 忘记 ' + V.stat[0] + '</div>' +
        (V.lastTip ? '<div class="small muted" style="margin-bottom:18px">' + esc(V.lastTip) + '</div>' : '<div style="height:14px"></div>') +
        '<div class="row" style="justify-content:center">' +
          '<button class="btn btn-primary" data-act="again">再来一组</button>' +
          '<button class="btn" data-act="review">看复习安排</button>' +
          '<button class="btn" data-act="tolist">去词库看看</button>' +
        '</div>' +
      '</div>';
    }

    var v = V.queue[V.idx];
    var pct = Math.round((V.idx / V.queue.length) * 100);
    var rec = wordRec(v.w, false);
    var isNew = !rec || !rec.seen;
    var rt = rec ? retentionOf(rec) : null;

    var front = '<div class="fc-word">' + esc(v.w) + '</div>' +
      '<div class="row" style="margin-top:2px">' +
        '<div class="fc-phon">' + esc(v.ph) + '</div>' +
        '<button class="speak-btn" data-act="speak" data-w="' + esc(v.w) + '" title="朗读">' + speakerSvg() + '</button>' +
      '</div>';

    var meta = isNew
      ? '<span class="tag tag-gold">新词</span>'
      : '<span class="tag tag-blue">第 ' + (rec.seen + 1) + ' 次见面</span>' +
        (rt != null ? '<span class="tag ' + (rt < 0.6 ? "tag-red" : rt < 0.85 ? "tag-gold" : "tag-green") + '">留存 ' + Math.round(rt * 100) + '%</span>' : "");

    var back = '<div style="margin-top:6px">' +
      '<div class="fc-mean"><span class="fc-pos">' + esc(v.pos) + '</span>' + esc(v.cn) + '</div>' +
      '<div class="fc-divider"></div>' +
      '<div class="fc-ex">' + esc(v.ex) + '</div>' +
      '<div class="fc-ex-cn">' + esc(v.exCn) + '</div>' +
      (rec && rec.seen
        ? '<div class="fc-memo">已复习 ' + rec.seen + ' 次 · 当前间隔 ' + (rec.interval || 0) + ' 天 · 易度 ' + rec.ease.toFixed(2) +
          (rec.lapses ? ' · 遗忘 ' + rec.lapses + ' 次' : '') + '</div>'
        : '<div class="fc-memo">首次学习，评完分后系统会排下次复习日</div>') +
      '</div>';

    return '<div class="flash-stage">' +
      '<div class="flash-top">' +
        '<div class="bar" style="flex:1"><div class="bar-fill" style="width:' + pct + '%"></div></div>' +
        '<span class="small muted" style="white-space:nowrap">' + (V.idx + 1) + ' / ' + V.queue.length + '</span>' +
        '<span class="tag tag-blue">' + esc(v.tag) + '</span>' +
      '</div>' +
      '<div class="row" style="margin-bottom:10px;gap:6px">' + meta + '</div>' +
      '<div class="flashcard ' + (V.revealed ? "revealed" : "") + '" data-act="flip">' +
        front +
        (V.revealed ? back : '<div class="fc-hint">先在心里回忆一下中文意思，再点开核对</div>') +
      '</div>' +
      (V.revealed
        ? '<div class="rate-row rate-row-4">' +
            '<button class="rate-btn r0" data-g="0">忘记了<small>重置 · 明天再见</small></button>' +
            '<button class="rate-btn r1" data-g="1">模糊<small>间隔收紧</small></button>' +
            '<button class="rate-btn r2" data-g="2">记得<small>正常拉长</small></button>' +
            '<button class="rate-btn r3" data-g="3">很熟练<small>大幅拉长</small></button>' +
          '</div>' +
          '<div class="small muted center" style="margin-top:10px">评分决定下次复习间隔，如实选择比"都点认识"有效得多</div>'
        : '<button class="btn btn-primary btn-lg btn-block" data-act="flip">显示释义</button>') +
      '</div>';
  }

  function speakerSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  }

  function filteredWords(q, tag, st) {
    q = (q || "").toLowerCase();
    return VOCAB.filter(function (v) {
      if (q && v.w.toLowerCase().indexOf(q) < 0 && v.cn.indexOf(q) < 0) return false;
      if (tag && tag !== "全部" && v.tag !== tag) return false;
      if (st >= 0 && vStatus(v.w) !== st) return false;
      return true;
    });
  }

  function wordRowsHtml(rows) {
    if (!rows.length) return '<div class="empty"><b>没有匹配的单词</b>换个关键词试试</div>';
    return rows.map(function (v) {
      return '<div class="v-row">' +
        '<div class="v-word">' + esc(v.w) + '<span class="v-phon">' + esc(v.ph) + '</span></div>' +
        '<div class="v-cn">' + esc(v.pos) + " " + esc(v.cn) + '</div>' +
        statusTag(vStatus(v.w)) +
        wordSchedule(v.w) +
        '<button class="speak-btn" data-act="speak" data-w="' + esc(v.w) + '">' + speakerSvg() + '</button>' +
        '</div>';
    }).join("");
  }

  function renderWordList() {
    var tag = V.tag || "全部";
    var st = V.st == null ? -1 : V.st;
    var tags = ["全部"].concat(Object.keys(VOCAB.reduce(function (m, v) { m[v.tag] = 1; return m; }, {})));
    var rows = filteredWords(V.q, tag, st);

    return '<section class="card">' +
      '<div class="row" style="margin-bottom:12px">' +
        '<input class="search" id="vq" placeholder="搜索单词或释义…" value="' + esc(V.q || "") + '">' +
        '<span class="small muted" style="white-space:nowrap" id="vCount">' + rows.length + ' 词</span>' +
      '</div>' +
      '<div class="filter-row" style="margin-bottom:6px">' +
        tags.map(function (t) {
          return '<button class="chip-btn ' + (t === tag ? "active" : "") + '" data-tag="' + esc(t) + '">' + esc(t) + '</button>';
        }).join("") +
      '</div>' +
      '<div class="filter-row" style="margin-bottom:10px">' +
        [["全部状态", -1], ["未学习", 0], ["学习中", 1], ["复习中", 2], ["已掌握", 3]].map(function (p) {
          return '<button class="chip-btn ' + (st === p[1] ? "active" : "") + '" data-st="' + p[1] + '">' + p[0] + '</button>';
        }).join("") +
      '</div>' +
      '<div class="vocab-list">' + wordRowsHtml(rows) + '</div>' +
      '</section>';
  }

  function mountVocab() {
    var root = $("#view");
    var listQ = $("#vq");

    if (listQ) {
      listQ.addEventListener("input", function () {
        V.q = this.value;
        var st = V.st == null ? -1 : V.st;
        var rows = filteredWords(V.q, V.tag || "全部", st);
        var list = $(".vocab-list");
        if (list) list.innerHTML = wordRowsHtml(rows);
        var cnt = $("#vCount");
        if (cnt) cnt.textContent = rows.length + " 词";
      });
    }

    root.addEventListener("click", function (e) {
      var t = e.target.closest("[data-act],[data-g],[data-mode],[data-tag],[data-st]");
      if (!t) return;

      if (t.dataset.mode) {
        V.mode = t.dataset.mode;
        rerenderVocab();
        return;
      }
      if (t.dataset.tag) { V.tag = t.dataset.tag; rerenderVocab(); return; }
      if (t.dataset.st) { V.st = +t.dataset.st; rerenderVocab(); return; }

      if (t.dataset.g != null) {
        gradeWord(V.queue[V.idx], +t.dataset.g);
        return;
      }

      var act = t.dataset.act;
      if (act === "flip") {
        V.revealed = !V.revealed;
        $("#flashArea").innerHTML = flashHtml();
      } else if (act === "speak") {
        speakWord(t.dataset.w);
      } else if (act === "again") {
        V.queue = buildQueue();
        V.idx = 0; V.revealed = false; V.done = 0; V.stat = { 0: 0, 1: 0, 2: 0, 3: 0 };
        V.lastTip = "";
        $("#flashArea").innerHTML = flashHtml();
      } else if (act === "review") {
        navigate("review");
      } else if (act === "tolist") {
        V.mode = "list";
        rerenderVocab();
      }
    });
  }

  function rerenderVocab() {
    render(true);
  }

  /* 评分：g = 0 忘记 / 1 模糊 / 2 记得 / 3 熟练 */
  function gradeWord(v, g) {
    if (!v) return;
    var r = S.vocab[v.w];
    var isNew = !r;
    r = wordRec(v.w, true);
    r.seen++;
    r.last = dstr();

    var d = dayRec();
    d.words++;
    if (isNew) d.new++;

    var prevInterval = r.interval || 0;
    var next = sm2Next(r, g);
    r.interval = next;
    r.due = addDays(dstr(), next);

    if (g >= 2) { r.right++; gainXP(g === 3 ? 3 : 2); }
    else if (g === 1) { r.wrong++; gainXP(1); }
    else { r.wrong++; }

    r.st = statusOf(r);
    r.hist.push({ d: dstr(), g: g, i: next, e: +r.ease.toFixed(2) });
    if (r.hist.length > 20) r.hist.shift();

    V.stat[g]++;
    V.done++;
    save();

    // 忘记的词，本组末尾再出现一次
    if (g === 0) V.queue.push(v);

    V.idx++;
    V.revealed = false;
    V.lastTip = "下次复习：" + (next <= 1 ? "明天" : next + " 天后") +
      "（易度 " + r.ease.toFixed(2) + (prevInterval ? "，原间隔 " + prevInterval + " 天" : "") + "）";
    $("#flashArea").innerHTML = flashHtml();
    updateChrome();
  }

  /* ---------------- 语音合成 ---------------- */
  var voiceCache = [];
  function loadVoices() {
    if (!("speechSynthesis" in window)) return;
    voiceCache = speechSynthesis.getVoices() || [];
  }
  if ("speechSynthesis" in window) {
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  }

  function pickVoice() {
    if (!voiceCache.length) loadVoices();
    var en = voiceCache.filter(function (v) { return /^en/i.test(v.lang); });
    return en.filter(function (v) { return /natural|google|aria|jenny|guy|zira|david/i.test(v.name); })[0]
      || en.filter(function (v) { return /en-US/i.test(v.lang); })[0]
      || en[0] || null;
  }

  function speakWord(w) {
    var v = VOCAB.filter(function (x) { return x.w === w; })[0];
    if (!v) return;
    speakText(v.w + ". " + v.ex, 1);
  }

  function speakText(text, pitch) {
    if (!("speechSynthesis" in window)) { toast("当前浏览器不支持语音朗读"); return; }
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    var vc = pickVoice();
    if (vc) u.voice = vc;
    u.rate = S.settings.rate || 0.95;
    u.pitch = pitch || 1;
    speechSynthesis.speak(u);
  }

  /* =========================================================
     通用题目渲染
     ========================================================= */
  function fmtClock(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    return pad(Math.floor(s / 60)) + ":" + pad(s % 60);
  }
  function questionHtml(i, q, chosen, submitted) {
    var opts = q.opts.map(function (o, k) {
      var cls = "opt";
      if (submitted) {
        if (k === q.ans) cls += " correct";
        else if (k === chosen) cls += " wrong";
      } else if (k === chosen) {
        cls += " selected";
      }
      return '<button type="button" class="' + cls + '" data-q="' + i + '" data-o="' + k + '"' + (submitted ? " disabled" : "") + ">" +
        '<span class="key">' + "ABCD"[k] + "</span><span>" + esc(o) + "</span></button>";
    }).join("");
    return '<div class="q-block">' +
      '<div class="q-stem"><span class="q-num">' + (i + 1) + ".</span>" + esc(q.q) + "</div>" +
      '<div class="options">' + opts + "</div>" +
      (submitted ? '<div class="explain"><b>答案 ' + "ABCD"[q.ans] + "</b>　" + esc(q.exp) + "</div>" : "") +
      "</div>";
  }
  function backBar(title, desc, act) {
    return '<div class="row" style="margin-bottom:2px">' +
      '<button class="btn btn-sm" data-act="' + act + '">← 返回</button>' +
      '<div><div class="card-title">' + esc(title) + '</div><div class="card-sub">' + desc + "</div></div>" +
      "</div>";
  }

  /* =========================================================
     听力训练
     ========================================================= */
  var LS = { set: null, answers: {}, submitted: false, audioIdx: null };

  function renderListening() {
    if (!LS.set) return listeningList();
    var set = LS.set;
    var answered = Object.keys(LS.answers).length;

    var items = set.items.map(function (it, i) {
      var chosen = LS.answers[i];
      var script = LS.submitted
        ? '<div class="script"><b>听力原文</b><br>' + it.lines.map(function (l) {
            return "<b>" + (l.sp === "N" ? "Narrator" : l.sp === "M" ? "Man" : "Woman") + ":</b> " + esc(l.t);
          }).join("<br>") + "</div>"
        : "";
      return '<div class="q-block">' +
        '<div class="audio-bar">' +
          '<button class="play-btn" data-act="play" data-i="' + i + '" title="播放录音">' + playIcon() + "</button>" +
          '<div class="wave" data-w="l' + i + '">' + waveBars(26) + "</div>" +
          '<span class="small muted" style="white-space:nowrap">点击播放</span>' +
        "</div>" +
        '<div class="q-stem"><span class="q-num">' + (i + 1) + ".</span>" + esc(it.q) + "</div>" +
        '<div class="options">' + it.opts.map(function (o, k) {
          var cls = "opt";
          if (LS.submitted) {
            if (k === it.ans) cls += " correct";
            else if (k === chosen) cls += " wrong";
          } else if (k === chosen) cls += " selected";
          return '<button type="button" class="' + cls + '" data-q="' + i + '" data-o="' + k + '"' + (LS.submitted ? " disabled" : "") + ">" +
            '<span class="key">' + "ABCD"[k] + "</span><span>" + esc(o) + "</span></button>";
        }).join("") + "</div>" +
        (LS.submitted ? '<div class="explain"><b>答案 ' + "ABCD"[it.ans] + "</b>　" + esc(it.exp) + "</div>" + script : "") +
        "</div>";
    }).join("");

    var score = 0;
    if (LS.submitted) {
      set.items.forEach(function (it, i) { if (LS.answers[i] === it.ans) score++; });
    }

    return backBar(set.title, set.level + " · " + set.desc, "back-listen") +
      '<section class="card">' +
        '<div class="card-head"><div><div class="card-title">听力原文朗读</div>' +
        '<div class="card-sub">使用浏览器语音合成，可反复播放，建议先听两遍再作答</div></div>' +
        (LS.submitted ? '<span class="tag tag-green">得分 ' + score + "/" + set.items.length + "</span>" : "") +
        "</div>" + items + "</section>" +
      (LS.submitted
        ? '<div class="row"><button class="btn btn-primary" data-act="retry-listen">再做一遍</button>' +
          '<button class="btn" data-act="back-listen">返回列表</button></div>'
        : '<div class="sticky-bar"><span class="small muted">已答 <b>' + answered + "</b>/" + set.items.length + "</span>" +
          '<div class="bar" style="flex:1"><div class="bar-fill" style="width:' + (answered / set.items.length * 100) + '%"></div></div>' +
          '<button class="btn btn-primary btn-sm" data-act="submit-listen"' + (answered === 0 ? " disabled" : "") + ">提交答案</button></div>");
  }

  function listeningList() {
    var cards = LISTENING_SETS.map(function (s) {
      var rec = S.listening.filter(function (r) { return r.id === s.id; });
      var best = rec.length ? Math.max.apply(null, rec.map(function (r) { return r.score; })) : null;
      return '<section class="card">' +
        '<div class="card-head"><div><div class="card-title">' + esc(s.title) + "</div>" +
        '<div class="card-sub">' + esc(s.desc) + "</div></div>" +
        '<span class="tag ' + (s.level === "基础" ? "tag-green" : s.level === "进阶" ? "tag-blue" : "tag-gold") + '">' + s.level + "</span></div>" +
        '<div class="spread"><span class="small muted">' +
          (best == null ? "尚未练习" : "历史最佳 " + best + "/" + s.items.length + " · 已练 " + rec.length + " 次") +
        "</span><button class='btn btn-sm btn-soft' data-act='start-listen' data-id='" + s.id + "'>开始练习</button></div>" +
        "</section>";
    }).join("");
    return '<section class="card" style="padding:18px 20px;background:#fbfcfd">' +
      '<div class="card-title">怎么练听力最有效</div>' +
      '<div class="small muted" style="margin-top:4px">先盲听一遍抓大意 → 再听一遍记关键词 → 作答 → 看原文核对，把没听出来的连读和弱读标出来。同一材料听三遍胜过三篇新材料。</div></section>' +
      cards;
  }

  function playIcon() {
    return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>';
  }
  function waveBars(n) {
    var s = "";
    for (var i = 0; i < n; i++) {
      s += '<i style="height:' + (25 + Math.round(Math.random() * 65)) + '%"></i>';
    }
    return s;
  }

  function playLines(lines, key, wave) {
    if (!("speechSynthesis" in window)) { toast("当前浏览器不支持语音朗读"); return; }
    if (LS.audioIdx === key) {
      speechSynthesis.cancel();
      LS.audioIdx = null;
      if (wave) wave.classList.remove("on");
      return;
    }
    speechSynthesis.cancel();
    $$(".wave").forEach(function (w) { w.classList.remove("on"); });
    LS.audioIdx = key;
    if (wave) wave.classList.add("on");

    var vc = pickVoice();
    var i = 0;
    function next() {
      if (i >= lines.length) {
        if (wave) wave.classList.remove("on");
        LS.audioIdx = null;
        return;
      }
      var ln = lines[i++];
      var u = new SpeechSynthesisUtterance(ln.t);
      u.lang = "en-US";
      if (vc) u.voice = vc;
      u.rate = S.settings.rate || 0.95;
      u.pitch = ln.sp === "M" ? 0.78 : ln.sp === "W" ? 1.12 : 1;
      u.onend = function () { setTimeout(next, ln.sp === "N" ? 450 : 300); };
      u.onerror = function () {
        if (wave) wave.classList.remove("on");
        LS.audioIdx = null;
      };
      speechSynthesis.speak(u);
    }
    next();
  }

  function mountListening() {
    $("#view").addEventListener("click", function (e) {
      var t = e.target.closest("[data-act],[data-q]");
      if (!t) return;

      if (t.dataset.q != null && !LS.submitted) {
        LS.answers[+t.dataset.q] = +t.dataset.o;
        rerenderView();
        return;
      }
      var act = t.dataset.act;
      if (act === "start-listen") {
        LS.set = LISTENING_SETS.filter(function (s) { return s.id === t.dataset.id; })[0];
        LS.answers = {}; LS.submitted = false;
        rerenderView();
      } else if (act === "back-listen") {
        speechSynthesis.cancel();
        LS.set = null;
        rerenderView();
      } else if (act === "retry-listen") {
        LS.answers = {}; LS.submitted = false;
        rerenderView();
      } else if (act === "play") {
        var li = +t.dataset.i;
        playLines(LS.set.items[li].lines, "l" + li, $('.wave[data-w="l' + li + '"]'));
      } else if (act === "submit-listen") {
        var score = 0, total = LS.set.items.length;
        LS.set.items.forEach(function (it, i) { if (LS.answers[i] === it.ans) score++; });
        LS.submitted = true;
        var d = dayRec();
        d.listen++; d.quizzes++; d.correct += score; d.total += total;
        S.listening.push({ id: LS.set.id, score: score, total: total, at: Date.now() });
        gainXP(score * 3 + 5);
        save();
        rerenderView();
        toast("得分 " + score + "/" + total + "，解析已展开");
      }
    });
  }

  /* =========================================================
     阅读理解
     ========================================================= */
  var RD = { id: null, answers: {}, submitted: false, start: 0 };

  function renderReading() {
    if (!RD.id) return readingList();
    var p = READING_PASSAGES.filter(function (x) { return x.id === RD.id; })[0];
    var answered = Object.keys(RD.answers).length;
    var score = 0;
    if (RD.submitted) {
      p.questions.forEach(function (q, i) { if (RD.answers[i] === q.ans) score++; });
    }
    var qs = p.questions.map(function (q, i) { return questionHtml(i, q, RD.answers[i], RD.submitted); }).join("");

    return backBar(p.title, p.level + " · " + p.topic + " · 建议 " + p.minutes + " 分钟", "back-read") +
      '<section class="card"><div class="passage">' +
        p.paras.map(function (x) { return "<p>" + esc(x) + "</p>"; }).join("") +
      "</div></section>" +
      '<section class="card">' +
        '<div class="card-head"><div class="card-title">Questions</div>' +
        (RD.submitted ? '<span class="tag tag-green">得分 ' + score + "/" + p.questions.length + "</span>" : '<span class="small muted" id="readTimer">00:00</span>') +
        "</div>" + qs + "</section>" +
      (RD.submitted
        ? '<div class="row"><button class="btn btn-primary" data-act="retry-read">重做本篇</button>' +
          '<button class="btn" data-act="back-read">返回列表</button></div>'
        : '<div class="sticky-bar"><span class="small muted">已答 <b>' + answered + "</b>/" + p.questions.length + "</span>" +
          '<div class="bar" style="flex:1"><div class="bar-fill" style="width:' + (answered / p.questions.length * 100) + '%"></div></div>' +
          '<button class="btn btn-primary btn-sm" data-act="submit-read"' + (answered === 0 ? " disabled" : "") + ">提交答案</button></div>");
  }

  function readingList() {
    var cards = READING_PASSAGES.map(function (p) {
      var rec = S.reading.filter(function (r) { return r.id === p.id; });
      var best = rec.length ? Math.max.apply(null, rec.map(function (r) { return r.score; })) : null;
      return '<section class="card">' +
        '<div class="card-head"><div><div class="card-title">' + esc(p.title) + "</div>" +
        '<div class="card-sub">' + p.topic + " · " + p.questions.length + " 题 · 约 " + p.minutes + " 分钟</div></div>" +
        '<span class="tag ' + (p.level === "中等" ? "tag-blue" : "tag-gold") + '">' + p.level + "</span></div>" +
        '<div class="spread"><span class="small muted">' +
          (best == null ? "尚未练习" : "历史最佳 " + best + "/" + p.questions.length + " · 已练 " + rec.length + " 次") +
        "</span><button class='btn btn-sm btn-soft' data-act='start-read' data-id='" + p.id + "'>开始阅读</button></div>" +
        "</section>";
    }).join("");
    return '<section class="card" style="padding:18px 20px;background:#fbfcfd">' +
      '<div class="card-title">阅读提分要点</div>' +
      '<div class="small muted" style="margin-top:4px">先读题干定位关键词，再回原文找同义替换。六级阅读的正确答案几乎从不照抄原文，而是换一种说法。做完务必回看错题的定位句。</div></section>' + cards;
  }

  function mountReading() {
    $("#view").addEventListener("click", function (e) {
      var t = e.target.closest("[data-act],[data-q]");
      if (!t) return;
      if (t.dataset.q != null && !RD.submitted) {
        RD.answers[+t.dataset.q] = +t.dataset.o;
        rerenderView();
        return;
      }
      var act = t.dataset.act;
      if (act === "start-read") {
        RD.id = t.dataset.id; RD.answers = {}; RD.submitted = false; RD.start = Date.now();
        rerenderView();
      } else if (act === "back-read") {
        RD.id = null;
        rerenderView();
      } else if (act === "retry-read") {
        RD.answers = {}; RD.submitted = false; RD.start = Date.now();
        rerenderView();
      } else if (act === "submit-read") {
        var p = READING_PASSAGES.filter(function (x) { return x.id === RD.id; })[0];
        var score = 0;
        p.questions.forEach(function (q, i) { if (RD.answers[i] === q.ans) score++; });
        RD.submitted = true;
        var d = dayRec();
        d.read++; d.quizzes++; d.correct += score; d.total += p.questions.length;
        S.reading.push({ id: p.id, score: score, total: p.questions.length, at: Date.now(), sec: Math.round((Date.now() - RD.start) / 1000) });
        gainXP(score * 4 + 6);
        save();
        rerenderView();
        toast("得分 " + score + "/" + p.questions.length + "，对照解析回看定位句");
      }
    });
  }

  /* =========================================================
     翻译练习
     ========================================================= */
  var TR = { idx: 0, shown: false, draft: {} };

  function renderTranslation() {
    var t = TRANSLATIONS[TR.idx];
    var draft = TR.draft[t.id] || "";
    var rec = S.translation.filter(function (r) { return r.id === t.id; }).length;

    var switcher = '<div class="filter-row">' + TRANSLATIONS.map(function (x, i) {
      var done = S.translation.some(function (r) { return r.id === x.id; });
      return '<button class="chip-btn ' + (i === TR.idx ? "active" : "") + '" data-ti="' + i + '">' + (i + 1) + (done ? " ✓" : "") + "</button>";
    }).join("") + '<span class="small muted" style="margin-left:4px">共 ' + TRANSLATIONS.length + " 句 · 已完成 " + S.translation.length + " 句</span></div>";

    return switcher +
      '<section class="card">' +
        '<div class="card-head"><div><div class="card-title">把下面这句话译成英文</div>' +
        '<div class="card-sub">建议 5 分钟 · 先自己写，再看参考译文' + (rec ? " · 已练 " + rec + " 次" : "") + "</div></div>" +
        '<span class="tag tag-blue">汉译英</span></div>' +
        '<div style="font-size:16px;line-height:1.9;padding:4px 0 12px">' + esc(t.cn) + "</div>" +
        '<textarea class="ta" id="transInput" placeholder="在这里写下你的译文…">' + esc(draft) + "</textarea>" +
        '<div class="spread" style="margin-top:8px">' +
          '<span class="small muted" id="transCount">' + draft.length + " 字符</span>" +
          '<div class="row">' +
            '<button class="btn btn-sm" data-act="clear-trans">清空</button>' +
            '<button class="btn btn-primary btn-sm" data-act="check-trans">提交并对照</button>' +
          "</div>" +
        "</div>" +
      "</section>" +
      (TR.shown ? refHtml(t) : "");
  }

  function refHtml(t) {
    return '<section class="card">' +
      '<div class="card-head"><div class="card-title">参考译文</div><span class="tag tag-green">对照学习</span></div>' +
      '<div class="ref-box ref-en">' + esc(t.ref) + "</div>" +
      '<div class="fc-divider"></div>' +
      '<div class="card-title" style="font-size:13px;margin-bottom:8px">关键表达</div>' +
      '<div class="filter-row" style="margin-bottom:14px">' + t.keys.map(function (k) {
        return '<span class="tag tag-blue">' + esc(k) + "</span>";
      }).join("") + "</div>" +
      '<div class="explain"><b>译法提示</b>　' + esc(t.tip) + "</div>" +
      '<div class="spread" style="margin-top:16px">' +
        '<span class="small muted">对照之后，给自己的译文打个分</span>' +
        '<div class="row">' +
          '<button class="btn btn-sm" data-act="rate-trans" data-v="1">还需努力</button>' +
          '<button class="btn btn-sm" data-act="rate-trans" data-v="2">基本达意</button>' +
          '<button class="btn btn-sm btn-primary" data-act="rate-trans" data-v="3">译得不错</button>' +
        "</div>" +
      "</div></section>";
  }

  function mountTranslation() {
    var input = $("#transInput");
    if (input) {
      input.addEventListener("input", function () {
        var t = TRANSLATIONS[TR.idx];
        TR.draft[t.id] = this.value;
        $("#transCount").textContent = this.value.length + " 字符";
      });
    }
    $("#view").addEventListener("click", function (e) {
      var t = e.target.closest("[data-act],[data-ti]");
      if (!t) return;
      if (t.dataset.ti != null) {
        var inp = $("#transInput");
        if (inp) TR.draft[TRANSLATIONS[TR.idx].id] = inp.value;
        TR.idx = +t.dataset.ti;
        TR.shown = false;
        rerenderView();
        return;
      }
      var act = t.dataset.act;
      if (act === "check-trans") {
        var el = $("#transInput");
        if (!el || !el.value.trim()) { toast("先写一句译文再对照"); return; }
        TR.draft[TRANSLATIONS[TR.idx].id] = el.value;
        TR.shown = true;
        rerenderView();
      } else if (act === "clear-trans") {
        TR.draft[TRANSLATIONS[TR.idx].id] = "";
        rerenderView();
      } else if (act === "rate-trans") {
        var cur = TRANSLATIONS[TR.idx];
        S.translation.push({ id: cur.id, self: +t.dataset.v, at: Date.now() });
        dayRec().trans++;
        gainXP(4);
        save();
        toast("已记录，换一句继续");
        TR.shown = false;
        TR.idx = Math.min(TRANSLATIONS.length - 1, TR.idx + 1);
        rerenderView();
      }
    });
  }

  /* =========================================================
     写作训练
     ========================================================= */
  var WR = { idx: 0, start: 0, submitted: false, draft: {}, timer: null };

  function renderWriting() {
    var t = WRITING_TASKS[WR.idx];
    var draft = WR.draft[t.id] || "";
    var words = draft.trim() ? draft.trim().split(/\s+/).length : 0;

    var switcher = '<div class="filter-row">' + WRITING_TASKS.map(function (x, i) {
      var done = S.writing.some(function (r) { return r.id === x.id; });
      return '<button class="chip-btn ' + (i === WR.idx ? "active" : "") + '" data-wi="' + i + '">' + (i + 1) + (done ? " ✓" : "") + "</button>";
    }).join("") + '<span class="small muted" style="margin-left:4px">共 ' + WRITING_TASKS.length + " 篇范文</span></div>";

    var body = '<section class="card">' +
      '<div class="card-head"><div><div class="card-title">' + esc(t.title) + "</div>" +
      '<div class="card-sub">' + esc(t.cn) + " · 建议 30 分钟 · 150–200 词</div></div>" +
      '<span class="tag tag-gold" id="writeTimer">30:00</span></div>' +
      '<div class="q-stem" style="font-weight:500">' + esc(t.prompt) + "</div>" +
      '<div class="outline-list" style="margin-bottom:16px">' + t.outline.map(function (o, i) {
        return '<div class="outline-item"><span class="outline-idx">' + (i + 1) + "</span><span>" + esc(o) + "</span></div>";
      }).join("") + "</div>" +
      '<textarea class="ta" id="writeInput" style="min-height:230px" placeholder="Start writing here…">' + esc(draft) + "</textarea>" +
      '<div class="spread" style="margin-top:8px">' +
        '<span class="small muted"><b id="writeCount">' + words + "</b> words</span>" +
        '<div class="row">' +
          '<button class="btn btn-sm" data-act="outline-write">换一篇</button>' +
          '<button class="btn btn-primary btn-sm" data-act="submit-write">提交并看范文</button>' +
        "</div>" +
      "</div></section>";

    var model = WR.submitted ? '<section class="card">' +
      '<div class="card-head"><div><div class="card-title">参考范文</div>' +
      '<div class="card-sub">' + (WR.draft[t.id] ? "你的字数：<b>" + (WR.draft[t.id].trim().split(/\s+/).length) + "</b> 词" : "先写再看，效果更好") + "</div></div>" +
      '<span class="tag tag-green">Band 6 · 高分档</span></div>' +
      '<div class="passage" style="font-family:Georgia,serif;font-size:15px">' + paragraphs(t.model) + "</div>" +
      '<div class="fc-divider"></div>' +
      '<div class="card-title" style="font-size:13px;margin-bottom:8px">可以借鉴的表达</div>' +
      '<div class="stack">' + t.highlights.map(function (h) {
        return '<div class="outline-item"><span class="outline-idx">✦</span><span>' + esc(h) + "</span></div>";
      }).join("") + "</div></section>" : "";

    return switcher + body + model;
  }

  function paragraphs(text) {
    return text.split(/\n{2,}/).map(function (p) { return "<p>" + esc(p.trim()) + "</p>"; }).join("");
  }

  function mountWriting() {
    var input = $("#writeInput");
    if (input) {
      input.addEventListener("input", function () {
        var t = WRITING_TASKS[WR.idx];
        WR.draft[t.id] = this.value;
        var n = this.value.trim() ? this.value.trim().split(/\s+/).length : 0;
        $("#writeCount").textContent = n;
      });
    }
    $("#view").addEventListener("click", function (e) {
      var t = e.target.closest("[data-act],[data-wi]");
      if (!t) return;
      if (t.dataset.wi != null) {
        var inp = $("#writeInput");
        if (inp) WR.draft[WRITING_TASKS[WR.idx].id] = inp.value;
        WR.idx = +t.dataset.wi;
        WR.submitted = false;
        WR.start = Date.now();
        rerenderView();
        return;
      }
      var act = t.dataset.act;
      if (act === "submit-write") {
        var el = $("#writeInput");
        if (el) WR.draft[WRITING_TASKS[WR.idx].id] = el.value;
        var txt = (WR.draft[WRITING_TASKS[WR.idx].id] || "").trim();
        if (txt.split(/\s+/).length < 30) { toast("至少写 30 词再看范文，动笔才有收获"); return; }
        WR.submitted = true;
        dayRec().write++;
        S.writing.push({ id: WRITING_TASKS[WR.idx].id, words: txt.split(/\s+/).length, at: Date.now() });
        gainXP(10);
        save();
        rerenderView();
      } else if (act === "outline-write") {
        WR.idx = (WR.idx + 1) % WRITING_TASKS.length;
        WR.submitted = false;
        WR.start = Date.now();
        rerenderView();
      }
    });
  }

  /* =========================================================
     水平自测
     ========================================================= */
  var EX = { started: false, step: 0, answers: {}, done: false, start: 0, result: null };

  function renderExam() {
    if (EX.done && EX.result) return examReport(EX.result);
    if (!EX.started) return examIntro();
    return examPaper();
  }

  function examIntro() {
    var total = EXAM.sections.reduce(function (n, s) { return n + s.items.length; }, 0);
    var rows = EXAM.sections.map(function (s) {
      return '<div class="spread" style="padding:9px 0;border-bottom:1px solid var(--line-soft)">' +
        '<span class="small" style="color:var(--ink-2)">' + s.name + "</span>" +
        '<span class="small muted">' + s.items.length + " 题 · 占分 " + Math.round(s.weight * 100) + "%</span></div>";
    }).join("");

    var hist = S.exam.history.slice(-5).reverse();
    var histHtml = hist.length ? '<section class="card">' +
      '<div class="card-head"><div class="card-title">历次测评</div><span class="small muted">最近 5 次</span></div>' +
      '<div class="vocab-list">' + hist.map(function (h) {
        var idx = S.exam.history.indexOf(h);
        var prev = idx > 0 ? S.exam.history[idx - 1] : null;
        var d = prev ? h.score - prev.score : null;
        var dt = new Date(h.at);
        return '<div class="v-row"><div class="v-cn">' + (dt.getMonth() + 1) + "月" + dt.getDate() + "日 · " + levelOf(h.score).name + "</div>" +
          '<span class="tag ' + (h.score >= 500 ? "tag-green" : h.score >= 425 ? "tag-blue" : "tag-gold") + '">' + h.score + " 分</span>" +
          '<span class="small muted" style="min-width:52px;text-align:right">' + (d == null ? "首次" : (d >= 0 ? "+" : "") + d) + "</span></div>";
      }).join("") + "</div></section>" : "";

    var last = S.exam.latest ? lastResultCard(S.exam.latest) : "";

    return last + '<section class="card">' +
      '<div class="card-head"><div><div class="card-title">六级水平自测</div>' +
      '<div class="card-sub">' + total + " 题 · 约 " + EXAM.minutes + " 分钟 · 交卷即出分</div></div>" +
      '<span class="tag tag-blue">免费 · 即时判定</span></div>' +
      '<div class="small" style="color:var(--ink-2);line-height:1.8;margin-bottom:14px">' +
        "这套题覆盖词汇、语法、阅读、听力四个维度，难度参照六级。做完会给出估算分数与等级，找出最该补的短板，并生成一份可以直接应用的学习计划。不确定的题凭第一感觉选，不要查资料——测出来的才是真实水平。" +
      "</div>" + rows +
      '<div class="row" style="margin-top:18px">' +
        '<button class="btn btn-primary btn-lg" data-act="exam-start">开始测评</button>' +
        '<span class="small muted">中途可退出，退出不保存作答</span>' +
      "</div></section>" + histHtml;
  }

  function lastResultCard(rec) {
    var lv = levelOf(rec.score);
    var dt = new Date(rec.at);
    var bars = rec.sections.map(function (s) {
      var meta = EXAM.sections.filter(function (x) { return x.id === s.id; })[0];
      var pct = Math.round(s.right / s.total * 100);
      return '<div class="bar-row"><span>' + (meta ? meta.short : s.id) + "</span>" +
        '<div class="bar"><div class="bar-fill ' + (pct >= 70 ? "green" : pct >= 45 ? "" : "gold") + '" style="width:' + pct + '%"></div></div>' +
        '<span class="val">' + s.right + "/" + s.total + "</span></div>";
    }).join("");
    return '<section class="card">' +
      '<div class="card-head"><div><div class="card-title">上次测评结果</div>' +
      '<div class="card-sub">' + (dt.getMonth() + 1) + "月" + dt.getDate() + "日 · " + lv.name +
      " · 目标 " + (S.plan ? S.plan.target : lv.target) + " 分</div></div>" +
      '<span class="tag tag-green">' + rec.score + " 分</span></div>" +
      '<div class="stack">' + bars + "</div>" +
      '<div class="small muted" style="margin-top:12px">重新测一次看变化。完整计划在交卷后生成，逐题解析只在刚交卷时展示。</div></section>';
  }

  function examPaper() {
    var sec = EXAM.sections[EX.step];
    var offset = 0;
    for (var i = 0; i < EX.step; i++) offset += EXAM.sections[i].items.length;
    var answered = sec.items.filter(function (_, k) { return EX.answers[sec.id + ":" + k] != null; }).length;
    var lastText = null;

    var body = sec.items.map(function (it, k) {
      var html = "";
      if (it.text && it.text !== lastText) {
        lastText = it.text;
        var tx = (sec.texts || []).filter(function (t) { return t.id === it.text; })[0];
        if (tx) {
          html += '<div class="passage" style="margin:4px 0 18px;padding-bottom:16px;border-bottom:1px solid var(--line-soft)">' +
            '<div class="card-title" style="margin-bottom:10px">' + esc(tx.title) + "</div>" +
            tx.paras.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div>";
        }
      }
      return html + examQ(it, sec.id + ":" + k, EX.answers[sec.id + ":" + k], offset + k + 1);
    }).join("");

    return '<div class="spread" style="margin-bottom:12px">' +
        '<div><div class="card-title">第 ' + (EX.step + 1) + " 部分 · " + esc(sec.name) + "</div>" +
        '<div class="card-sub">' + esc(sec.desc) + "</div></div>" +
        '<div class="row"><span class="chip" id="examTimer">00:00</span>' +
        '<button class="btn btn-sm btn-ghost" data-act="exam-quit">退出</button></div>' +
      "</div>" +
      '<div class="bar" style="margin-bottom:16px"><div class="bar-fill" style="width:' + ((EX.step + 1) / EXAM.sections.length * 100) + '%"></div></div>' +
      '<section class="card">' + body + "</section>" +
      '<div class="sticky-bar">' +
        '<button class="btn btn-sm" data-act="exam-prev"' + (EX.step === 0 ? " disabled" : "") + ">上一部分</button>" +
        '<span class="small muted" style="white-space:nowrap">已答 <b id="examAnswered">' + answered + "</b>/" + sec.items.length + "</span>" +
        '<div class="bar" style="flex:1"><div class="bar-fill" id="examBar" style="width:' + (answered / sec.items.length * 100) + '%"></div></div>' +
        (EX.step < EXAM.sections.length - 1
          ? '<button class="btn btn-primary btn-sm" data-act="exam-next">下一部分</button>'
          : '<button class="btn btn-primary btn-sm" data-act="exam-submit">提交试卷</button>') +
      "</div>";
  }

  function examQ(it, key, chosen, no) {
    var opts = it.opts.map(function (o, k) {
      return '<button type="button" class="opt' + (chosen === k ? " selected" : "") + '" data-eq="' + esc(key) + '" data-eo="' + k + '">' +
        '<span class="key">' + "ABCD"[k] + "</span><span>" + esc(o) + "</span></button>";
    }).join("");
    var audio = it.lines
      ? '<div class="audio-bar"><button class="play-btn" data-act="exam-play" data-key="' + esc(key) + '">' + playIcon() + "</button>" +
        '<div class="wave" data-w="' + esc(key) + '">' + waveBars(24) + "</div>" +
        '<span class="small muted" style="white-space:nowrap">点击播放</span></div>'
      : "";
    return '<div class="q-block">' + audio +
      '<div class="q-stem"><span class="q-num">' + no + ".</span>" + esc(it.q) + "</div>" +
      '<div class="options">' + opts + "</div></div>";
  }

  function startExam() {
    EX.started = true;
    EX.step = 0;
    EX.answers = {};
    EX.done = false;
    EX.result = null;
    EX.start = Date.now();
    rerenderView();
  }

  function updateExamProgress() {
    var sec = EXAM.sections[EX.step];
    var answered = sec.items.filter(function (_, k) { return EX.answers[sec.id + ":" + k] != null; }).length;
    var a = $("#examAnswered");
    if (a) a.textContent = answered;
    var b = $("#examBar");
    if (b) b.style.width = (answered / sec.items.length * 100) + "%";
  }

  function submitExam() {
    var total = 0, blank = 0;
    EXAM.sections.forEach(function (s) {
      total += s.items.length;
      s.items.forEach(function (_, i) { if (EX.answers[s.id + ":" + i] == null) blank++; });
    });
    if (blank > 0 && !confirm("还有 " + blank + " / " + total + " 题未作答，未答按错计分。确定提交吗？")) return;

    var r = gradeExam();
    EX.result = r;
    EX.done = true;

    var rec = {
      at: Date.now(),
      score: r.score,
      pct: r.pct,
      right: r.right,
      total: r.total,
      level: r.level.key,
      sections: r.sections.map(function (s) { return { id: s.id, right: s.right, total: s.total }; })
    };
    S.exam.history.push(rec);
    S.exam.latest = rec;
    var d = dayRec();
    d.quizzes++;
    d.correct += r.right;
    d.total += r.total;
    gainXP(30);
    save();
    rerenderView();
    toast("测评完成，已生成学习计划");
  }

  function levelOf(score) {
    if (score >= 550) return { key: "L4", name: "冲刺高分", desc: "基础扎实，接下来拼的是稳定性和速度。", target: 580 };
    if (score >= 500) return { key: "L3", name: "稳步提分", desc: "整体不错，短板决定你的上限。", target: 550 };
    if (score >= 425) return { key: "L2", name: "接近过线", desc: "客观题基本能应付，把薄弱项拉到平均线以上就能稳过。", target: 500 };
    return { key: "L1", name: "基础待夯实", desc: "先解决“看不懂、听不清”的问题，再谈技巧。", target: 450 };
  }

  function gradeExam() {
    var secs = [], p = 0, right = 0, total = 0;
    EXAM.sections.forEach(function (sec) {
      var r = 0;
      sec.items.forEach(function (it, i) { if (EX.answers[sec.id + ":" + i] === it.ans) r++; });
      secs.push({
        id: sec.id, name: sec.name, short: sec.short,
        right: r, total: sec.items.length,
        pct: Math.round(r / sec.items.length * 100)
      });
      p += sec.weight * (r / sec.items.length);
      right += r;
      total += sec.items.length;
    });
    var score = clamp(Math.round(280 + 420 * p), 300, 680);
    var level = levelOf(score);
    return {
      score: score, pct: Math.round(p * 100), right: right, total: total,
      sections: secs, level: level, plan: buildPlan(score, secs, level),
      answers: EX.answers
    };
  }

  var ACTIONS = {
    vocab: function (n) { return "每天 " + n + " 个新词，先读例句再看释义；把到期复习清空再学新词"; },
    grammar: function () { return "每天 10 道语法题，重点抓定语从句、虚拟语气、倒装与主谓一致"; },
    reading: function () { return "每天 1 篇真题阅读，限时 8 分钟，做完逐题回原文找同义替换"; },
    listening: function () { return "每天 1 组听力，先盲听再对照原文，标出连读和弱读"; }
  };

  function buildPlan(score, secs, level) {
    var sorted = secs.slice().sort(function (a, b) { return a.pct - b.pct; });
    var weak = sorted[0], weak2 = sorted[1], best = sorted[sorted.length - 1];
    var dailyWords = level.key === "L1" ? 30 : level.key === "L2" ? 25 : 20;
    var dailyMinutes = level.key === "L1" ? 60 : level.key === "L2" ? 50 : 45;

    var weeks = [
      {
        title: "第 1–2 周 · 先补最短板",
        items: [
          ACTIONS[weak.id](dailyWords),
          "把「" + weak.name + "」安排在精力最好的时段，每天 20–25 分钟",
          "周末用 25 分钟重做一次自测，只分析错题"
        ]
      },
      {
        title: "第 3–4 周 · 补第二短板",
        items: [
          ACTIONS[weak2.id](dailyWords),
          "「" + weak.name + "」每天保持 15 分钟，防止回落",
          "开始积累作文模板句，每周 10 句，抄写并造句"
        ]
      },
      {
        title: "第 5–6 周 · 整合提分",
        items: [
          "每周 2 次整套模考，严格按考试时间计时",
          "写作每周 1 篇、翻译每周 2 句，全部对照范文逐句改",
          "新词减半，把复习队列清空，只复习错题和到期词"
        ]
      }
    ];

    return {
      score: score,
      target: level.target,
      level: level.key,
      dailyWords: dailyWords,
      dailyMinutes: dailyMinutes,
      focus: [{ id: weak.id, name: weak.name, short: weak.short, pct: weak.pct }, { id: weak2.id, name: weak2.name, short: weak2.short, pct: weak2.pct }],
      strongest: { id: best.id, name: best.name, short: best.short },
      weeks: weeks,
      createdAt: Date.now()
    };
  }

  function examReport(r) {
    var applied = !!(S.plan && S.plan.createdAt === r.plan.createdAt);
    var bars = r.sections.map(function (s) {
      var cls = s.pct >= 70 ? "green" : s.pct >= 45 ? "" : "gold";
      return '<div class="bar-row"><span>' + s.short + "</span>" +
        '<div class="bar"><div class="bar-fill ' + cls + '" style="width:' + s.pct + '%"></div></div>' +
        '<span class="val">' + s.right + "/" + s.total + "</span></div>";
    }).join("");

    var p = r.plan;
    var weeksHtml = p.weeks.map(function (w) {
      return '<div style="margin-bottom:16px"><div class="card-title" style="font-size:13.5px;margin-bottom:8px">' + esc(w.title) + "</div>" +
        '<div class="outline-list">' + w.items.map(function (x, i) {
          return '<div class="outline-item"><span class="outline-idx">' + (i + 1) + "</span><span>" + esc(x) + "</span></div>";
        }).join("") + "</div></div>";
    }).join("");

    return '<section class="hero">' +
        "<div>" +
          '<div class="hero-kicker">测评结果 · 估算水平</div>' +
          '<div style="display:flex;align-items:baseline;gap:8px;margin:6px 0 2px">' +
            '<span style="font-size:52px;font-weight:650;letter-spacing:-.04em;line-height:1">' + r.score + "</span>" +
            '<span style="font-size:14px;opacity:.72">/ 710 估算</span>' +
          "</div>" +
          '<div class="hero-title" style="font-size:18px;margin-top:6px">' + esc(r.level.name) + "</div>" +
          '<div class="hero-desc">' + esc(r.level.desc) + "</div>" +
        "</div>" +
        '<div class="hero-stats">' +
          '<div><div class="hero-stat-num">' + r.right + " / " + r.total + '</div><div class="hero-stat-label">答对题数</div></div>' +
          '<div><div class="hero-stat-num">' + p.target + ' 分</div><div class="hero-stat-label">建议目标</div></div>' +
        "</div>" +
      "</section>" +

      '<div class="grid-2">' +
        '<section class="card">' +
          '<div class="card-head"><div><div class="card-title">四维得分</div><div class="card-sub">条形长度即正确率</div></div></div>' +
          '<div class="stack">' + bars + "</div>" +
          '<div class="small muted" style="margin-top:14px">加权正确率 ' + r.pct + "%，按 710 分制折算约 " + r.score + " 分。折算为粗略估算，用于定位而非预测考场分数。</div>" +
        "</section>" +
        '<section class="card">' +
          '<div class="card-head"><div><div class="card-title">诊断</div><div class="card-sub">先补最弱的一项，性价比最高</div></div></div>' +
          '<div class="stack">' +
            '<div class="spread"><span class="small" style="color:var(--ink-2)">优势项</span><span class="tag tag-green">' + esc(p.strongest.name) + "</span></div>" +
            '<div class="spread"><span class="small" style="color:var(--ink-2)">最需补强</span><span class="tag tag-red">' + esc(p.focus[0].name) + "</span></div>" +
            '<div class="spread"><span class="small" style="color:var(--ink-2)">次要短板</span><span class="tag tag-gold">' + esc(p.focus[1].name) + "</span></div>" +
          "</div>" +
          '<div class="explain" style="margin-top:14px">' + esc(diagnosisText(r)) + "</div>" +
        "</section>" +
      "</div>" +

      '<section class="card">' +
        '<div class="card-head"><div><div class="card-title">为你生成的学习计划</div>' +
        '<div class="card-sub">每日 ' + p.dailyWords + " 词 · 约 " + p.dailyMinutes + " 分钟 · " +
        (p.focus[0].pct >= 75 ? "四项均衡，重点练速度" : "重点补 " + esc(p.focus[0].short) + " 和 " + esc(p.focus[1].short)) + "</div></div>" +
        (applied
          ? '<span class="tag tag-green">已应用</span>'
          : '<button class="btn btn-primary btn-sm" data-act="exam-apply">应用这套计划</button>') +
        "</div>" + weeksHtml +
        (applied ? '<div class="small muted">已写入学习设置：每日新词 ' + p.dailyWords + " 个，首页任务与词汇队列已按此执行。</div>" : "") +
      "</section>" +

      '<details class="card"><summary style="cursor:pointer;font-weight:600;font-size:14px">查看逐题解析</summary>' +
        '<div style="margin-top:16px">' + examReview(r) + "</div></details>" +

      '<div class="row"><button class="btn" data-act="exam-again">重新测评</button>' +
      '<button class="btn btn-ghost" data-go="home">回到今日概览</button></div>';
  }

  function diagnosisText(r) {
    var weak = r.sections.slice().sort(function (a, b) { return a.pct - b.pct; })[0];
    var best = r.sections.slice().sort(function (a, b) { return b.pct - a.pct; })[0];
    if (weak.pct >= 75) return "四项都在 75% 以上，基础比较扎实。接下来的重点不是补短板，而是限时训练和写作翻译的稳定输出。";
    if (best.pct - weak.pct >= 40) return best.name + "明显强于" + weak.name + "，属于偏科型。先把" + weak.name + "补到 60% 左右，总分提升最快，比继续拔高强项划算。";
    return "四项水平比较接近，问题在" + weak.name + "的准确率（" + weak.pct + "%）。这类情况适合按计划逐项推进，每两周复测一次看曲线。";
  }

  function examReview(r) {
    var offset = 0;
    return EXAM.sections.map(function (sec) {
      var rows = sec.items.map(function (it, i) {
        var key = sec.id + ":" + i;
        var mine = r.answers ? r.answers[key] : null;
        var ok = mine === it.ans;
        return '<div style="padding:9px 0;border-bottom:1px solid var(--line-soft)">' +
          '<div class="small"><b>' + (offset + i + 1) + ".</b> " +
          (ok ? '<span class="tag tag-green">正确</span>' : '<span class="tag tag-red">' + (mine == null ? "未答" : "错误") + "</span>") +
          ' <span class="muted">正确答案 ' + "ABCD"[it.ans] + (mine != null ? " · 你选了 " + "ABCD"[mine] : "") + "</span></div>" +
          '<div class="small muted" style="margin-top:4px;line-height:1.7">' + esc(it.q) + "　" + esc(it.exp) + "</div></div>";
      }).join("");
      offset += sec.items.length;
      return '<div style="margin-bottom:18px"><div class="card-title" style="font-size:13px;margin-bottom:4px">' + esc(sec.name) + "</div>" + rows + "</div>";
    }).join("");
  }

  function applyPlan() {
    if (!EX.result) return;
    var p = EX.result.plan;
    S.plan = p;
    S.settings.dailyWords = p.dailyWords;
    S.settings.dailyMinutes = p.dailyMinutes;
    V.queue = [];
    V.done = 0;
    save();
    rerenderView();
    toast("已应用：每天 " + p.dailyWords + " 词，重点补" + p.focus[0].short);
  }

  function mountExam() {
    $("#view").addEventListener("click", function (e) {
      var opt = e.target.closest("[data-eq][data-eo]");
      if (opt) {
        var key = opt.dataset.eq, oi = +opt.dataset.eo;
        EX.answers[key] = oi;
        $$('[data-eq="' + key + '"]').forEach(function (el) {
          el.classList.toggle("selected", +el.dataset.eo === oi);
        });
        updateExamProgress();
        return;
      }
      var t = e.target.closest("[data-act],[data-go]");
      if (!t) return;
      if (t.dataset.go) { navigate(t.dataset.go); return; }

      var act = t.dataset.act;
      if (act === "exam-start") {
        startExam();
      } else if (act === "exam-next") {
        EX.step = Math.min(EXAM.sections.length - 1, EX.step + 1);
        rerenderView();
      } else if (act === "exam-prev") {
        EX.step = Math.max(0, EX.step - 1);
        rerenderView();
      } else if (act === "exam-submit") {
        submitExam();
      } else if (act === "exam-quit") {
        if (confirm("退出后本次作答不会保存，确定退出吗？")) {
          EX.started = false;
          EX.answers = {};
          EX.step = 0;
          EX.done = false;
          EX.result = null;
          rerenderView();
        }
      } else if (act === "exam-play") {
        var k2 = t.dataset.key;
        var sec = EXAM.sections.filter(function (s) { return k2.indexOf(s.id + ":") === 0; })[0];
        if (!sec) return;
        var idx = +k2.split(":")[1];
        playLines(sec.items[idx].lines, k2, $('.wave[data-w="' + k2 + '"]'));
      } else if (act === "exam-apply") {
        applyPlan();
      } else if (act === "exam-again") {
        EX.done = false;
        EX.result = null;
        EX.started = false;
        EX.answers = {};
        EX.step = 0;
        rerenderView();
      }
    });
  }

  /* =========================================================
     备考计划 · 2026-12-12
     ========================================================= */
  function planExamDate() {
    return (S.settings && S.settings.examDate) || EXAM_DATE;
  }

  function planWeeks() {
    var examD = planExamDate();
    return PD.weeks.map(function (w) {
      var off = -(5 + 7 * (8 - w.n));
      return {
        n: w.n, phase: w.phase, theme: w.theme, goal: w.goal, rows: w.rows, check: w.check,
        start: addDays(examD, off),
        end: w.n === 8 ? examD : addDays(examD, off + 6)
      };
    });
  }

  function weekState(w, today) {
    if (today > w.end) return "past";
    if (today >= w.start) return "current";
    return "future";
  }

  function currentWeekInfo() {
    if (!PD) return null;
    var t = dstr(), ws = planWeeks(), cur = null, nx = null;
    ws.forEach(function (w) {
      var st = weekState(w, t);
      if (st === "current" && !cur) cur = w;
      if (st === "future" && !nx) nx = w;
    });
    return cur || nx;
  }

  function renderPlan() {
    if (!PD) {
      return '<section class="card"><div class="empty"><b>计划数据未加载</b>请确认 data-plan.js 与 index.html 在同一目录</div></section>';
    }
    var today = dstr();
    var weeks = planWeeks();
    var examD = planExamDate();
    var left = diffDays(today, examD);
    var ep = examD.split("-");
    var ew = "日一二三四五六"[new Date(+ep[0], +ep[1] - 1, +ep[2]).getDay()];
    var examText = +ep[1] + " 月 " + +ep[2] + " 日 周" + ew;
    var cur = null, next = null;
    weeks.forEach(function (w) {
      var st = weekState(w, today);
      if (st === "current" && !cur) cur = w;
      if (st === "future" && !next) next = w;
    });
    var focus = cur || next || weeks[weeks.length - 1];
    var R = 46, C = 2 * Math.PI * R;
    var ringPct = (focus.n - 1) / weeks.length;

    var scoreRows = PD.sections.map(function (s) {
      var w = Math.round(s.target / s.pts * 100);
      return '<div class="t-row">' +
        '<div><div style="font-weight:550">' + esc(s.name) + '</div>' +
        '<div class="small muted" style="font-size:11px">' + s.q + ' 题 · 占 ' + s.pct + '%</div></div>' +
        '<div class="bar"><div class="bar-fill" style="width:' + clamp(w, 0, 100) + '%"></div></div>' +
        '<div class="val" style="text-align:right;font-variant-numeric:tabular-nums">' + s.target + '<span class="muted" style="font-size:11px"> / ' + s.pts + '</span></div>' +
        '</div>';
    }).join("");

    var condHtml = PD.verdict.conditions.map(function (c, i) {
      return '<div class="cond-row"><div class="outline-idx">' + (i + 1) + '</div>' +
        '<div><div style="font-size:13px;font-weight:550">' + esc(c.t) + '</div>' +
        '<div class="small muted" style="margin-top:1px">' + esc(c.d) + '</div></div></div>';
    }).join("");

    var weekHtml = weeks.map(function (w) {
      var st = weekState(w, today);
      var tag = st === "current" ? '<span class="tag tag-green">本周</span>'
        : st === "past" ? '<span class="tag">已过去</span>'
          : (next && next.n === w.n ? '<span class="tag tag-blue">下周开始</span>' : '');
      var lines = w.rows.map(function (r) {
        return '<div class="pw-line"><b>' + esc(r.k) + '</b><span>' + esc(r.v) + '</span></div>';
      }).join("");
      var quick = w.n === focus.n
        ? '<div class="row" style="margin-top:11px;flex-wrap:wrap">' +
          '<button class="btn btn-sm btn-soft" data-go="vocab">去背词</button>' +
          '<button class="btn btn-sm btn-soft" data-go="listening">去听力</button>' +
          '<button class="btn btn-sm btn-soft" data-go="reading">去阅读</button>' +
          '<button class="btn btn-sm btn-soft" data-go="translation">去翻译</button>' +
          '</div>'
        : "";
      return '<div class="plan-week ' + st + '" data-week="' + w.n + '">' +
        '<div class="pw-head">' +
          '<div class="pw-badge">W' + w.n + '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div class="pw-title">' + esc(w.theme) + (tag ? " " + tag : "") + '</div>' +
            '<div class="pw-date">' + dateLabel(w.start) + " – " + dateLabel(w.end) + " · " + esc(w.phase) + '</div>' +
          '</div>' +
          '<button class="btn btn-sm btn-ghost" data-fold="' + w.n + '" type="button">收起</button>' +
        '</div>' +
        '<div class="pw-goal">本周目标：' + esc(w.goal) + '</div>' +
        '<div class="pw-body">' + lines + '</div>' +
        '<div class="pw-check">检查点 · ' + esc(w.check) + '</div>' +
        quick +
        '</div>';
    }).join("");

    var dailyHtml = PD.daily.map(function (d) {
      var rows = d.rows.map(function (r) {
        return '<div class="pw-line"><b>' + esc(r.t) + '</b><span><b style="color:var(--ink);font-weight:600;font-size:12.5px">' + esc(r.c) + '</b> · ' + esc(r.d) + '</span></div>';
      }).join("");
      return '<div style="padding:12px 0;border-bottom:1px solid var(--line-soft)">' +
        '<div class="spread" style="margin-bottom:8px">' +
          '<span style="font-size:13px;font-weight:600">' + esc(d.name) + '</span>' +
          '<span class="tag">' + esc(d.tag) + '</span>' +
        '</div>' + rows + '</div>';
    }).join("");

    var dayHtml = PD.examDay.map(function (e) {
      return '<div class="day-line">' +
        '<div class="day-time">' + esc(e.t) + '</div>' +
        '<div><div style="font-size:13px;font-weight:550">' + esc(e.c) + '</div>' +
        '<div class="small muted" style="line-height:1.55">' + esc(e.d) + '</div></div>' +
        '</div>';
    }).join("");

    var msHtml = PD.milestones.map(function (m) {
      var past = today > m.date;
      return '<div class="spread" style="padding:7px 0;border-bottom:1px solid var(--line-soft)">' +
        '<div class="row" style="gap:10px">' +
          '<span class="small ' + (past ? "muted" : "") + '" style="min-width:62px;font-variant-numeric:tabular-nums">' + dateLabel(m.date) + '</span>' +
          '<span class="small" style="color:' + (past ? "var(--ink-3)" : "var(--ink-2)") + '">' + esc(m.label) + '</span>' +
        '</div>' +
        (m.note ? '<span class="small muted" style="font-size:11px">' + esc(m.note) + '</span>' : '') +
        '</div>';
    }).join("");

    var heroDesc;
    if (left < 0) {
      heroDesc = "这场考试已经结束了。如果还要再考一次，去设置里把考试日期改成下一次，计划会自动重排。";
    } else if (!cur && next && next.n === 1) {
      heroDesc = "今天先做一件小事：花 25 分钟测一次水平，明天正式开始第 1 周。四级 470 折到六级约 400–425，要到 500 需要补的是听力和阅读，不是继续背更偏的词。";
    } else {
      heroDesc = "现在在第 " + focus.n + " 周：" + focus.theme + "。目标 500 分，重点不是刷更多题，是把听力从「听懂一半」拉到 66%，把阅读稳在 70%。";
    }

    return '' +
      '<section class="hero">' +
        '<div>' +
          '<div class="hero-kicker">CET-6 · 笔试</div>' +
          '<div class="hero-title">' + examText + " " + PD.exam.time + '</div>' +
          '<div class="hero-desc">' + heroDesc + '</div>' +
          '<div class="row" style="margin-top:18px">' +
            '<button class="btn btn-lg" style="background:#fff;color:#2b4f74;border-color:#fff" data-go="vocab">按计划背词</button>' +
            '<button class="btn btn-lg" style="background:rgba(255,255,255,.12);color:#fff;border-color:rgba(255,255,255,.35)" data-go="exam">先测水平</button>' +
          '</div>' +
        '</div>' +
        '<div class="hero-ring">' +
          '<div class="ring-wrap">' +
            '<svg width="108" height="108" viewBox="0 0 108 108">' +
              '<circle cx="54" cy="54" r="' + R + '" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="7"/>' +
              '<circle cx="54" cy="54" r="' + R + '" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" ' +
                'stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - ringPct)).toFixed(1) + '"/>' +
            '</svg>' +
            '<div class="ring-center"><div><div class="ring-num">' + focus.n + '/8</div><div class="ring-label">计划进度</div></div></div>' +
          '</div>' +
          '<div class="hero-stats">' +
            '<div><div class="hero-stat-num">' + (left < 0 ? 0 : left) + ' 天</div><div class="hero-stat-label">距考试</div></div>' +
            '<div><div class="hero-stat-num">' + PD.target + ' 分</div><div class="hero-stat-label">目标分数</div></div>' +
          '</div>' +
        '</div>' +
      '</section>' +

      '<div class="grid-2">' +
        '<section class="card">' +
          '<div class="card-head"><div><div class="card-title">这件事能不能成</div>' +
          '<div class="card-sub">四级 ' + PD.cet4 + ' → 六级 ' + PD.target + '</div></div>' +
          '<span class="tag tag-gold">' + esc(PD.verdict.level) + '</span></div>' +
          '<div style="font-size:15.5px;font-weight:600;margin-bottom:8px">' + esc(PD.verdict.title) + '</div>' +
          '<div class="stack" style="gap:6px;margin-bottom:14px">' +
            PD.verdict.points.map(function (p) {
              return '<div class="v-point">' + esc(p) + '</div>';
            }).join("") +
          '</div>' +
          '<div class="card-sub" style="margin-bottom:8px">成立要满足三个条件</div>' +
          '<div class="stack" style="gap:9px">' + condHtml + '</div>' +
          '</section>' +

        '<section class="card">' +
          '<div class="card-head"><div><div class="card-title">500 分从哪来</div>' +
          '<div class="card-sub">按各模块占分倒推，不是拍脑袋</div></div>' +
          '<span class="tag tag-blue">合计 500</span></div>' +
          '<div class="stack" style="gap:2px;margin-bottom:10px">' + scoreRows + '</div>' +
          '<div class="explain" style="margin-top:8px">' + esc(PD.baseline.note) + '</div>' +
          '<div class="card-sub" style="margin-top:12px;margin-bottom:6px">各模块怎么练</div>' +
          '<div class="stack" style="gap:6px">' +
            PD.sections.map(function (s) {
              return '<div class="pw-line"><b>' + esc(s.name) + '</b><span>' + esc(s.daily) + '</span></div>';
            }).join("") +
          '</div>' +
          '</section>' +
      '</div>' +

      '<section class="card">' +
        '<div class="card-head"><div><div class="card-title">八周路线</div>' +
        '<div class="card-sub">从 ' + dateLabel(weeks[0].start) + ' 到考试日，共 ' + diffDays(weeks[0].start, examD) + ' 天</div></div>' +
        '<span class="tag">按周执行</span></div>' +
        '<div class="plan-weeks">' + weekHtml + '</div>' +
      '</section>' +

      '<div class="grid-2">' +
        '<section class="card">' +
          '<div class="card-head"><div><div class="card-title">每天怎么分配</div>' +
          '<div class="card-sub">忙的时候用保底版，不要断</div></div></div>' +
          dailyHtml +
          '<div class="explain" style="margin-top:12px">累计约 100 小时。如果某天只剩 45 分钟，走保底版；宁可每天 45 分钟，也不要周末一次补 5 小时。</div>' +
          '</section>' +

        '<section class="card">' +
          '<div class="card-head"><div><div class="card-title">考试当天</div>' +
          '<div class="card-sub">' + examText + ' · ' + PD.exam.time + '</div></div></div>' +
          dayHtml +
          '<div class="explain" style="margin-top:12px">听力结束立刻收答题卡 1，没有补涂时间；阅读按「仔细 → 匹配 → 选词」做，把时间花在分值高的题上。</div>' +
          '</section>' +
      '</div>' +

      (examD === PD.exam.date
        ? '<section class="card">' +
          '<div class="card-head"><div class="card-title">近期节点</div>' +
          '<span class="small muted">以本校通知为准</span></div>' +
          msHtml +
          '</section>'
        : "");
  }

  function mountPlan() {
    var view = $("#view");
    view.addEventListener("click", function (e) {
      var f = e.target.closest("[data-fold]");
      if (f) {
        var card = f.closest(".plan-week");
        var folded = card.classList.toggle("folded");
        f.textContent = folded ? "展开" : "收起";
        return;
      }
      var b = e.target.closest("[data-go]");
      if (b) navigate(b.dataset.go);
    });
  }

  /* =========================================================
     复习提醒：应用内提醒 + 系统通知 + 日历订阅
     ========================================================= */
  var NOTIFY = { timer: null };

  function two(n) { return (n < 10 ? "0" : "") + n; }

  function notifyPerm() {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission;
  }

  function isStandalone() {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      navigator.standalone === true;
  }

  /* 走 Service Worker 发通知：安卓 Chrome 只认这条路径，普通 new Notification 会被静默丢弃 */
  function showSystemNotification(title, body) {
    var opts = {
      body: body,
      icon: "icons/icon-192.png",
      badge: "icons/icon-192.png",
      tag: "cet6-review",
      data: { url: "index.html#review" }
    };
    function direct() {
      try { new Notification(title, opts); return true; } catch (e) { return false; }
    }
    if ("serviceWorker" in navigator) {
      return navigator.serviceWorker.ready
        .then(function (reg) { return reg.showNotification(title, opts); })
        .then(function () { return true; })
        .catch(direct);
    }
    return Promise.resolve(direct());
  }

  function askNotify() {
    if (!("Notification" in window)) return Promise.resolve("unsupported");
    if (Notification.permission === "granted") return Promise.resolve("granted");
    return new Promise(function (resolve) {
      var settled = false;
      var done = function (p) { if (!settled) { settled = true; resolve(p); } };
      try {
        var r = Notification.requestPermission(done);
        if (r && typeof r.then === "function") r.then(done);
        // 极少数浏览器既不回调也不返回 Promise
        setTimeout(function () { done(Notification.permission); }, 1500);
      } catch (e) { done(Notification.permission); }
    });
  }

  /* 当前应触发的提醒时段（离现在最近、且已经过去的那个） */
  function currentSlot() {
    var n = S.settings.notify;
    var now = new Date();
    var hm = two(now.getHours()) + ":" + two(now.getMinutes());
    var slot = "";
    (n.times || []).forEach(function (t) { if (t && t <= hm) slot = t; });
    return slot;
  }

  /* 每分钟检查一次：到点且今天这一档还没提醒过，就弹 */
  function checkReminder(force) {
    var n = S.settings.notify;
    if (!n) return;
    var slot = currentSlot();
    if (!slot) return;
    if (!force && !n.on) return;
    var key = dstr() + "@" + slot;
    if (!force && n.lastFired === key) return;

    var info = dueInfo();
    var pending = info.due + info.fresh;
    if (!pending) return;

    if (!force) {
      n.lastFired = key;
      n.lastDay = dstr();
      save();
    }
    var title = info.due
      ? "该复习了：今天有 " + info.due + " 个词到期"
      : "今天的词汇任务还没开始";
    var body = info.due
      ? (info.overdue ? "其中 " + info.overdue + " 个已经逾期，先清掉这批。" : "大约 5 分钟能过完，趁还没忘干净。")
      : "还有 " + info.fresh + " 个新词等着，20 个词约 8 分钟。";

    // 页面可见就用应用内提示，避免和系统通知双弹；不可见才发系统通知
    if (document.hidden) {
      showSystemNotification(title, body);
    } else {
      toast(title);
    }
  }

  function startReminderLoop() {
    if (NOTIFY.timer) clearInterval(NOTIFY.timer);
    syncDigest(true);
    setTimeout(function () { checkReminder(); }, 2500);
    NOTIFY.timer = setInterval(function () { checkReminder(); }, 60000);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) checkReminder();
    });
  }

  /* ---------- 日历文件 ---------- */
  function icsStamp(d) {
    return d.getUTCFullYear() + two(d.getUTCMonth() + 1) + two(d.getUTCDate()) + "T" +
      two(d.getUTCHours()) + two(d.getUTCMinutes()) + "00Z";
  }

  /* 生成 .ics：从明天起每天在设定时间提醒，直到考试当天 */
  function buildICS() {
    var n = S.settings.notify;
    var times = (n.times && n.times.length) ? n.times : ["08:00"];
    var start = new Date();
    start.setDate(start.getDate() + 1);
    var endStr = S.settings.examDate || EXAM_DATE;
    var ep = endStr.split("-");
    var out = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//CET6 Trainer//Review Reminder//CN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:六级复习提醒",
      "X-WR-TIMEZONE:Asia/Shanghai"
    ];
    times.forEach(function (t, i) {
      if (!t) return;
      var hm = t.split(":");
      var hh = +hm[0] || 8, mm = +hm[1] || 0;
      var dt = new Date(start.getFullYear(), start.getMonth(), start.getDate(), hh, mm, 0);
      var until = new Date(+ep[0], +ep[1] - 1, +ep[2], hh, mm, 0);
      out.push("BEGIN:VEVENT");
      out.push("UID:cet6-review-" + i + "-" + icsStamp(dt) + "@cet6trainer");
      out.push("DTSTAMP:" + icsStamp(new Date()));
      out.push("DTSTART:" + icsStamp(dt));
      out.push("DURATION:PT10M");
      out.push("RRULE:FREQ=DAILY;UNTIL=" + icsStamp(until));
      out.push("SUMMARY:六级复习 · " + t + " 该背词了");
      out.push("DESCRIPTION:打开六级训练，清掉今天的复习队列。间隔重复的关键是按时，别攒到周末一起补。");
      out.push("TRANSP:TRANSPARENT");
      out.push("BEGIN:VALARM");
      out.push("TRIGGER:-PT0M");
      out.push("ACTION:DISPLAY");
      out.push("DESCRIPTION:六级复习时间到了");
      out.push("END:VALARM");
      out.push("END:VEVENT");
    });
    out.push("END:VCALENDAR");
    return out.join("\r\n");
  }

  function exportICS() {
    var blob = new Blob([buildICS()], { type: "text/calendar;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cet6-review.ics";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    toast("日历文件已生成，打开导入即可");
  }

  /* ---------- 页面 ---------- */
  function renderReview() {
    var info = dueInfo();
    var n = S.settings.notify;
    var f = forecastLoad(14);
    var max = 1;
    f.forEach(function (x) { if (x.n > max) max = x.n; });

    // 记忆健康度：已学词的平均留存
    var sum = 0, cnt = 0;
    var ranked = [];
    Object.keys(S.vocab).forEach(function (k) {
      var r = S.vocab[k];
      if (!r || !r.seen) return;
      var rt = retentionOf(r);
      if (rt == null) return;
      sum += rt; cnt++;
      ranked.push({ w: k, r: r, rt: rt });
    });
    ranked.sort(function (a, b) { return a.rt - b.rt; });
    var risk = ranked.slice(0, 8);
    var health = cnt ? Math.round(sum / cnt * 100) : null;
    var healthTone = health == null ? "muted" : health >= 80 ? "good" : health >= 60 ? "warn" : "bad";

    var perm = notifyPerm();
    var permText = perm === "granted" ? "已开启" : perm === "denied" ? "已被拒绝" : perm === "unsupported" ? "不支持" : "未开启";
    var permCls = perm === "granted" ? "tag-green" : perm === "denied" ? "tag-red" : "tag-gold";

    var riskHtml = risk.length ? risk.map(function (x) {
      var tone = x.rt < 0.6 ? "tag-red" : x.rt < 0.85 ? "tag-gold" : "tag-green";
      return '<div class="v-row">' +
        '<div class="v-word">' + esc(x.w) + '</div>' +
        '<div class="v-cn">' + esc((VOCAB.filter(function (v) { return v.w === x.w; })[0] || {}).cn || "") + '</div>' +
        '<span class="tag ' + tone + '">留存 ' + Math.round(x.rt * 100) + '%</span>' +
        '<button class="speak-btn" data-act="speak" data-w="' + esc(x.w) + '">' + speakerSvg() + '</button>' +
        '</div>';
    }).join("") : '<div class="empty"><b>还没有可分析的数据</b>先背几个词，这里会显示最该补的词</div>';

    var loadHtml = f.map(function (x, i) {
      var h = Math.round(x.n / max * 100);
      var isToday = i === 0;
      var d = new Date(x.date.replace(/-/g, "/"));
      return '<div class="load-col' + (isToday ? " today" : "") + '">' +
        '<div class="load-num">' + (x.n || "") + '</div>' +
        '<div class="load-bar"><i style="height:' + (x.n ? Math.max(6, h) : 0) + '%"></i></div>' +
        '<div class="load-day">' + (isToday ? "今天" : (d.getMonth() + 1) + "/" + d.getDate()) + '</div>' +
        '</div>';
    }).join("");

    var times = n.times.map(function (t, i) {
      return '<input class="input time-input" type="time" data-nt="t' + i + '" value="' + esc(t) + '">';
    }).join("");

    return '<section class="card review-hero">' +
        '<div class="spread" style="align-items:flex-start;gap:18px;flex-wrap:wrap">' +
          '<div>' +
            '<div class="hero-kicker" style="color:#9fb8d0">Spaced Repetition</div>' +
            '<div class="review-big">' + info.due + '<span> 个词今天到期</span></div>' +
            '<div class="review-sub">' +
              (info.overdue ? "其中 <b>" + info.overdue + "</b> 个已逾期，优先清掉；" : "没有逾期，节奏正好；") +
              "已学 " + info.learned + " / " + info.total + " 词，已掌握 " + info.mastered + " 词。" +
            '</div>' +
            '<div class="row" style="margin-top:16px">' +
              '<button class="btn btn-primary" data-act="go-vocab">开始复习</button>' +
              (info.fresh ? '<button class="btn" data-act="go-new">学 ' + Math.min(info.fresh, S.settings.dailyWords) + " 个新词</button>" : "") +
            '</div>' +
          '</div>' +
          '<div class="health-ring ' + healthTone + '">' +
            '<div class="ring-num">' + (health == null ? "—" : health + "%") + '</div>' +
            '<div class="ring-cap">记忆健康度</div>' +
          '</div>' +
        '</div>' +
      '</section>' +

      '<div class="grid-3">' +
        '<section class="card stat-card"><div class="stat-num">' + info.due + '<span class="stat-unit">词</span></div><div class="stat-label">今日待复习</div></section>' +
        '<section class="card stat-card"><div class="stat-num">' + info.mastered + '<span class="stat-unit">词</span></div><div class="stat-label">已掌握（间隔 ≥ 21 天）</div></section>' +
        '<section class="card stat-card"><div class="stat-num">' + (health == null ? "—" : health + "%") + '</div><div class="stat-label">平均留存率</div></section>' +
      '</div>' +

      '<section class="card">' +
        '<div class="card-head"><div><div class="card-title">未来 14 天复习负载</div>' +
        '<div class="card-sub">柱高 = 当天到期的词数。某天特别高，说明那天学得太多，可以提前匀掉一些</div></div></div>' +
        '<div class="load-chart">' + loadHtml + '</div>' +
      '</section>' +

      '<section class="card">' +
        '<div class="card-head"><div><div class="card-title">最可能忘掉的词</div>' +
        '<div class="card-sub">按当前留存率排序，越低越该优先复习（红色 < 60%）</div></div>' +
        '<button class="btn btn-sm btn-soft" data-act="go-vocab">去复习</button></div>' +
        '<div class="vocab-list">' + riskHtml + '</div>' +
      '</section>' +

      '<section class="card">' +
        '<div class="card-head"><div><div class="card-title">手机提醒</div>' +
        '<div class="card-sub">三种通道，建议至少开一种</div></div>' +
        '<span class="tag ' + permCls + '">通知权限：' + permText + '</span></div>' +

        '<div class="form-row"><div><div class="form-label">开启每日提醒</div>' +
          '<div class="form-desc">到点后即使没打开应用也会提示（取决于系统策略）</div></div>' +
          '<label class="switch"><input type="checkbox" data-nt="on"' + (n.on ? " checked" : "") + '><i></i></label></div>' +

        '<div class="form-row"><div><div class="form-label">提醒时间</div>' +
          '<div class="form-desc">每天最多三档，建议早、中、晚各一次</div></div>' +
          '<div class="row time-row">' + times + '</div></div>' +

        '<div class="row" style="flex-wrap:wrap;margin-top:6px">' +
          '<button class="btn btn-primary btn-sm" data-act="notify-perm">' + (perm === "granted" ? "重新申请权限" : "开启系统通知") + '</button>' +
          '<button class="btn btn-sm" data-act="notify-test">发一条测试通知</button>' +
          '<button class="btn btn-sm" data-act="ics">导出日历提醒</button>' +
        '</div>' +

        '<div class="stack" style="margin-top:18px;gap:0">' +
          '<div class="channel"><span class="ch-num">1</span><div><b>应用内提醒</b>' +
            '<div class="small muted">打开应用就会在顶部提示今天到期的数量，不依赖任何权限。</div></div></div>' +
          '<div class="channel"><span class="ch-num">2</span><div><b>系统通知（推荐）</b>' +
            '<div class="small muted">点「开启系统通知」并允许。装到主屏后，安卓 Chrome 支持后台定时唤醒检查；iPhone 需 iOS 16.4+ 且必须先从 Safari 添加到主屏。</div></div></div>' +
          '<div class="channel"><span class="ch-num">3</span><div><b>日历提醒（最可靠）</b>' +
            '<div class="small muted">导出 .ics 后打开导入手机日历，每天固定时间由系统闹钟提醒，不受应用是否打开影响，也不耗电。</div></div></div>' +
        '</div>' +

        (isStandalone() ? "" : '<div class="hint-box" style="margin-top:14px">还没装到主屏。先把这个网址「添加到主屏幕」，通知才能真正在后台弹出。</div>') +
      '</section>' +

      '<section class="card">' +
        '<div class="card-head"><div><div class="card-title">复习是怎么排的</div>' +
        '<div class="card-sub">SM-2 间隔重复算法，按你的评分动态调整</div></div></div>' +
        '<div class="algo-steps">' +
          '<div class="algo-step"><b>1</b><span>第一次见面后，1 天后复习</span></div>' +
          '<div class="algo-step"><b>2</b><span>答对则间隔跳到 6 天</span></div>' +
          '<div class="algo-step"><b>3</b><span>之后每次 × 易度因子（1.3–3.0）</span></div>' +
          '<div class="algo-step"><b>4</b><span>答错立即重置为 1 天，易度下降</span></div>' +
          '<div class="algo-step"><b>5</b><span>间隔 ≥ 21 天且连续答对，记为已掌握</span></div>' +
        '</div>' +
        '<div class="small muted" style="margin-top:12px">易度因子随每次评分微调：越熟练越接近 3.0，间隔拉得越快；反复忘的词会掉到 1.3，几乎每两天就要见一次。</div>' +
      '</section>';
  }

  function mountReview() {
    var root = $("#view");
    root.addEventListener("change", function (e) {
      var k = e.target.dataset.nt;
      if (!k) return;
      var n = S.settings.notify;
      if (k === "on") { n.on = e.target.checked; save(); toast(n.on ? "提醒已开启" : "提醒已关闭"); }
      else if (/^t\d$/.test(k)) {
        var i = +k.slice(1);
        n.times[i] = e.target.value;
        save();
        toast("提醒时间已更新");
      }
    });
    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]");
      if (!b) return;
      var act = b.dataset.act;
      if (act === "go-vocab" || act === "go-new") {
        V.queue = [];
        V.idx = 0; V.done = 0; V.stat = { 0: 0, 1: 0, 2: 0, 3: 0 };
        V.lastTip = "";
        navigate("vocab");
      } else if (act === "speak") {
        speakWord(b.dataset.w);
      } else if (act === "notify-perm") {
        askNotify().then(function (p) {
          if (p === "granted") {
            toast("已开启，到点会提醒你");
            showSystemNotification("提醒已开启", "以后每天 " + S.settings.notify.times.join(" / ") + " 提醒你复习。");
          } else if (p === "denied") {
            toast("权限被拒绝，可在浏览器设置里重新允许");
          } else if (p === "unsupported") {
            toast("这个浏览器不支持通知，建议用日历提醒");
          }
          render(true);
        });
      } else if (act === "notify-test") {
        askNotify().then(function (p) {
          if (p !== "granted") { toast(p === "denied" ? "通知权限被拒绝" : "请先允许通知"); return; }
          var info = dueInfo();
          showSystemNotification("测试通知 · 六级训练",
            info.due ? "今天有 " + info.due + " 个词到期，去复习一下。" : "通知通道正常，到点会这样提醒你。");
          toast("已发送测试通知");
        });
      } else if (act === "ics") {
        exportICS();
      }
    });
  }

  /* =========================================================
     记忆方法
     ========================================================= */
  function curveSvg() {
    // 无复习的遗忘曲线（对数刻度）
    var pts = MEMORY.FORGET_CURVE;
    var W = 620, H = 190, padL = 34, padB = 26;
    var x = function (i) { return padL + i * (W - padL - 12) / (pts.length - 1); };
    var y = function (h) { return 8 + (100 - h) / 100 * (H - padB - 8); };
    var line = pts.map(function (p, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(p.h).toFixed(1); }).join(" ");
    var dots = pts.map(function (p, i) {
      return '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.h).toFixed(1) + '" r="3.5" fill="#c96a5f"/>' +
        '<text x="' + x(i).toFixed(1) + '" y="' + (y(p.h) - 10).toFixed(1) + '" text-anchor="middle" font-size="11" fill="#8a8f96">' + p.h + '%</text>';
    }).join("");
    var labels = pts.map(function (p, i) {
      return '<text x="' + x(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="10.5" fill="#9aa0a6">' + p.t + '</text>';
    }).join("");
    var grid = [0, 25, 50, 75, 100].map(function (v) {
      return '<line x1="' + padL + '" y1="' + y(v) + '" x2="' + (W - 12) + '" y2="' + y(v) + '" stroke="#eef0f3" stroke-width="1"/>' +
        '<text x="' + (padL - 6) + '" y="' + (y(v) + 3.5) + '" text-anchor="end" font-size="10" fill="#b3b8be">' + v + '</text>';
    }).join("");
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="curve-svg" role="img" aria-label="艾宾浩斯遗忘曲线">' +
      grid +
      '<path d="' + line + '" fill="none" stroke="#c96a5f" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
      dots + labels +
      '</svg>';
  }

  function sawtoothSvg() {
    // 复习后的留存回升（锯齿）
    var W = 620, H = 190, padL = 34, padB = 26;
    var span = 33;
    var x = function (d) { return padL + d / span * (W - padL - 12); };
    var y = function (h) { return 8 + (100 - h) / 100 * (H - padB - 8); };
    var reviews = [0, 1, 3, 7, 15, 30];
    var segs = [];
    for (var i = 0; i < reviews.length; i++) {
      var a = reviews[i];
      var b = i + 1 < reviews.length ? reviews[i + 1] : span;
      if (b <= a) continue;
      var drop = i + 1 < reviews.length ? 10 : 32;
      segs.push("M" + x(a).toFixed(1) + " " + y(100).toFixed(1) +
        " Q" + x((a + b) / 2).toFixed(1) + " " + y(100 - drop * 0.78).toFixed(1) +
        " " + x(b).toFixed(1) + " " + y(100 - drop).toFixed(1));
    }
    var marks = reviews.map(function (d, i) {
      return '<line x1="' + x(d).toFixed(1) + '" y1="' + y(100) + '" x2="' + x(d).toFixed(1) + '" y2="' + (H - padB) + '" stroke="#dfe4ea" stroke-dasharray="3 3"/>' +
        '<circle cx="' + x(d).toFixed(1) + '" cy="' + y(100) + '" r="3" fill="#4a7ba7"/>' +
        '<text x="' + x(d).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="10.5" fill="#9aa0a6">' + (i === 0 ? "学" : "第" + d + "天") + '</text>';
    }).join("");
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="curve-svg" role="img" aria-label="间隔重复的留存曲线">' +
      [0, 50, 100].map(function (v) {
        return '<line x1="' + padL + '" y1="' + y(v) + '" x2="' + (W - 12) + '" y2="' + y(v) + '" stroke="#eef0f3"/>' +
          '<text x="' + (padL - 6) + '" y="' + (y(v) + 3.5) + '" text-anchor="end" font-size="10" fill="#b3b8be">' + v + '</text>';
      }).join("") +
      marks +
      '<path d="' + segs.join(" ") + '" fill="none" stroke="#4a7ba7" stroke-width="2.2" stroke-linecap="round"/>' +
      '</svg>';
  }

  function renderMemory() {
    var tech = MEMORY.TECHNIQUES.map(function (t) {
      return '<details class="mem-card">' +
        '<summary><span class="mem-name">' + esc(t.name) + '</span>' +
          '<span class="mem-en">' + esc(t.en) + '</span>' +
          '<span class="tag ' + (t.level === "最重要" ? "tag-red" : t.level === "提速关键" ? "tag-gold" : "tag-blue") + '">' + esc(t.level) + '</span>' +
        '</summary>' +
        '<div class="mem-body">' +
          '<p class="mem-claim">' + esc(t.claim) + '</p>' +
          '<div class="mem-line"><b>怎么做</b>' + esc(t.how) + '</div>' +
          '<div class="mem-line"><b>在这个系统里</b>' + esc(t.inApp) + '</div>' +
          (t.cite ? '<div class="mem-cite">' + esc(t.cite) + '</div>' : "") +
        '</div>' +
        '</details>';
    }).join("");

    var roots = MEMORY.ROOTS.map(function (r) {
      return '<div class="root-row" data-root="' + esc((r.r + " " + r.cn + " " + r.words.join(" ")).toLowerCase()) + '">' +
        '<div class="root-key">' + esc(r.r) + '</div>' +
        '<div class="root-cn">' + esc(r.cn) + '</div>' +
        '<div class="root-words">' + r.words.map(function (w) { return '<span>' + esc(w) + '</span>'; }).join("") + '</div>' +
        '</div>';
    }).join("");

    // 个人记忆参数
    var eases = [], intervals = [], lapses = 0, seen = 0;
    Object.keys(S.vocab).forEach(function (k) {
      var r = S.vocab[k];
      if (!r || !r.seen) return;
      seen++;
      eases.push(r.ease || 2.5);
      intervals.push(r.interval || 0);
      lapses += r.lapses || 0;
    });
    var avgEase = seen ? (eases.reduce(function (a, b) { return a + b; }, 0) / seen).toFixed(2) : "2.50";
    var avgInt = seen ? Math.round(intervals.reduce(function (a, b) { return a + b; }, 0) / seen) : 0;
    var avgLapse = seen ? (lapses / seen).toFixed(2) : "0.00";

    return '<section class="card">' +
        '<div class="card-head"><div><div class="card-title">遗忘曲线</div>' +
        '<div class="card-sub">不复习的话，学完 1 天只剩 33%，1 个月后只剩 21%</div></div></div>' +
        curveSvg() +
        '<div class="small muted" style="margin-top:8px">横轴为对数刻度（20 分钟 → 31 天），纵轴为还能想起的比例。数据源自艾宾浩斯 1885 年的无意义音节实验。</div>' +
      '</section>' +

      '<section class="card">' +
        '<div class="card-head"><div><div class="card-title">在有复习的情况下</div>' +
        '<div class="card-sub">同样的内容，每次都在快忘时补一刀，留存就变成锯齿状上升</div></div></div>' +
        sawtoothSvg() +
        '<div class="small muted" style="margin-top:8px">每次复习后曲线回到 100%，但下降速度越来越慢——这就是间隔可以从 1 天拉到 30 天的原因。</div>' +
      '</section>' +

      '<section class="card">' +
        '<div class="card-head"><div><div class="card-title">你的记忆参数</div>' +
        '<div class="card-sub">来自你每一次评分的真实数据</div></div>' +
        '<span class="tag tag-blue">' + seen + ' 词在学</span></div>' +
        '<div class="grid-3">' +
          '<div class="stat-card" style="border:none;padding:0"><div class="stat-num">' + avgEase + '</div><div class="stat-label">平均易度因子（1.3–3.0）</div></div>' +
          '<div class="stat-card" style="border:none;padding:0"><div class="stat-num">' + avgInt + '<span class="stat-unit">天</span></div><div class="stat-label">平均复习间隔</div></div>' +
          '<div class="stat-card" style="border:none;padding:0"><div class="stat-num">' + avgLapse + '</div><div class="stat-label">平均遗忘次数</div></div>' +
        '</div>' +
        '<div class="small muted" style="margin-top:14px">' +
          (seen < 10
            ? "样本还太少，先去背 20 个词，这里的数字才有参考价值。"
            : avgLapse >= 1
              ? "遗忘次数偏高，说明复习间隔排得太长了，或者背的时候只是「看着眼熟」。试试评分时更严格：想不起例句用法就选「模糊」。"
              : "遗忘率控制得不错。继续保持如实的评分，算法才能把间隔拉到位。") +
        '</div>' +
      '</section>' +

      '<section class="card">' +
        '<div class="card-head"><div><div class="card-title">八种记忆方法</div>' +
        '<div class="card-sub">点开看原理、做法，以及在本系统里对应哪个功能</div></div></div>' +
        '<div class="stack" style="gap:10px">' + tech + '</div>' +
      '</section>' +

      '<section class="card">' +
        '<div class="card-head"><div><div class="card-title">高频词根词缀</div>' +
        '<div class="card-sub">' + MEMORY.ROOTS.length + ' 组，覆盖六级阅读里大量长词</div></div>' +
        '<input class="search" id="rootQ" placeholder="搜词根 / 中文 / 例词…" style="max-width:200px"></div>' +
        '<div class="root-list" id="rootList">' + roots + '</div>' +
        '<div class="empty" id="rootEmpty" style="display:none"><b>没有匹配的词根</b>换个关键词</div>' +
      '</section>' +

      '<section class="card" style="background:#fbfcfd">' +
        '<div class="card-title" style="margin-bottom:8px">算法说明</div>' +
        '<div class="small muted" style="line-height:1.9">' +
          "本系统采用 SM-2 间隔重复算法（Piotr Woźniak, 1987）。每次评分换算成 0–5 的质量分，" +
          "按 <code>EF ← EF + (0.1 − (5−q)(0.08 + (5−q)×0.02))</code> 更新易度因子，" +
          "间隔按 <code>1 → 6 → I×EF</code> 递推，质量分低于 3 时重置为 1 天。" +
          "对「模糊」档做了乘 0.72 的收敛处理，避免间隔增长过快。留存率用指数模型 " +
          "<code>R = e^(−t/S)</code> 计算，S 由当前间隔反推，使到期日恰好剩 90%。" +
        '</div>' +
      '</section>';
  }

  function mountMemory() {
    var q = $("#rootQ");
    if (!q) return;
    q.addEventListener("input", function () {
      var v = this.value.trim().toLowerCase();
      var rows = $$(".root-row");
      var shown = 0;
      rows.forEach(function (r) {
        var hit = !v || (r.dataset.root || "").indexOf(v) >= 0;
        r.style.display = hit ? "" : "none";
        if (hit) shown++;
      });
      var empty = $("#rootEmpty");
      if (empty) empty.style.display = shown ? "none" : "";
    });
  }

  /* =========================================================
     学习数据
     ========================================================= */
  function renderStats() {
    var totalMin = 0, activeDays = 0;
    Object.keys(S.days).forEach(function (k) {
      totalMin += S.days[k].minutes || 0;
      if ((S.days[k].words || 0) + (S.days[k].quizzes || 0) + (S.days[k].trans || 0) + (S.days[k].write || 0) > 0) activeDays++;
    });

    var counts = { 0: 0, 1: 0, 2: 0, 3: 0 };
    VOCAB.forEach(function (v) {
      var st = S.vocab[v.w] ? S.vocab[v.w].st : 0;
      counts[st]++;
    });
    var totalQ = 0, rightQ = 0;
    Object.keys(S.days).forEach(function (k) {
      totalQ += S.days[k].total || 0;
      rightQ += S.days[k].correct || 0;
    });
    var acc = totalQ ? Math.round(rightQ / totalQ * 100) : 0;

    var total = VOCAB.length;
    function bar(label, val, cls) {
      return '<div class="bar-row"><span>' + label + '</span><div class="bar"><div class="bar-fill ' + cls + '" style="width:' + (val / total * 100) + '%"></div></div><span class="val">' + val + "</span></div>";
    }

    var recent = [];
    S.reading.forEach(function (r) { recent.push({ at: r.at, txt: "阅读 · " + r.id + " 得分 " + r.score + "/" + r.total }); });
    S.listening.forEach(function (r) { recent.push({ at: r.at, txt: "听力 · " + r.id + " 得分 " + r.score + "/" + r.total }); });
    S.translation.forEach(function (r) { recent.push({ at: r.at, txt: "翻译 · " + r.id + " 已完成" }); });
    S.writing.forEach(function (r) { recent.push({ at: r.at, txt: "写作 · " + r.id + " " + r.words + " 词" }); });
    recent.sort(function (a, b) { return b.at - a.at; });
    recent = recent.slice(0, 6);

    return '<div class="grid-3">' +
        statBox(currentStreak(), "天", "连续打卡") +
        statBox(Math.round(totalMin / 60 * 10) / 10, "小时", "累计学习时长") +
        statBox(acc, "%", "答题正确率") +
      "</div>" +
      '<section class="card">' +
        '<div class="card-head"><div><div class="card-title">学习打卡</div>' +
        '<div class="card-sub">最近 18 周 · 共活跃 ' + activeDays + " 天</div></div>" +
        '<span class="tag tag-blue">XP ' + (S.xp || 0) + "</span></div>" +
        '<div class="heatmap-wrap"><div class="heatmap">' + heatmapCells() + "</div></div>" +
        '<div class="heat-legend"><span>少</span><span class="heat-cell"></span><span class="heat-cell l1"></span><span class="heat-cell l2"></span><span class="heat-cell l3"></span><span class="heat-cell l4"></span><span>多</span></div>' +
      "</section>" +
      '<div class="grid-2">' +
        '<section class="card">' +
          '<div class="card-head"><div><div class="card-title">词汇掌握分布</div><div class="card-sub">共 ' + total + " 词</div></div></div>" +
          '<div class="stack">' +
            bar("已掌握", counts[3], "green") +
            bar("复习中", counts[2], "") +
            bar("学习中", counts[1], "gold") +
            bar("未学习", counts[0], "") +
          "</div>" +
          '<div class="small muted" style="margin-top:14px">已掌握 ' + Math.round(counts[3] / total * 100) + "%，建议每天新学 " + S.settings.dailyWords + " 词，同时清空到期复习。</div>" +
        "</section>" +
        '<section class="card">' +
          '<div class="card-head"><div><div class="card-title">模块完成情况</div><div class="card-sub">累计练习次数</div></div></div>' +
          '<div class="stack">' +
            moduleRow("听力", S.listening.length, "组") +
            moduleRow("阅读", S.reading.length, "篇") +
            moduleRow("翻译", S.translation.length, "句") +
            moduleRow("写作", S.writing.length, "篇") +
          "</div>" +
        "</section>" +
      "</div>" +
      '<section class="card">' +
        '<div class="card-head"><div class="card-title">最近记录</div></div>' +
        (recent.length ? '<div class="vocab-list">' + recent.map(function (r) {
          return '<div class="v-row"><div class="v-cn">' + esc(r.txt) + '</div><span class="small muted">' + timeAgo(r.at) + "</span></div>";
        }).join("") + "</div>" : '<div class="empty"><b>还没有练习记录</b>从今天的第一组单词开始</div>') +
      "</section>";
  }

  function statBox(num, unit, label) {
    return '<div class="card stat-card"><div class="stat-num">' + num + '<span class="stat-unit">' + unit + '</span></div><div class="stat-label">' + label + "</div></div>";
  }
  function moduleRow(name, n, unit) {
    return '<div class="spread" style="padding:7px 0"><span class="small" style="color:var(--ink-2)">' + name + "</span>" +
      '<span class="small"><b>' + n + "</b> <span class='muted'>" + unit + "</span></span></div>";
  }
  function timeAgo(ts) {
    var d = Math.floor((Date.now() - ts) / 1000);
    if (d < 60) return "刚刚";
    if (d < 3600) return Math.floor(d / 60) + " 分钟前";
    if (d < 86400) return Math.floor(d / 3600) + " 小时前";
    return Math.floor(d / 86400) + " 天前";
  }
  function heatmapCells() {
    var today = dstr();
    var dow = (new Date().getDay() + 6) % 7;
    var start = addDays(today, -(17 * 7 + dow));
    var out = "";
    for (var i = 0; i < 18 * 7; i++) {
      var d = addDays(start, i);
      var rec = S.days[d];
      var lv = 0;
      if (rec) {
        var sc = (rec.minutes || 0) + (rec.words || 0) * 0.8 + (rec.quizzes || 0) * 3;
        if (sc > 0) lv = sc < 12 ? 1 : sc < 30 ? 2 : sc < 55 ? 3 : 4;
      }
      if (d > today) lv = 0;
      out += '<div class="heat-cell ' + (lv ? "l" + lv : "") + '" title="' + d + (rec ? " · " + (rec.minutes || 0) + " 分钟" : "") + '"></div>';
    }
    return out;
  }

  /* =========================================================
     设置
     ========================================================= */
  function renderSettings() {
    var s = S.settings;
    return '<section class="card">' +
      '<div class="card-head"><div><div class="card-title">学习目标</div><div class="card-sub">影响每日任务与复习队列长度</div></div></div>' +
      '<div class="form-row"><div><div class="form-label">每日新词目标</div><div class="form-desc">建议 20–30 个，兼顾复习量</div></div>' +
        '<select class="input" data-set="dailyWords">' + [10, 15, 20, 30, 40, 50].map(function (n) {
          return '<option value="' + n + '"' + (n === s.dailyWords ? " selected" : "") + ">" + n + " 词</option>";
        }).join("") + "</select></div>" +
      '<div class="form-row"><div><div class="form-label">每日学习时长目标</div><div class="form-desc">首页进度按此目标显示</div></div>' +
        '<select class="input" data-set="dailyMinutes">' + [30, 45, 60, 90].map(function (n) {
          return '<option value="' + n + '"' + (n === s.dailyMinutes ? " selected" : "") + ">" + n + " 分钟</option>";
        }).join("") + "</select></div>" +
      '<div class="form-row"><div><div class="form-label">考试日期</div><div class="form-desc">用于首页倒计时</div></div>' +
        '<input class="input" type="date" data-set="examDate" value="' + s.examDate + '"></div>' +
      '<div class="form-row"><div><div class="form-label">听力朗读语速</div><div class="form-desc">语音由浏览器合成，音色取决于系统</div></div>' +
        '<select class="input" data-set="rate">' +
          '<option value="0.8"' + (s.rate == 0.8 ? " selected" : "") + ">慢速</option>" +
          '<option value="0.95"' + (s.rate == 0.95 ? " selected" : "") + ">正常</option>" +
          '<option value="1.1"' + (s.rate == 1.1 ? " selected" : "") + ">稍快</option>" +
        "</select></div>" +
      "</section>" +
      '<section class="card">' +
        '<div class="card-head"><div><div class="card-title">复习提醒</div>' +
        '<div class="card-sub">每日提醒时间、系统通知权限、日历订阅</div></div>' +
        '<button class="btn btn-sm btn-soft" data-act="go-review">去设置</button></div>' +
        '<div class="small muted">当前状态：' + (S.settings.notify.on ? "已开启" : "已关闭") +
        " · 每天 " + S.settings.notify.times.join(" / ") +
        " · 通知权限" + (notifyPerm() === "granted" ? "已授权" : notifyPerm() === "denied" ? "被拒绝" : "未申请") + '</div>' +
      "</section>" +
      '<section class="card">' +
        '<div class="card-head"><div><div class="card-title">数据</div><div class="card-sub">记录仅保存在当前浏览器</div></div></div>' +
        '<div class="form-row"><div><div class="form-label">导出学习记录</div><div class="form-desc">下载 JSON 备份，换设备时可保留进度</div></div>' +
          '<button class="btn btn-sm" data-act="export">导出</button></div>' +
        '<div class="form-row"><div><div class="form-label">清除所有数据</div><div class="form-desc">词汇进度、打卡与练习记录将全部删除</div></div>' +
          '<button class="btn btn-sm" style="color:var(--red);border-color:#eccdc9" data-act="reset">清除</button></div>' +
      "</section>" +
      '<section class="card" style="background:#fbfcfd">' +
        '<div class="card-title" style="margin-bottom:6px">关于这套系统</div>' +
        '<div class="small muted">包含 ' + VOCAB.length + " 个六级高频词（间隔重复复习）、" + LISTENING_SETS.length + " 组听力、" +
        READING_PASSAGES.length + " 篇阅读、" + TRANSLATIONS.length + " 句翻译与 " + WRITING_TASKS.length + " 篇写作范文。所有题目与解析内置，可离线使用。</div>" +
      "</section>";
  }

  function mountSettings() {
    $("#view").addEventListener("change", function (e) {
      var k = e.target.dataset.set;
      if (!k) return;
      var v = e.target.value;
      if (k === "dailyWords" || k === "rate" || k === "dailyMinutes") v = parseFloat(v);
      S.settings[k] = v;
      save();
      toast("已保存");
      if (k === "dailyWords") V.queue = [];
    });
    $("#view").addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]");
      if (!b) return;
      if (b.dataset.act === "go-review") {
        navigate("review");
      } else if (b.dataset.act === "export") {
        var blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "cet6-backup-" + dstr() + ".json";
        a.click();
        toast("备份已下载");
      } else if (b.dataset.act === "reset") {
        if (confirm("确定要清除全部学习记录吗？此操作不可恢复。")) {
          localStorage.removeItem(KEY);
          S = defaultState();
          V.queue = []; V.idx = 0; V.done = 0; V.stat = { 0: 0, 1: 0, 2: 0, 3: 0 };
          RD.id = null; LS.set = null;
          updateChrome();
          render();
          toast("已清除");
        }
      }
    });
  }

  /* =========================================================
     路由与初始化
     ========================================================= */
  var timers = [];
  function clearTimers() {
    timers.forEach(function (t) { clearInterval(t); });
    timers = [];
  }

  function rerenderView() {
    render(true);
  }

  function mountTimers() {
    var id = (location.hash || "#home").slice(1);
    if (id === "exam" && EX.started && !EX.done) {
      if (!EX.start) EX.start = Date.now();
      timers.push(setInterval(function () {
        var el = $("#examTimer");
        if (el) el.textContent = fmtClock(Date.now() - EX.start);
      }, 500));
    }
    if (id === "reading" && RD.id && !RD.submitted) {
      if (!RD.start) RD.start = Date.now();
      timers.push(setInterval(function () {
        var el = $("#readTimer");
        if (el) el.textContent = fmtClock(Date.now() - RD.start);
      }, 500));
    }
    if (id === "writing") {
      if (!WR.start) WR.start = Date.now();
      if (!WR.submitted) {
        timers.push(setInterval(function () {
          var el = $("#writeTimer");
          if (!el) return;
          var left = 30 * 60000 - (Date.now() - WR.start);
          el.textContent = left > 0 ? fmtClock(left) : "时间到";
          if (left <= 0) el.className = "tag tag-red";
        }, 500));
      }
    }
  }

  var lastRoute = "";
  function render(keepScroll) {
    var y = window.scrollY;
    clearTimers();
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    LS.audioIdx = null;

    var id = (location.hash || "#home").slice(1);
    var def = NAV.filter(function (n) { return n.id === id; })[0] || NAV[0];
    // 从其它页面进入词汇训练时，回到卡片模式
    if (def.id === "vocab" && lastRoute !== "vocab" && !keepScroll) V.mode = "study";
    lastRoute = def.id;
    $("#pageKicker").textContent = def.kicker;
    $("#pageTitle").textContent = def.title;
    $$(".nav-item").forEach(function (b) {
      b.classList.toggle("active", b.dataset.route === def.id);
    });

    var html = "";
    switch (def.id) {
      case "home": html = renderHome(); break;
      case "review": html = renderReview(); break;
      case "plan": html = renderPlan(); break;
      case "exam": html = renderExam(); break;
      case "vocab": html = renderVocab(); break;
      case "memory": html = renderMemory(); break;
      case "listening": html = renderListening(); break;
      case "reading": html = renderReading(); break;
      case "translation": html = renderTranslation(); break;
      case "writing": html = renderWriting(); break;
      case "stats": html = renderStats(); break;
      case "settings": html = renderSettings(); break;
    }
    // 重建容器，同时清掉旧的事件监听，避免重复绑定
    var old = $("#view");
    var fresh = old.cloneNode(false);
    old.parentNode.replaceChild(fresh, old);
    fresh.innerHTML = html;

    window.scrollTo(0, keepScroll ? y : 0);
    updateChrome();

    if (def.id === "home") {
      $("#view").addEventListener("click", function (e) {
        var b = e.target.closest("[data-go]");
        if (b) navigate(b.dataset.go);
      });
    } else if (def.id === "plan") {
      mountPlan();
    } else if (def.id === "review") {
      mountReview();
    } else if (def.id === "memory") {
      mountMemory();
    } else if (def.id === "vocab") {
      mountVocab();
    } else if (def.id === "exam") {
      mountExam();
    } else if (def.id === "listening") {
      mountListening();
    } else if (def.id === "reading") {
      mountReading();
    } else if (def.id === "translation") {
      mountTranslation();
    } else if (def.id === "writing") {
      mountWriting();
    } else if (def.id === "settings") {
      mountSettings();
    }

    mountTimers();
  }

  /* ---------------- 启动 ---------------- */
  // 打乱每题的选项顺序（固定种子，保证同一份卷子每次打开顺序一致）
  function shuffleExamOptions() {
    var seed = 20260003;
    function rnd() {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    }
    EXAM.sections.forEach(function (sec) {
      sec.items.forEach(function (it) {
        var idx = it.opts.map(function (_, i) { return i; });
        for (var i = idx.length - 1; i > 0; i--) {
          var j = Math.floor(rnd() * (i + 1));
          var tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp;
        }
        var newOpts = [], newAns = 0;
        idx.forEach(function (orig, k) {
          newOpts.push(it.opts[orig]);
          if (orig === it.ans) newAns = k;
        });
        it.opts = newOpts;
        it.ans = newAns;
      });
    });
  }
  shuffleExamOptions();

  buildNav();
  window.addEventListener("hashchange", function () { render(false); });
  startReminderLoop();

  // 学习时长统计：页面可见且 3 分钟内有操作时，每分钟记 1 分钟
  var lastAct = Date.now();
  ["click", "keydown", "scroll", "touchstart"].forEach(function (ev) {
    document.addEventListener(ev, function () { lastAct = Date.now(); }, true);
  });
  setInterval(function () {
    if (document.hidden) return;
    if (Date.now() - lastAct > 180000) return;
    dayRec().minutes += 1;
    save();
  }, 60000);

  if (!location.hash) location.hash = "#home";
  render();
  updateChrome();
})();
