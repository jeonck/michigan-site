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

  // 넓은 표는 가로 스크롤 컨테이너로 감싼다 (모바일에서 페이지가 밀리지 않게)
  Array.prototype.forEach.call(document.querySelectorAll('.prose table'), function (table) {
    if (table.parentElement.classList.contains('table-scroll')) return;
    var box = document.createElement('div');
    box.className = 'table-scroll';
    table.parentNode.insertBefore(box, table);
    box.appendChild(table);
  });
})();
