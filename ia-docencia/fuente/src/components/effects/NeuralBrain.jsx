import { useEffect, useRef } from "react";
import useCanvasLoop from "../../hooks/useCanvasLoop";

/* Cerebro holográfico en 3D. Nube de nodos con la silueta de un cerebro,
   sinapsis que viajan por las conexiones y una línea de escaneo. Todo en canvas,
   sin imágenes, para que cargue rápido en datos móviles. */

function surface(th, ph, side) {
  // th recorre de la frente a la nuca; ph baja desde la cisura central hasta la base
  let x = Math.cos(th) * 1.3;
  let y = Math.sin(th) * Math.cos(ph);
  const z = (Math.sin(th) * Math.sin(ph) * 0.92 + 0.05) * side;
  if (x > 0.2 && y > 0) x += 0.07 * y; // frente más abultada
  if (y < 0) y *= 0.62; // base más plana
  if (y < -0.1 && x > -0.35 && x < 0.95) y -= 0.2 * Math.sin(((x + 0.35) / 1.3) * Math.PI); // lóbulo temporal
  return { x, y: y * 0.98, z };
}

function buildBrain(small) {
  const nodes = [];
  const edges = [];
  const add = (n) => nodes.push(n) - 1;
  const link = (a, b) => edges.push([a, b]);
  const bands = small ? 8 : 13;
  const steps = small ? 22 : 40;

  // Circunvoluciones: líneas onduladas sobre cada hemisferio
  [1, -1].forEach((side) => {
    let prev = null;
    for (let b = 0; b < bands; b++) {
      const base = 0.16 + (b / (bands - 1)) * 2.42;
      const f = 4.5 + ((b * 7) % 5);
      const ph1 = b * 2.1 + side;
      const line = [];
      for (let i = 0; i <= steps; i++) {
        const th = 0.1 + (i / steps) * (Math.PI - 0.2);
        const ph = base + 0.17 * Math.sin(th * f + ph1) + 0.07 * Math.sin(th * f * 2.3 + ph1 * 2);
        const id = add({ ...surface(th, ph, side), s: i % 3 === 0 ? 1.15 : 0.5 });
        if (i) link(id - 1, id);
        line.push(id);
      }
      if (prev) for (let i = 2; i < line.length; i += 5) link(prev[i], line[i]); // sinapsis entre circunvoluciones
      prev = line;
    }
  });
  // Cerebelo: láminas finas
  const cbRows = small ? 5 : 8;
  for (let r = 0; r < cbRows; r++) {
    const v = -0.9 + (r / (cbRows - 1)) * 1.8;
    let last = -1;
    const pts = small ? 10 : 16;
    for (let i = 0; i <= pts; i++) {
      const u = (i / pts) * Math.PI * 2;
      const k = Math.sqrt(1 - v * v * 0.9);
      const id = add({ x: -0.8 + 0.34 * k * Math.cos(u), y: -0.5 + 0.2 * v, z: 0.5 * k * Math.sin(u), s: 0.5 });
      if (last >= 0) link(last, id);
      last = id;
    }
  }
  // Tronco encefálico
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    [-0.09, 0.09].forEach((dz, j) => {
      const id = add({ x: -0.34 - 0.2 * t, y: -0.62 - 0.5 * t, z: dz, s: 0.6 });
      if (i && j === 1) link(id - 1, id);
      if (i) link(id - 2, id);
    });
  }
  const adj = nodes.map(() => []);
  edges.forEach(([a, b]) => {
    adj[a].push(b);
    adj[b].push(a);
  });
  return { nodes, edges, adj };
}

