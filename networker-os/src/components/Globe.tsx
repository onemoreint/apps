import { useEffect, useRef } from 'react';
import { LAND_H, LAND_MASK_B64, LAND_W } from './landMask';

// Globo terráqueo animado (canvas 2D, sin dependencias): gira constantemente y muestra
// arcos de conexión entre los países de la red. Respeta "reducir movimiento" y se pausa
// cuando la pestaña no está visible para ahorrar batería.

export const COUNTRY_COORDS: Record<string, [number, number]> = {
  colombia: [6.24, -75.58],
  venezuela: [10.48, -66.9],
  mexico: [19.43, -99.13],
  peru: [-12.05, -77.04],
  ecuador: [-0.18, -78.47],
  chile: [-33.45, -70.67],
  argentina: [-34.6, -58.38],
  panama: [8.98, -79.52],
  espana: [40.42, -3.7],
  'estados unidos': [25.76, -80.19],
  usa: [25.76, -80.19],
  bolivia: [-16.5, -68.15],
  'republica dominicana': [18.49, -69.93],
  guatemala: [14.63, -90.51],
  'costa rica': [9.93, -84.08],
  brasil: [-23.55, -46.63],
  uruguay: [-34.9, -56.16],
  paraguay: [-25.26, -57.58],
  honduras: [14.07, -87.19],
  'el salvador': [13.69, -89.22],
  nicaragua: [12.11, -86.24],
  'puerto rico': [18.47, -66.11],
  cuba: [23.11, -82.37],
  canada: [43.65, -79.38],
  italia: [41.9, 12.5],
  portugal: [38.72, -9.14],
};

const BACKGROUND_NODES = ['mexico', 'peru', 'chile', 'argentina', 'espana', 'estados unidos', 'brasil', 'panama', 'ecuador', 'venezuela', 'bolivia', 'republica dominicana', 'guatemala', 'costa rica'];

export const normalizeCountry = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

interface Props {
  hub: string; // país central (el del usuario / empresa)
  active: string[]; // países con contactos
  size?: number; // tamaño máximo en px
}

