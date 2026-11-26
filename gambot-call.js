
(function () {

  if (window.__gambotCallLoaded) return;

  window.__gambotCallLoaded = true;

  var C = {"api":"https://gambot.azurewebsites.net","org":"570067264","id":"mmeyJuL9cdRgxIvgDLqN","tel":"0747066620","display":"074-7066620","launcher":false,"iconOnly":false,"size":"md","color":"#2e6155","iconColor":"#ffffff","position":"right","anim":"float","teaser":"התקשרו אלינו","title":"התקשרו אלינו","callText":"חיוג עכשיו","trackTel":true,"lang":"auto","delay":0,"bottom":0,"side":0};

  var TXT = {

    he: { call: 'חיוג עכשיו', copy: 'העתקת המספר', copied: 'הועתק', close: 'סגירה', title: 'התקשרו אלינו', hint: 'לחצו על הכפתור כדי להתקשר מהנייד, או חייגו את המספר.' },

    en: { call: 'Call now', copy: 'Copy number', copied: 'Copied', close: 'Close', title: 'Call us', hint: 'Tap the button to call from your phone, or dial the number.' }

  };

  var lang = C.lang;

  if (lang !== 'he' && lang !== 'en') {

    lang = String(document.documentElement.lang || navigator.language || 'en').toLowerCase().indexOf('he') === 0 ? 'he' : 'en';

  }

  var T = TXT[lang];

  var rtl = lang === 'he';

  function digits(s) { return String(s || '').replace(/\D/g, ''); }

  var telDigits = digits(C.tel);

  function sameNumber(href) {

    var d = digits(href);

    return !!d && !!telDigits && d.slice(-9) === telDigits.slice(-9);

  }

  function store(kind) { try { return window[kind]; } catch (e) { return null; } }

  function visitorId() {

    var ls = store('localStorage'), id = '';

    try { id = ls ? ls.getItem('gambot_vid') : ''; } catch (e) {}

    if (!id) {

      id = Math.random().toString(36).slice(2) + Date.now().toString(36);

      try { if (ls) ls.setItem('gambot_vid', id); } catch (e) {}

    }

    return id;

  }

  var KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];

  function attribution() {

    var out = {}, found = false, ss = store('sessionStorage');

    try {

      var q = new URLSearchParams(location.search);

      for (var i = 0; i < KEYS.length; i++) {

        var v = q.get(KEYS[i]);

        if (v) { out[KEYS[i]] = v; found = true; }

      }

    } catch (e) {}

    try {

      if (found) { if (ss) ss.setItem('gambot_utm', JSON.stringify(out)); }

      else if (ss && ss.getItem('gambot_utm')) out = JSON.parse(ss.getItem('gambot_utm')) || {};

    } catch (e) {}

    return out;

  }

  function report(type, label) {

    try {

      var body = JSON.stringify({

        org: C.org, widgetId: C.id, clickType: type, label: label || '',

        page: location.href, title: document.title, referrer: document.referrer,

        visitorId: visitorId(), utm: attribution(), lang: lang

      });

      var url = C.api + '/api/webhooks/website-call/click';

      if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }))) return;

      fetch(url, { method: 'POST', body: body, headers: { 'Content-Type': 'text/plain' }, keepalive: true });

    } catch (e) {}

  }

 

  var host = null, root = null, card = null, mounted = false;

  var coarse = false;

  try { coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch (e) {}

  var SIZES = { sm: 48, md: 58, lg: 68 };

  var PHONE_SVG = '<svg viewBox="0 0 24 24" width="55%" height="55%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';

 

  function mount() {

    if (mounted) return;

    mounted = true;

    host = document.createElement('div');

    host.setAttribute('data-gambot-call-root', '');

    root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

    var px = SIZES[C.size] || 58;

    var side = C.position === 'left' ? 'left' : 'right';

    var css =

      ':host{all:initial}' +

      '*{box-sizing:border-box;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}' +

      '.fab{position:fixed;bottom:' + (20 + C.bottom) + 'px;' + side + ':' + (20 + C.side) + 'px;z-index:2147483000;display:flex;align-items:center;gap:10px;flex-direction:' + (side === 'left' ? 'row' : 'row-reverse') + '}' +

      '.btn{width:' + px + 'px;height:' + px + 'px;border-radius:50%;border:0;cursor:pointer;background:' + C.color + ';color:' + C.iconColor + ';display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(0,0,0,.25);padding:0}' +

      '.btn:focus-visible{outline:3px solid #fff;outline-offset:2px;box-shadow:0 0 0 5px ' + C.color + '}' +

      '.tease{background:#fff;color:#111;padding:8px 14px;border-radius:18px;font-size:14px;box-shadow:0 4px 14px rgba(0,0,0,.18);max-width:220px;direction:' + (rtl ? 'rtl' : 'ltr') + '}' +

      '.ov{position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.35);display:none;align-items:center;justify-content:center;padding:16px}' +

      '.ov.on{display:flex}' +

      '.card{background:#fff;color:#111;border-radius:16px;width:100%;max-width:340px;padding:22px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.35);direction:' + (rtl ? 'rtl' : 'ltr') + ';position:relative}' +

      '.card h3{margin:0 0 6px;font-size:18px}' +

      '.card p{margin:0 0 14px;font-size:13px;color:#555}' +

      '.num{display:block;direction:ltr;font-size:26px;font-weight:700;letter-spacing:.5px;margin:6px 0 16px;color:' + C.color + ';text-decoration:none}' +

      '.row{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}' +

      '.act{flex:1 1 120px;border:0;border-radius:10px;padding:11px 14px;font-size:15px;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block;color:' + C.iconColor + ';background:' + C.color + '}' +

      '.act.alt{background:#eef0f2;color:#222}' +

      '.x{position:absolute;top:8px;' + (rtl ? 'left' : 'right') + ':10px;border:0;background:none;font-size:22px;line-height:1;cursor:pointer;color:#666}';

    if (C.anim !== 'none') {

      css += '@media (prefers-reduced-motion:no-preference){.btn{animation:p 2.4s ease-out infinite}@keyframes p{0%{box-shadow:0 6px 18px rgba(0,0,0,.25),0 0 0 0 ' + C.color + '66}70%{box-shadow:0 6px 18px rgba(0,0,0,.25),0 0 0 16px ' + C.color + '00}100%{box-shadow:0 6px 18px rgba(0,0,0,.25),0 0 0 0 ' + C.color + '00}}}';

    }

    var style = document.createElement('style');

    style.textContent = css;

    root.appendChild(style);

 

    var shownNumber = C.display || C.tel;

    var ov = document.createElement('div');

    ov.className = 'ov';

    ov.innerHTML =

      '<div class="card" role="dialog" aria-modal="true" aria-label="' + T.title + '">' +

      '<button class="x" type="button" aria-label="' + T.close + '">&times;</button>' +

      '<h3></h3><p>' + T.hint + '</p>' +

      '<a class="num" href=tel:' + C.tel.replace(/[^+\d]/g, '') + '></a>' +

      '<div class="row"><a class="act call" href=tel:' + C.tel.replace(/[^+\d]/g, '') + '></a>' +

      '<button class="act alt copy" type="button"></button></div></div>';

    root.appendChild(ov);

    ov.querySelector('h3').textContent = C.title || T.title;

    ov.querySelector('.num').textContent = shownNumber;

    ov.querySelector('.call').textContent = C.callText || T.call;

    ov.querySelector('.copy').textContent = T.copy;

    card = ov;

    var cur = { type: 'widget', label: '' };

    ov.addEventListener('click', function (e) { if (e.target === ov) ov.classList.remove('on'); });

    ov.querySelector('.x').addEventListener('click', function () { ov.classList.remove('on'); });

    ov.querySelector('.call').addEventListener('click', function () { report(cur.type, cur.label); });

    ov.querySelector('.num').addEventListener('click', function () { report(cur.type, cur.label); });

    ov.querySelector('.copy').addEventListener('click', function () {

      var b = this;

      report(cur.type, cur.label);

      try { navigator.clipboard.writeText(C.tel); } catch (e) {}

      b.textContent = T.copied;

      setTimeout(function () { b.textContent = T.copy; }, 1800);

    });

    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') ov.classList.remove('on'); });

    ov._cur = cur;

 

    if (C.launcher) {

      var fab = document.createElement('div');

      fab.className = 'fab';

      var btn = document.createElement('button');

      btn.type = 'button';

      btn.className = 'btn';

      btn.setAttribute('aria-label', C.callText || T.call);

      btn.innerHTML = PHONE_SVG;

      btn.addEventListener('click', function () { openCall('widget', 'launcher'); });

      fab.appendChild(btn);

      if (C.teaser && !C.iconOnly) {

        var t = document.createElement('div');

        t.className = 'tease';

        t.textContent = C.teaser;

        fab.appendChild(t);

      }

      root.appendChild(fab);

    }

    document.body.appendChild(host);

  }

 

  function openCall(type, label) {

    mount();

    if (coarse) {

      report(type, label);

      location.href = 'tel:' + C.tel.replace(/[^+\d]/g, '');

      return;

    }

    card._cur.type = type;

    card._cur.label = label || '';

    card.classList.add('on');

  }

 

  document.addEventListener('click', function (e) {

    var t = e.target;

    var el = t && t.closest ? t.closest('[data-gambot-call],a[href^=tel:]') : null;

    if (!el || (host && host.contains(el))) return;

    var href = el.getAttribute('href') || '';

    var isTel = el.tagName === 'A' && /^tel:/i.test(href);

    var marked = el.hasAttribute('data-gambot-call');

    var label = String(el.getAttribute('data-gambot-call') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100);

    if (marked) {

      if (isTel) { report('element', label); return; }

      e.preventDefault();

      openCall('element', label);

    } else if (C.trackTel && isTel && sameNumber(href)) {

      report('tel_link', label);

    }

  }, true);

 

  window.GambotCall = { open: function (label) { openCall('element', label || 'api'); }, number: C.tel };

 

  function init() {

    if (C.launcher) setTimeout(mount, C.delay * 1000);

  }

  if (document.body) init(); else document.addEventListener('DOMContentLoaded', init);

})();