function glowSprite(rgb) {
  const c = document.createElement("canvas");
  c.width = c.height = 48;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(24, 24, 0, 24, 24, 24);
  g.addColorStop(0, `rgba(${rgb},1)`);
  g.addColorStop(0.22, `rgba(${rgb},.75)`);
  g.addColorStop(0.5, `rgba(${rgb},.14)`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  x.fillStyle = g;
  x.fillRect(0, 0, 48, 48);
  return c;
}

export default function NeuralBrain({ className = "" }) {
  const ref = useRef(null);
  const pointer = useRef({ x: 0, y: 0, sx: 0, sy: 0 });

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const move = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  useCanvasLoop(ref, (ctx, size) => {
    const { nodes, edges, adj } = buildBrain(size.small);
    const px = new Float32Array(nodes.length);
    const py = new Float32Array(nodes.length);
    const pz = new Float32Array(nodes.length);
    const sprites = { neon: glowSprite("0,200,255"), white: glowSprite("235,246,255"), violet: glowSprite("165,120,255") };
    const pulses = Array.from({ length: size.small ? 12 : 26 }, (_, i) => ({
      a: Math.floor(Math.random() * nodes.length),
      b: -1,
      p: Math.random(),
      v: 0.012 + Math.random() * 0.02,
      c: i % 3 === 0 ? "violet" : "white",
    }));
    pulses.forEach((pu) => {
      pu.b = adj[pu.a][0] ?? pu.a;
    });

    return (t) => {
      const { w, h } = size;
      if (!w) return;
      const P = pointer.current;
      P.sx += (P.x - P.sx) * 0.05;
      P.sy += (P.y - P.sy) * 0.05;
      const ry = 0.34 + Math.sin(t * 0.00024) * 0.4 + P.sx * 0.25;
      const rx = 0.13 + P.sy * 0.12;
      const cy1 = Math.cos(ry), sy1 = Math.sin(ry), cx1 = Math.cos(rx), sx1 = Math.sin(rx);
      const S = Math.min(w * 0.3, h * (size.small ? 0.4 : 0.34));
      const cx = w * 0.5;
      const cy = h * 0.44;
      ctx.clearRect(0, 0, w, h);

      // Halo
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 1.7);
      halo.addColorStop(0, "rgba(23,105,255,.22)");
      halo.addColorStop(0.55, "rgba(135,71,255,.08)");
      halo.addColorStop(1, "rgba(8,11,22,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);

      // Proyector holográfico
      const by = cy + S * 1.3;
      const cone = ctx.createLinearGradient(0, by, 0, cy - S * 0.2);
      cone.addColorStop(0, "rgba(0,200,255,.16)");
      cone.addColorStop(1, "rgba(0,200,255,0)");
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(cx - S * 0.52, by);
      ctx.lineTo(cx - S * 1.2, cy - S * 0.2);
      ctx.lineTo(cx + S * 1.2, cy - S * 0.2);
      ctx.lineTo(cx + S * 0.52, by);
      ctx.fill();
      [[0.56, 0.11, 0.65, [], 1.4], [0.82, 0.16, 0.36, [3, 7], 1], [1.12, 0.22, 0.2, [18, 10], 1]].forEach(([rxx, ryy, al, dash, lw], i) => {
        ctx.strokeStyle = `rgba(0,200,255,${al})`;
        ctx.lineWidth = lw;
        ctx.setLineDash(dash);
        ctx.lineDashOffset = t * (i % 2 ? 0.012 : -0.008);
        ctx.beginPath();
        ctx.ellipse(cx, by, S * rxx, S * ryy, 0, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Proyección
      const f = 3.4;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const x1 = n.x * cy1 + n.z * sy1;
        const z1 = -n.x * sy1 + n.z * cy1;
        const y1 = n.y * cx1 - z1 * sx1;
        const z2 = n.y * sx1 + z1 * cx1;
        const k = f / (f + z2);
        px[i] = cx + x1 * k * S;
        py[i] = cy - y1 * k * S;
        pz[i] = z2;
      }

      // Conexiones por profundidad, agrupadas para dibujar menos veces
      ctx.globalCompositeOperation = "lighter";
      [[0.35, 2, "rgba(70,110,255,.16)", 0.7], [-0.25, 0.35, "rgba(40,150,255,.34)", 0.9], [-2, -0.25, "rgba(90,215,255,.62)", 1.1]].forEach(([lo, hi, color, lw]) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.beginPath();
        for (let e = 0; e < edges.length; e++) {
          const [a, b] = edges[e];
          const d = (pz[a] + pz[b]) / 2;
          if (d >= lo && d < hi) {
            ctx.moveTo(px[a], py[a]);
            ctx.lineTo(px[b], py[b]);
          }
        }
        ctx.stroke();
      });

      // Línea de escaneo
      const span = S * 2.3;
      const scanY = cy - S * 1.1 + ((t * 0.055) % span);
      const lg = ctx.createLinearGradient(cx - S * 1.4, 0, cx + S * 1.4, 0);
      lg.addColorStop(0, "rgba(0,200,255,0)");
      lg.addColorStop(0.5, "rgba(120,225,255,.5)");
      lg.addColorStop(1, "rgba(0,200,255,0)");
      ctx.fillStyle = lg;
      ctx.fillRect(cx - S * 1.4, scanY, S * 2.8, 1);

      // Nodos, proporcionales al tamaño del cerebro
      const dot = Math.max(0.45, Math.min(1, S / 230));
      for (let i = 0; i < nodes.length; i++) {
        const depth = (1.3 - pz[i]) / 2.6;
        const near = Math.max(0, 1 - Math.abs(py[i] - scanY) / (S * 0.13));
        const r = (1 + depth * 1.9 + near * 2.6) * nodes[i].s * 2.3 * dot;
        ctx.globalAlpha = Math.min(1, 0.2 + depth * 0.62 + near * 0.55);
        ctx.drawImage(near > 0.4 ? sprites.white : sprites.neon, px[i] - r, py[i] - r, r * 2, r * 2);
      }

      // Sinapsis
      ctx.globalAlpha = 1;
      for (const pu of pulses) {
        pu.p += pu.v;
        if (pu.p >= 1) {
          const opts = adj[pu.b].filter((j) => j !== pu.a);
          pu.a = pu.b;
          const choices = opts.length ? opts : adj[pu.b];
          pu.b = choices.length ? choices[Math.floor(Math.random() * choices.length)] : pu.a;
          pu.p = 0;
        }
        const x = px[pu.a] + (px[pu.b] - px[pu.a]) * pu.p;
        const y = py[pu.a] + (py[pu.b] - py[pu.a]) * pu.p;
        const r = (7 + (0.5 - pz[pu.a] * 0.5) * 4) * dot;
        ctx.drawImage(sprites[pu.c], x - r, y - r, r * 2, r * 2);
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    };
  });

  return <canvas ref={ref} role="img" aria-label="Cerebro digital holográfico formado por una red neuronal activa" className={className} />;
}
