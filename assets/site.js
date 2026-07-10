/* GhostGram Labs — living page bits */

/* ---------- Cookie consent (Google Consent Mode) ---------- */
(function () {
  var KEY = 'gg-consent';

  function grant() {
    if (typeof gtag === 'function') {
      gtag('consent', 'update', { analytics_storage: 'granted' });
    }
  }

  function showBanner() {
    if (document.querySelector('.consent')) return;
    var el = document.createElement('div');
    el.className = 'consent';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Cookie consent');
    el.innerHTML =
      '<p><strong>Can I count your visit?</strong> This site uses Google Analytics to see how many people visit and from which country. No ads, nothing sold. <a href="/privacy.html">Details</a></p>' +
      '<div class="consent-actions">' +
      '<button type="button" class="btn btn-primary consent-yes">Sure, count me</button>' +
      '<button type="button" class="btn btn-ghost consent-no">No thanks</button>' +
      '</div>';
    document.body.appendChild(el);
    el.querySelector('.consent-yes').addEventListener('click', function () {
      try { localStorage.setItem(KEY, 'granted'); } catch (e) {}
      grant();
      el.remove();
    });
    el.querySelector('.consent-no').addEventListener('click', function () {
      try { localStorage.setItem(KEY, 'denied'); } catch (e) {}
      el.remove();
    });
  }

  /* let the privacy page reopen the banner */
  window.ggCookieSettings = function () {
    try { localStorage.removeItem(KEY); } catch (e) {}
    showBanner();
  };

  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  if (saved === 'granted') { grant(); }
  else if (saved !== 'denied') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBanner);
    } else {
      showBanner();
    }
  }
})();

