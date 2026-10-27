// Retira la pantalla de entrada cuando la app está lista y la animación ya se vio completa.
const MINIMO_MS = 1900; // duración de la animación del logo
const inicio = performance.now();

export function ocultarSplash() {
  const s = document.getElementById('splash');
  if (!s || s.dataset.saliendo) return;
  s.dataset.saliendo = '1';
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const espera = Math.max(0, (reducido ? 500 : MINIMO_MS) - (performance.now() - inicio));
  setTimeout(() => {
    s.classList.add('splash-fuera');
    s.addEventListener('animationend', () => s.remove(), { once: true });
    setTimeout(() => s.remove(), 800);
  }, espera);
}
