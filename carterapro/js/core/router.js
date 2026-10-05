// Enrutador por hash (#/clientes/123). Funciona offline y en cualquier hosting estático.
// Las vistas se cargan bajo demanda (import dinámico).
import { emit } from './events.js';

const rutas = [];
let limpiezaActual = null;
let contenedor;
let alFallar;
let rutaAnterior = null;
let primeraVez = true;

/** patron: '/clientes/:id' — carga: () => import('../views/x.js') */
export function ruta(patron, carga, opciones = {}) {
  const nombres = [];
  const regex = new RegExp('^' + patron.replace(/:(\w+)/g, (_, n) => { nombres.push(n); return '([^/]+)'; }) + '/?$');
  rutas.push({ patron, regex, nombres, carga, ...opciones });
}

export function actual() {
  const h = location.hash.slice(1) || '/';
  const [path, qs = ''] = h.split('?');
  return { path, query: Object.fromEntries(new URLSearchParams(qs)) };
}

export function ir(destino, { reemplazar = false } = {}) {
  const hash = '#' + destino;
  if (reemplazar) history.replaceState(null, '', hash);
  if (location.hash === hash) renderizar();
  else if (reemplazar) renderizar();
  else location.hash = hash;
}

export function recargar() {
  return renderizar({ mantenerScroll: true });
}

async function renderizar({ mantenerScroll = false } = {}) {
  const { path, query } = actual();
  const r = rutas.find(x => x.regex.test(path)) || rutas.find(x => x.patron === '/');
  const params = {};
  path.match(r.regex)?.slice(1).forEach((v, i) => { params[r.nombres[i]] = decodeURIComponent(v); });

  if (typeof limpiezaActual === 'function') { try { limpiezaActual(); } catch { /* ignorar */ } }
  limpiezaActual = null;
  const scroll = window.scrollY;
  // Si solo cambian los filtros (?…) de la misma pantalla, se conserva la posición.
  mantenerScroll = mantenerScroll || rutaAnterior === path;
  rutaAnterior = path;
  try {
    const vista = await r.carga();
    const nodo = document.createElement('div');
    nodo.className = 'vista';
    limpiezaActual = await vista.render(nodo, params, query);
    contenedor.replaceChildren(nodo);
    window.scrollTo(0, mantenerScroll ? scroll : 0);
    emit('ruta:cambio', { path, seccion: r.seccion });
    // Al cambiar de pantalla, el foco va al título (lectores de pantalla y teclado).
    const h1 = nodo.querySelector('h1');
    if (h1 && !mantenerScroll) {
      h1.setAttribute('tabindex', '-1');
      if (!primeraVez) h1.focus({ preventScroll: true });
    }
    primeraVez = false;
  } catch (e) {
    alFallar?.(e, contenedor);
  }
}

export function iniciar(elemento, { onError } = {}) {
  contenedor = elemento;
  alFallar = onError;
  window.addEventListener('hashchange', () => renderizar());
  return renderizar();
}
