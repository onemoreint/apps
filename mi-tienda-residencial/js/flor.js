/* Escena de partículas en bucle (polvo → figura → [red] → polvo). Vanilla JS, sin dependencias.
   Uso: ParticleLoop(canvas, { shape:'patch'|'lotus', net:true|false, dot:'r,g,b', hot:'r,g,b', glow:'r,g,b',
        center:function(W,H){return {x,y,r}}, count:[movil,escritorio], cycle:segundos, alpha:1 }) */
(function () {
  'use strict';
  function rnd(seed) { var x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); }
  function smooth(a, b, x) { var k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); }

  function lotusPoint(i, c) {
    // 10 % línea de agua, el resto pétalos
    if (rnd(i + 101) < 0.1) {
      var u = rnd(i + 103) * 2 - 1;
      return { x: c.x + u * c.r * 1.5, y: c.y + c.r * 0.5 + u * u * c.r * 0.08 };
    }
    var angs = [-78, -52, -26, 0, 26, 52, 78];
    var k = Math.floor(rnd(i + 107) * angs.length);
    var side = Math.abs(k - 3) / 3;
    var L = c.r * (1.25 - 0.4 * side), w = L * 0.3;
    var s = rnd(i + 109);
    var half = w * Math.pow(Math.sin(Math.PI * s), 0.85);
    var lx = rnd(i + 113) < 0.6 ? (rnd(i + 127) < 0.5 ? -half : half) : (rnd(i + 131) * 2 - 1) * half;
    var ly = -s * L;
    var a = angs[k] * Math.PI / 180;
    var bx = c.x, by = c.y + c.r * 0.45;
    return { x: bx + lx * Math.cos(a) - ly * Math.sin(a), y: by + lx * Math.sin(a) + ly * Math.cos(a) };
  }

  function patchPoint(i, c) {
    var a = rnd(i + 3) * Math.PI * 2;
    var rr = rnd(i + 11) < 0.38 ? c.r * (0.96 + rnd(i + 5) * 0.06) : c.r * Math.sqrt(rnd(i + 7)) * 0.94;
    return { x: c.x + Math.cos(a) * rr, y: c.y + Math.sin(a) * rr };
  }

  window.ParticleLoop = function (cvs, cfg) {
    if (!cvs || !cvs.getContext) return;
    var ctx = cvs.getContext('2d');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var cycle = cfg.cycle || 14, alpha = cfg.alpha == null ? 1 : cfg.alpha;
    var W, H, DPR, P = [], nodes = [], C, t = 0, last = 0, running = false;

    function layout() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = cvs.clientWidth; H = cvs.clientHeight;
      if (!W || !H) return;
      cvs.width = Math.round(W * DPR); cvs.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      C = cfg.center(W, H);
      var n = W < 720 ? cfg.count[0] : cfg.count[1];
      nodes = [];
      var K = W < 720 ? 12 : 18;
      for (var k = 0; k < K; k++) nodes.push({ x: (0.04 + rnd(k + 1) * 0.92) * W, y: (0.08 + rnd(k + 77) * 0.84) * H });
      var old = P; P = [];
      for (var i = 0; i < n; i++) {
        var f = cfg.shape === 'lotus' ? lotusPoint(i, C) : patchPoint(i, C);
        var nd = nodes[i % K], na = rnd(i + 19) * 6.283, nr = Math.pow(rnd(i + 23), 2) * 12;
        var p = { dx: rnd(i + 31) * W, dy: rnd(i + 37) * H, fx: f.x, fy: f.y,
          nx: nd.x + Math.cos(na) * nr, ny: nd.y + Math.sin(na) * nr,
          s: 0.6 + rnd(i + 41) * 1.4, ph: rnd(i + 43) * 6.28, hot: rnd(i + 47) < 0.1 };
        p.x = old[i] ? old[i].x : p.dx; p.y = old[i] ? old[i].y : p.dy;
        P.push(p);
      }
    }

    function draw(a, b, ease, wob) {
      ctx.clearRect(0, 0, W, H);
      var glow = a * (1 - b);
      if (glow > 0.01 && cfg.glow) {
        var g = ctx.createRadialGradient(C.x, C.y, C.r * 0.1, C.x, C.y, C.r * 2);
        g.addColorStop(0, 'rgba(' + cfg.glow + ',' + (0.3 * glow * alpha) + ')');
        g.addColorStop(1, 'rgba(' + cfg.glow + ',0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      if (b > 0.02) {
        ctx.lineWidth = 1;
        var lim = Math.max(W, H) * 0.28;
        for (var i = 0; i < nodes.length; i++) for (var j = i + 1; j < nodes.length; j++) {
          var dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < lim) {
            ctx.strokeStyle = 'rgba(' + cfg.dot + ',' + (0.25 * b * (1 - d / lim) * alpha) + ')';
            ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke();
          }
        }
      }
      ctx.globalCompositeOperation = 'lighter';
      for (var k = 0; k < P.length; k++) {
        var p = P[k];
        var tx = p.dx + (p.fx - p.dx) * a, ty = p.dy + (p.fy - p.dy) * a;
        tx += (p.nx - tx) * b; ty += (p.ny - ty) * b;
        var drift = (1 - a * (1 - b)) * 5 + 1;
        tx += Math.sin(t * 0.7 + p.ph) * drift * wob; ty += Math.cos(t * 0.6 + p.ph * 1.3) * drift * wob;
        p.x += (tx - p.x) * ease; p.y += (ty - p.y) * ease;
        var al = (0.3 + 0.5 * a + Math.sin(t * 2 + p.ph) * 0.1 * wob) * alpha;
        ctx.fillStyle = 'rgba(' + (p.hot ? cfg.hot : cfg.dot) + ',' + al + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (p.hot ? 1.3 : 1), 0, 6.283); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    function frame(now) {
      if (!running) return;
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now; t += dt;
      var u = (t % cycle) / cycle;
      var out = 1 - smooth(0.88, 1, u);
      var a = smooth(0.06, 0.28, u) * out;
      var b = cfg.net ? smooth(0.55, 0.7, u) * out : 0;
      draw(a, b, 0.06, 1);
      requestAnimationFrame(frame);
    }

    function still() { for (var i = 0; i < 2; i++) draw(1, 0, 1, 0); }
    function start() { if (reduce || running) return; running = true; last = 0; requestAnimationFrame(frame); }
    function stop() { running = false; }

    layout();
    if (reduce) { still(); }
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { layout(); if (reduce) still(); }, 150); });
    if ('IntersectionObserver' in window) {
      var loopObs = new IntersectionObserver(function (es) { es[0].isIntersecting ? start() : stop(); }, { threshold: 0 });
      loopObs.observe(cvs);
    } else start();
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  };
})();

/* Flor de Lotto: el polvo dorado forma una flor de loto detrás del logo de la portada */
(function () {
  try {
    var portada = document.querySelector('.portada');
    if (!portada || !window.ParticleLoop) return;
    var cvs = document.createElement('canvas');
    cvs.className = 'portada__fx'; cvs.setAttribute('aria-hidden', 'true');
    portada.insertBefore(cvs, portada.firstChild);
    var logo = document.getElementById('logoPortada');
    window.ParticleLoop(cvs, {
      shape: 'lotus', net: false, cycle: 12, count: [320, 480], alpha: 0.9,
      dot: '245,236,217', hot: '201,165,90', glow: '201,165,90',
      center: function (W, H) {
        var pr = portada.getBoundingClientRect(), r = logo ? logo.getBoundingClientRect() : null;
        var x = r && r.width ? r.left - pr.left + r.width / 2 : W / 2;
        var y = r && r.height ? r.top - pr.top + r.height / 2 : H * 0.35;
        return { x: x, y: y, r: Math.min(W * 0.44, 190) };
      }
    });
  } catch (e) { console.warn('[flor] no se pudo iniciar', e); }
})();
