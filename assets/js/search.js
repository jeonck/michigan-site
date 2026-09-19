// 클라이언트 검색. 인덱스는 빌드 시 생성된 정적 JSON 이고 외부로 나가는 요청이 없다.
(function () {
  'use strict';

  var input = document.getElementById('q');
  var out = document.getElementById('search-results');
  var status = document.getElementById('search-status');
  if (!input || !out) return;

  var docs = null;
  var pending = null;

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function snippet(text, terms) {
    var lower = text.toLowerCase();
    var i = -1;
    for (var k = 0; k < terms.length; k++) {
      var p = lower.indexOf(terms[k]);
      if (p !== -1 && (i === -1 || p < i)) i = p;
    }
    var raw = i === -1
      ? text.slice(0, 130) + '…'
      : (i > 45 ? '…' : '') + text.slice(Math.max(0, i - 45), i + 135) + '…';
    var safe = escapeHtml(raw);
    var re = new RegExp(terms.map(escapeRe).join('|'), 'gi');
    return safe.replace(re, function (m) { return '<mark>' + m + '</mark>'; });
  }

  // 제목 > 설명 > 태그 > 본문 순으로 가중치를 준다.
  var WEIGHT = [100, 50, 40, 20];

  function haystacks(doc) {
    return [
      doc.t.toLowerCase(),
      (doc.d || '').toLowerCase(),
      (doc.g || []).join(' ').toLowerCase(),
      (doc.b || '').toLowerCase()
    ];
  }

  // 띄어쓴 단어는 모두 들어 있어야 한다. 예전에는 검색어를 통째로 한 문자열로
  // 찾아서 "운전면허 예약" 처럼 두 단어가 떨어져 있는 문서를 놓쳤다.
  function score(doc, terms) {
    var fields = haystacks(doc);
    var total = 0;
    for (var i = 0; i < terms.length; i++) {
      var best = 0;
      for (var j = 0; j < fields.length; j++) {
        var at = fields[j].indexOf(terms[i]);
        if (at !== -1) { best = Math.max(1, WEIGHT[j] - (j === 0 ? at : 0)); break; }
      }
      if (!best) return 0;
      total += best;
    }
    return total;
  }

  function render(q) {
    if (!docs) return;
    var terms = q.split(/\s+/).filter(function (t) { return t; });
    if (!terms.length) {
      out.innerHTML = '';
      status.textContent = '검색어를 입력하세요.';
      return;
    }
    var hits = docs
      .map(function (d) { return { d: d, s: score(d, terms) }; })
      .filter(function (h) { return h.s > 0; })
      .sort(function (a, b) { return b.s - a.s; })
      .slice(0, 30);

    if (!hits.length) {
      out.innerHTML = '';
      status.textContent = '"' + q + '" 에 대한 결과가 없습니다.';
      return;
    }
    status.textContent = hits.length + '건 찾았습니다.';
    out.innerHTML = hits.map(function (h) {
      var d = h.d;
      var body = (d.b || '').toLowerCase();
      var inBody = terms.some(function (t) { return body.indexOf(t) !== -1; });
      return '<li><span class="hit-cat">' + escapeHtml(d.c) + '</span>' +
        '<h3><a href="' + escapeHtml(d.u) + '">' + escapeHtml(d.t) + '</a></h3>' +
        '<p class="muted">' + snippet(inBody ? d.b : (d.d || d.t), terms) + '</p></li>';
    }).join('');
  }

  function load() {
    if (docs || pending) return pending;
    status.textContent = '검색 인덱스를 불러오는 중…';
    pending = fetch('/search-index.json')
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(function (json) {
        docs = json;
        render(input.value.trim().toLowerCase());
      })
      .catch(function () {
        status.textContent = '검색 인덱스를 불러오지 못했습니다. 새로고침해 보세요.';
      });
    return pending;
  }

  input.addEventListener('input', function () {
    var q = input.value.trim().toLowerCase();
    if (!docs) { load().then(function () { render(q); }); return; }
    render(q);
  });

  // 주소창의 ?q= 를 지원해 링크로 검색 결과를 공유할 수 있게 한다.
  var initial = new URLSearchParams(location.search).get('q');
  if (initial) { input.value = initial; load(); }
})();
