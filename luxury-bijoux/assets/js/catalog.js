/* Catálogo: búsqueda, filtros, orden y carga progresiva sobre data/catalog.json */
(() => {
  'use strict';
  const LB = window.LB, root = LB.root;
  const grid = document.getElementById('grid');
  if (!grid) return;
  const $ = s => document.querySelector(s);
  const preset = JSON.parse(grid.dataset.preset || '{}');
  const params = new URLSearchParams(location.search);
  const state = {
    q: params.get('q') || '',
    cat: params.get('cat') ?? preset.cat ?? '',
    col: params.get('col') ?? preset.col ?? '',
    sort: params.get('orden') || (preset.nov ? 'new' : 'dest'),
    nov: !!preset.nov,
  };
  const PAGE = 36;
  let data, list = [], shown = 0;
  const qi = $('#f-q'), colSel = $('#f-col'), sortSel = $('#f-sort'), count = $('#count'), more = $('#more'), clear = $('#clear');
  const chips = [...document.querySelectorAll('.chip[data-cat]')];

  qi.value = state.q; sortSel.value = state.sort;

  const card = (o, i) => {
    const flags = o.flags, nov = flags & 2, out = flags & 4;
    const badge = out ? '<span class="badge out">Consultar reposición</span>' : nov ? '<span class="badge">Nuevo</span>' : '';
    const url = `${root}p/${o.id}/`;
    const price = LB.settings.mostrarPrecios && o.precio ? `<span class="price">${o.nprecios > 1 ? 'Desde ' : ''}${LB.price(o.precio)}</span>` : '';
    const catName = data.cats[o.cat] || '';
    return `<article class="card reveal" style="--i:${i % 8}">
 <a class="stretch" href="${url}" aria-label="Ver detalles de ${LB.esc(o.nombre)}"></a>
 <div class="ph">${badge}<img src="${root}${o.thumb}" alt="${LB.esc(o.nombre)} — ${LB.esc(catName)}" loading="lazy" decoding="async">${o.thumb2 ? `<img class="alt" src="${root}${o.thumb2}" alt="" loading="lazy" decoding="async">` : ''}</div>
 <div class="body"><span class="cat">${LB.esc(catName)}</span><h3>${LB.esc(o.nombre)}</h3><p class="desc">${LB.esc(o.desc)}</p>${price}
 <div class="acts"><a href="${url}">VER DETALLES</a><a class="wa" data-wa-product="${o.id}" data-name="${LB.esc(o.nombre)}" data-ref="${LB.esc(o.ref)}" href="${url}">CONSULTAR DISPONIBILIDAD</a></div></div>
</article>`;
  };

  const sorters = {
    dest: (a, b) => (b.flags & 1) - (a.flags & 1) || (b.flags & 2) - (a.flags & 2) || a.orden - b.orden,
    new: (a, b) => (b.fecha || '').localeCompare(a.fecha || '') || a.orden - b.orden,
    az: (a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }),
  };

  function compute() {
    let items = data.items;
    if (state.nov) items = items.filter(o => o.flags & 2);
    if (state.cat) items = items.filter(o => o.cat === state.cat);
    if (state.col) items = items.filter(o => o.col === state.col);
    if (state.q) items = LB.match(items, state.q);
    list = items.slice().sort(sorters[state.sort] || sorters.dest);
  }

  function renderMore() {
    const next = list.slice(shown, shown + PAGE);
    const html = next.map((o, i) => card(o, i)).join('');
    grid.insertAdjacentHTML('beforeend', html);
    LB.observe([...grid.querySelectorAll('.card.reveal:not(.in)')]);
    shown += next.length;
    more.hidden = shown >= list.length;
  }

  function syncUI() {
    chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.cat === state.cat)));
    colSel.value = state.col;
    const n = list.length;
    count.textContent = n ? `${n.toLocaleString('es-CO')} ${n === 1 ? 'pieza' : 'piezas'}` : '';
    clear.hidden = !(state.q || (state.cat && state.cat !== (preset.cat || '')) || (state.col && state.col !== (preset.col || '')));
    const p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.cat && state.cat !== (preset.cat || '')) p.set('cat', state.cat);
    if (state.col && state.col !== (preset.col || '')) p.set('col', state.col);
    if (state.sort !== (preset.nov ? 'new' : 'dest')) p.set('orden', state.sort);
    history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
  }

  function refresh(animate = true) {
    compute();
    const swap = () => {
      grid.innerHTML = ''; shown = 0;
      if (!list.length) {
        grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><h2>No encontramos piezas con esos filtros</h2><p>Quita algún filtro o busca por la referencia exacta. También puedes escribirnos y te ayudamos a encontrarla.</p><p><button class="btn btn--ghost" id="empty-clear">QUITAR FILTROS</button></p></div>`;
        document.getElementById('empty-clear').onclick = resetAll;
        more.hidden = true;
      } else renderMore();
      syncUI();
      grid.classList.remove('is-filtering');
    };
    if (animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) { grid.classList.add('is-filtering'); setTimeout(swap, 180); }
    else swap();
  }

  function resetAll() { state.q = ''; qi.value = ''; state.cat = preset.cat || ''; state.col = preset.col || ''; refresh(); }

  chips.forEach(c => c.addEventListener('click', () => { state.cat = c.dataset.cat; refresh(); }));
  colSel.addEventListener('change', () => { state.col = colSel.value; refresh(); });
  sortSel.addEventListener('change', () => { state.sort = sortSel.value; refresh(); });
  let t; qi.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { state.q = qi.value.trim(); refresh(); }, 180); });
  clear.addEventListener('click', resetAll);
  more.addEventListener('click', renderMore);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => { if (es[0].isIntersecting && data && shown < list.length) renderMore(); }, { rootMargin: '900px 0px' })
      .observe(document.getElementById('sentinel'));
  }

  Promise.all([LB.loadCatalog(), LB.ready]).then(([d]) => {
    data = d;
    // las categorías sin piezas visibles en este contexto se ocultan
    const ctx = state.col ? d.items.filter(o => o.col === state.col) : state.nov ? d.items.filter(o => o.flags & 2) : d.items;
    const present = new Set(ctx.map(o => o.cat));
    chips.forEach(c => { if (c.dataset.cat && !present.has(c.dataset.cat)) c.hidden = true; });
    refresh(false);
  }).catch(() => { count.textContent = 'No se pudo cargar el catálogo. Revisa tu conexión y recarga la página.'; });
})();
