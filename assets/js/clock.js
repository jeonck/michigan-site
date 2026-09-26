// 홈 화면의 시간대 시계.
//
// 서버가 찍어 둔 값은 빌드 시각이라 금방 낡는다. 시간대 목록과 기준 시간대는
// HTML 의 data 속성에서 읽고(= data/site.yaml 이 유일한 출처), 실제 시각만
// 브라우저에서 1초마다 다시 계산한다.
//
// 서머타임은 직접 계산하지 않는다. Intl 에 IANA 시간대 이름을 넘기면
// 브라우저의 시간대 데이터베이스가 그 날짜의 규칙을 적용해 준다.
// 애리조나처럼 서머타임을 쓰지 않는 곳도 이 방식이면 저절로 맞는다.
(function () {
  var root = document.getElementById('clocks');
  if (!root || typeof Intl === 'undefined' || !Intl.DateTimeFormat) return;

  var baseTz = root.getAttribute('data-base-tz');
  if (!baseTz) return;

  var KO_WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];
  var DAY_LABEL = { '-1': '어제', '0': '', '1': '내일' };

  // Intl 포맷터는 만드는 비용이 있으니 시간대마다 한 번만 만들어 둔다.
  function makeFormatter(tz) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      weekday: 'short', timeZoneName: 'short'
    });
  }

  // formatToParts 로 쪼개면 로캘 표기 차이에 휘둘리지 않는다.
  function readParts(fmt, when) {
    var out = {};
    fmt.formatToParts(when).forEach(function (part) { out[part.type] = part.value; });
    return out;
  }

  // 그 시간대의 벽시계 시각을 UTC 타임스탬프처럼 만들어 시차 계산에 쓴다.
  function wallClock(parts) {
    return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  }

  var items = [];
  Array.prototype.forEach.call(root.querySelectorAll('.clock'), function (el) {
    var tz = el.getAttribute('data-tz');
    if (!tz) return;
    try {
      items.push({
        el: el,
        tz: tz,
        base: tz === baseTz,
        fmt: makeFormatter(tz),
        time: el.querySelector('[data-role="time"]'),
        date: el.querySelector('[data-role="date"]'),
        day: el.querySelector('[data-role="day"]'),
        offset: el.querySelector('[data-role="offset"]')
      });
    } catch (err) {
      // 브라우저가 모르는 시간대면 서버가 찍어 둔 값을 그대로 둔다.
    }
  });
  if (!items.length) return;

  function set(node, text) {
    if (node && node.textContent !== text) node.textContent = text;
  }

  function tick() {
    var now = new Date();
    var parsed = items.map(function (item) {
      return { item: item, parts: readParts(item.fmt, now) };
    });

    var base = null;
    parsed.forEach(function (row) { if (row.item.base) base = row; });
    if (!base) base = parsed[0];
    var baseWall = wallClock(base.parts);
    var baseDay = Date.UTC(+base.parts.year, +base.parts.month - 1, +base.parts.day);

    parsed.forEach(function (row) {
      var p = row.parts;
      var item = row.item;

      set(item.time, p.hour + ':' + p.minute);

      var when = new Date(Date.UTC(+p.year, +p.month - 1, +p.day));
      set(item.date, p.month + '/' + p.day + '(' + KO_WEEKDAY[when.getUTCDay()] + ')');

      var gap = Math.round((when.getTime() - baseDay) / 86400000);
      set(item.day, DAY_LABEL[String(gap)] || '');

      if (item.base) {
        set(item.offset, '기준');
      } else {
        var hours = (wallClock(p) - baseWall) / 3600000;
        // 30분·45분 단위 시간대가 있으므로 정수로 반올림하지 않는다.
        var rounded = Math.round(hours * 100) / 100;
        var shown = rounded % 1 === 0 ? String(rounded) : String(rounded);
        set(item.offset, (rounded >= 0 ? '+' : '') + shown + '시간');
      }

      if (item.time) {
        item.time.setAttribute('datetime', p.year + '-' + p.month + '-' + p.day +
          'T' + p.hour + ':' + p.minute);
        item.time.setAttribute('title', p.timeZoneName || item.tz);
      }
    });
  }

  tick();
  var timer = setInterval(tick, 1000);

  // 탭이 가려져 있는 동안은 굳이 돌리지 않는다.
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      clearInterval(timer);
    } else {
      tick();
      timer = setInterval(tick, 1000);
    }
  });
})();

