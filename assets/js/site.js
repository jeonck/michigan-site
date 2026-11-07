// 테마 토글과 모바일 메뉴. 저장 실패(프라이빗 모드 등)해도 화면은 정상 동작한다.
(function () {
  'use strict';

  var root = document.documentElement;

  function store(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* 저장만 실패, 무시 */ }
  }

  function currentTheme() {
    if (root.dataset.theme) return root.dataset.theme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  var toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      store('theme', next);
    });
  }

  var menuBtn = document.getElementById('menu-toggle');
  var menu = document.getElementById('mobile-nav');
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () {
      var open = menu.hidden;
      menu.hidden = !open;
      menuBtn.setAttribute('aria-expanded', String(open));
    });
  }

  // 이벤트 페이지의 즉시 거르기
  var filter = document.getElementById('event-filter');
  var list = document.getElementById('event-cards');
  var none = document.getElementById('event-none');
  if (filter && list) {
    filter.addEventListener('input', function () {
      var q = filter.value.trim().toLowerCase();
      var shown = 0;
      Array.prototype.forEach.call(list.children, function (li) {
        var hit = !q || (li.dataset.text || '').indexOf(q) !== -1;
        li.hidden = !hit;
        if (hit) shown++;
      });
      if (none) none.hidden = shown !== 0;
    });
  }

  // 마감 공지의 D-day 를 보는 사람의 오늘로 다시 센다. 빌드는 하루 한 번(새벽) 도는데,
  // 밤늦게 배포되면 어제 마감된 공지가 다음 빌드까지 남아 있었다. 지난 것은 숨긴다.
  var band = document.getElementById('notice-band');
  if (band) {
    var now = new Date();
    var today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    var left = 0;
    Array.prototype.forEach.call(band.querySelectorAll('.notice[data-deadline]'), function (li) {
      var p = li.getAttribute('data-deadline').split('-');
      var days = Math.round((Date.UTC(+p[0], +p[1] - 1, +p[2]) - today) / 86400000);
      if (days < 0) { li.hidden = true; return; }
      left++;
      var dd = li.querySelector('.dday');
      if (dd) dd.textContent = days === 0 ? '오늘 마감' : 'D-' + days;
      li.classList.toggle('notice-urgent', days <= 14);
    });
    if (!left) band.hidden = true;
  }

  // 넓은 표는 가로 스크롤 컨테이너로 감싼다 (모바일에서 페이지가 밀리지 않게)
  Array.prototype.forEach.call(document.querySelectorAll('.prose table'), function (table) {
    if (table.parentElement.classList.contains('table-scroll')) return;
    var box = document.createElement('div');
    box.className = 'table-scroll';
    table.parentNode.insertBefore(box, table);
    box.appendChild(table);
  });
})();
