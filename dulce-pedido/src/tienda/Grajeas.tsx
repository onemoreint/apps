import { useEffect, useRef } from 'react';

/**
 * Grajeas de repostería dibujadas en un lienzo que cubre la pantalla.
 * Llueven dentro de la portada y saltan al agregar un producto al pedido.
 */
type Grajea = { x: number; y: number; vx: number; vy: number; giro: number; vg: number; color: string; largo: number; gravedad: number; limite: number };

const pendientes: { x: number; y: number; n: number }[] = [];
let despertar: (() => void) | null = null;

const sinMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Lanza una explosión de grajeas desde un punto de la pantalla. */
export function lanzarGrajeas(x: number, y: number, n = 46): void {
  if (sinMovimiento()) return;
  pendientes.push({ x, y, n });
  despertar?.();
}

export function Grajeas({ lluvia }: { lluvia: boolean }) {
  const lienzo = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = lienzo.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || sinMovimiento()) return;

    const estilo = getComputedStyle(document.documentElement);
    const colores = ['#ffc42e', '#ffffff', estilo.getPropertyValue('--primario').trim() || '#43102f', '#ff8fa8'];
    const color = () => colores[Math.floor(Math.random() * colores.length)]!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const medir = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    medir();
    window.addEventListener('resize', medir);

    let grajeas: Grajea[] = [];
    let cuadro = 0;
    let anterior = 0;
    let acumulado = 0;

    const portada = () => (lluvia ? document.getElementById('portada')?.getBoundingClientRect() : undefined);

    const paso = (t: number) => {
      const dt = Math.min(t - anterior, 50) / 16.67;
      anterior = t;

      for (const p of pendientes.splice(0)) {
        for (let i = 0; i < p.n; i++) {
          const angulo = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
          const fuerza = 5 + Math.random() * 10;
          grajeas.push({
            x: p.x,
            y: p.y,
            vx: Math.cos(angulo) * fuerza,
            vy: Math.sin(angulo) * fuerza,
            giro: Math.random() * 6.28,
            vg: (Math.random() - 0.5) * 0.5,
            color: color(),
            largo: 8 + Math.random() * 7,
            gravedad: 0.32,
            limite: window.innerHeight + 30,
          });
        }
      }

      const zona = portada();
      const llueve = zona && zona.bottom > 0 && zona.top < window.innerHeight && !document.hidden;
      if (llueve) {
        acumulado += dt;
        const cada = window.innerWidth < 700 ? 24 : 12;
        while (acumulado > cada) {
          acumulado -= cada;
          grajeas.push({
            x: Math.random() * window.innerWidth,
            y: Math.max(zona.top, 0) - 12,
            vx: (Math.random() - 0.5) * 0.7,
            vy: 1.3 + Math.random() * 1.7,
            giro: Math.random() * 6.28,
            vg: (Math.random() - 0.5) * 0.09,
            color: color(),
            largo: 8 + Math.random() * 7,
            gravedad: 0.004,
            limite: zona.bottom + 50,
          });
        }
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.lineCap = 'round';
      ctx.lineWidth = 4.5;
      grajeas = grajeas.filter((g) => g.y < g.limite);
      for (const g of grajeas) {
        g.vy += g.gravedad * dt;
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        g.giro += g.vg * dt;
        const dx = (Math.cos(g.giro) * g.largo) / 2;
        const dy = (Math.sin(g.giro) * g.largo) / 2;
        ctx.strokeStyle = g.color;
        ctx.beginPath();
        ctx.moveTo(g.x - dx, g.y - dy);
        ctx.lineTo(g.x + dx, g.y + dy);
        ctx.stroke();
      }

      // Sin grajeas ni lluvia el lienzo se duerme y no gasta batería.
      cuadro = grajeas.length > 0 || llueve ? requestAnimationFrame(paso) : 0;
    };

    const arrancar = () => {
      if (cuadro) return;
      anterior = performance.now();
      cuadro = requestAnimationFrame(paso);
    };
    despertar = arrancar;
    arrancar();
    window.addEventListener('scroll', arrancar, { passive: true });
    document.addEventListener('visibilitychange', arrancar);

    return () => {
      cancelAnimationFrame(cuadro);
      despertar = null;
      window.removeEventListener('resize', medir);
      window.removeEventListener('scroll', arrancar);
      document.removeEventListener('visibilitychange', arrancar);
    };
  }, [lluvia]);

  return <canvas ref={lienzo} className="pointer-events-none fixed inset-0 z-40 h-full w-full" aria-hidden />;
}
