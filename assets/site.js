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

/* ---------- Weather scenery + floating app icons ---------- */
(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  var mode = 'icons';
  var rainDrops = [], snowFlakes = [], clouds = [], fogBands = [];
  var sunAngle = 0, flashA = 0, nextFlash = 0;

  function codeToMode(c) {
    if (c === 0 || c === 1) return 'sunny';
    if (c === 2) return 'cloudy';
    if (c === 3) return 'overcast';
    if (c === 45 || c === 48) return 'fog';
    if (c === 95 || c === 96 || c === 99) return 'thunder';
    if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return 'rain';
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow';
    return 'cloudy';
  }

  function setupWeather(m, w, h) {
    mode = m;
    document.body.classList.add('weather-' + m);
    var i;
    if (m === 'rain' || m === 'thunder') {
      var n = Math.min(110, Math.round(w / 11));
      for (i = 0; i < n; i++) {
        rainDrops.push({
          x: Math.random() * w, y: Math.random() * h,
          len: 10 + Math.random() * 8,
          v: 9 + Math.random() * 5,
          drift: 1 + Math.random() * 1.2
        });
      }
      nextFlash = performance.now() + 3000 + Math.random() * 5000;
    }
    if (m === 'snow') {
      var s = Math.min(80, Math.round(w / 16));
      for (i = 0; i < s; i++) {
        snowFlakes.push({
          x: Math.random() * w, y: Math.random() * h,
          r: 1.2 + Math.random() * 2.2,
          v: 0.6 + Math.random() * 1.1,
          phase: Math.random() * Math.PI * 2,
          spin: 0.008 + Math.random() * 0.012
        });
      }
    }
    if (m === 'cloudy' || m === 'overcast' || m === 'rain' || m === 'thunder') {
      var counts = { cloudy: 5, overcast: 8, rain: 4, thunder: 5 };
      for (i = 0; i < counts[m]; i++) {
        clouds.push({
          x: Math.random() * w,
          y: (m === 'rain' || m === 'thunder')
            ? 20 + Math.random() * h * 0.15
            : 30 + Math.random() * h * 0.5,
          s: 0.7 + Math.random() * 1.1,
          v: 0.12 + Math.random() * 0.2
        });
      }
    }
    if (m === 'fog') {
      for (i = 0; i < 5; i++) {
        fogBands.push({
          x: Math.random() * w,
          y: (i + 0.5) * (h / 5),
          v: 0.15 + Math.random() * 0.25,
          rw: w * (0.35 + Math.random() * 0.25)
        });
      }
    }
  }

  /* preview override for testing: ?weather=sunny|cloudy|overcast|fog|rain|thunder|snow */
  var forced = /[?&]weather=(sunny|cloudy|overcast|fog|rain|thunder|snow)/.exec(location.search);
  if (forced) {
    setupWeather(forced[1], innerWidth, innerHeight);
  } else if (window.fetch) {
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
        setupWeather(codeToMode(wx.current.weather_code), innerWidth, innerHeight);
      })
      .catch(function () { /* no weather — keep the floating icons */ });
  }

  /* ----- canvas ----- */
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

  function drawIcons(alpha) {
    for (var i = 0; i < things.length; i++) {
      var t = things[i];
      var dx = t.x - mx, dy = t.y - my, d2 = dx * dx + dy * dy;
      if (d2 < 25600) {
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
      ctx.globalAlpha = alpha;
      ctx.drawImage(sp, -t.size / 2, -t.size / 2, t.size, t.size);
      ctx.restore();
    }
  }

  function drawSun() {
    sunAngle += 0.0025;
    var sx = w - 110, sy = 115, r = 36;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(sunAngle);
    ctx.strokeStyle = 'rgba(240, 172, 50, 0.55)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (var i = 0; i < 12; i++) {
      var a = (i / 12) * 6.2832;
      ctx.moveTo(Math.cos(a) * (r + 12), Math.sin(a) * (r + 12));
      ctx.lineTo(Math.cos(a) * (r + 24), Math.sin(a) * (r + 24));
    }
    ctx.stroke();
    ctx.restore();
    var g = ctx.createRadialGradient(sx, sy, 4, sx, sy, r + 6);
    g.addColorStop(0, 'rgba(246, 190, 70, 0.85)');
    g.addColorStop(1, 'rgba(246, 190, 70, 0.15)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, 6.2832);
    ctx.fill();
  }

  function drawClouds() {
    var col = mode === 'thunder' ? 'rgba(92, 102, 122, 0.35)'
      : mode === 'overcast' ? 'rgba(130, 140, 158, 0.3)'
      : 'rgba(150, 160, 178, 0.26)';
    ctx.fillStyle = col;
    for (var i = 0; i < clouds.length; i++) {
      var c = clouds[i];
      c.x += c.v;
      if (c.x - 60 * c.s > w) c.x = -60 * c.s;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 24 * c.s, 0, 6.2832);
      ctx.arc(c.x + 24 * c.s, c.y + 7 * c.s, 17 * c.s, 0, 6.2832);
      ctx.arc(c.x - 23 * c.s, c.y + 8 * c.s, 15 * c.s, 0, 6.2832);
      ctx.fill();
    }
  }

  function drawFog() {
    ctx.fillStyle = 'rgba(196, 200, 210, 0.2)';
    for (var i = 0; i < fogBands.length; i++) {
      var f = fogBands[i];
      f.x += f.v;
      if (f.x - f.rw > w) f.x = -f.rw;
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, f.rw, 36, 0, 0, 6.2832);
      ctx.fill();
    }
  }

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

  function drawFlash() {
    var now = performance.now();
    if (now > nextFlash) {
      flashA = 0.16;
      nextFlash = now + 6000 + Math.random() * 9000;
    }
    if (flashA > 0.004) {
      ctx.fillStyle = 'rgba(255, 252, 235, ' + flashA + ')';
      ctx.fillRect(0, 0, w, h);
      flashA *= 0.86;
    }
  }

  function tick() {
    ctx.clearRect(0, 0, w, h);
    if (mode === 'sunny') { drawSun(); drawIcons(0.3); }
    else if (mode === 'cloudy') { drawSun(); drawClouds(); drawIcons(0.3); }
    else if (mode === 'overcast') { drawClouds(); drawIcons(0.26); }
    else if (mode === 'fog') { drawIcons(0.16); drawFog(); }
    else if (mode === 'rain') { drawClouds(); drawRain(); }
    else if (mode === 'thunder') { drawClouds(); drawRain(); drawFlash(); }
    else if (mode === 'snow') { drawSnow(); }
    else { drawIcons(0.3); }
    requestAnimationFrame(tick);
  }
  tick();
})();