function cssVar(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  if (Number.isNaN(n)) return [230, 181, 92];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

let landCache: Uint8Array | null = null;
function isLand(lat: number, lon: number): boolean {
  if (!landCache) landCache = Uint8Array.from(atob(LAND_MASK_B64), (c) => c.charCodeAt(0));
  const x = Math.min(LAND_W - 1, Math.max(0, Math.floor(lon + 180)));
  const y = Math.min(LAND_H - 1, Math.max(0, Math.floor(90 - lat)));
  const i = y * LAND_W + x;
  return ((landCache[i >> 3] >> (i & 7)) & 1) === 1;
}

const toXYZ = (lat: number, lon: number): [number, number, number] => {
  const la = (lat * Math.PI) / 180;
  const lo = (lon * Math.PI) / 180;
  return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
};

export function Globe({ hub, active, size = 340 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const activeKey = active.map(normalizeCountry).sort().join('|');

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gold = hexToRgb(cssVar('--accent', '#e6b55c'));
    const blue = hexToRgb(cssVar('--accent-2', '#5b8cff'));
    const rgba = (c: [number, number, number], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

    // Puntos del planeta (esfera de Fibonacci): continentes densos, océano apenas insinuado
    const N = 9000;
    const land: [number, number, number][] = [];
    const ocean: [number, number, number][] = [];
    const ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = ga * i;
      const p: [number, number, number] = [Math.cos(th) * r, y, Math.sin(th) * r];
      const lat = (Math.asin(y) * 180) / Math.PI;
      const lon = (Math.atan2(p[0], p[2]) * 180) / Math.PI;
      if (isLand(lat, lon)) land.push(p);
      else if (i % 10 === 0) ocean.push(p);
    }

    const hubKey = normalizeCountry(hub);
    const activeSet = new Set(activeKey.split('|').filter((k) => COUNTRY_COORDS[k]));
    const hubCoords = COUNTRY_COORDS[hubKey] ?? COUNTRY_COORDS.colombia;
    const nodeKeys = Array.from(new Set([hubKey, ...activeSet, ...BACKGROUND_NODES])).filter((k) => COUNTRY_COORDS[k]);
    const nodes = nodeKeys.map((k) => ({ key: k, p: toXYZ(...COUNTRY_COORDS[k]), active: activeSet.has(k) || k === hubKey, hub: k === hubKey }));

    // Arcos: del país central a cada país activo + algunos enlaces de fondo entre nodos
    const hubP = toXYZ(...hubCoords);
    const arcs: { a: [number, number, number]; b: [number, number, number]; strong: boolean; offset: number }[] = [];
    nodes.forEach((n, i) => {
      if (n.hub) return;
      if (n.active) arcs.push({ a: hubP, b: n.p, strong: true, offset: (i * 0.137) % 1 });
    });
    const bg = nodes.filter((n) => !n.active);
    for (let i = 0; i + 1 < bg.length; i += 2) arcs.push({ a: bg[i].p, b: bg[i + 1].p, strong: false, offset: (i * 0.29) % 1 });
    if (arcs.filter((a) => a.strong).length === 0) bg.slice(0, 4).forEach((n, i) => arcs.push({ a: hubP, b: n.p, strong: true, offset: i * 0.25 }));

    // Pre-calcula puntos de cada arco (interpolación esférica elevada)
    const SEG = 48;
    const arcPts = arcs.map((arc) => {
      const [ax, ay, az] = arc.a;
      const [bx, by, bz] = arc.b;
      const dot = Math.min(1, Math.max(-1, ax * bx + ay * by + az * bz));
      const om = Math.acos(dot) || 1e-6;
      const lift = Math.min(0.08 + om * 0.12, 0.22);
      const pts: [number, number, number][] = [];
      for (let s = 0; s <= SEG; s++) {
        const t = s / SEG;
        const k1 = Math.sin((1 - t) * om) / Math.sin(om);
        const k2 = Math.sin(t * om) / Math.sin(om);
        const h = 1 + Math.sin(Math.PI * t) * lift;
        pts.push([(ax * k1 + bx * k2) * h, (ay * k1 + by * k2) * h, (az * k1 + bz * k2) * h]);
      }
      return pts;
    });

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tilt = 0.32;
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    // Arranca con Latinoamérica de frente
    let rot = -((hubCoords[1] * Math.PI) / 180);
    let w = 0;
    let dpr = 1;

    const resize = () => {
      const s = Math.min(wrap.clientWidth, size);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = s;
      canvas.width = s * dpr;
      canvas.height = s * dpr;
      canvas.style.width = `${s}px`;
      canvas.style.height = `${s}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const project = (p: [number, number, number], R: number, cx: number, cy: number) => {
      const cr = Math.cos(rot);
      const sr = Math.sin(rot);
      const x = p[0] * cr + p[2] * sr;
      const z0 = -p[0] * sr + p[2] * cr;
      const y = p[1] * ct - z0 * st;
      const z = p[1] * st + z0 * ct;
      return { x: cx + x * R, y: cy - y * R, z };
    };

    let raf = 0;
    let last = performance.now();
    let running = true;

    const draw = (now: number) => {
      const dt = Math.min(now - last, 64);
      last = now;
      if (!reduce) rot += dt * 0.00016;
      const time = now / 1000;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, w);
      const cx = w / 2;
      const cy = w / 2;
      const R = w * 0.4;

      // Halo exterior
      const halo = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.35);
      halo.addColorStop(0, rgba(blue, 0.28));
      halo.addColorStop(1, rgba(blue, 0));
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.35, 0, Math.PI * 2);
      ctx.fill();

      // Esfera
      const body = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
      body.addColorStop(0, 'rgba(40,62,110,0.95)');
      body.addColorStop(0.6, 'rgba(16,26,48,0.96)');
      body.addColorStop(1, 'rgba(8,13,26,0.98)');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgba(blue, 0.45);
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Océano (textura sutil) y continentes
      for (const d of ocean) {
        const q = project(d, R, cx, cy);
        if (q.z <= 0) continue;
        ctx.fillStyle = rgba(blue, 0.05 + q.z * 0.12);
        ctx.fillRect(q.x - 0.5, q.y - 0.5, 1, 1);
      }
      const landSize = Math.max(1.1, R / 110);
      for (const d of land) {
        const q = project(d, R, cx, cy);
        if (q.z <= 0) continue;
        ctx.fillStyle = `rgba(${Math.round(120 + 90 * q.z)},${Math.round(160 + 70 * q.z)},255,${0.25 + q.z * 0.7})`;
        const r = landSize * (0.55 + q.z * 0.6);
        ctx.fillRect(q.x - r / 2, q.y - r / 2, r, r);
      }

      // Arcos de conexión
      arcs.forEach((arc, ai) => {
        const pts = arcPts[ai].map((p) => project(p, R, cx, cy));
        ctx.lineWidth = arc.strong ? 1.4 : 0.9;
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1];
          const b = pts[i];
          if (a.z < -0.05 && b.z < -0.05) continue;
          const vis = Math.max(0, Math.min(1, (a.z + b.z) / 2 + 0.3));
          ctx.strokeStyle = arc.strong ? rgba(gold, 0.18 + vis * 0.35) : rgba(blue, 0.08 + vis * 0.22);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
        // Pulso que viaja por el arco
        const speed = arc.strong ? 0.35 : 0.22;
        const head = (time * speed + arc.offset) % 1;
        const len = 0.18;
        for (let i = 1; i < pts.length; i++) {
          const t = i / (pts.length - 1);
          const dist = head - t;
          if (dist < 0 || dist > len) continue;
          const a = pts[i - 1];
          const b = pts[i];
          if (a.z < 0 && b.z < 0) continue;
          const k = 1 - dist / len;
          ctx.strokeStyle = arc.strong ? rgba(gold, 0.9 * k) : rgba(blue, 0.7 * k);
          ctx.lineWidth = (arc.strong ? 2.6 : 1.6) * k + 0.4;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      });

      // Nodos (países)
      nodes.forEach((n, i) => {
        const q = project(n.p, R, cx, cy);
        if (q.z <= -0.02) return;
        const alpha = Math.min(1, 0.35 + q.z);
        const col = n.active ? gold : blue;
        if (n.active) {
          const pulse = ((time * 0.8 + i * 0.17) % 1);
          ctx.strokeStyle = rgba(col, (1 - pulse) * 0.7 * alpha);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(q.x, q.y, 3 + pulse * (n.hub ? 16 : 10), 0, Math.PI * 2);
          ctx.stroke();
        }
        const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, n.hub ? 9 : 6);
        g.addColorStop(0, rgba(col, alpha));
        g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(q.x, q.y, n.hub ? 9 : 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba([255, 255, 255], alpha * (n.active ? 0.95 : 0.6));
        ctx.beginPath();
        ctx.arc(q.x, q.y, n.hub ? 2.6 : n.active ? 2 : 1.3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Brillo especular
      const shine = ctx.createRadialGradient(cx - R * 0.45, cy - R * 0.5, 0, cx - R * 0.45, cy - R * 0.5, R * 0.9);
      shine.addColorStop(0, 'rgba(255,255,255,0.10)');
      shine.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = shine;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      if (running) raf = requestAnimationFrame(draw);
    };

    const onVis = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(draw);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    raf = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [hub, activeKey, size]);

  return (
    <div ref={wrapRef} className="globe-wrap" style={{ maxWidth: size }}>
      <canvas ref={canvasRef} role="img" aria-label="Globo terráqueo girando con las conexiones de tu red entre países" />
    </div>
  );
}
