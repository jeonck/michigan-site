// 배너 광고 계측. 화면에 절반 이상 보이면 ad_view 한 번, 누르면 ad_click.
// GA4(gtag)가 없으면 아무것도 보내지 않는다. 광고주에게는 GA4 의 이 두 이벤트를
// advertiser/ad_id/slot 파라미터로 집계해 보여준다.
(function () {
  var ads = document.querySelectorAll('a.ad[data-ad-id]');
  if (!ads.length || typeof window.gtag !== 'function') return;
  function params(el) {
    return { advertiser: el.dataset.advertiser, ad_id: el.dataset.adId, slot: el.dataset.slot,
             page_path: location.pathname };
  }
  ads.forEach(function (el) {
    el.addEventListener('click', function () { gtag('event', 'ad_click', params(el)); });
  });
  if (!('IntersectionObserver' in window)) return;
  var seen = new WeakSet();
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting && e.intersectionRatio >= 0.5 && !seen.has(e.target)) {
        seen.add(e.target);
        gtag('event', 'ad_view', params(e.target));
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  ads.forEach(function (el) { io.observe(el); });
})();
