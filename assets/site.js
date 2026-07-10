/* GhostGram Labs — living page bits (inspired by dvein.com's reactive canvas) */
(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Drifting ink blobs across the whole page, repelled by the pointer ---------- */
  if (!reduced) {
    var canvas = document.createElement('canvas');
    canvas.className = 'page-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);
    var ctx = canvas.getContext('2d');
    var accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#4338ca';
    var w = 0, h = 0;

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    var blobs = [];
    var count = Math.max(14, Math.round((window.innerWidth * window.innerHeight) / 60000));
    if (count > 26) count = 26;
    for (var i = 0; i < count; i++) {
      blobs.push({
        x: Math.random() * Math.max(w, 800),
        y: Math.random() * Math.max(h, 400),
        r: 16 + Math.random() * 52,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        wob: Math.random() * Math.PI * 2
      });
    }

    var mx = -9999, my = -9999;
    window.addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
    });
    document.documentElement.addEventListener('mouseleave', function () { mx = -9999; my = -9999; });

    function tick() {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < blobs.length; i++) {
        var b = blobs[i];
        var dx = b.x - mx, dy = b.y - my, d2 = dx * dx + dy * dy;
        if (d2 < 25600) { /* 160px — scatter away from the pointer */
          var d = Math.sqrt(d2) || 1;
          b.vx += (dx / d) * 0.22;
          b.vy += (dy / d) * 0.22;
        }
        b.wob += 0.01;
        b.vx = (b.vx + Math.cos(b.wob) * 0.006) * 0.985;
        b.vy = (b.vy + Math.sin(b.wob * 1.3) * 0.006) * 0.985;
        b.x += b.vx; b.y += b.vy;
        if (b.x < -70) b.x = w + 70; if (b.x > w + 70) b.x = -70;
        if (b.y < -70) b.y = h + 70; if (b.y > h + 70) b.y = -70;
        var g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, accent + '2e');
        g.addColorStop(1, accent + '00');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, 6.2832);
        ctx.fill();
      }
      requestAnimationFrame(tick);
    }
    tick();
  }

  /* ---------- Trailing cursor companion (desktop pointers only) ---------- */
  if (window.matchMedia('(pointer: fine)').matches && !reduced) {
    var dot = document.createElement('div');
    dot.className = 'cursor-ghost';
    dot.setAttribute('aria-hidden', 'true');
    document.body.appendChild(dot);
    var x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y;
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      dot.style.opacity = '1';
    });
    document.documentElement.addEventListener('mouseleave', function () { dot.style.opacity = '0'; });
    var hoverables = 'a, button, summary, .btn';
    document.addEventListener('pointerover', function (e) {
      if (e.target.closest && e.target.closest(hoverables)) dot.classList.add('is-hover');
    });
    document.addEventListener('pointerout', function (e) {
      if (e.target.closest && e.target.closest(hoverables)) dot.classList.remove('is-hover');
    });
    (function follow() {
      x += (tx - x) * 0.16;
      y += (ty - y) * 0.16;
      dot.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%)';
      requestAnimationFrame(follow);
    })();
  }
})();
