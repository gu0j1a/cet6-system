/* Service Worker：离线缓存 + 后台复习提醒 */
var CACHE = "cet6-shell-v2";
var DATA_CACHE = "cet6-data-v1";
var ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./data-vocab.js",
  "./data-content.js",
  "./data-exam.js",
  "./data-plan.js",
  "./data-memory.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/icon-180.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) {
          return k !== CACHE && k !== DATA_CACHE;
        }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        if (res && res.ok && url.origin === self.location.origin) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () {
        if (e.request.mode === "navigate") return caches.match("./index.html");
      });
    })
  );
});

/* ---------- 通知点击：聚焦或打开应用 ---------- */
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var target = (e.notification.data && e.notification.data.url) || "./index.html#review";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if (c.url.indexOf(self.registration.scope) === 0 && "focus" in c) {
          if ("navigate" in c) c.navigate(target).catch(function () { });
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});

/* ---------- 后台读取到期数据并提醒 ---------- */
function readDigest() {
  return caches.open(DATA_CACHE).then(function (c) {
    return c.match("./due.json");
  }).then(function (res) {
    return res ? res.json() : null;
  }).catch(function () { return null; });
}

function notifyFromDigest(d) {
  if (!d || !d.on) return;
  var pending = (d.due || 0) + (d.fresh || 0);
  if (!pending) return;
  var title = d.due
    ? "该复习了：今天有 " + d.due + " 个词到期"
    : "今天的词汇任务还没开始";
  var body = d.due
    ? (d.overdue ? "其中 " + d.overdue + " 个已逾期，先清掉这批。" : "大约 5 分钟能过完。")
    : "还有 " + d.fresh + " 个新词等着你。";
  return self.registration.showNotification(title, {
    body: body,
    icon: "./icons/icon-192.png",
    badge: "./icons/icon-192.png",
    tag: "cet6-review",
    data: { url: "./index.html#review" }
  });
}

self.addEventListener("periodicsync", function (e) {
  if (e.tag !== "cet6-daily-check") return;
  e.waitUntil(readDigest().then(notifyFromDigest));
});

self.addEventListener("sync", function (e) {
  if (e.tag !== "cet6-check") return;
  e.waitUntil(readDigest().then(notifyFromDigest));
});

self.addEventListener("message", function (e) {
  if (e.data && e.data.type === "check-review") {
    e.waitUntil(readDigest().then(notifyFromDigest));
  }
});
