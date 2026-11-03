import { useEffect } from "react";

/* Ciclo de dibujo para canvas: ajusta la resolución, se detiene fuera de pantalla
   o con la pestaña oculta, y dibuja un solo cuadro si se pide menos movimiento. */
export default function useCanvasLoop(ref, setup, maxFps = 60) {
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.innerWidth < 768;
    const dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
    const size = { w: 0, h: 0, small };
    const draw = setup(ctx, size);
    let raf = 0;
    let visible = true;
    let last = 0;
    const minStep = 1000 / maxFps;

    const loop = (t) => {
      raf = requestAnimationFrame(loop);
      if (t - last < minStep) return;
      last = t;
      draw(t);
    };
    const start = () => {
      if (!raf && !reduced && visible && !document.hidden) raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      size.w = r.width;
      size.h = r.height;
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(reduced ? 12000 : performance.now());
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      visible ? start() : stop();
    });
    io.observe(canvas);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    resize();
    start();
    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