// 시계 밑 현재 날씨. Open-Meteo(무료·키 없음·CORS 허용) 한 번 호출로 모든 칸을 채운다.
// 실패하면 그 줄만 빈 채로 둔다 — 시계는 날씨와 무관하게 돈다.
(function () {
  var root = document.getElementById('clocks');
  if (!root || !window.fetch) return;
  var boxes = Array.prototype.filter.call(root.querySelectorAll('.clock[data-lat]'), function (el) {
    return el.querySelector('[data-role="weather"]');
  });
  if (!boxes.length) return;

  // WMO 날씨 코드 → [이모지, 한국어]. Open-Meteo 문서의 코드 표를 그대로 옮겼다.
  var WMO = {
    0: ['☀️', '맑음'], 1: ['🌤️', '대체로 맑음'], 2: ['⛅', '구름 조금'], 3: ['☁️', '흐림'],
    45: ['🌫️', '안개'], 48: ['🌫️', '안개'],
    51: ['🌦️', '이슬비'], 53: ['🌦️', '이슬비'], 55: ['🌧️', '이슬비'],
    56: ['🌧️', '언 이슬비'], 57: ['🌧️', '언 이슬비'],
    61: ['🌧️', '비'], 63: ['🌧️', '비'], 65: ['🌧️', '강한 비'],
    66: ['🌧️', '언 비'], 67: ['🌧️', '언 비'],
    71: ['🌨️', '눈'], 73: ['🌨️', '눈'], 75: ['❄️', '강한 눈'], 77: ['🌨️', '싸락눈'],
    80: ['🌦️', '소나기'], 81: ['🌧️', '소나기'], 82: ['⛈️', '강한 소나기'],
    85: ['🌨️', '눈 소나기'], 86: ['❄️', '눈 소나기'],
    95: ['⛈️', '뇌우'], 96: ['⛈️', '우박 뇌우'], 99: ['⛈️', '우박 뇌우']
  };
  var NIGHT = { 0: '🌙', 1: '🌙', 2: '☁️' };

  var url = 'https://api.open-meteo.com/v1/forecast' +
    '?latitude=' + boxes.map(function (b) { return b.getAttribute('data-lat'); }).join(',') +
    '&longitude=' + boxes.map(function (b) { return b.getAttribute('data-lon'); }).join(',') +
    '&current=temperature_2m,weather_code,is_day&timezone=auto';

  fetch(url).then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); }).then(function (data) {
    var rows = Array.isArray(data) ? data : [data];
    rows.forEach(function (row, i) {
      var cur = row && row.current;
      var box = boxes[i];
      if (!cur || !box || typeof cur.temperature_2m !== 'number') return;
      var w = WMO[cur.weather_code] || ['🌡️', ''];
      var icon = cur.is_day === 0 && NIGHT[cur.weather_code] ? NIGHT[cur.weather_code] : w[0];
      var c = Math.round(cur.temperature_2m);
      var f = Math.round(cur.temperature_2m * 9 / 5 + 32);
      var node = box.querySelector('[data-role="weather"]');
      node.textContent = '';
      node.appendChild(document.createTextNode(icon + ' ' + c + '°C ' + w[1] + ' '));
      var small = document.createElement('small');
      small.textContent = f + '°F';
      node.appendChild(small);
      node.setAttribute('title', 'Open-Meteo, ' + cur.time.replace('T', ' ') + ' 현지 기준');
    });
  }).catch(function () { /* 날씨는 장식 — 조용히 비워 둔다 */ });
})();
