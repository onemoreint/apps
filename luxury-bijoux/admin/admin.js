/* Panel administrativo de Luxury Bijoux
   - Modo GitHub: lee y escribe site/data/*.json y fotos en el repositorio mediante la API de GitHub.
     El token se guarda solo en sessionStorage (se borra al cerrar la pestaña). Nunca se escribe en el código.
   - Modo local: edita en el navegador y descarga un ZIP con los archivos actualizados. */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => (s ?? '').toString().replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const slug = s => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 3200); };

  let BASE = 'site/';             // carpeta del sitio dentro del repositorio (settings.admin.ruta)
  const FILES = ['products.json', 'categories.json', 'collections.json', 'settings.json'];
  const S = { mode: null, gh: null, products: [], categories: [], collections: {}, settings: {}, uploads: new Map(), dirty: new Set(), page: 0 };

  /* ---------------- GitHub ---------------- */
  const gh = async (path, opt = {}) => {
    const r = await fetch(`https://api.github.com/repos/${S.gh.repo}${path}`, {
      ...opt, headers: { Authorization: `Bearer ${S.gh.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(opt.headers || {}) },
    });
    if (!r.ok) { const t = await r.text(); throw new Error(`GitHub ${r.status}: ${t.slice(0, 160)}`); }
    return opt.raw ? r.text() : r.json();
  };
  const readRepoJson = async name => JSON.parse(await gh(`/contents/${BASE}data/${name}?ref=${encodeURIComponent(S.gh.branch)}`, { raw: true, headers: { Accept: 'application/vnd.github.raw+json' } }));

  const readRuta = () => fetch('../data/settings.json', { cache: 'no-cache' }).then(r => r.json()).then(s => { if (s.admin && s.admin.ruta != null) BASE = s.admin.ruta; return s; }).catch(() => ({}));
  async function connect(repo, branch, token) {
    await readRuta();
    S.gh = { repo: repo.trim().replace(/^https:\/\/github.com\//, '').replace(/\/$/, ''), branch: branch.trim(), token: token.trim() };
    const info = await gh('');
    if (!info.permissions?.push) throw new Error('El token no tiene permiso de escritura en este repositorio.');
    sessionStorage.setItem('lb-admin', JSON.stringify(S.gh));
    S.mode = 'github';
    const [p, c, k, s] = await Promise.all(FILES.map(readRepoJson));
    Object.assign(S, { products: p, categories: c, collections: k, settings: s });
  }
  async function loadLocal() {
    S.mode = 'local';
    const [p, c, k, s] = await Promise.all(FILES.map(f => fetch(`../data/${f}`, { cache: 'no-cache' }).then(r => r.json())));
    Object.assign(S, { products: p, categories: c, collections: k, settings: s });
  }

  const b64 = buf => { let s = ''; const b = new Uint8Array(buf); for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
  const enc = str => new TextEncoder().encode(str);
  const jsonFiles = () => {
    const out = {};
    if (S.dirty.has('products.json')) out['data/products.json'] = JSON.stringify(S.products);
    if (S.dirty.has('categories.json')) out['data/categories.json'] = JSON.stringify(S.categories, null, 1);
    if (S.dirty.has('collections.json')) out['data/collections.json'] = JSON.stringify(S.collections, null, 1);
    if (S.dirty.has('settings.json')) out['data/settings.json'] = JSON.stringify(S.settings, null, 1);
    return out;
  };

  async function publishGithub() {
    const files = jsonFiles();
    const total = Object.keys(files).length + S.uploads.size;
    if (!total) { toast('No hay cambios por publicar.'); return; }
    const prog = progress('Publicando cambios', 'Preparando…');
    try {
      const ref = await gh(`/git/ref/heads/${encodeURIComponent(S.gh.branch)}`);
      const base = await gh(`/git/commits/${ref.object.sha}`);
      const tree = []; let n = 0;
      const blob = async (path, content, encoding) => {
        const r = await gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content, encoding }) });
        tree.push({ path: BASE + path, mode: '100644', type: 'blob', sha: r.sha });
        prog(`Subiendo archivos ${++n} de ${total}…`);
      };
      for (const [path, buf] of S.uploads) await blob(path, b64(buf), 'base64');
      for (const [path, txt] of Object.entries(files)) await blob(path, b64(enc(txt)), 'base64');
      const t = await gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: base.tree.sha, tree }) });
      const c = await gh('/git/commits', { method: 'POST', body: JSON.stringify({ message: `Catálogo: actualización desde el panel (${new Date().toLocaleString('es-CO')})`, tree: t.sha, parents: [ref.object.sha] }) });
      await gh(`/git/refs/heads/${encodeURIComponent(S.gh.branch)}`, { method: 'PATCH', body: JSON.stringify({ sha: c.sha }) });
      S.uploads.clear(); S.dirty.clear(); markDirty();
      prog.done('Cambios publicados', 'GitHub está regenerando el sitio. Estará visible en 2 a 4 minutos.');
    } catch (e) { prog.done('No se pudo publicar', e.message + ' — Tus cambios siguen aquí; vuelve a intentarlo.'); }
  }

  /* ---------------- ZIP (sin compresión) para modo local ---------------- */
  const crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = crcT[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function zip(entries) {
    const parts = [], central = []; let off = 0;
    for (const [name, data] of entries) {
      const nb = enc(name), crc = crc32(data), h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint32(14, crc, true);
      h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nb.length, true);
      parts.push(h.buffer, nb, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint32(16, crc, true);
      c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nb.length, true); c.setUint32(42, off, true);
      central.push(c.buffer, nb); off += 30 + nb.length + data.length;
    }
    const csize = central.reduce((a, b) => a + b.byteLength, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, entries.length, true); e.setUint16(10, entries.length, true); e.setUint32(12, csize, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...central, e.buffer], { type: 'application/zip' });
  }
  const download = (blob, name) => { const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  function downloadZip() {
    S.dirty.add('products.json'); S.dirty.add('categories.json'); S.dirty.add('collections.json'); S.dirty.add('settings.json');
    const entries = Object.entries(jsonFiles()).map(([p, t]) => [p, enc(t)]);
    for (const [p, b] of S.uploads) entries.push([p, new Uint8Array(b)]);
    download(zip(entries), `catalogo-cambios-${new Date().toISOString().slice(0, 10)}.zip`);
  }

  /* ---------------- interfaz general ---------------- */
  function progress(title, msg) {
    const el = document.createElement('div'); el.className = 'progress';
    el.innerHTML = `<div><h3>${esc(title)}</h3><p>${esc(msg)}</p></div>`; document.body.append(el);
    const f = m => (el.querySelector('p').textContent = m);
    f.done = (t, m) => { el.querySelector('h3').textContent = t; f(m); const b = document.createElement('button'); b.className = 'btn btn--light'; b.textContent = 'ENTENDIDO'; b.onclick = () => el.remove(); el.firstChild.append(b); };
    return f;
  }
  const markDirty = file => { if (file) S.dirty.add(file); $('#dirty').hidden = !S.dirty.size && !S.uploads.size; };
  addEventListener('beforeunload', e => { if (S.dirty.size || S.uploads.size) { e.preventDefault(); e.returnValue = ''; } });

  $$('[data-tab]').forEach(b => b.addEventListener('click', () => {
    $$('[data-tab]').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    $$('[data-panel]').forEach(p => (p.hidden = p.dataset.panel !== b.dataset.tab));
    ({ categorias: renderCats, colecciones: renderCols, ajustes: renderSettings })[b.dataset.tab]?.();
  }));

  const imgURL = path => (S.uploads.has(path) ? URL.createObjectURL(new Blob([S.uploads.get(path)], { type: 'image/webp' })) : '../' + path);
  const catName = id => S.categories.find(c => c.id === id)?.nombre || id;

  /* ---------------- productos ---------------- */
  const PER = 48;
  function filtered() {
    const q = norm($('#p-q').value), cat = $('#p-cat').value, col = $('#p-col').value, flag = $('#p-flag').value;
    return S.products.filter(p => (!cat || p.categoria === cat) && (!col || p.coleccion === col) && (!flag || p[flag]) &&
      (!q || norm(`${p.nombre} ${p.referencia || ''} ${p.id}`).includes(q)));
  }
  function renderList() {
    const list = filtered(), pages = Math.max(1, Math.ceil(list.length / PER));
    S.page = Math.min(S.page, pages - 1);
    $('#p-count').textContent = `${list.length.toLocaleString('es-CO')} productos`;
    $('#p-page').textContent = `Página ${S.page + 1} de ${pages}`;
    $('#p-prev').disabled = S.page === 0; $('#p-next').disabled = S.page >= pages - 1;
    $('#p-list').innerHTML = list.slice(S.page * PER, S.page * PER + PER).map(p => {
      const im = p.imagenes?.[0];
      const tags = ['destacado', 'novedad', 'agotado', 'oculto'].filter(k => p[k]).map(k => `<span class="tag on">${k}</span>`).join('');
      return `<button class="adm-item" data-id="${esc(p.id)}">${im ? `<img src="${imgURL(im.thumb)}" alt="" loading="lazy">` : '<img alt="">'}<div><b>${esc(p.nombre)}</b><small>${esc(catName(p.categoria))} · ${esc(p.id)}</small><span class="tags">${tags}</span></div></button>`;
    }).join('');
  }
  ['#p-q', '#p-cat', '#p-col', '#p-flag'].forEach(s => $(s).addEventListener('input', () => { S.page = 0; renderList(); }));
  $('#p-prev').onclick = () => { S.page--; renderList(); scrollTo(0, 0); };
  $('#p-next').onclick = () => { S.page++; renderList(); scrollTo(0, 0); };
  $('#p-list').addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) openEditor(b.dataset.id); });
  $('#p-new').onclick = () => openEditor(null);

  function fillSelects() {
    const cats = S.categories.map(c => `<option value="${esc(c.id)}">${esc(c.nombre)}</option>`).join('');
    const cols = Object.entries(S.collections).map(([k, v]) => `<option value="${esc(k)}">${esc(v.nombre)}</option>`).join('');
    $('#p-cat').innerHTML = '<option value="">Todas las categorías</option>' + cats;
    $('#p-col').innerHTML = '<option value="">Todas las colecciones</option>' + cols;
    $('#e-form').categoria.innerHTML = cats; $('#e-form').coleccion.innerHTML = cols;
  }

  let editing = null, draftImgs = [];
  function openEditor(id) {
    const f = $('#e-form');
    editing = id ? S.products.find(p => p.id === id) : null;
    const p = editing || { nombre: '', referencia: '', categoria: S.categories[0]?.id, coleccion: Object.keys(S.collections)[0], medidas: [], precios: [], imagenes: [] };
    $('#e-title').textContent = editing ? 'Editar producto' : 'Nuevo producto';
    f.nombre.value = p.nombre; f.referencia.value = p.referencia || ''; f.categoria.value = p.categoria; f.coleccion.value = p.coleccion;
    f.medidas.value = (p.medidas || []).join(' | '); f.precios.value = (p.precios || []).join(' | ');
    f.descripcion.value = p.descripcion || ''; f.caracteristicas.value = p.caracteristicas || ''; f.detalle.value = p.detalle || '';
    ['destacado', 'novedad', 'agotado', 'oculto'].forEach(k => (f[k].checked = !!p[k]));
    draftImgs = (p.imagenes || []).map(i => ({ ...i }));
    renderImgs();
    const src = p.fuente;
    $('#e-src').textContent = src ? `Fuente: ${src.tipo}${src.archivo ? ' · ' + src.archivo : ''}${src.pagina ? ', página ' + src.pagina : ''}${src.url ? ' · ' + src.url : ''}` : '';
    $('#e-del').hidden = !editing;
    $('#editor').showModal();
  }
  function renderImgs() {
    $('#e-imgs').innerHTML = draftImgs.map((im, i) => `<figure><img src="${imgURL(im.thumb)}" alt=""><div><button type="button" data-mv="${i}" title="Mover a la izquierda">◀</button><button type="button" data-rm="${i}">Quitar</button></div></figure>`).join('') || '<p class="src">Sin fotos.</p>';
  }
  $('#e-imgs').addEventListener('click', e => {
    const mv = e.target.dataset.mv, rm = e.target.dataset.rm;
    if (mv > 0) { const i = +mv; [draftImgs[i - 1], draftImgs[i]] = [draftImgs[i], draftImgs[i - 1]]; }
    if (rm !== undefined) draftImgs.splice(+rm, 1);
    renderImgs();
  });
  async function toWebp(file, max, q) {
    const bm = await createImageBitmap(file);
    const s = Math.min(1, max / Math.max(bm.width, bm.height));
    const c = document.createElement('canvas'); c.width = Math.round(bm.width * s); c.height = Math.round(bm.height * s);
    c.getContext('2d').drawImage(bm, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/webp', q));
    return { buf: await blob.arrayBuffer(), w: c.width, h: c.height };
  }
  $('#e-upload').addEventListener('change', async e => {
    const id = editing?.id || 'nuevo-' + Date.now().toString(36);
    for (const file of e.target.files) {
      const k = `${id}-u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
      const full = await toWebp(file, 1000, 0.78), th = await toWebp(file, 440, 0.72);
      const src = `assets/products/${k}.webp`, thumb = `assets/products/thumb/${k}.webp`;
      S.uploads.set(src, full.buf); S.uploads.set(thumb, th.buf);
      draftImgs.push({ src, thumb, w: full.w, h: full.h });
    }
    e.target.value = ''; renderImgs(); markDirty();
  });
  const list = v => v.split('|').map(s => s.trim()).filter(Boolean);
  $('#e-form').addEventListener('submit', e => {
    if (e.submitter?.value !== 'save') return;
    const f = e.target;
    if (!f.nombre.value.trim()) { e.preventDefault(); f.nombre.focus(); return; }
    let p = editing;
    if (!p) {
      const base = slug(f.coleccion.value || 'producto');
      let n = S.products.filter(x => x.coleccion === f.coleccion.value).length + 1, id;
      do id = `${base}-${String(n++).padStart(3, '0')}`; while (S.products.some(x => x.id === id));
      p = { id, colecciones: [f.coleccion.value], fuente: { tipo: 'Panel' }, orden: S.products.length };
      S.products.unshift(p);
    }
    Object.assign(p, {
      nombre: f.nombre.value.trim(), referencia: f.referencia.value.trim() || null, categoria: f.categoria.value, coleccion: f.coleccion.value,
      medidas: list(f.medidas.value), precios: list(f.precios.value).map(x => parseInt(x.replace(/\D/g, ''), 10)).filter(Boolean),
      descripcion: f.descripcion.value.trim(), caracteristicas: f.caracteristicas.value.trim(), detalle: f.detalle.value.trim(), imagenes: draftImgs,
    });
    ['destacado', 'novedad', 'agotado', 'oculto'].forEach(k => (p[k] = f[k].checked));
    if (!p.colecciones?.includes(p.coleccion)) p.colecciones = [p.coleccion, ...(p.colecciones || [])];
    markDirty('products.json'); renderList(); toast('Producto guardado. Recuerda publicar los cambios.');
  });
  $('#e-del').onclick = () => {
    if (!editing || !confirm(`¿Eliminar «${editing.nombre}»? Esta acción se aplica al publicar.`)) return;
    S.products.splice(S.products.indexOf(editing), 1);
    markDirty('products.json'); $('#editor').close(); renderList(); toast('Producto eliminado.');
  };

  /* ---------------- categorías ---------------- */
  function renderCats() {
    const count = id => S.products.filter(p => p.categoria === id && !p.oculto).length;
    $('#c-list').innerHTML = S.categories.slice().sort((a, b) => a.orden - b.orden).map(c => `
     <div class="adm-card" data-cat="${esc(c.id)}">
      <label>Nombre<input data-k="nombre" value="${esc(c.nombre)}"></label>
      <label>Descripción<textarea data-k="descripcion" rows="2">${esc(c.descripcion)}</textarea></label>
      <div class="row"><label>Orden<input data-k="orden" type="number" value="${c.orden}" style="width:90px"></label>
      <label>Portada (id de producto)<input data-k="portadaId" placeholder="p. ej. anillos-078" style="width:200px"></label></div>
      <div class="cover">${c.portada ? `<img src="../${esc(c.portada)}" alt="">` : ''}<label><input type="checkbox" data-k="visible" ${c.visible !== false ? 'checked' : ''}> Visible</label><small>${count(c.id)} productos · id: ${esc(c.id)}</small></div>
     </div>`).join('');
  }
  $('#c-list').addEventListener('change', e => {
    const card = e.target.closest('[data-cat]'), c = S.categories.find(x => x.id === card.dataset.cat), k = e.target.dataset.k;
    if (k === 'portadaId') { const p = S.products.find(x => x.id === e.target.value.trim()); if (!p?.imagenes?.length) { toast('No encontré ese producto o no tiene fotos.'); return; } c.portada = p.imagenes[0].src; renderCats(); }
    else c[k] = k === 'visible' ? e.target.checked : k === 'orden' ? +e.target.value : e.target.value;
    markDirty('categories.json');
  });
  $('#c-new').onclick = () => {
    const nombre = prompt('Nombre de la nueva categoría'); if (!nombre) return;
    const id = slug(nombre); if (S.categories.some(c => c.id === id)) { toast('Ya existe una categoría con ese nombre.'); return; }
    S.categories.push({ id, nombre, descripcion: '', orden: S.categories.length + 1, visible: true, portada: null });
    markDirty('categories.json'); fillSelects(); renderCats();
  };

  /* ---------------- colecciones ---------------- */
  function renderCols() {
    const cats = S.categories.map(c => `<option value="${esc(c.id)}">${esc(c.nombre)}</option>`).join('');
    $('#k-list').innerHTML = Object.entries(S.collections).map(([k, v]) => `
     <div class="adm-card" data-col="${esc(k)}">
      <label>Nombre<input data-k="nombre" value="${esc(v.nombre)}"></label>
      <div class="row"><label>Categoría<select data-k="categoria">${cats.replace(`value="${esc(v.categoria)}"`, `value="${esc(v.categoria)}" selected`)}</select></label>
      <label>Fecha<input data-k="fecha" type="date" value="${esc(v.fecha || '')}"></label></div>
      <small>${S.products.filter(p => p.coleccion === k).length} productos · ${esc(v.fuente?.archivo || v.fuente?.url || v.fuente?.tipo || '')}</small>
     </div>`).join('');
  }
  $('#k-list').addEventListener('change', e => {
    const k = e.target.closest('[data-col]').dataset.col; S.collections[k][e.target.dataset.k] = e.target.value; markDirty('collections.json');
  });
  $('#k-new').onclick = () => {
    const nombre = prompt('Nombre de la nueva colección'); if (!nombre) return;
    const id = slug(nombre); if (S.collections[id]) { toast('Ya existe esa colección.'); return; }
    S.collections[id] = { id, nombre, categoria: S.categories[0]?.id, fecha: new Date().toISOString().slice(0, 10), fuente: { tipo: 'Panel' } };
    markDirty('collections.json'); fillSelects(); renderCols();
  };

  /* ---------------- ajustes ---------------- */
  const FIELDS = [
    ['h3', 'Contacto'],
    ['whatsapp', 'Número de WhatsApp (con indicativo, p. ej. +57 300 000 0000)'], ['email', 'Correo de contacto'],
    ['instagram', 'Instagram (URL)'], ['facebook', 'Facebook (URL)'], ['tiktok', 'TikTok (URL)'],
    ['mensajeWhatsapp', 'Mensaje para productos ({producto} se reemplaza por nombre y referencia)', 'area'],
    ['mensajeWhatsappGeneral', 'Mensaje general de WhatsApp', 'area'],
    ['h3', 'Sitio'], ['marca', 'Nombre de la marca'], ['siteUrl', 'Dirección pública del sitio (para sitemap y redes), p. ej. https://midominio.com'],
    ['mostrarPrecios', 'Mostrar los precios de los catálogos en el sitio', 'check'],
    ['h3', 'Textos de la portada'],
    ['textos.heroTitulo', 'Frase principal'], ['textos.heroSubtitulo', 'Subtítulo', 'area'], ['textos.heroBoton1', 'Botón principal'], ['textos.heroBoton2', 'Botón secundario'],
    ['textos.editorial1Titulo', 'Editorial 1: título'], ['textos.editorial1Texto', 'Editorial 1: texto', 'area'],
    ['textos.macroTitulo', 'Banda de imagen: título'], ['textos.macroTexto', 'Banda de imagen: texto', 'area'],
    ['textos.editorial2Titulo', 'Editorial 2: título'], ['textos.editorial2Texto', 'Editorial 2: texto', 'area'],
    ['textos.coleccionesTitulo', 'Título de colecciones'], ['textos.cierreTitulo', 'Título del buscador'], ['textos.cierreTexto', 'Texto del buscador', 'area'],
    ['textos.contactoTitulo', 'Contacto: título'], ['textos.contactoTexto', 'Contacto: texto', 'area'], ['textos.seoDescripcion', 'Descripción para Google', 'area'],
    ['h3', 'Fotos de la portada (ids de producto separados por coma)'],
    ['home.hero', 'Vitrina principal (3 ids)', 'ids'], ['home.editorial1', 'Editorial 1 (2 ids)', 'ids'], ['home.editorial2', 'Editorial 2 (2 ids)', 'ids'], ['home.macro', 'Banda de imagen (1 id)'],
  ];
  const getK = (o, k) => k.split('.').reduce((a, b) => a?.[b], o);
  const setK = (o, k, v) => { const ks = k.split('.'); const last = ks.pop(); ks.reduce((a, b) => (a[b] ||= {}), o)[last] = v; };
  function renderSettings() {
    $('#s-form').innerHTML = FIELDS.map(([k, label, type]) => {
      if (k === 'h3') return `<h3>${esc(label)}</h3>`;
      const v = getK(S.settings, k);
      if (type === 'check') return `<label class="full" style="display:flex;gap:.5rem;align-items:center"><input type="checkbox" data-k="${k}" ${v ? 'checked' : ''}> ${esc(label)}</label>`;
      if (type === 'area') return `<label class="full">${esc(label)}<textarea data-k="${k}" rows="2">${esc(v)}</textarea></label>`;
      return `<label>${esc(label)}<input data-k="${k}" data-type="${type || ''}" value="${esc(Array.isArray(v) ? v.join(', ') : v)}"></label>`;
    }).join('');
  }
  $('#s-form').addEventListener('change', e => {
    const k = e.target.dataset.k; if (!k) return;
    let v = e.target.type === 'checkbox' ? e.target.checked : e.target.value.trim();
    if (e.target.dataset.type === 'ids') v = v.split(',').map(s => s.trim()).filter(Boolean);
    if (k === 'whatsapp' && v && v.replace(/\D/g, '').length < 10) toast('Revisa el número: incluye el indicativo del país.');
    setK(S.settings, k, v); markDirty('settings.json');
  });

  /* ---------------- importar / exportar ---------------- */
  const COLS_CSV = ['id', 'nombre', 'referencia', 'categoria', 'coleccion', 'medidas', 'precios', 'descripcion', 'caracteristicas', 'imagenes', 'destacado', 'novedad', 'oculto', 'agotado'];
  const csvCell = v => { v = v == null ? '' : String(v); return /[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
  function toCSV(rows) {
    return '﻿' + [COLS_CSV.join(',')].concat(rows.map(p => COLS_CSV.map(k => {
      if (k === 'imagenes') return csvCell((p.imagenes || []).map(i => i.src).join('|'));
      if (Array.isArray(p[k])) return csvCell(p[k].join('|'));
      if (typeof p[k] === 'boolean') return p[k] ? 'si' : '';
      return csvCell(p[k]);
    }).join(','))).join('\n');
  }
  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    const sep = (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
      else if (ch === '"') q = true;
      else if (ch === sep) { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    const head = rows.shift().map(h => norm(h.trim()));
    return rows.filter(r => r.some(c => c.trim())).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])));
  }
  const truthy = v => v === true || /^(si|sí|1|true|x|yes)$/i.test(String(v ?? '').trim());
  function importRows(rows) {
    let upd = 0, add = 0, skip = 0;
    for (const r of rows) {
      if (!r.nombre && !r.id) { skip++; continue; }
      let p = r.id && S.products.find(x => x.id === r.id);
      if (!p) {
        if (!r.nombre) { skip++; continue; }
        const col = r.coleccion || Object.keys(S.collections)[0];
        let id = r.id || `${slug(col)}-i${Date.now().toString(36)}${add}`;
        p = { id, colecciones: [col], fuente: { tipo: 'Importación' }, orden: S.products.length, imagenes: [] };
        S.products.push(p); add++;
      } else upd++;
      const arr = v => (Array.isArray(v) ? v : String(v).split('|').map(s => s.trim()).filter(Boolean));
      for (const k of ['nombre', 'referencia', 'categoria', 'coleccion', 'descripcion', 'caracteristicas']) if (r[k] !== undefined && r[k] !== '') p[k] = r[k];
      if (r.medidas !== undefined && r.medidas !== '') p.medidas = arr(r.medidas);
      if (r.precios !== undefined && r.precios !== '') p.precios = arr(r.precios).map(x => parseInt(String(x).replace(/\D/g, ''), 10)).filter(Boolean);
      if (r.imagenes) p.imagenes = arr(r.imagenes).map(x => typeof x === 'object' ? x : { src: x, thumb: x, w: 1000, h: 1000 });
      for (const k of ['destacado', 'novedad', 'oculto', 'agotado']) if (r[k] !== undefined) p[k] = truthy(r[k]);
      if (p.categoria && !S.categories.some(c => c.id === p.categoria)) { S.categories.push({ id: p.categoria, nombre: p.categoria, descripcion: '', orden: S.categories.length + 1, visible: true }); markDirty('categories.json'); }
      if (p.coleccion && !S.collections[p.coleccion]) { S.collections[p.coleccion] = { id: p.coleccion, nombre: p.coleccion, categoria: p.categoria, fecha: new Date().toISOString().slice(0, 10), fuente: { tipo: 'Importación' } }; markDirty('collections.json'); }
    }
    markDirty('products.json'); fillSelects(); renderList();
    return `Importación lista: ${add} nuevos, ${upd} actualizados${skip ? `, ${skip} filas sin nombre omitidas` : ''}. Publica para aplicar.`;
  }
  $('#imp-file').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const txt = await f.text();
      const rows = /\.json$/i.test(f.name) ? (j => (Array.isArray(j) ? j : j.products || []))(JSON.parse(txt)) : parseCSV(txt);
      $('#imp-msg').textContent = importRows(rows);
    } catch (err) { $('#imp-msg').textContent = 'No se pudo leer el archivo: ' + err.message; }
    e.target.value = '';
  });
  $('#tpl').onclick = () => download(new Blob([toCSV([{ id: '', nombre: 'Aretes ejemplo', referencia: 'REF-001', categoria: 'aretes', coleccion: 'aretas-rodinado', medidas: ['20x10mm'], precios: [], descripcion: '', caracteristicas: '', imagenes: [], destacado: false, novedad: true }])], { type: 'text/csv' }), 'plantilla-productos.csv');
  $('#exp-csv').onclick = () => download(new Blob([toCSV(S.products)], { type: 'text/csv' }), 'productos.csv');
  $('#exp-json').onclick = () => download(new Blob([JSON.stringify(S.products, null, 1)], { type: 'application/json' }), 'products.json');
  $('#exp-zip').onclick = downloadZip;

  /* ---------------- arranque ---------------- */
  async function start() {
    $('#login').hidden = true; $('#app').hidden = false;
    $('#mode').textContent = S.mode === 'github' ? `GitHub · ${S.gh.repo} (${S.gh.branch})` : 'Modo local: descarga los cambios en «Importar / exportar»';
    $('#publish').textContent = S.mode === 'github' ? 'PUBLICAR CAMBIOS' : 'DESCARGAR CAMBIOS';
    fillSelects(); renderList();
  }
  $('#publish').onclick = () => (S.mode === 'github' ? publishGithub() : downloadZip());
  $('#logout').onclick = () => { if ((S.dirty.size || S.uploads.size) && !confirm('Tienes cambios sin publicar. ¿Salir de todos modos?')) return; sessionStorage.removeItem('lb-admin'); S.dirty.clear(); S.uploads.clear(); location.reload(); };
  $('#login-form').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target; $('#login-err').textContent = 'Conectando…';
    try { await connect(f.repo.value, f.rama.value, f.token.value); await start(); }
    catch (err) { $('#login-err').textContent = err.message.includes('401') ? 'El token no es válido o venció.' : err.message.includes('404') ? 'No encontré el repositorio o la rama. Revisa el nombre y que el token tenga acceso.' : err.message; }
  });
  $('#local-mode').onclick = async () => { try { await loadLocal(); await start(); } catch (e) { $('#login-err').textContent = 'No se pudieron leer los datos del sitio: ' + e.message; } };
  const saved = sessionStorage.getItem('lb-admin');
  if (saved) { const g = JSON.parse(saved); connect(g.repo, g.branch, g.token).then(start).catch(() => sessionStorage.removeItem('lb-admin')); }
  else fetch('../data/settings.json').then(r => r.json()).then(s => { if (s.admin?.repo) $('#login-form').repo.value = s.admin.repo; if (s.admin?.rama) $('#login-form').rama.value = s.admin.rama; }).catch(() => {});
})();
