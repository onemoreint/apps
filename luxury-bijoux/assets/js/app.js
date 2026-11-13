/* Luxury Bijoux — comportamiento común: menú, búsqueda, WhatsApp, revelado, parallax, formulario */
(() => {
  'use strict';
  const root = document.querySelector('meta[name=root]')?.content ?? '';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const LB = (window.LB = window.LB || {});
  LB.root = root;
  LB.settings = Object.assign({}, window.__SETTINGS__ || {});

  /* ---------- ajustes en vivo (el número de WhatsApp puede cambiar sin regenerar) ---------- */
  LB.ready = fetch(root + 'data/settings.json', { cache: 'no-cache' })
    .then(r => (r.ok ? r.json() : {}))
    .then(s => { Object.assign(LB.settings, s); applyWa(); return LB.settings; })
    .catch(() => LB.settings);

  /* ---------- utilidades ---------- */
  LB.norm = s => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  LB.esc = s => (s ?? '').toString().replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  LB.price = n => '$' + Number(n).toLocaleString('es-CO');
  LB.toast = msg => {
    const t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('on');
    clearTimeout(LB._tt); LB._tt = setTimeout(() => t.classList.remove('on'), 2600);
  };
  LB.absUrl = path => new URL(path, location.href).href;

  /* ---------- WhatsApp ---------- */
  const waNumber = () => (LB.settings.whatsapp || '').replace(/\D/g, '');
  LB.waLink = text => {
    const n = waNumber();
    return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
  };
  LB.productMessage = (name, ref, url) => {
    const label = ref && !name.includes(ref) ? `${name} (Ref. ${ref})` : name;
    const tpl = LB.settings.mensajeWhatsapp || 'Hola, me interesa el producto {producto}.';
    return tpl.replace('{producto}', label) + (url ? `\n${url}` : '');
  };
  function applyWa() {
    const general = LB.waLink(LB.settings.mensajeWhatsappGeneral || 'Hola, estoy visitando su catálogo.');
    $$('[data-wa]').forEach(a => {
      if (general) { a.href = general; a.target = '_blank'; a.rel = 'noopener'; }
      else { a.href = root + '#contacto'; a.removeAttribute('target'); }
    });
  }
  applyWa();
  document.addEventListener('click', ev => {
    const btn = ev.target.closest('[data-wa-product]');
    if (!btn) return;
    const url = LB.absUrl(root + 'p/' + btn.dataset.waProduct + '/');
    const link = LB.waLink(LB.productMessage(btn.dataset.name, btn.dataset.ref, url));
    ev.preventDefault();
    if (link) window.open(link, '_blank', 'noopener');
    else {
      LB.toast('Aún no hay un número de WhatsApp configurado. Usa el formulario de contacto.');
      const f = $('#contact-form');
      if (f) { f.pieza.value = btn.dataset.ref ? `${btn.dataset.name} (Ref. ${btn.dataset.ref})` : btn.dataset.name; f.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }
      else setTimeout(() => (location.href = root + '#contacto'), 1400);
    }
  });

  /* ---------- cabecera ---------- */
  const header = $('.site-header');
  const onScroll = () => header && header.classList.toggle('is-solid', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- menú móvil ---------- */
  const drawer = $('#drawer'), menuBtn = $('[data-open-menu]');
  const setMenu = open => {
    if (!drawer) return;
    drawer.classList.toggle('open', open); drawer.setAttribute('aria-hidden', !open);
    menuBtn?.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) drawer.querySelector('a')?.focus(); else menuBtn?.focus();
    $$('a', drawer).forEach((a, i) => (a.style.transitionDelay = open ? `${80 + i * 40}ms` : '0ms'));
  };
  menuBtn?.addEventListener('click', () => setMenu(true));
  $('[data-close-menu]')?.addEventListener('click', () => setMenu(false));
  drawer?.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });

  /* ---------- índice del catálogo (compartido por búsqueda y catálogo) ---------- */
  LB.loadCatalog = () => (LB._cat ||= fetch(root + 'data/catalog.json').then(r => r.json()).then(d => {
    const F = ['id', 'nombre', 'ref', 'cat', 'col', 'thumb', 'thumb2', 'flags', 'fecha', 'orden', 'extra', 'precio', 'nprecios', 'desc'];
    d.items = d.p.map(r => { const o = {}; F.forEach((k, i) => (o[k] = r[i])); return o; });
    d.items.forEach(o => (o.hay = LB.norm([o.nombre, o.ref, o.id, d.cats[o.cat], d.cols[o.col], o.extra].join(' '))));
    return d;
  }));
  LB.match = (items, q) => {
    const terms = LB.norm(q).split(/\s+/).filter(Boolean);
    if (!terms.length) return items;
    return items.filter(o => terms.every(t => o.hay.includes(t)));
  };

  /* ---------- búsqueda global ---------- */
  const layer = $('#search'), qi = $('#q'), qr = $('#q-results'), qh = $('#q-hint');
  const openSearch = () => {
    if (!layer) return;
    layer.classList.add('open'); layer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; setTimeout(() => qi.focus(), 60);
    LB.loadCatalog();
  };
  const closeSearch = () => { layer?.classList.remove('open'); layer?.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; };
  $$('[data-open-search]').forEach(b => b.addEventListener('click', openSearch));
  $('[data-close-search]')?.addEventListener('click', closeSearch);
  layer?.addEventListener('click', e => { if (e.target === layer) closeSearch(); });
  let st;
  qi?.addEventListener('input', () => {
    clearTimeout(st);
    st = setTimeout(async () => {
      const d = await LB.loadCatalog(); const q = qi.value.trim();
      if (!q) { qr.innerHTML = ''; qh.textContent = 'Busca por nombre, referencia, categoría, colección o característica.'; return; }
      const res = LB.match(d.items, q);
      qh.innerHTML = res.length ? `${res.length.toLocaleString('es-CO')} resultados. <a class="link" href="${root}catalogo/?q=${encodeURIComponent(q)}">Ver todos en el catálogo</a>`
        : 'Sin resultados. Prueba con otra palabra o con la referencia exacta.';
      qr.innerHTML = res.slice(0, 18).map(o => `<a href="${root}p/${o.id}/"><img src="${root}${o.thumb}" alt="" loading="lazy"><span>${LB.esc(o.nombre)}</span></a>`).join('');
    }, 140);
  });
  qi?.addEventListener('keydown', e => { if (e.key === 'Enter' && qi.value.trim()) location.href = `${root}catalogo/?q=${encodeURIComponent(qi.value.trim())}`; });
  addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeSearch(); setMenu(false); }
    if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
  });

  /* ---------- aparición progresiva ---------- */
  LB.observe = els => {
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('in')); return; }
    LB._io ||= new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); LB._io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach(el => LB._io.observe(el));
  };
  LB.observe($$('.reveal'));

  /* ---------- parallax sutil ---------- */
  const para = $$('[data-speed]');
  if (para.length && !reduce) {
    let ticking = false;
    const run = () => {
      para.forEach(el => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        const c = r.top + r.height / 2 - innerHeight / 2;
        el.style.transform = `translate3d(0,${(c * parseFloat(el.dataset.speed)).toFixed(1)}px,0)`;
      });
      ticking = false;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } }, { passive: true });
    run();
  }

  /* ---------- formulario de contacto: compone el mensaje y lo abre en WhatsApp o correo ---------- */
  const form = $('#contact-form');
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    await LB.ready;
    const msg = $('#form-msg');
    const d = Object.fromEntries(new FormData(form));
    if (!d.nombre.trim() || !d.mensaje.trim()) { msg.textContent = 'Escribe tu nombre y tu mensaje para poder enviarlo.'; return; }
    const text = `Hola, soy ${d.nombre.trim()}${d.ciudad ? ' de ' + d.ciudad.trim() : ''}.\n${d.pieza ? 'Me interesa: ' + d.pieza.trim() + '\n' : ''}${d.mensaje.trim()}`;
    const wa = LB.waLink(text);
    if (wa) { window.open(wa, '_blank', 'noopener'); msg.textContent = 'Abrimos WhatsApp con tu mensaje listo para enviar.'; return; }
    if (LB.settings.email) { location.href = `mailto:${LB.settings.email}?subject=${encodeURIComponent('Consulta desde el catálogo')}&body=${encodeURIComponent(text)}`; msg.textContent = 'Abrimos tu correo con el mensaje listo para enviar.'; return; }
    try { await navigator.clipboard.writeText(text); } catch (_) {}
    msg.textContent = 'El canal de contacto aún no está configurado. Copiamos tu mensaje para que lo envíes cuando quieras.';
  });

  /* ---------- carga ---------- */
  const loader = $('#loader');
  if (loader) {
    const done = () => { loader.classList.add('done'); setTimeout(() => loader.remove(), 900); };
    if (document.readyState === 'complete') done(); else { addEventListener('load', done); setTimeout(done, 1600); }
  }
})();
