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

  /* ---------- sound: real rain, wind with the storm, thunder after each strike.
     Public-domain recordings from Wikimedia Commons ("Rain", "Rain against the window", "Tonitrus"),
     fetched only once the visitor turns sound on. ---------- */
  var sound = (function () {
    var KEY = 'gg-sound';
    var ac = null, master, rainG, windG, buffers = null, loading = false, on = false;

    function fetchBuffer(name) {
      return fetch('/assets/audio/' + name).then(function (r) { return r.arrayBuffer(); }).then(function (b) {
        return new Promise(function (ok, fail) { ac.decodeAudioData(b, ok, fail); });
      });
    }

    /* loop a recording; the ends are trimmed a touch to skip the silence mp3 encoders pad on */
    function loop(buf, out, rate, offset, pan) {
      var src = ac.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.loopStart = 0.06;
      src.loopEnd = buf.duration - 0.06;
      src.playbackRate.value = rate;
      var node = src;
      if (ac.createStereoPanner) {
        var p = ac.createStereoPanner();
        p.pan.value = pan;
        src.connect(p);
        node = p;
      }
      node.connect(out);
      src.start(0, offset % (buf.duration - 0.2));
    }

    function build() {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain();
      master.gain.value = 0;
      var limiter = ac.createDynamicsCompressor(); /* keeps the loudest thunder from distorting */
      limiter.threshold.value = -10;
      limiter.ratio.value = 6;
      master.connect(limiter);
      limiter.connect(ac.destination);
      rainG = ac.createGain(); rainG.gain.value = 0; rainG.connect(master);
      windG = ac.createGain(); windG.gain.value = 0; windG.connect(master);
    }

    function load() {
      if (buffers || loading) return;
      loading = true;
      label('rain sounds: loading…');
      Promise.all([fetchBuffer('rain.mp3'), fetchBuffer('rain-wind.mp3'), fetchBuffer('thunder.mp3')]).then(function (b) {
        buffers = { rain: b[0], wind: b[1], thunder: b[2] };
        /* two copies of the rain, a little apart in time, speed and space, so the loop never audibly repeats */
        loop(buffers.rain, rainG, 1, 0, -0.35);
        loop(buffers.rain, rainG, 0.93, 4.1, 0.35);
        loop(buffers.wind, windG, 1, Math.random() * 30, 0);
        lastFollow = 0;
        follow(level);
        paint();
      }).catch(function () {
        loading = false;
        label('rain sounds: unavailable');
      });
    }

    /* each strike plays a different stretch of the thunder recording; far ones are muffled and soft */
    function thunder(strength, far) {
      if (!on || !buffers) return;
      var t = ac.currentTime, len = 6 + Math.random() * 3;
      var src = ac.createBufferSource();
      src.buffer = buffers.thunder;
      var f = ac.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = far ? 420 : 4000;
      var g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(strength * (far ? 0.5 : 1), t + 0.08);
      g.gain.setValueAtTime(strength * (far ? 0.5 : 1), t + len - 2);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      src.connect(f);
      f.connect(g);
      g.connect(master);
      src.start(t, Math.random() * (buffers.thunder.duration - len - 0.5));
      src.stop(t + len + 0.1);
    }

    var lastFollow = 0;

    function follow(lv) {
      if (!on || !buffers) return;
      var t = ac.currentTime;
      if (t - lastFollow < 0.25) return; /* a few updates a second is plenty for weather */
      lastFollow = t;
      rainG.gain.setTargetAtTime(0.45 + lv * 0.55, t, 1.5); /* soft in the drizzle, full in the storm */
      windG.gain.setTargetAtTime(Math.max(0, lv - 0.45) * 1.6, t, 2); /* the wind only rises with the storm */
    }

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sound-btn';
    document.body.appendChild(btn);

    var ICON_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
    var ICON_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>';

    function label(text) {
      var s = btn.querySelector('span');
      if (s) s.textContent = text;
    }

    function paint() {
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.innerHTML = (on ? ICON_ON : ICON_OFF) + '<span>rain sounds: ' + (on ? 'on' : 'off') + '</span>';
    }

    function setOn(v) {
      on = v;
      try { localStorage.setItem(KEY, v ? 'on' : 'off'); } catch (e) {}
      paint();
      if (v) {
        if (!ac) build();
        if (ac.state === 'suspended') ac.resume();
        load();
        lastFollow = 0;
        follow(level);
        master.gain.setTargetAtTime(1, ac.currentTime, 0.5);
        /* if the browser is still holding sound back, say so on the button instead of failing quietly */
        setTimeout(function () {
          if (on && ac.state !== 'running') label('sound blocked: tap again');
        }, 700);
      } else if (ac) {
        master.gain.setTargetAtTime(0, ac.currentTime, 0.3);
      }
    }

    /* a scribbled hint, only until the visitor has tried the button once */
    var psst = null, seen = false;
    try { seen = localStorage.getItem('gg-psst') === '1'; } catch (e) {}
    if (!seen) {
      psst = document.createElement('div');
      psst.className = 'psst';
      psst.setAttribute('aria-hidden', 'true');
      psst.textContent = small ? 'psst, tap for rain ↓' : 'psst, tap for rain →';
      document.body.appendChild(psst);
      setTimeout(function () { if (psst) psst.classList.add('gone'); }, 12000);
    }

    btn.addEventListener('click', function () {
      setOn(!on);
      if (psst) { psst.classList.add('gone'); psst = null; }
      try { localStorage.setItem('gg-psst', '1'); } catch (e) {}
    });

    /* browsers allow sound only after a click or key press, so a returning listener's
       rain picks up again at their first touch of the page */
    var wanted = false;
    try { wanted = localStorage.getItem(KEY) === 'on'; } catch (e) {}
    if (wanted) {
      var wake = function (e) {
        if (e && e.target && e.target.closest && e.target.closest('.sound-btn')) return;
        document.removeEventListener('pointerdown', wake);
        document.removeEventListener('keydown', wake);
        setOn(true);
      };
      document.addEventListener('pointerdown', wake);
      document.addEventListener('keydown', wake);
    }
    paint();

    return {
      thunder: thunder,
      follow: follow,
      pause: function () { if (ac && on) ac.suspend(); },
      resume: function () { if (ac && on) ac.resume(); }
    };
  })();

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

  /* where the rain meets the street: little crowns and rings along the pavement */
  var ground = document.querySelector('.street-ground'), splashes = [];

  function drawSplashes(dt) {
    if (!ground) return;
    var gy = ground.getBoundingClientRect().top + 6;
    if (gy < -20 || gy > H + 20) { splashes.length = 0; return; }
    var n = Math.floor(level * W / 14 * dt + Math.random()); /* splashes per frame along the whole street */
    while (n-- > 0 && splashes.length < 160) splashes.push({ x: Math.random() * W, age: 0, s: 0.6 + Math.random() * 0.8 });
    cx.lineCap = 'round';
    cx.lineWidth = 1.1;
    for (var i = splashes.length - 1; i >= 0; i--) {
      var p = splashes[i];
      p.age += dt;
      var u = p.age / 0.45;
      if (u >= 1) { splashes.splice(i, 1); continue; }
      cx.strokeStyle = 'rgba(239, 226, 243, ' + ((1 - u) * 0.5).toFixed(3) + ')';
      if (u < 0.4) { /* the crown */
        var h = 6 * p.s * (u / 0.4);
        cx.beginPath();
        cx.moveTo(p.x - 1, gy); cx.lineTo(p.x - 4 * p.s, gy - h);
        cx.moveTo(p.x + 1, gy); cx.lineTo(p.x + 4 * p.s, gy - h);
        cx.stroke();
      }
      cx.beginPath(); /* the ring */
      cx.ellipse(p.x, gy + 3, 2 + u * 11 * p.s, 0.8 + u * 2.4 * p.s, 0, 0, 6.283);
      cx.stroke();
    }
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

    drawSplashes(dt);

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
      headTo = watching && Math.random() < 0.7 ? -11 - Math.random() * 5 : (Math.random() < 0.5 ? 0 : 4);
      nextLook = t + 2500 + Math.random() * 4500;
    }
    var since = t - flinchAt;
    var flinch = since > 0 && since < 700 ? Math.sin(since / 700 * Math.PI) : 0; /* ducks a little at the thunder */
    headA += (headTo + flinch * 7 - headA) * 0.06;
    dogHead.setAttribute('transform', 'rotate(' + headA.toFixed(2) + ' 108 78)');

    var wag = level < 0.45 ? Math.sin(t * 0.012) * 7 : Math.sin(t * 0.004) * 2;
    dogTail.setAttribute('transform', 'rotate(' + wag.toFixed(2) + ' 147 150)');

    var shake = 0, s = t - shakeAt;
    if (shakeAt && s > 0 && s < 900) shake = Math.sin(s * 0.11) * 4 * (1 - s / 900); /* shakes the rain off */
    dogMove.setAttribute('transform', 'translate(52 ' + (368 + flinch * 2).toFixed(2) + ') scale(.85) rotate(' + shake.toFixed(2) + ' 120 210)');
  }

  /* ---------- lightning, and the thunder that follows it ---------- */
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

  /* far: only the sky glows. near: a bolt you can see, then the thunder a moment later */
  function lightning(t, far) {
    bolt = far ? null : makeBolt();
    flashQueue.push(t, t + 160 + Math.random() * 120); /* a strike, then one fainter flicker */
    flashScale = far ? 0.45 : 1;
    var delay = far ? 2500 + Math.random() * 2000 : 700 + Math.random() * 1500;
    if (!far) flinchAt = t + delay;
    setTimeout(function () { sound.thunder(far ? 0.5 : 0.7 + Math.random() * 0.3, far); }, delay);
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
    dogTick(t);
    sound.follow(level);
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
  window.addEventListener('resize', function () {
    resize();
    lampResize();
    if (reduced) { drawSky(0); drawLamp(0, 0); }
  });

  if (reduced) {
    /* a still rainy night: one frame, nothing moving */
    drawSky(0);
    drawLamp(0, 0);
  } else {
    start();
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { running = false; sound.pause(); }
    else { start(); sound.resume(); }
  });
})();
