/* Archivo Inteligente IA — arranque, navegación y eventos globales. */
(function () {
  'use strict';
  const AI = window.AI;
  const { html, icon, $, $$ } = AI;

  const ROUTES = [
    { id: 'dashboard', label: 'Inicio', icon: 'dashboard', mobile: true },
    { id: 'expedientes', label: 'Expedientes', icon: 'folder', mobile: true },
    { id: 'inventario', label: 'Inventario', icon: 'table', mobile: true },
    { id: 'transferencias', label: 'Transferencias', icon: 'transfer' },
    { id: 'asistente', label: 'Asistente ARCHI IA', short: 'ARCHI IA', icon: 'sparkles', mobile: true },
    { id: 'alertas', label: 'Alertas', icon: 'bell', badge: true },
    { id: 'informes', label: 'Informes', icon: 'report' },
    { id: 'productividad', label: 'Productividad', icon: 'gauge' },
    { id: 'configuracion', label: 'Configuración', icon: 'settings' },
  ];
  let current = 'dashboard';

  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, qs] = h.split('?');
    const params = {};
    if (qs) new URLSearchParams(qs).forEach((v, k) => { params[k] = v; });
    return { id: ROUTES.some((r) => r.id === path) ? path : 'dashboard', params };
  }

  function syncShell() {
    const alertas = AI.store.computeAlertas().filter((a) => !a.atendida).length;
    $('#nav').innerHTML = AI.fmt(html`<span class="sep">Gestión documental</span>${ROUTES.map((r, i) => html`${i === 6 ? html`<span class="sep">Análisis</span>` : ''}<a href="#/${r.id}" class="${r.id === current ? 'active' : ''}" ${r.id === current ? 'aria-current="page"' : ''}>${icon(r.icon)}<span>${r.label}</span>${r.badge && alertas ? html`<span class="badge">${alertas}</span>` : ''}</a>`)}`);
    $('#bottomnav').innerHTML = AI.fmt(html`${ROUTES.filter((r) => r.mobile).map((r) => html`<a href="#/${r.id}" class="${r.id === current ? 'active' : ''}">${icon(r.icon)}<span>${r.short || r.label}</span></a>`)}<button type="button" data-action="more-menu" class="${ROUTES.some((r) => !r.mobile && r.id === current) ? 'active' : ''}" aria-label="Más secciones">${icon('more')}<span>Más</span>${alertas ? html`<span class="dotn">${alertas}</span>` : ''}</button>`);
    const sel = $('#muni-select');
    sel.innerHTML = AI.fmt(Object.values(AI.catalog.MUNICIPIOS).map((m) => html`<option value="${m.id}" ${m.id === AI.state.config.municipio ? 'selected' : ''}>${m.nombre}</option>`));
    document.title = `Archivo Inteligente IA · ${AI.store.municipio().nombre} (demo)`;
    const logo = AI.state.config.logo;
    $$('.brand-mark, .brand-mini').forEach((el) => { el.classList.toggle('has-logo', !!logo); el.innerHTML = AI.fmt(logo ? html`<img src="${logo}" alt="Logo institucional (cargado localmente)">` : html`<svg viewBox="0 0 24 24"><use href="#i-archive"/></svg>`); });
  }

  function render() {
    const { id, params } = parseHash();
    current = id;
    const v = AI.views[id];
    $('#page-title').textContent = v.title;
    $('#page-sub').textContent = typeof v.sub === 'function' ? v.sub() : v.sub || '';
    syncShell();
    const root = $('#view');
    try { v.render(root, params); } catch (err) { console.error(err); root.innerHTML = AI.fmt(html`<div class="card empty">${icon('alert')}<p>Ocurrió un error al mostrar esta sección: ${err.message}</p></div>`); }
  }
  AI.refresh = () => { const y = window.scrollY; render(); window.scrollTo(0, y); };
  AI.go = (hash) => { if (location.hash === hash) render(); else location.hash = hash; window.scrollTo(0, 0); };
  AI.syncShell = syncShell;

  AI.actions['more-menu'] = () => {
    AI.openModal('Más secciones', html`<div class="list">${ROUTES.filter((r) => !r.mobile).map((r) => html`<a class="list-item" href="#/${r.id}" data-close style="text-decoration:none;color:inherit"><span class="dot">${icon(r.icon)}</span><div class="body"><div class="t">${r.label}</div></div>${icon('chevron')}</a>`)}</div>`);
  };

  function bind() {
    document.addEventListener('click', (e) => {
      const close = e.target.closest('[data-close]');
      if (close && close.closest('#modal')) { if (AI._onModalDismiss && !close.closest('#modal-foot [data-cd]')) { const f = AI._onModalDismiss; AI._onModalDismiss = null; f(); } AI.closeModal(); if (close.tagName !== 'A') return; }
      const el = e.target.closest('[data-action]');
      if (!el) return;
      const fn = AI.actions[el.dataset.action];
      if (!fn) return;
      e.preventDefault();
      Promise.resolve(fn(el, e)).catch((err) => { console.error(err); AI.toast('Error: ' + err.message, 'err'); });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !$('#modal').hidden) { if (AI._onModalDismiss) { const f = AI._onModalDismiss; AI._onModalDismiss = null; f(); } AI.closeModal(); }
    });
    window.addEventListener('hashchange', () => { AI.closeModal(); render(); window.scrollTo(0, 0); });
    $('#gsearch').addEventListener('submit', (e) => { e.preventDefault(); const q = AI.clean($('#gsearch-input').value, 80); AI.go('#/inventario?q=' + encodeURIComponent(q)); });
    $('#muni-select').addEventListener('change', async (e) => { AI.state.config.municipio = AI.catalog.MUNICIPIOS[e.target.value] ? e.target.value : 'generico'; await AI.store.saveConfig(); AI.toast('Demostración personalizada para ' + AI.store.municipio().nombre + '.'); AI.refresh(); });
    window.addEventListener('afterprint', () => { $('#print-area').innerHTML = ''; });
  }

  async function init() {
    try {
      await AI.store.load();
    } catch (err) {
      console.error(err);
      $('#view').innerHTML = AI.fmt(html`<div class="card empty">${icon('alert')}<p>No se pudieron cargar los datos: ${err.message}</p></div>`);
      return;
    }
    bind();
    render();
    if (AI.db.isMemory()) AI.toast('IndexedDB no está disponible: los datos se guardarán solo mientras la página esté abierta.', 'warn');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