/* ---------- Little runner: chases the pointer on desktop, walks with scroll on touch.
   In rain/thunder/snow he shelters under page elements when idle; in sunshine he sunbathes. ---------- */
(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

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
    '<g class="shades"><line x1="7.4" y1="4.4" x2="16.6" y2="4.4"/><circle cx="10.2" cy="4.8" r="1.5"/><circle cx="13.8" cy="4.8" r="1.5"/></g>' +
    '</svg>';
  document.body.appendChild(man);

  function badWeather() {
    var c = document.body.classList;
    return c.contains('weather-rain') || c.contains('weather-thunder') || c.contains('weather-snow');
  }

  function isSunny() {
    return document.body.classList.contains('weather-sunny');
  }

  function findShelter(px, py) {
    var els = document.querySelectorAll('.app-card, .feature, .value, .btn, .download-band, .faq details, .app-icon, h1, .section-title, .nav');
    var best = null, bestD = Infinity;
    for (var i = 0; i < els.length; i++) {
      var r = els[i].getBoundingClientRect();
      if (r.width < 50 || r.bottom < 70) continue;
      var sy = r.bottom + 38; /* his feet land here; head tucks just under the ledge */
      if (sy > innerHeight - 6) continue;
      var sx = Math.max(r.left + 14, Math.min(px, r.right - 14));
      var d = (sx - px) * (sx - px) + (sy - py) * (sy - py);
      if (d < bestD) { bestD = d; best = { x: sx, y: sy }; }
    }
    return best;
  }

  if (window.matchMedia('(pointer: fine)').matches) {
    /* desktop: he chases the mouse pointer */
    var x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, dir = 1;
    var lastPointer = 0, shelter = null, lastShelterCalc = 0;

    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      lastPointer = Date.now();
      man.style.opacity = '1';
    });
    document.documentElement.addEventListener('mouseleave', function () { man.style.opacity = '0'; });

    (function chase() {
      var now = Date.now();
      var gx = tx, gy = ty;
      var sunbathing = false;
      if (badWeather() && now - lastPointer > 1400) {
        if (!shelter || now - lastShelterCalc > 450) {
          shelter = findShelter(x, y) || shelter;
          lastShelterCalc = now;
        }
        if (shelter) { gx = shelter.x; gy = shelter.y; }
      } else {
        shelter = null;
        if (isSunny() && now - lastPointer > 2500) {
          /* nice weather, nothing to chase — time for a sunbath */
          gx = x; gy = y;
          sunbathing = true;
        }
      }
      var dx = gx - x, dy = gy - y;
      x += dx * 0.07;
      y += dy * 0.07;
      var speed = Math.abs(dx) + Math.abs(dy);
      if (Math.abs(dx) > 1) dir = dx > 0 ? 1 : -1;
      man.classList.toggle('moving', speed > 8);
      man.classList.toggle('sunbathe', sunbathing && speed < 2);
      man.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-110%) scaleX(' + dir + ')';
      requestAnimationFrame(chase);
    })();
  } else {
    /* touch: he walks along the bottom edge as you scroll (left = top of page,
       right = bottom, a living progress bar). When you stop scrolling he reacts
       to the weather: shelters under a card in rain/snow, sunbathes in sunshine. */
    var wx = 16, wy = window.innerHeight - 8, wdir = 1;
    var lastY = window.scrollY, lastMove = 0;
    var mShelter = null, mShelterCalc = 0;
    man.style.opacity = '1';

    function walkTarget() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? window.scrollY / max : 0;
      return 16 + p * (window.innerWidth - 32);
    }
    wx = walkTarget();

    window.addEventListener('scroll', function () {
      var s = window.scrollY;
      if (Math.abs(s - lastY) > 1) wdir = s >= lastY ? 1 : -1;
      lastY = s;
      lastMove = Date.now();
    }, { passive: true });

    (function walk() {
      var now = Date.now();
      var idleFor = now - lastMove;
      var gx, gy;
      if (idleFor > 2500 && badWeather()) {
        /* rain or snow and the reader has settled — run for cover */
        if (!mShelter || now - mShelterCalc > 600) {
          mShelter = findShelter(wx, wy) || mShelter;
          mShelterCalc = now;
        }
      } else {
        mShelter = null;
      }
      if (mShelter) { gx = mShelter.x; gy = mShelter.y; }
      else { gx = walkTarget(); gy = window.innerHeight - 8; }

      var dx = gx - wx, dy = gy - wy;
      wx += dx * 0.1;
      wy += dy * 0.1;
      if (Math.abs(dx) > 1) wdir = dx > 0 ? 1 : -1;
      var moving = Math.abs(dx) + Math.abs(dy) > 1.6 || idleFor < 140;
      man.classList.toggle('moving', moving);
      /* on a lazy sunny day with no scrolling, he lies down for a sunbath */
      man.classList.toggle('sunbathe', !moving && idleFor > 3000 && isSunny());
      man.style.transform = 'translate(' + wx + 'px,' + wy + 'px) translate(-50%,-100%) scaleX(' + wdir + ')';
      requestAnimationFrame(walk);
    })();
  }
})();
