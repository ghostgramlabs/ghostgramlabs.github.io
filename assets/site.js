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
    document.body.classList.add('consent-open');
    function done() { el.remove(); document.body.classList.remove('consent-open'); }
    el.querySelector('.consent-yes').addEventListener('click', function () {
      try { localStorage.setItem(KEY, 'granted'); } catch (e) {}
      grant();
      done();
    });
    el.querySelector('.consent-no').addEventListener('click', function () {
      try { localStorage.setItem(KEY, 'denied'); } catch (e) {}
      done();
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

/* ---------- Monsoon night: the rain comes and goes, a storm rolls through now and then,
   termites gather round the streetlight once it eases, and the dog under the lamp keeps watch ---------- */
(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small = window.matchMedia('(max-width: 640px)').matches;

  /* one night, on a loop: drizzle, rain, storm, easing off, then the quiet after.
     Every visit starts in a drizzle so the first thing anyone sees is the page, not a storm. */
  var PHASES = [
    { name: 'drizzle', level: 0.3, min: 15, max: 30 },
    { name: 'rain', level: 0.62, min: 15, max: 25 },
    { name: 'storm', level: 1, min: 22, max: 32 },
    { name: 'easing', level: 0.4, min: 18, max: 28 },
    { name: 'after', level: 0.12, min: 30, max: 50 }
  ];
  var phase = 0, phaseEnd = 0, level = 0.3;

  /* preview override for testing: ?rain=drizzle|rain|storm|easing|after holds that part of the night */
  var forced = /[?&]rain=(\w+)/.exec(location.search);
  if (forced) {
    for (var fi = 0; fi < PHASES.length; fi++) if (PHASES[fi].name === forced[1]) phase = fi;
    level = PHASES[phase].level;
  }

  /* ---------- the sky canvas: clouds, rain and the lightning glow, behind everything ---------- */
  var cv = document.createElement('canvas');
  cv.className = 'rain-canvas';
  cv.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(cv, document.body.firstChild);
  var cx = cv.getContext('2d');
  var W = 0, H = 0, colL = 0, colR = 0;
  var MAX_DROPS = small ? 150 : 340;
  var drops = [], clouds = [];
  var flash = 0, flashScale = 1, holdUntil = 0, nextFlash = Infinity, nextFar = Infinity, flashQueue = [], shakeAt = 0, flinchAt = -1e9, bolt = null;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    cv.width = W * dpr;
    cv.height = H * dpr;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    /* the text column: rain thins out there so reading never fights the weather */
    colL = Math.max(16, (W - 1080) / 2 + 24);
    colR = colL + Math.min(720, W - 32);
    clouds = [];
    /* drifting below the header, each at its own pace so they slide past one another */
    var n = small ? 3 : 5;
    for (var i = 0; i < n; i++) {
      clouds.push({ x: Math.random() * W, y: 95 + Math.random() * 130, s: 0.6 + Math.random() * 0.8, v: 14 + Math.random() * 18 });
    }
  }

  /* two depths: lots of fine, faint drops far off, fewer long bright ones close by */
  function newDrop(fromTop) {
    var near = Math.random() < 0.3;
    return {
      x: Math.random() * (W + 240) - 120,
      y: fromTop ? -40 - Math.random() * 80 : Math.random() * H,
      l: near ? 20 + Math.random() * 16 : 7 + Math.random() * 8,
      v: near ? 980 + Math.random() * 300 : 470 + Math.random() * 160,
      w: near ? 1.6 + Math.random() * 0.7 : 0.8 + Math.random() * 0.4,
      a: near ? 0.26 + Math.random() * 0.16 : 0.12 + Math.random() * 0.12
    };
  }

  /* a flat, hand-cut cloud: a few overlapping ovals, like paper shapes */
  function cloud(c, fill) {
    var s = c.s;
    cx.fillStyle = fill;
    cx.beginPath();
    cx.ellipse(c.x, c.y, 70 * s, 26 * s, 0, 0, 6.283);
    cx.ellipse(c.x - 46 * s, c.y + 8 * s, 42 * s, 20 * s, 0, 0, 6.283);
    cx.ellipse(c.x + 50 * s, c.y + 6 * s, 48 * s, 21 * s, 0, 0, 6.283);
    cx.ellipse(c.x + 8 * s, c.y - 18 * s, 40 * s, 24 * s, 0, 0, 6.283);
    cx.fill();
  }

  function mix(a, b, t) {
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' + Math.round(a[1] + (b[1] - a[1]) * t) + ',' + Math.round(a[2] + (b[2] - a[2]) * t) + ')';
  }

  function drawSky(dt) {
    cx.clearRect(0, 0, W, H);
    /* lightning lights the sky behind the page: a soft wash, never a hard white flash */
    if (flash > 0.01) {
      cx.fillStyle = 'rgba(255, 236, 214, ' + (flash * 0.15).toFixed(3) + ')';
      cx.fillRect(0, 0, W, H);
    }
    /* the bolt itself, far off in the sky and clear of the text */
    if (bolt && flash > 0.08) {
      cx.lineJoin = 'round';
      cx.lineCap = 'round';
      for (var bp = 0; bp < 3; bp++) {
        var ba = Math.min(1, flash);
        cx.strokeStyle = bp === 2 ? 'rgba(255, 255, 250, ' + ba.toFixed(3) + ')' : bp === 1 ? 'rgba(255, 238, 205, ' + (ba * 0.55).toFixed(3) + ')' : 'rgba(255, 196, 130, ' + (ba * 0.22).toFixed(3) + ')';
        cx.lineWidth = bp === 2 ? 2.6 : bp === 1 ? 6 : 16;
        cx.beginPath();
        for (var bi = 0; bi < bolt.length; bi++) {
          if (bolt[bi] === null) { bi++; cx.moveTo(bolt[bi][0], bolt[bi][1]); continue; }
          if (bi === 0) cx.moveTo(bolt[0][0], bolt[0][1]);
          else cx.lineTo(bolt[bi][0], bolt[bi][1]);
        }
        cx.stroke();
      }
    }
    var base = [36, 26, 46], heavy = [50, 37, 64];
    var fill = mix(base, heavy, 0.35 + level * 0.65); /* heavier rain, heavier clouds */
    if (flash > 0.01) fill = mix(heavy, [150, 128, 172], Math.min(1, flash));
    for (var i = 0; i < clouds.length; i++) {
      var c = clouds[i];
      c.x += c.v * dt * (0.5 + level);
      if (c.x - 130 * c.s > W) c.x = -130 * c.s;
      cloud(c, fill);
    }

    var want = Math.round(MAX_DROPS * level);
    while (drops.length < want) drops.push(newDrop(drops.length > 10));
    if (drops.length > want) drops.length = want;
    var wind = 0.18 + level * 0.12;
    cx.lineCap = 'round';
    for (var j = 0; j < drops.length; j++) {
      var d = drops[j];
      d.y += d.v * dt * (0.75 + level * 0.5);
      d.x -= d.v * dt * wind;
      if (d.y > H + 20 || d.x < -40) { drops[j] = newDrop(true); continue; }
      var a = d.a * (d.x > colL && d.x < colR ? 0.4 : 1);
      cx.strokeStyle = 'rgba(239, 226, 243, ' + a.toFixed(3) + ')';
      cx.lineWidth = d.w;
      cx.beginPath();
      cx.moveTo(d.x, d.y);
      cx.lineTo(d.x + d.l * wind, d.y - d.l);
      cx.stroke();
    }
  }

  /* ---------- the lamp: termites and the raindrops caught in its light ---------- */
  var lamp = document.querySelector('.lamp');
  var lc = lamp ? lamp.querySelector('.lamp-canvas') : null;
  var lx = lc ? lc.getContext('2d') : null;
  var bugs = [], litDrops = [];
  var dogMove = lamp ? lamp.querySelector('.dog-move') : null;
  var dogHead = lamp ? lamp.querySelector('.dog-head') : null;
  var dogTail = lamp ? lamp.querySelector('.dog-tail') : null;
  var BULB = [203, 80]; /* in the lamp drawing's own units (320 x 590) */

  function lampResize() {
    if (!lc) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var k = lamp.clientHeight / 590;
    lc.width = lamp.clientWidth * dpr;
    lc.height = lamp.clientHeight * dpr;
    lx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0); /* draw in drawing units from here on */
  }

  function newBug() {
    return {
      a: Math.random() * 6.283,
      r: 14 + Math.pow(Math.random(), 1.3) * 80,
      sp: (Math.random() < 0.5 ? -1 : 1) * (1.2 + Math.random() * 2.2),
      wob: Math.random() * 6.283,
      life: 0, fall: false, fx: 0, fy: 0, fv: 0
    };
  }

  function bugAt(b, t) {
    return [
      BULB[0] + Math.cos(b.a) * b.r * 1.25 + Math.sin(t * 0.004 + b.wob) * 6,
      BULB[1] + 14 + Math.sin(b.a) * b.r * 0.72 + Math.cos(t * 0.005 + b.wob) * 5
    ];
  }

  function drawBug(x, y, ang, alpha, flap) {
    lx.save();
    lx.translate(x, y);
    lx.rotate(ang);
    lx.globalAlpha = alpha;
    lx.fillStyle = 'rgba(255, 246, 228, 0.72)'; /* long see-through wings, swept back */
    lx.beginPath();
    lx.ellipse(-5, -1.3 - flap, 6.2, 1.5, -0.16 - flap * 0.12, 0, 6.283);
    lx.ellipse(-5, 1.3 + flap, 6.2, 1.5, 0.16 + flap * 0.12, 0, 6.283);
    lx.fill();
    lx.fillStyle = '#3a2614';
    lx.beginPath();
    lx.ellipse(0, 0, 2.7, 1.1, 0, 0, 6.283);
    lx.fill();
    lx.restore();
  }

  function drawLamp(t, dt) {
    if (!lx) return;
    lx.clearRect(0, 0, 320, 590);

    /* rain looks brighter where it falls through the light */
    var wantLit = Math.round((small ? 14 : 30) * level);
    while (litDrops.length < wantLit) {
      litDrops.push({ y: Math.random() * 480 + 80, u: Math.random(), v: 520 + Math.random() * 300, l: 8 + Math.random() * 10 });
    }
    if (litDrops.length > wantLit) litDrops.length = wantLit;
    lx.strokeStyle = 'rgba(255, 220, 170, 0.5)';
    lx.lineWidth = 1.3;
    lx.lineCap = 'round';
    for (var i = 0; i < litDrops.length; i++) {
      var d = litDrops[i];
      d.y += d.v * dt;
      if (d.y > 556) { d.y = 84 + Math.random() * 40; d.u = Math.random(); }
      var half = (d.y - 80) / 481 * 164; /* the cone widens as it falls */
      var x = BULB[0] - half + d.u * half * 2 - (d.y - 80) * 0.18;
      lx.beginPath();
      lx.moveTo(x, d.y);
      lx.lineTo(x + d.l * 0.2, d.y - d.l);
      lx.stroke();
    }

    /* termites come out once the rain eases, as they really do, and scatter when it pours */
    var wantBugs = level < 0.45 ? Math.round((0.45 - level) / 0.33 * (small ? 16 : 30)) : 0;
    if (reduced) { while (bugs.length < wantBugs) bugs.push(newBug()); }
    else if (bugs.length < wantBugs && Math.random() < 0.08) bugs.push(newBug());
    for (var j = bugs.length - 1; j >= 0; j--) {
      var b = bugs[j];
      b.life += dt;
      var fadeIn = reduced ? 1 : Math.min(1, b.life / 1.5);
      if (!b.fall) {
        b.a += b.sp * dt;
        var p = bugAt(b, t);
        drawBug(p[0], p[1], b.a + (b.sp > 0 ? 1.57 : -1.57), fadeIn, Math.sin(t * 0.09 + b.wob) * 0.6);
        /* now and then one loses its wings and drops; when it pours they all go */
        if (!reduced && ((bugs.length > wantBugs && Math.random() < 0.02) || Math.random() < 0.0008)) {
          b.fall = true; b.fx = p[0]; b.fy = p[1]; b.fv = 20;
        }
      } else {
        b.fv += 60 * dt;
        b.fy += b.fv * dt;
        b.fx += Math.sin(t * 0.01 + b.wob) * 0.4;
        var left = Math.max(0, 1 - (b.fy - 200) / 340);
        drawBug(b.fx, b.fy, 1.57 + Math.sin(t * 0.008) * 0.5, left * 0.9, 0);
        if (b.fy > 556 || left <= 0) bugs.splice(j, 1);
      }
    }
  }

  /* ---------- the dog: small, unhurried moves ---------- */
  var headA = 0, headTo = 0, nextLook = 0;

  function dogTick(t) {
    if (!dogMove) return;
    /* looks up at the swarm, or out at the street, every few seconds */
    if (t > nextLook) {
      var watching = bugs.length > 4;
      headTo = watching && Math.random() < 0.7 ? 11 + Math.random() * 5 : (Math.random() < 0.5 ? 0 : -4); /* positive tips the nose up */
      nextLook = t + 2500 + Math.random() * 4500;
    }
    var since = t - flinchAt;
    var flinch = since > 0 && since < 700 ? Math.sin(since / 700 * Math.PI) : 0; /* ducks a little at the thunder */
    var aim = boatNear ? -9 : headTo; /* a boat going by gets a look */
    headA += (aim - flinch * 7 - headA) * 0.06;
    dogHead.setAttribute('transform', 'rotate(' + headA.toFixed(2) + ' 108 78)');

    var wag = level < 0.45 ? Math.sin(t * 0.012) * 7 : Math.sin(t * 0.004) * 2;
    dogTail.setAttribute('transform', 'rotate(' + wag.toFixed(2) + ' 147 150)');

    var shake = 0, s = t - shakeAt;
    if (shakeAt && s > 0 && s < 900) shake = Math.sin(s * 0.11) * 4 * (1 - s / 900); /* shakes the rain off */
    dogMove.setAttribute('transform', 'translate(52 ' + (368 + flinch * 2).toFixed(2) + ') scale(.85) rotate(' + shake.toFixed(2) + ' 120 210)');
  }

  /* ---------- the street: rain splashing on it, water running along the gutter, and paper boats ---------- */
  var ground = document.querySelector('.street-ground');
  var street = ground ? ground.parentNode : null;
  var sc = null, sx = null, SW = 0, SH = 0;
  var splashes = [], boats = [], ripples = [], flows = [], boatNear = false;
  /* notebook, newspaper and coloured-craft paper: every boat a different sheet */
  var PAPERS = ['#fbf3e4', '#f6dde3', '#dbe9f4', '#f2e5bf', '#e2efd8'];

  if (street) {
    sc = document.createElement('canvas');
    sc.className = 'street-canvas';
    sc.setAttribute('aria-hidden', 'true');
    street.appendChild(sc);
    sx = sc.getContext('2d');
  }

  function streetResize() {
    if (!sc) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    SW = sc.clientWidth;
    SH = sc.clientHeight;
    sc.width = SW * dpr;
    sc.height = SH * dpr;
    sx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function waterY() {
    var gh = ground.offsetHeight;
    return SH - gh + (gh > 15 ? 10 : 5);
  }

  function flowSpeed() { return 26 + level * 60; } /* the gutter runs faster when it pours */

  function dropBoat(clientX, clientY, t) {
    var r = sc.getBoundingClientRect(), wy = waterY();
    if (boats.length >= 8) boats.shift();
    boats.push({
      x: clientX - r.left,
      y: Math.min(clientY - r.top, wy - 6),
      vy: 0,
      s: small ? 15 : 22,
      k: 0.85 + Math.random() * 0.3,
      paper: PAPERS[Math.floor(Math.random() * PAPERS.length)],
      ph: Math.random() * 6.283,
      floating: reduced,
      wake: 0
    });
    if (reduced) drawStreet(t || 0, 0);
  }

  function ring(x, y, big) {
    ripples.push({ x: x, y: y, age: 0, s: big ? 1.6 : 1 });
  }

  /* a folded paper boat: the hull, the peaked sail and its centre fold */
  function drawBoat(b, wy, t) {
    var s = b.s;
    var bob = b.floating ? Math.sin(t * 0.004 + b.ph) * (1 + level * 1.4) : 0;
    var tilt = b.floating ? Math.sin(t * 0.0031 + b.ph) * 0.08 * (1 + level) : (b.vy > 0 ? 0.25 : 0);
    sx.save();
    sx.translate(b.x, (b.floating ? wy : b.y) + bob);
    sx.rotate(tilt);
    sx.lineJoin = 'round';
    sx.lineWidth = 1.6;
    sx.strokeStyle = '#1c1a17';
    sx.fillStyle = b.paper;
    sx.beginPath(); /* sail */
    sx.moveTo(-0.5 * s, -0.45 * s);
    sx.lineTo(0, -1.35 * s);
    sx.lineTo(0.5 * s, -0.45 * s);
    sx.closePath();
    sx.fill();
    sx.stroke();
    sx.beginPath(); /* hull */
    sx.moveTo(-1.05 * s, -0.45 * s);
    sx.lineTo(1.05 * s, -0.45 * s);
    sx.lineTo(0.62 * s, 0.05 * s);
    sx.lineTo(-0.62 * s, 0.05 * s);
    sx.closePath();
    sx.fill();
    sx.stroke();
    sx.lineWidth = 1;
    sx.beginPath(); /* the folds */
    sx.moveTo(0, -1.35 * s); sx.lineTo(0, -0.45 * s);
    sx.moveTo(-0.62 * s, 0.05 * s); sx.lineTo(-0.3 * s, -0.45 * s);
    sx.moveTo(0.62 * s, 0.05 * s); sx.lineTo(0.3 * s, -0.45 * s);
    sx.stroke();
    sx.restore();
    if (b.floating) { /* the bottom sits in the water */
      sx.fillStyle = 'rgba(26, 18, 32, 0.55)';
      sx.fillRect(b.x - 0.9 * s, wy + bob - 0.05 * s, 1.8 * s, 0.25 * s);
    }
  }

  function drawStreet(t, dt) {
    if (!sx) return;
    sx.clearRect(0, 0, SW, SH);
    var wy = waterY(), fv = flowSpeed();

    /* water running along the gutter */
    var wantFlows = Math.round(SW / 38);
    while (flows.length < wantFlows) flows.push({ x: Math.random() * SW, y: wy - 1 + Math.random() * 7, l: 6 + Math.random() * 14, a: 0.1 + Math.random() * 0.14, k: 0.9 + Math.random() * 0.4 });
    sx.lineCap = 'round';
    sx.lineWidth = 1;
    for (var f = 0; f < flows.length; f++) {
      var w = flows[f];
      w.x += fv * w.k * dt;
      if (w.x - w.l > SW) w.x = -Math.random() * 40;
      sx.strokeStyle = 'rgba(239, 226, 243, ' + w.a.toFixed(3) + ')';
      sx.beginPath();
      sx.moveTo(w.x - w.l, w.y);
      sx.lineTo(w.x, w.y);
      sx.stroke();
    }

    /* rain landing on the street: a little crown, then a ring */
    var n = Math.floor(level * SW / 14 * dt + Math.random() * (dt > 0 ? 1 : 0));
    while (n-- > 0 && splashes.length < 160) splashes.push({ x: Math.random() * SW, age: 0, s: 0.6 + Math.random() * 0.8 });
    sx.lineWidth = 1.1;
    for (var i = splashes.length - 1; i >= 0; i--) {
      var p = splashes[i];
      p.age += dt;
      var u = p.age / 0.45;
      if (u >= 1) { splashes.splice(i, 1); continue; }
      sx.strokeStyle = 'rgba(239, 226, 243, ' + ((1 - u) * 0.5).toFixed(3) + ')';
      if (u < 0.4) {
        var h = 6 * p.s * (u / 0.4);
        sx.beginPath();
        sx.moveTo(p.x - 1, wy - 2); sx.lineTo(p.x - 4 * p.s, wy - 2 - h);
        sx.moveTo(p.x + 1, wy - 2); sx.lineTo(p.x + 4 * p.s, wy - 2 - h);
        sx.stroke();
      }
      sx.beginPath();
      sx.ellipse(p.x, wy + 1, 2 + u * 11 * p.s, 0.8 + u * 2.4 * p.s, 0, 0, 6.283);
      sx.stroke();
    }

    /* rings left by boats landing and drifting */
    for (var q = ripples.length - 1; q >= 0; q--) {
      var rp = ripples[q];
      rp.age += dt;
      var v = rp.age / 0.9;
      if (v >= 1) { ripples.splice(q, 1); continue; }
      sx.strokeStyle = 'rgba(255, 236, 214, ' + ((1 - v) * 0.45).toFixed(3) + ')';
      sx.beginPath();
      sx.ellipse(rp.x, rp.y + 2, (6 + v * 26) * rp.s, (1.4 + v * 4) * rp.s, 0, 0, 6.283);
      sx.stroke();
    }

    /* the boats: fall in, splash, then ride the current out of sight */
    var dogX = -1e9;
    if (lamp) {
      var lr = lamp.getBoundingClientRect(), sr = sc.getBoundingClientRect();
      dogX = lr.left - sr.left + 150 * (lr.height / 590);
    }
    boatNear = false;
    for (var j = boats.length - 1; j >= 0; j--) {
      var b = boats[j];
      if (!b.floating) {
        b.vy += 900 * dt;
        b.y += b.vy * dt;
        if (b.y >= wy) {
          b.floating = true;
          ring(b.x, wy, true);
          ring(b.x, wy, false);
          for (var c = 0; c < 4; c++) splashes.push({ x: b.x + (Math.random() - 0.5) * 2.4 * b.s, age: 0, s: 1 + Math.random() * 0.6 });
        }
      } else {
        b.x += fv * b.k * dt;
        b.wake += dt;
        if (b.wake > 0.6) { b.wake = 0; ring(b.x - b.s, wy, false); }
        if (b.x - 2 * b.s > SW) { boats.splice(j, 1); continue; }
        if (Math.abs(b.x - dogX) < 90) boatNear = true;
      }
      drawBoat(b, wy, t);
    }
  }

  /* tap the wet street (or just above it) to drop a boat in */
  var hero = street ? street.parentNode : null;

  function onStreet(e) {
    if (!ground || (e.target.closest && e.target.closest('a, button'))) return false;
    var g = ground.getBoundingClientRect();
    return e.clientY >= g.top - 70 && e.clientY <= g.bottom + 2;
  }

  if (hero) {
    hero.addEventListener('click', function (e) {
      if (!onStreet(e)) return;
      dropBoat(e.clientX, e.clientY, performance.now());
      if (hint) { hint.classList.add('gone'); hint = null; }
      try { localStorage.setItem('gg-boat', '1'); } catch (err) {}
    });
    hero.addEventListener('mousemove', function (e) {
      hero.classList.toggle('boat-zone', onStreet(e));
    });
  }

  /* a small invitation, until the visitor has floated their first boat */
  var hint = null, floated = false;
  try { floated = localStorage.getItem('gg-boat') === '1'; } catch (err) {}
  if (street && !floated) {
    hint = document.createElement('div');
    hint.className = 'boat-hint';
    hint.setAttribute('aria-hidden', 'true');
    hint.textContent = small ? 'tap the wet street to float a paper boat ↓' : '↓ click the wet street to float a paper boat';
    street.appendChild(hint);
  }

  /* ---------- lightning ---------- */
  /* a jagged path from the clouds down through the open sky, with one fork */
  function makeBolt() {
    var wide = W > 900;
    var x = wide ? (Math.random() < 0.75 ? W * (0.66 + Math.random() * 0.3) : W * (0.02 + Math.random() * 0.06)) : W * (0.15 + Math.random() * 0.7);
    var y = 40 + Math.random() * 60, end = H * (0.28 + Math.random() * 0.2), pts = [[x, y]], fork = null;
    while (y < end) {
      x += (Math.random() - 0.5) * 34;
      y += 14 + Math.random() * 22;
      pts.push([x, y]);
      if (!fork && pts.length === 4) fork = [x, y];
    }
    if (fork) {
      pts.push(null, fork);
      var fx = fork[0], fy = fork[1];
      for (var i = 0; i < 4; i++) { fx += 8 + Math.random() * 16; fy += 12 + Math.random() * 16; pts.push([fx, fy]); }
    }
    return pts;
  }

  /* far: only the sky glows. near: a bolt you can see, and the dog ducks a moment later */
  function lightning(t, far) {
    bolt = far ? null : makeBolt();
    flashQueue.push(t, t + 160 + Math.random() * 120); /* a strike, then one fainter flicker */
    flashScale = far ? 0.45 : 1;
    var delay = far ? 2500 + Math.random() * 2000 : 700 + Math.random() * 1500;
    if (!far) flinchAt = t + delay;
  }

  function startPhase(t) {
    var p = PHASES[phase];
    phaseEnd = t + (p.min + Math.random() * (p.max - p.min)) * 1000;
    if (p.name === 'storm') nextFlash = t + 1500 + Math.random() * 1500;
    if (p.name === 'rain') nextFar = t + 6000 + Math.random() * 6000;
    if (p.name === 'easing') shakeAt = t + 1500; /* the storm has passed */
  }

  /* ---------- the loop ---------- */
  var last = 0, running = false;

  function tick(t) {
    if (!running) return;
    var dt = Math.min(0.05, (t - (last || t)) / 1000);
    last = t;
    if (!phaseEnd) startPhase(t);
    if (t > phaseEnd && !forced) { phase = (phase + 1) % PHASES.length; startPhase(t); }
    level += (PHASES[phase].level - level) * Math.min(1, dt * 0.35);

    var pn = PHASES[phase].name;
    if (pn === 'storm' && t > nextFlash) {
      lightning(t, false);
      nextFlash = t + 4000 + Math.random() * 5000;
    }
    if (pn === 'rain' && t > nextFar) {
      lightning(t, true);
      nextFar = t + 10000 + Math.random() * 8000;
    }
    while (flashQueue.length && t >= flashQueue[0]) {
      flashQueue.shift();
      flash = (flash > 0.3 ? 0.7 : 1) * flashScale;
      holdUntil = t + 90;
    }
    if (t > holdUntil) flash *= Math.pow(0.05, dt); /* holds a moment, then fades over about a second */

    drawSky(dt);
    drawLamp(t, dt);
    drawStreet(t, dt);
    dogTick(t);
    requestAnimationFrame(tick);
  }

  function start() {
    if (running || reduced) return;
    running = true;
    last = 0;
    requestAnimationFrame(tick);
  }

  resize();
  lampResize();
  streetResize();
  window.addEventListener('resize', function () {
    resize();
    lampResize();
    streetResize();
    if (reduced) { drawSky(0); drawLamp(0, 0); drawStreet(0, 0); }
  });

  if (reduced) {
    /* a still rainy night: one frame, nothing moving */
    drawSky(0);
    drawLamp(0, 0);
    drawStreet(0, 0);
  } else {
    start();
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) running = false;
    else start();
  });
})();