(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Weather mode: rain/snow at the visitor's location changes the scenery ---------- */
  var weatherMode = 'icons';
  var rainDrops = [], snowFlakes = [];

  function setupWeather(mode, w, h) {
    weatherMode = mode;
    document.body.classList.add('weather-' + mode);
    if (mode === 'rain') {
      var n = Math.min(110, Math.round(w / 11));
      for (var i = 0; i < n; i++) {
        rainDrops.push({
          x: Math.random() * w, y: Math.random() * h,
          len: 10 + Math.random() * 8,
          v: 9 + Math.random() * 5,
          drift: 1 + Math.random() * 1.2
        });
      }
    } else if (mode === 'snow') {
      var m = Math.min(80, Math.round(w / 16));
      for (var j = 0; j < m; j++) {
        snowFlakes.push({
          x: Math.random() * w, y: Math.random() * h,
          r: 1.2 + Math.random() * 2.2,
          v: 0.6 + Math.random() * 1.1,
          phase: Math.random() * Math.PI * 2,
          spin: 0.008 + Math.random() * 0.012
        });
      }
    }
  }

  if (!reduced && window.fetch) {
    fetch('https://ipwho.is/?fields=success,latitude,longitude')
      .then(function (r) { return r.json(); })
      .then(function (loc) {
        if (!loc || !loc.success) return null;
        return fetch('https://api.open-meteo.com/v1/forecast?latitude=' + loc.latitude +
          '&longitude=' + loc.longitude + '&current=weather_code')
          .then(function (r) { return r.json(); });
      })
      .then(function (wx) {
        if (!wx || !wx.current) return;
        var c = wx.current.weather_code;
        var rain = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];
        var snow = [71, 73, 75, 77, 85, 86];
        if (rain.indexOf(c) > -1) setupWeather('rain', innerWidth, innerHeight);
        else if (snow.indexOf(c) > -1) setupWeather('snow', innerWidth, innerHeight);
      })
      .catch(function () { /* no weather — keep the floating icons */ });
  }

  /* ---------- App icons drifting behind the page, scattering from the pointer ---------- */
  if (!reduced) {
    var canvas = document.createElement('canvas');
    canvas.className = 'page-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);
    var ctx = canvas.getContext('2d');
    var w = 0, h = 0;

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    /* pre-render each app icon with rounded corners */
    var sprites = [];
    ['/assets/img/pettibox-icon.webp', '/assets/img/directserve-icon.webp', '/assets/img/speakalert-icon.webp']
      .forEach(function (src, i) {
        var img = new Image();
        img.onload = function () {
          var s = 96, r = 24;
          var off = document.createElement('canvas');
          off.width = s; off.height = s;
          var o = off.getContext('2d');
          o.beginPath();
          o.moveTo(r, 0); o.arcTo(s, 0, s, s, r); o.arcTo(s, s, 0, s, r);
          o.arcTo(0, s, 0, 0, r); o.arcTo(0, 0, s, 0, r); o.closePath();
          o.clip();
          o.drawImage(img, 0, 0, s, s);
          sprites[i] = off;
        };
        img.src = src;
      });

    var count = Math.max(8, Math.round((window.innerWidth * window.innerHeight) / 110000));
    if (count > 15) count = 15;
    var things = [];
    for (var i = 0; i < count; i++) {
      things.push({
        x: Math.random() * Math.max(w, 800),
        y: Math.random() * Math.max(h, 400),
        size: 30 + Math.random() * 26,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        rot: (Math.random() - 0.5) * 0.6,
        vr: (Math.random() - 0.5) * 0.004,
        idx: i % 3,
        wob: Math.random() * Math.PI * 2
      });
    }

    var mx = -9999, my = -9999;
    window.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; });
    document.documentElement.addEventListener('mouseleave', function () { mx = -9999; my = -9999; });

    function drawRain() {
      ctx.strokeStyle = 'rgba(96, 125, 158, 0.42)';
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (var i = 0; i < rainDrops.length; i++) {
        var d = rainDrops[i];
        d.y += d.v; d.x += d.drift;
        if (d.y - d.len > h) { d.y = -d.len; d.x = Math.random() * w; }
        if (d.x > w + 20) d.x = -20;
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.drift * 1.6, d.y - d.len);
      }
      ctx.stroke();
    }

    function drawSnow() {
      ctx.fillStyle = 'rgba(134, 152, 178, 0.55)';
      for (var i = 0; i < snowFlakes.length; i++) {
        var f = snowFlakes[i];
        f.phase += f.spin;
        f.y += f.v;
        f.x += Math.sin(f.phase) * 0.6;
        if (f.y - f.r > h) { f.y = -f.r; f.x = Math.random() * w; }
        if (f.x > w + 10) f.x = -10; if (f.x < -10) f.x = w + 10;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, 6.2832);
        ctx.fill();
      }
    }

    function tick() {
      ctx.clearRect(0, 0, w, h);
      if (weatherMode === 'rain') { drawRain(); requestAnimationFrame(tick); return; }
      if (weatherMode === 'snow') { drawSnow(); requestAnimationFrame(tick); return; }
      for (var i = 0; i < things.length; i++) {
        var t = things[i];
        var dx = t.x - mx, dy = t.y - my, d2 = dx * dx + dy * dy;
        if (d2 < 25600) { /* 160px — drift away from the pointer */
          var d = Math.sqrt(d2) || 1;
          t.vx += (dx / d) * 0.2;
          t.vy += (dy / d) * 0.2;
          t.vr += (Math.random() - 0.5) * 0.01;
        }
        t.wob += 0.008;
        t.vx = (t.vx + Math.cos(t.wob) * 0.005) * 0.985;
        t.vy = (t.vy + Math.sin(t.wob * 1.3) * 0.005) * 0.985;
        t.vr *= 0.99;
        t.x += t.vx; t.y += t.vy; t.rot += t.vr;
        if (t.x < -60) t.x = w + 60; if (t.x > w + 60) t.x = -60;
        if (t.y < -60) t.y = h + 60; if (t.y > h + 60) t.y = -60;
        var sp = sprites[t.idx];
        if (!sp) continue;
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(t.rot);
        ctx.globalAlpha = 0.3;
        ctx.drawImage(sp, -t.size / 2, -t.size / 2, t.size, t.size);
        ctx.restore();
      }
      requestAnimationFrame(tick);
    }
    tick();
  }

  /* ---------- Little runner: chases the pointer on desktop, walks with scroll on touch ---------- */
  if (!reduced) {
    var man = document.createElement('div');
    man.className = 'cursor-runner';
    man.setAttribute('aria-hidden', 'true');
    man.innerHTML =
      '<svg viewBox="0 0 24 34" fill="none">' +
      '<circle class="head" cx="12" cy="5" r="3.6"/>' +
      '<line class="torso" x1="12" y1="8.6" x2="12" y2="19"/>' +
      '<line class="arm a1" x1="12" y1="11.5" x2="7" y2="16"/>' +
      '<line class="arm a2" x1="12" y1="11.5" x2="17" y2="16"/>' +
      '<line class="leg l1" x1="12" y1="19" x2="8" y2="29"/>' +
      '<line class="leg l2" x1="12" y1="19" x2="16" y2="29"/>' +
      '<g class="umbrella"><line x1="16" y1="16" x2="16" y2="1.5"/>' +
      '<path class="canopy" d="M6 3.5 Q16 -6 26 3.5 Q22.7 1.4 19.3 3.5 Q16 1.4 12.7 3.5 Q9.3 1.4 6 3.5 Z"/></g>' +
      '<g class="beanie"><path d="M8.4 4.4 A3.6 3.6 0 0 1 15.6 4.4 Z"/><circle cx="12" cy="0.7" r="1.3"/></g>' +
      '</svg>';
    document.body.appendChild(man);

    if (window.matchMedia('(pointer: fine)').matches) {
      /* desktop: he chases the mouse pointer */
      var x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, dir = 1;
      window.addEventListener('pointermove', function (e) {
        tx = e.clientX; ty = e.clientY;
        man.style.opacity = '1';
      });
      document.documentElement.addEventListener('mouseleave', function () { man.style.opacity = '0'; });

      (function chase() {
        var dx = tx - x, dy = ty - y;
        x += dx * 0.07;
        y += dy * 0.07;
        var speed = Math.abs(dx) + Math.abs(dy);
        if (Math.abs(dx) > 1) dir = dx > 0 ? 1 : -1;
        man.classList.toggle('moving', speed > 8);
        man.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-110%) scaleX(' + dir + ')';
        requestAnimationFrame(chase);
      })();
    } else {
      /* touch: he walks along the bottom edge as you scroll — left edge is the
         top of the page, right edge is the bottom, so he doubles as a progress bar */
      var wx = 16, wtx = 16, wdir = 1, lastY = window.scrollY, lastMove = 0;
      man.style.opacity = '1';

      function walkTarget() {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        var p = max > 0 ? window.scrollY / max : 0;
        return 16 + p * (window.innerWidth - 32);
      }
      wtx = walkTarget(); wx = wtx;

      window.addEventListener('scroll', function () {
        var s = window.scrollY;
        if (Math.abs(s - lastY) > 1) wdir = s >= lastY ? 1 : -1;
        lastY = s;
        wtx = walkTarget();
        lastMove = Date.now();
      }, { passive: true });
      window.addEventListener('resize', function () { wtx = walkTarget(); });

      (function walk() {
        wx += (wtx - wx) * 0.1;
        var moving = Math.abs(wtx - wx) > 0.8 || Date.now() - lastMove < 140;
        man.classList.toggle('moving', moving);
        man.style.transform = 'translate(' + wx + 'px,' + (window.innerHeight - 8) + 'px) translate(-50%,-100%) scaleX(' + wdir + ')';
        requestAnimationFrame(walk);
      })();
    }
  }
})();
