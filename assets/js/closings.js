// 눈 휴교 띠. /closings.json 은 겨울 평일 아침 20분마다 갱신된다(closings.yml).
// 시즌 달에는 "휴교 없음" 도 보여주고, 시즌 밖에는 휴교가 있을 때만 보인다.
(function () {
  var box = document.getElementById('closings');
  if (!box) return;
  fetch('/closings.json', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d) return;
      var month = new Date().getMonth() + 1;
      var inSeason = (d.season_months || []).indexOf(month) >= 0;
      var list = document.getElementById('closings-list');
      var title = document.getElementById('closings-title');
      var meta = document.getElementById('closings-meta');
      var src = document.getElementById('closings-source');
      if (src && d.source) src.href = d.source;
      // 새벽 전체 배포가 옛 파일을 덮어쓸 수 있다 — 20시간 넘은 값은 "확인" 이라고 말하지 않는다.
      var ageH = d.generated_at ? (Date.now() - Date.parse(d.generated_at)) / 36e5 : Infinity;
      if (ageH > 20) {
        if (!inSeason) return;
        title.textContent = '휴교 확인 대기';
        meta.textContent = '마지막 확인 ' + d.checked_local + ' — 평일 아침 5시부터 20분마다 갱신';
        box.hidden = false;
        return;
      }
      if (d.error) {
        if (!inSeason) return;
        title.textContent = '휴교 확인 실패';
        meta.textContent = d.checked_local + ' — 학군 알림을 직접 확인하세요';
        box.hidden = false;
        return;
      }
      if (d.closings && d.closings.length) {
        title.textContent = '오늘 휴교·지연';
        meta.textContent = d.checked_local + ' 확인 · 디트로이트 광역 전체 ' + d.all_count + '곳';
        d.closings.forEach(function (c) {
          var li = document.createElement('li');
          var b = document.createElement('strong'); b.textContent = c.name_ko || c.name;
          li.appendChild(b);
          li.appendChild(document.createTextNode(' — ' + (c.status || '') + ' (' + c.name + ')'));
          list.appendChild(li);
        });
        box.classList.add('closings-active');
        box.hidden = false;
      } else if (inSeason) {
        title.textContent = '휴교 없음';
        meta.textContent = d.checked_local + ' 확인' + (d.all_count ? ' · 광역 전체로는 ' + d.all_count + '곳 휴교·지연' : '');
        box.hidden = false;
      }
    })
    .catch(function () {});
})();
