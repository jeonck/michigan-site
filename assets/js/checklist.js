// 90일 체크리스트. 진행 상황은 이 브라우저의 localStorage 에만 남는다.
(function () {
  'use strict';

  var KEY = 'austin-checklist-v1';
  var boxes = Array.prototype.slice.call(document.querySelectorAll('input[data-task]'));
  if (!boxes.length) return;

  var panel = document.getElementById('progress');
  var fill = document.getElementById('progress-fill');
  var doneEl = document.getElementById('progress-done');
  var totalEl = document.getElementById('progress-total');
  var resetBtn = document.getElementById('progress-reset');

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function write(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 무시 */ }
  }

  function paint() {
    var done = 0;
    boxes.forEach(function (box) {
      var li = box.closest('.task');
      if (box.checked) { done++; li.classList.add('done'); } else { li.classList.remove('done'); }
    });
    var pct = boxes.length ? Math.round((done / boxes.length) * 100) : 0;
    if (fill) fill.style.width = pct + '%';
    if (doneEl) doneEl.textContent = String(done);
    if (totalEl) totalEl.textContent = String(boxes.length);
  }

  var state = read();
  boxes.forEach(function (box) {
    box.checked = !!state[box.dataset.task];
    box.addEventListener('change', function () {
      var next = read();
      if (box.checked) next[box.dataset.task] = 1; else delete next[box.dataset.task];
      write(next);
      paint();
    });
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      if (!window.confirm('체크한 항목을 모두 지웁니다. 계속할까요?')) return;
      write({});
      boxes.forEach(function (box) { box.checked = false; });
      paint();
    });
  }

  // JS 가 살아 있을 때만 진행률 UI 를 보여준다.
  if (panel) panel.hidden = false;
  paint();
})();
