// Punto de entrada: abre la base de datos, carga la configuración, monta la navegación y el router.
import { abrir, solicitarPersistencia } from './data/db.js';
import * as config from './services/config.js';
import * as router from './core/router.js';
import { on } from './core/events.js';
import { instalarCapturaGlobal, mensajeAmigable } from './core/errors.js';
import { html, montar } from './ui/html.js';
import { icono } from './ui/icons.js';
import { toast } from './ui/dialogos.js';
import { t } from './core/i18n.js';
import { bloquear, instalarAutobloqueo } from './ui/bloqueo.js';
import * as instalacion from './services/instalacion.js';

const NAV = [
  { href: '#/', clave: 'nav.inicio', ico: 'inicio', seccion: 'inicio' },
  { href: '#/clientes', clave: 'nav.clientes', ico: 'clientes', seccion: 'clientes' },
  { href: '#/creditos', clave: 'nav.creditos', ico: 'creditos', seccion: 'creditos' },
  { href: '#/pagos', clave: 'nav.pagos', ico: 'pagos', seccion: 'pagos' },
  { href: '#/mas', clave: 'nav.mas', ico: 'mas', seccion: 'mas' },
];

const NAV_EXTRA = [
  { href: '#/cobranzas', clave: 'nav.cobranzas', ico: 'cobranza', seccion: 'cobranzas' },
  { href: '#/calendario', clave: 'nav.calendario', ico: 'calendario', seccion: 'calendario' },
  { href: '#/reportes', clave: 'nav.reportes', ico: 'tendencia', seccion: 'reportes' },
  { href: '#/copia', clave: 'nav.copia', ico: 'copia', seccion: 'copia' },
  { href: '#/configuracion', clave: 'nav.configuracion', ico: 'config', seccion: 'configuracion' },
];

const v = nombre => () => import(`./views/${nombre}.js`);

function definirRutas() {
  router.ruta('/', v('dashboard'), { seccion: 'inicio' });
  router.ruta('/bienvenida', v('bienvenida'), { seccion: 'bienvenida' });
  router.ruta('/clientes', v('clientes'), { seccion: 'clientes' });
  router.ruta('/clientes/nuevo', v('cliente-form'), { seccion: 'clientes' });
  router.ruta('/clientes/:id/editar', v('cliente-form'), { seccion: 'clientes' });
  router.ruta('/clientes/:id', v('cliente-perfil'), { seccion: 'clientes' });
  router.ruta('/creditos', v('creditos'), { seccion: 'creditos' });
  router.ruta('/creditos/nuevo', v('credito-form'), { seccion: 'creditos' });
  router.ruta('/creditos/:id', v('credito-detalle'), { seccion: 'creditos' });
  router.ruta('/pagos', v('pagos'), { seccion: 'pagos' });
  router.ruta('/pagos/nuevo', v('pago-form'), { seccion: 'pagos' });
  router.ruta('/recibos/:id', v('recibo'), { seccion: 'pagos' });
  router.ruta('/cobranzas', v('cobranzas'), { seccion: 'cobranzas' });
  router.ruta('/calendario', v('calendario'), { seccion: 'calendario' });
  router.ruta('/reportes', v('reportes'), { seccion: 'reportes' });
  router.ruta('/buscar', v('buscar'), { seccion: 'buscar' });
  router.ruta('/copia', v('copia'), { seccion: 'copia' });
  router.ruta('/seguridad', v('seguridad'), { seccion: 'seguridad' });
  router.ruta('/instalar', v('instalar'), { seccion: 'instalar' });
  router.ruta('/analista', v('analista-ia'), { seccion: 'analista' });
  router.ruta('/ayuda', v('ayuda'), { seccion: 'ayuda' });
  router.ruta('/mas', v('mas'), { seccion: 'mas' });
  router.ruta('/configuracion', v('configuracion'), { seccion: 'configuracion' });
}

