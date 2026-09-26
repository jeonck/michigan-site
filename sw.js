// 서비스 워커 — 오프라인에서 "봤던 페이지" 를 열 수 있게, 두 번째 방문부터 자산을 빨리.
//
// 원칙: HTML 은 network-first. 이 사이트의 핵심은 매일 갱신되는 이벤트·마감 공지라,
// 낡은 페이지가 캐시에서 뜨는 것이 최악의 실패다. 온라인이면 항상 서버 것을 쓰고,
// 실패했을 때만 캐시(그것도 없으면 /offline/). CSS·JS·글꼴·이미지만 캐시로 먼저
// 그리고 뒤에서 갱신한다(stale-while-revalidate).
//
// 캐시 이름에 빌드 시각이 들어가 배포마다 옛 캐시를 통째로 버린다 — build.py 가 채운다.
var VERSION = '20260926191317';
var CACHE = 'site-' + VERSION;
var OFFLINE = '/offline/';
var PRECACHE = [OFFLINE, '/assets/css/site.css', '/assets/js/site.js', '/assets/img/logo.svg'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(PRECACHE); }).then(function () {
    return self.skipWaiting();
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // 같은 출처의 문서·자산만. 분석·날씨·CDN 글꼴은 브라우저에 맡긴다.
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') !== -1) {
    e.respondWith(fetch(req).then(function (res) {
      // clone 은 응답을 돌려주기 전에 — 나중에 하면 본문이 이미 소비돼 있다
      if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) { return hit || caches.match(OFFLINE); });
    }));
    return;
  }

  // 매일 바뀌는 JSON(휴교 등)은 캐시하지 않는다.
  if (url.pathname.endsWith('.json')) return;

  if (url.pathname.indexOf('/assets/') === 0) {
    e.respondWith(caches.open(CACHE).then(function (c) {
      return c.match(req).then(function (hit) {
        var refresh = fetch(req).then(function (res) {
          if (res.ok) c.put(req, res.clone());
          return res;
        }).catch(function () { return hit; });
        return hit || refresh;
      });
    }));
  }
});