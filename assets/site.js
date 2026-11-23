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
  var bugs = [], litDrops = [], hearts = [];
  var dogMove = lamp ? lamp.querySelector('.dog-move') : null;
  var dogHit = lamp ? lamp.querySelector('.dog-hit') : null;
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
    lx.globalAlpha = alpha * (0.12 + 0.88 * lit); /* they vanish into the dark when the lamp goes out */
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
    lx.globalAlpha = 0.08 + 0.92 * lit;
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
    lx.globalAlpha = 1;

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

    /* hearts from a pat: rise, sway, fade */
    for (var hh = hearts.length - 1; hh >= 0; hh--) {
      var ht = (t - hearts[hh].born) / 1500;
      if (ht >= 1) { hearts.splice(hh, 1); continue; }
      var hx = hearts[hh].x + Math.sin(ht * 6) * 3, hy = hearts[hh].y - ht * 70, hs = 10 + ht * 3;
      lx.globalAlpha = ht < 0.15 ? ht / 0.15 : 1 - (ht - 0.15) / 0.85;
      lx.fillStyle = '#ff8a8a';
      lx.beginPath();
      lx.moveTo(hx, hy + hs * 0.9);
      lx.bezierCurveTo(hx - hs * 1.3, hy, hx - hs * 0.7, hy - hs * 0.9, hx, hy - hs * 0.25);
      lx.bezierCurveTo(hx + hs * 0.7, hy - hs * 0.9, hx + hs * 1.3, hy, hx, hy + hs * 0.9);
      lx.fill();
      lx.globalAlpha = 1;
    }

    /* fireflies, only ever seen in the dark */
    if (flies.length) {
      var since = outAt >= 0 ? t - outAt : 1e9;
      var fa = since < 600 ? 0 : since < 1000 ? (since - 600) / 400 : since < 2650 ? 1 : Math.max(0, 1 - (since - 2650) / 300);
      for (var k = 0; k < flies.length; k++) {
        var f = flies[k];
        f.x += Math.sin(t * 0.0011 + f.ph) * 0.35;
        f.y += Math.cos(t * 0.0009 + f.ph * 1.7) * 0.25 - 0.06;
        var pulse = fa * (0.45 + 0.55 * Math.max(0, Math.sin(t * 0.004 + f.ph * 3)));
        lx.globalAlpha = pulse * 0.22;
        lx.fillStyle = '#c8ff7a';
        lx.beginPath(); lx.arc(f.x, f.y, 7, 0, 6.283); lx.fill();
        lx.globalAlpha = pulse;
        lx.fillStyle = '#efffc4';
        lx.beginPath(); lx.arc(f.x, f.y, 2.1, 0, 6.283); lx.fill();
      }
      lx.globalAlpha = 1;
      if (outAt < 0) flies = [];
    }
  }

  /* ---------- the dog: small, calm moves. When a paper boat comes down the gutter it gets up, walks over,
     sits to see it go by, then walks back to its place under the lamp ---------- */
  var headA = 0, headTo = 0, nextLook = 0;
  var lookUpUntil = 0, petAt = -1e9;
  var dogSit = lamp ? lamp.querySelector('.dog-sit') : null;
  var dogStand = lamp ? lamp.querySelector('.dog-stand') : null;
  var dogHeadPos = lamp ? lamp.querySelector('.dog-head-pos') : null;
  var dogTail2 = lamp ? lamp.querySelector('.dog-tail2') : null;
  var dogShadow = lamp ? lamp.querySelector('.dog-shadow') : null;
  var eyePos = lamp ? lamp.querySelector('.dog-eye-pos') : null;
  var LEGS = lamp ? [
    [lamp.querySelector('.leg-fn'), 92, 142, 0],            /* near front, swings from the shoulder */
    [lamp.querySelector('.leg-ff'), 104, 142, Math.PI],     /* far front */
    [lamp.querySelector('.leg-rn > g'), 156, 146, Math.PI], /* near back, swings from the hip */
    [lamp.querySelector('.leg-rf > g'), 156, 146, 0]        /* far back */
  ] : [];
  var DOG_CX = 160.8; /* the dog's middle, in the lamp drawing's units: it turns round on this line */
  var WALK = 62;      /* walking speed in drawing units a second: an easy amble */
  var dogMode = 'home', modeAt = 0, pose = 0, poseTo = 0, walkX = 0, face = 1, gait = 0, lastDogT = 0;

  function ease(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
  function setMode(m, t) { dogMode = m; modeAt = t; }

  /* how far left the dog may go: never off the screen, never too far from its lamp (drawing units, negative) */
  function walkLimit() {
    var k = lamp.clientHeight / 590, left = lamp.getBoundingClientRect().left;
    return Math.max(-(small ? 300 : 420), Math.min(0, (16 - left) / k - 100));
  }

  function dogTick(t) {
    if (!dogMove) return;
    var dt = lastDogT ? Math.min((t - lastDogT) / 1000, 0.05) : 0;
    lastDogT = t;
    var k = lamp.clientHeight / 590; /* screen pixels per drawing unit */
    var dark = outAt >= 0;
    var noBoat = boatDx > 1e8;

    /* where it is going, one step at a time */
    var stepping = 0, sinceMode = t - modeAt;
    if (dogMode === 'home') {
      poseTo = 0;
      if (!dark && pose < 0.02 && boatDx < -60 && boatDx > walkLimit() * k - 500) setMode('rise', t);
    } else if (dogMode === 'rise') { /* gets up */
      poseTo = 1;
      if (pose > 0.98 && sinceMode > 250) setMode('out', t);
    } else if (dogMode === 'out') { /* walks to meet the boat */
      if (noBoat || boatDx > -60 * k / 0.88 || walkX <= walkLimit()) setMode('settle', t);
      else stepping = -1;
    } else if (dogMode === 'settle') { /* sits down to see it go by */
      poseTo = 0;
      if (pose < 0.02) setMode('watch', t);
    } else if (dogMode === 'watch') {
      if (sinceMode > 1800 && (noBoat || boatDx > 90)) setMode(walkX > -2 ? 'home' : 'up', t);
    } else if (dogMode === 'up') { /* gets up and turns round */
      poseTo = 1;
      if (pose > 0.98 && sinceMode > 450) { face = -1; setMode('back', t); }
    } else if (dogMode === 'back') { /* walks back to the lamp */
      stepping = 1;
      if (walkX >= 0) { walkX = 0; stepping = 0; setMode('turn', t); }
    } else if (dogMode === 'turn') { /* a moment's pause, faces the street again, then sits */
      if (sinceMode > 300) face = 1;
      if (sinceMode > 550) setMode('home', t);
    }

    pose += (poseTo - pose) * Math.min(1, dt * 5);
    if (Math.abs(poseTo - pose) < 0.004) pose = poseTo;
    if (stepping) {
      walkX += stepping * WALK * dt;
      if (walkX > 0) walkX = 0;
      gait += WALK * dt / 46 * 6.283;
    } else {
      gait += (Math.round(gait / Math.PI) * Math.PI - gait) * Math.min(1, dt * 8); /* the feet come together when it stops */
    }
    var walking = stepping !== 0;

    /* sitting and standing: a short cross-fade, the head rising or settling between the two */
    var ps = ease(pose), fadeIn = ease((pose - 0.4) / 0.2);
    dogSit.setAttribute('opacity', (1 - fadeIn).toFixed(3));
    dogStand.setAttribute('opacity', fadeIn.toFixed(3));
    dogSit.style.display = fadeIn > 0.999 ? 'none' : '';
    dogStand.style.display = fadeIn < 0.001 ? 'none' : '';
    var bob = walking ? Math.abs(Math.sin(gait)) * 1.4 : 0;
    var headPos = 'translate(' + (-6 * ps).toFixed(2) + ' ' + (40 * ps - bob).toFixed(2) + ')';
    dogHeadPos.setAttribute('transform', headPos);
    if (eyePos) eyePos.setAttribute('transform', headPos);
    for (var li = 0; li < LEGS.length; li++) {
      var L = LEGS[li];
      if (L[0]) L[0].setAttribute('transform', 'rotate(' + (Math.sin(gait + L[3]) * 15).toFixed(2) + ' ' + L[1] + ' ' + L[2] + ')');
    }

    /* now and then a slight glance up at the swarm or out at the street */
    if (t > nextLook) {
      var watching = bugs.length > 4;
      headTo = watching && Math.random() < 0.6 ? 6 : (Math.random() < 0.5 ? 0 : -2); /* positive tips the nose up */
      nextLook = t + 4000 + Math.random() * 5000;
    }
    var since = t - flinchAt;
    var flinch = since > 0 && since < 700 ? Math.sin(since / 700 * Math.PI) : 0; /* ducks a little at the thunder */

    var aim = headTo, excited = false;
    if (Math.abs(boatDx) < 200) { aim = -3; excited = true; } /* a small nod towards a boat close by */
    if (dogMode === 'watch' && !noBoat) { aim = boatDx < 0 ? -4 : -6; excited = true; }
    if (pose > 0.05) aim = -2; /* on its feet it looks where it's going */
    if (t < lookUpUntil && !excited) aim = 7; /* the lamp flickered: a glance up at it */
    if (dark && t - outAt > 500) aim = 7; /* in the dark it looks up at the lamp, waiting */
    var petted = t - petAt;
    if (petted > 0 && petted < 1400) aim = 4 + Math.sin(petted / 1400 * Math.PI) * 3; /* a content tilt when patted */
    headA += (aim - flinch * 4 - headA) * 0.035;
    dogHead.setAttribute('transform', 'rotate(' + headA.toFixed(2) + ' 108 78)');
    if (eyeHead) eyeHead.setAttribute('transform', dogHead.getAttribute('transform'));

    var wag = Math.sin(t * 0.004) * 2;
    if (excited || level < 0.45) wag = Math.sin(t * 0.008) * 4;
    var glad = Math.min(t - happyAt, petted);
    if (glad > 0 && glad < 1800) wag = Math.sin(t * 0.012) * 6 * (1 - glad / 1800); /* light back, or a pat: a short wag */
    dogTail.setAttribute('transform', 'rotate(' + wag.toFixed(2) + ' 147 150)');
    if (dogTail2) dogTail2.setAttribute('transform', 'rotate(' + (wag * 0.8).toFixed(2) + ' 170 120)');

    var shake = 0, s = t - shakeAt;
    if (shakeAt && s > 0 && s < 900 && pose < 0.02) shake = Math.sin(s * 0.08) * 2 * (1 - s / 900); /* shakes the rain off */
    var tr = 'translate(' + walkX.toFixed(2) + ' 0)' +
      (face < 0 ? ' translate(' + DOG_CX + ' 0) scale(-1 1) translate(' + (-DOG_CX) + ' 0)' : '') +
      ' translate(52 ' + (368 + flinch * 1.5).toFixed(2) + ') scale(.85) rotate(' + shake.toFixed(2) + ' 120 210)';
    dogMove.setAttribute('transform', tr);
    if (eyeMove) eyeMove.setAttribute('transform', tr);
    if (dogShadow) dogShadow.setAttribute('transform', 'translate(' + walkX.toFixed(2) + ' 0)');
    if (dogHit) dogHit.style.pointerEvents = dogMode === 'home' ? '' : 'none'; /* pats are for when it's at home */
  }

  /* ---------- the street: rain splashing on it, water running along the gutter, and paper boats ---------- */
  var ground = document.querySelector('.street-ground');
  var street = ground ? ground.parentNode : null;
  var sc = null, sx = null, SW = 0, SH = 0;
  var splashes = [], boats = [], ripples = [], flows = [], boatDx = 1e9; /* the nearest floating boat, left (-) or right (+) of the dog */
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
      dogX = lr.left - sr.left + (150 + walkX) * (lr.height / 590); /* follows the dog when it walks */
    }
    boatDx = 1e9;
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
        if (Math.abs(b.x - dogX) < Math.abs(boatDx)) boatDx = b.x - dogX;
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
      if (!floated) {
        floated = true;
        try { localStorage.setItem('gg-boat', '1'); } catch (err) {}
        hideHint();
        /* one secret found: point at the next one, a moment later, and let the lamp flicker to catch the eye */
        if (!lampFound) {
          setTimeout(function () { if (!lampFound) showHint(LAMP_HINT); }, 1600);
          teaseAt = performance.now() + 2600;
        }
      }
    });
    hero.addEventListener('mousemove', function (e) {
      hero.classList.toggle('boat-zone', onStreet(e));
    });
  }

  /* small invitations, one at a time: float a boat first, then the lamp. Each shows only until it's been found. */
  var BOAT_HINT = small ? 'tap the wet street to float a paper boat ↓' : '↓ click the wet street to float a paper boat';
  var LAMP_HINT = 'psst… that lamp looks a little loose ↗';
  var FOUND_NOTE = 'you found it. the dog was hoping someone would.';
  var hint = null, floated = false, lampFound = false;
  try {
    floated = localStorage.getItem('gg-boat') === '1';
    lampFound = localStorage.getItem('gg-lamp') === '1';
  } catch (err) {}

  function showHint(text) {
    if (!street) return;
    if (!hint) {
      hint = document.createElement('div');
      hint.className = 'boat-hint gone';
      hint.setAttribute('aria-hidden', 'true');
      street.appendChild(hint);
      void hint.offsetWidth; /* so it fades in */
    }
    hint.textContent = text;
    hint.classList.remove('gone');
  }

  function hideHint() { if (hint) hint.classList.add('gone'); }

  if (!floated) showHint(BOAT_HINT);
  else if (!lampFound) showHint(LAMP_HINT);

  /* ---------- lights out: tap the lamp and it flickers and dies; in the dark only the dog's eye glows,
     then the light buzzes back and the dog is glad. Now and then the lamp flickers on its own, as if
     the wire were loose, which is the only invitation it gets. ---------- */
  var cone = lamp ? lamp.querySelector('.cone') : null;
  var bulb = lamp ? lamp.querySelector('.bulb') : null;
  var pool = lamp ? lamp.querySelector('.pool') : null;
  var eyes = lamp ? lamp.querySelector('.dog-eyes') : null;
  var eyeGlow = lamp ? lamp.querySelector('.dog-eye-glow') : null;
  var eyeMove = lamp ? lamp.querySelector('.dog-eye-move') : null;
  var eyeHead = lamp ? lamp.querySelector('.dog-eye-head') : null;
  var dogUse = lamp ? lamp.querySelector('.dog-use') : null;
  var nightF = lamp ? lamp.querySelectorAll('.night-f') : [];
  var hit = lamp ? lamp.querySelector('.lamp-hit') : null;
  var lit = 1, outAt = -1, outBlinks = 1, outFirst = false, happyAt = -1e9, flies = [];
  var teaseAt = 0, teaseFrom = -1;
  /* [ms, light]: flicker, die, a dark pause, then stutter back on */
  var SEQ = [[0, 1], [60, 0.25], [120, 0.9], [190, 0.1], [260, 0.75], [330, 0.05], [420, 0],
             [2700, 0.45], [2770, 0], [2850, 0.85], [2930, 0.3], [3010, 1]];
  var SEQ_END = 3010;
  var TEASE = [[0, 1], [40, 0.4], [110, 1], [190, 0.55], [240, 1]];

  function stepAt(steps, ms) {
    var v = steps[0][1];
    for (var i = 0; i < steps.length; i++) if (ms >= steps[i][0]) v = steps[i][1];
    return v;
  }

  function applyLight(eyeA, eyeOpen) {
    if (cone) cone.style.opacity = lit.toFixed(3);
    if (bulb) bulb.setAttribute('opacity', (0.28 + 0.72 * lit).toFixed(3));
    if (pool) pool.setAttribute('opacity', (0.18 * lit).toFixed(3));
    if (eyes) eyes.setAttribute('opacity', eyeA.toFixed(3));
    if (eyeGlow) eyeGlow.setAttribute('ry', (2.8 * eyeOpen).toFixed(2));
    /* the dog sinks into the dark with the light, a little bluer, like the night */
    if (dogUse) {
      if (lit >= 0.999) { dogUse.removeAttribute('filter'); return; }
      var k = 0.14 + 0.86 * lit;
      for (var i = 0; i < nightF.length; i++) nightF[i].setAttribute('slope', (i === 2 ? Math.min(1, k * 1.35) : k).toFixed(3));
      dogUse.setAttribute('filter', 'url(#night)');
    }
  }

  function lampTick(t) {
    if (outAt >= 0) {
      var s = t - outAt;
      if (s >= SEQ_END) {
        outAt = -1;
        lit = 1;
        happyAt = t;
        applyLight(0, 1);
        if (outFirst) { outFirst = false; afterFound(); }
        teaseAt = t + 25000 + Math.random() * 15000;
        return;
      }
      lit = stepAt(SEQ, s);
      var eyeA = s < 650 ? 0 : s < 900 ? (s - 650) / 250 : s < 2700 ? 1 : 0;
      var open = 1;
      if (s > 1500 && s < 1620) open = 0.12;
      if (outBlinks > 1 && s > 1760 && s < 1880) open = 0.12;
      applyLight(eyeA, open);
      return;
    }
    /* the loose wire */
    if (teaseFrom < 0 && teaseAt && t > teaseAt) { teaseFrom = t; lookUpUntil = t + 1500; } /* the dog looks up at it too */
    if (teaseFrom >= 0) {
      var e = t - teaseFrom;
      lit = e > 240 ? 1 : stepAt(TEASE, e);
      applyLight(0, 1);
      if (e > 240) {
        teaseFrom = -1;
        /* sooner while it's still a secret, rarer once it's been found */
        teaseAt = t + (lampFound ? 25000 + Math.random() * 15000 : 9000 + Math.random() * 9000);
      }
    }
  }

  /* a kind word for finding it; then, if the boat is still a secret, point at that */
  function afterFound() {
    showHint(FOUND_NOTE);
    setTimeout(function () { if (!floated) showHint(BOAT_HINT); else hideHint(); }, 5000);
  }

  function lightsOut() {
    if (outAt >= 0) return;
    var n = 0;
    try { n = parseInt(localStorage.getItem('gg-lamp-n') || '0', 10) || 0; localStorage.setItem('gg-lamp-n', String(n + 1)); } catch (err) {}
    outFirst = !lampFound;
    if (!lampFound) {
      lampFound = true;
      try { localStorage.setItem('gg-lamp', '1'); } catch (err) {}
      hideHint();
    }
    /* the first time it's always the glowing eye; after that it varies a little, so it stays worth a tap */
    var roll = Math.random();
    outBlinks = n > 0 && roll < 0.3 ? 2 : 1;
    if (n > 0 && roll >= 0.3 && roll < 0.7) {
      for (var i = 0; i < 7; i++) flies.push({ x: 50 + Math.random() * 240, y: 330 + Math.random() * 190, ph: Math.random() * 6.283 });
    }
    teaseFrom = -1;
    if (reduced) {
      /* no flicker, no movement: the light simply goes out for a moment and comes back */
      lit = 0;
      applyLight(1, 1);
      drawLamp(0, 0);
      outAt = 0;
      setTimeout(function () {
        outAt = -1; lit = 1; flies = [];
        applyLight(0, 1);
        drawLamp(0, 0);
        if (outFirst) { outFirst = false; afterFound(); }
      }, 2200);
      return;
    }
    outAt = performance.now();
  }

  if (hit) {
    hit.addEventListener('click', function (e) {
      e.stopPropagation();
      lightsOut();
    });
    /* pointing at it gets a flicker back: something's here */
    hit.addEventListener('mouseenter', function () {
      if (!reduced && outAt < 0 && teaseFrom < 0) teaseAt = performance.now();
    });
  }
  if (!reduced && !lampFound) teaseAt = performance.now() + (floated ? 4000 : 20000);
  /* not everyone floats a boat; after a while, point at the lamp anyway */
  if (!floated && !lampFound) {
    setTimeout(function () {
      if (floated || lampFound) return;
      showHint(LAMP_HINT);
      teaseAt = performance.now() + 1200;
    }, 15000);
  }

  /* pat the dog: a short wag, a tilt of the head and a small heart */
  if (dogHit && !reduced) {
    dogHit.addEventListener('click', function (e) {
      e.stopPropagation();
      var now = performance.now();
      if (now - petAt < 500) return;
      petAt = now;
      hearts.push({ x: 133, y: 392, born: now });
    });
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
    lampTick(t);
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