function pintarNavegacion() {
  const item = (n, clase) => html`<a href="${n.href}" class="${clase}" data-seccion="${n.seccion}">${icono(n.ico)}<span>${t(n.clave)}</span></a>`;
  montar(document.getElementById('nav-inferior'), html`${NAV.map(n => item(n, 'nav-item'))}`);
  const lateral = [...NAV.filter(n => n.seccion !== 'mas'), ...NAV_EXTRA];
  montar(document.getElementById('nav-lateral'), html`${lateral.map(n => item(n, 'lateral-item'))}
    <a href="#/mas" class="lateral-item" data-seccion="mas">${icono('mas')}<span>${t('nav.masOpciones')}</span></a>`);
  document.getElementById('nav-inferior').setAttribute('aria-label', t('nav.principal'));
  document.querySelector('.indicador-offline').textContent = t('barra.sinConexion');
}

const EN_MAS = ['cobranzas', 'calendario', 'reportes', 'configuracion', 'copia', 'seguridad', 'instalar', 'analista', 'ayuda'];

function marcarActivo({ seccion }) {
  document.body.dataset.seccion = seccion || '';
  // En celular, las secciones que viven dentro de "Más" marcan esa pestaña.
  const enInferior = EN_MAS.includes(seccion) ? 'mas' : seccion;
  document.querySelectorAll('.nav-item').forEach(a => a.classList.toggle('activo', a.dataset.seccion === enInferior));
  document.querySelectorAll('.lateral-item').forEach(a => {
    const activo = a.dataset.seccion === seccion;
    a.classList.toggle('activo', activo);
    if (activo) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

function pintarCabecera() {
  const cfg = config.get();
  document.getElementById('nombre-negocio').textContent = cfg.nombreNegocio || '';
  montar(document.getElementById('btn-buscar'), icono('buscar'));
  const btn = document.getElementById('btn-ocultar');
  montar(btn, icono(cfg.ocultarValores ? 'ojo_no' : 'ojo'));
  btn.setAttribute('aria-pressed', String(!!cfg.ocultarValores));
  btn.setAttribute('aria-label', t(cfg.ocultarValores ? 'barra.mostrar' : 'barra.ocultar'));
  document.getElementById('btn-buscar').setAttribute('aria-label', t('barra.buscar'));
  btn.title = btn.getAttribute('aria-label');
}

function errorDeVista(e, contenedor) {
  console.error(e);
  montar(contenedor, html`<div class="vacio">
    <span class="vacio-ico">${icono('alerta')}</span>
    <h3>No pudimos mostrar esta pantalla</h3>
    <p>${mensajeAmigable(e, 'cargar esta pantalla')}</p>
    <button class="btn btn-pri" type="button" id="btn-reintentar">Reintentar</button>
    <a class="btn btn-sec" href="#/">Ir al inicio</a>
  </div>`);
  contenedor.querySelector('#btn-reintentar').onclick = () => router.recargar();
}

function vigilarConexion() {
  const pintar = () => document.body.classList.toggle('sin-conexion', !navigator.onLine);
  window.addEventListener('offline', () => { pintar(); toast(t('conexion.perdida'), 'info'); });
  window.addEventListener('online', () => { pintar(); toast(t('conexion.ok')); });
  pintar();
}

async function iniciar() {
  instalarCapturaGlobal();
  const main = document.getElementById('contenido');
  try {
    await abrir();
    await config.cargar();
  } catch (e) {
    errorDeVista(e, main);
    return;
  }
  definirRutas();
  pintarNavegacion();
  pintarCabecera();
  on('ruta:cambio', marcarActivo);
  on('config:cambio', pintarCabecera);

  document.getElementById('btn-ocultar').addEventListener('click', async () => {
    await config.guardar({ ocultarValores: !config.get().ocultarValores });
    router.recargar();
  });

  instalacion.escuchar();
  vigilarConexion();
  instalacion.registrarServiceWorker(activar => toast(t('version.nueva'), 'info', {
    accion: { texto: t('version.actualizar'), fn: activar }, duracion: 30000,
  }));

  await bloquear();
  instalarAutobloqueo();

  const { path } = router.actual();
  if (!config.get().configurado && !['/bienvenida', '/configuracion'].includes(path)) {
    history.replaceState(null, '', '#/bienvenida');
  }
  await router.iniciar(main, { onError: errorDeVista });
  solicitarPersistencia();
}

iniciar();
