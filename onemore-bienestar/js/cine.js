/* ONE MORE · escena cinemática al hacer scroll (polvo → parche → red). Vanilla JS, sin dependencias. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* Escena: polvo → parche → red */
  function initScene() {
    var reel = document.getElementById('cine');
    var cvs = document.getElementById('cineFx');
    if (!reel || !cvs || !cvs.getContext) return;
    var ctx = cvs.getContext('2d');
    var caps = document.querySelectorAll('.cine-cap');
    var bar = document.querySelector('.cine-bar i');
    var hint = document.querySelector('.cine-hint');

    var W = 0, H = 0, DPR = 1, P = [], nodes = [], disc = { x: 0, y: 0, r: 0 };
    var progress = 0, running = false, step = 0, t = 0;

    function rnd(seed) { var x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); }
    function smooth(a, b, x) { var k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); }

    function layout() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = cvs.clientWidth; H = cvs.clientHeight;
      cvs.width = Math.round(W * DPR); cvs.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      var mobile = W < 720;
      var n = mobile ? 520 : 1000;
      disc.x = mobile ? W * 0.5 : W * 0.66;
      disc.y = mobile ? H * 0.3 : H * 0.44;
      disc.r = Math.min(W, H) * (mobile ? 0.24 : 0.22);

      // Nodos de la red (el equipo)
      nodes = [];
      var K = mobile ? 14 : 22;
      for (var k = 0; k < K; k++) {
        nodes.push({
          x: (mobile ? 0.08 : 0.38) * W + rnd(k + 1) * (mobile ? 0.84 : 0.56) * W,
          y: (mobile ? 0.08 : 0.1) * H + rnd(k + 77) * (mobile ? 0.34 : 0.7) * H
        });
      }

      var old = P; P = [];
      for (var i = 0; i < n; i++) {
        var a = rnd(i + 3) * Math.PI * 2;
        var rim = rnd(i + 11) < 0.38;
        var rr = rim ? disc.r * (0.96 + rnd(i + 5) * 0.06) : disc.r * Math.sqrt(rnd(i + 7)) * 0.94;
        var nd = nodes[i % K];
        var na = rnd(i + 19) * Math.PI * 2, nr = Math.pow(rnd(i + 23), 2) * 16;
        var p = {
          dx: rnd(i + 31) * W, dy: rnd(i + 37) * H,
          cx: disc.x + Math.cos(a) * rr, cy: disc.y + Math.sin(a) * rr,
          nx: nd.x + Math.cos(na) * nr, ny: nd.y + Math.sin(na) * nr,
          s: 0.6 + rnd(i + 41) * 1.6, ph: rnd(i + 43) * 6.28, hot: rnd(i + 47) < 0.08
        };
        p.x = old[i] ? old[i].x : p.dx; p.y = old[i] ? old[i].y : p.dy;
        P.push(p);
      }
    }

    function readScroll() {
      var r = reel.getBoundingClientRect();
      var span = reel.offsetHeight - window.innerHeight;
      progress = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
      var s = progress < 0.3 ? 0 : progress < 0.64 ? 1 : 2;
      if (s !== step) {
        step = s;
        for (var i = 0; i < caps.length; i++) caps[i].classList.toggle('on', +caps[i].dataset.step === s);
      }
      if (bar) bar.style.width = (progress * 100).toFixed(1) + '%';
      if (hint) hint.style.opacity = progress > 0.04 ? '0' : '1';
    }

    function frame() {
      t += 0.016;
      var a = smooth(0.04, 0.32, progress);   // polvo → parche
      var b = smooth(0.6, 0.86, progress);    // parche → red
      var ease = reduce ? 1 : 0.075;
      var wob = reduce ? 0 : 1;

      ctx.clearRect(0, 0, W, H);

      // Halo del parche
      var glow = a * (1 - b);
      if (glow > 0.01) {
        var g = ctx.createRadialGradient(disc.x, disc.y, disc.r * 0.2, disc.x, disc.y, disc.r * 2.1);
        g.addColorStop(0, 'rgba(255,122,26,' + (0.32 * glow) + ')');
        g.addColorStop(0.5, 'rgba(138,50,8,' + (0.12 * glow) + ')');
        g.addColorStop(1, 'rgba(11,8,6,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }

      // Líneas de la red
      if (b > 0.02) {
        ctx.lineWidth = 1;
        for (var i = 0; i < nodes.length; i++) {
          for (var j = i + 1; j < nodes.length; j++) {
            var dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
            var d = Math.sqrt(dx * dx + dy * dy), lim = Math.min(W, H) * 0.34;
            if (d < lim) {
              ctx.strokeStyle = 'rgba(255,194,102,' + (0.22 * b * (1 - d / lim)) + ')';
              ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke();
            }
          }
        }
      }

      // Partículas
      ctx.globalCompositeOperation = 'lighter';
      for (var k = 0; k < P.length; k++) {
        var p = P[k];
        var tx = p.dx + (p.cx - p.dx) * a, ty = p.dy + (p.cy - p.dy) * a;
        tx += (p.nx - tx) * b; ty += (p.ny - ty) * b;
        var drift = (1 - a * (1 - b)) * 6 + 1.2;
        tx += Math.sin(t * 0.7 + p.ph) * drift * wob;
        ty += Math.cos(t * 0.6 + p.ph * 1.3) * drift * wob;
        p.x += (tx - p.x) * ease; p.y += (ty - p.y) * ease;
        var al = 0.35 + 0.5 * a + Math.sin(t * 2 + p.ph) * 0.12 * wob;
        ctx.fillStyle = p.hot ? 'rgba(255,122,26,' + al + ')' : 'rgba(255,194,102,' + (al * 0.8) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (p.hot ? 1.4 : 1), 0, 6.283); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      if (running) requestAnimationFrame(frame);
    }

    layout();
    readScroll();
    window.addEventListener('scroll', readScroll, { passive: true });
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { layout(); readScroll(); }, 150); });

    // Solo anima mientras el hero está en pantalla
    if ('IntersectionObserver' in window) {
      var heroObs = new IntersectionObserver(function (es) {
        var vis = es[0].isIntersecting;
        if (vis && !running) { running = true; requestAnimationFrame(frame); }
        if (!vis) running = false;
      }, { threshold: 0 });
      heroObs.observe(reel);
    } else { running = true; requestAnimationFrame(frame); }
  }

  try { initScene(); } catch (e) { console.warn('[cine] no se pudo iniciar', e); }
})();
