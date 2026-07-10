/* GhostGram Labs — living page bits */
(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

    function tick() {
      ctx.clearRect(0, 0, w, h);
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

  /* ---------- Little runner who chases the pointer (desktop only) ---------- */
  if (window.matchMedia('(pointer: fine)').matches && !reduced) {
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
      '</svg>';
    document.body.appendChild(man);

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
      /* he trails behind and to the side, chasing the pointer */
      man.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-110%) scaleX(' + dir + ')';
      requestAnimationFrame(chase);
    })();
  }
})();
