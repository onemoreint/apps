/* Vistas: Dashboard, Expedientes (registro inteligente) e Inventario. */
(function () {
  'use strict';
  const AI = (window.AI = window.AI || {});
  const { html, icon, $, $$ } = AI;
  const S = AI.state;
  const st = () => AI.store;
  AI.views = AI.views || {};
  AI.actions = AI.actions || {};
  AI.ui = AI.ui || {
    exp: { q: '', dep: '', estado: '', pend: false, page: 1 },
    inv: { q: '', dep: '', serie: '', estado: '', archivo: '', desde: '', hasta: '', sort: 'codigo', dir: 1, page: 1, tab: 'inv' },
  };

  /* ---------- Componentes compartidos ---------- */
  const estadoBadge = (e) => html`<span class="badge b-${AI.norm(e)}">${e}</span>`;
  const TRB = { 'Borrador': 'borrador', 'En revisión': 'revision', 'Pendiente de aprobación': 'pendiente', 'Aprobada': 'aprobada', 'Completada': 'completada', 'Devuelta para corrección': 'devuelta' };
  const trBadge = (e) => html`<span class="badge b-tr-${TRB[e] || 'borrador'}">${e}</span>`;
  const sevBadge = (s) => html`<span class="badge b-${s}">${s === 'alta' ? 'Alta' : s === 'media' ? 'Media' : 'Baja'}</span>`;
  const depOptions = (sel, todas = 'Todas las dependencias') => html`${todas ? html`<option value="">${todas}</option>` : html`<option value="">Seleccione…</option>`}${st().deps().map((d) => html`<option value="${d.id}" ${d.id === sel ? 'selected' : ''}>${d.nombre}</option>`)}`;
  const serieOptions = (sel, label = 'Todas las series') => html`<option value="">${label}</option>${st().catalogo().series.map((s) => html`<option value="${s.id}" ${s.id === sel ? 'selected' : ''}>${s.id} · ${s.nombre}</option>`)}`;
  const subOptions = (serieId, sel) => { const s = st().serieById(serieId); return html`<option value="">${s ? 'Seleccione subserie…' : 'Primero elija la serie'}</option>${s ? s.subseries.map((u) => html`<option value="${u.id}" ${u.id === sel ? 'selected' : ''}>${u.id} · ${u.nombre}</option>`) : ''}`; };
  const clasif = (e) => (e.serie ? html`${st().serieName(e.serie)}${e.subserie ? html` <span class="muted">/ ${st().subName(e.subserie)}</span>` : ''}` : html`<span class="badge b-pend">Pendiente de clasificación</span>`);
  const missing = (v, label = 'Sin registrar') => (v ? v : html`<span class="missing">${label}</span>`);

  function matchExp(e, q) {
    if (!q) return true;
    const hay = AI.norm([e.codigo, e.nombre, e.responsable, e.ubicacion, e.observaciones, st().depName(e.dependencia), st().serieName(e.serie), st().subName(e.subserie), e.estado].join(' '));
    return AI.norm(q).split(/\s+/).every((t) => hay.includes(t));
  }

  function printDoc(content) {
    const pa = $('#print-area');
    pa.innerHTML = AI.fmt(content);
    window.print();
  }

  /* ---------- Formulario de expediente ---------- */
  function expForm(id, preset = {}) {
    const e = id ? st().expById(id) : null;
    const v = Object.assign({ codigo: '', dependencia: '', serie: '', subserie: '', nombre: '', fechaApertura: AI.todayISO(), fechaCierre: '', responsable: '', estado: 'Activo', ubicacion: '', observaciones: '', proximaRevision: '', soporte: 'Físico', folios: '' }, e || {}, preset);
    const transferido = e && e.estado === 'Transferido';
    const enTr = e && st().enTransferenciaActiva(e.id);
    const body = html`
      <form id="exp-form" novalidate>
        ${preset._fromArchi ? html`<div class="notice ok" style="margin-bottom:14px">${icon('sparkles')}<div>Se precargaron sugerencias de ARCHI IA. <b>Revise y valide</b> cada campo antes de guardar: la decisión final es del funcionario.</div></div>` : ''}
        ${transferido ? html`<div class="notice" style="margin-bottom:14px">${icon('info')}<div>Expediente en archivo central: el estado no se modifica desde aquí.</div></div>` : ''}
        <div class="form-grid">
          <label class="field"><span>Dependencia responsable *</span><select name="dependencia" required>${depOptions(v.dependencia, '')}</select><small class="err"></small></label>
          <label class="field"><span>Código único * <span class="hint">· autogenerable</span></span>
            <div class="row" style="flex-wrap:nowrap"><input name="codigo" value="${v.codigo}" maxlength="40" autocomplete="off" placeholder="DEP-SERIE-AÑO-001" style="text-transform:uppercase"><button type="button" class="btn sm" data-action="exp-gen-code" title="Generar código">${icon('sparkles')}</button></div><small class="err"></small></label>
          <label class="field"><span>Serie documental <span class="hint">· catálogo de demostración</span></span><select name="serie">${serieOptions(v.serie, 'Sin clasificar (pendiente)')}</select><small class="err"></small></label>
          <label class="field"><span>Subserie documental</span><select name="subserie">${subOptions(v.serie, v.subserie)}</select><small class="err"></small></label>
          <label class="field full"><span>Nombre o descripción *</span><input name="nombre" value="${v.nombre}" maxlength="200" placeholder="Ej.: Contrato de obra para mejoramiento de vía en sector Norte"><small class="err"></small></label>
          <label class="field"><span>Fecha de apertura *</span><input type="date" name="fechaApertura" value="${v.fechaApertura}" max="${AI.todayISO()}"><small class="err"></small></label>
          <label class="field"><span>Fecha de cierre <span class="hint">· cuando aplique</span></span><input type="date" name="fechaCierre" value="${v.fechaCierre}" max="${AI.todayISO()}"><small class="err"></small></label>
          <label class="field"><span>Responsable</span><input name="responsable" value="${v.responsable}" maxlength="80" placeholder="Cargo o código del funcionario"><small class="err"></small></label>
          <label class="field"><span>Estado *</span><select name="estado" ${transferido || enTr ? 'disabled' : ''}>${(transferido ? ['Transferido'] : ['Activo', 'Cerrado']).map((x) => html`<option ${x === v.estado ? 'selected' : ''}>${x}</option>`)}</select><small class="err">${enTr ? 'En transferencia ' + enTr.numero : ''}</small></label>
          <label class="field full"><span>Ubicación documental</span><input name="ubicacion" value="${v.ubicacion}" maxlength="160" placeholder="Archivo de gestión · Estante · Caja · Carpeta"><small class="err"></small></label>
          <label class="field"><span>Soporte</span><select name="soporte">${['Físico', 'Electrónico', 'Híbrido'].map((x) => html`<option ${x === v.soporte ? 'selected' : ''}>${x}</option>`)}</select></label>
          <label class="field"><span>Folios</span><input type="number" name="folios" min="0" max="99999" value="${v.folios}"></label>
          <label class="field"><span>Próxima revisión <span class="hint">· recordatorio interno</span></span><input type="date" name="proximaRevision" value="${v.proximaRevision}"><small class="err"></small></label>
          <div></div>
          <label class="field full"><span>Observaciones</span><textarea name="observaciones" maxlength="1000" rows="3">${v.observaciones}</textarea></label>
        </div>
        <p class="form-error" id="exp-form-msg" hidden></p>
        <p class="muted small" style="margin-top:12px">* Obligatorio. Los campos marcados como obligatorios en <b>Configuración › Reglas</b> que queden vacíos generarán una alerta de seguimiento.</p>
      </form>`;
    AI.openModal(e ? `Editar expediente ${e.codigo}` : 'Registrar expediente', body, {
      wide: true,
      foot: html`<button class="btn ghost" data-close>Cancelar</button><button class="btn" data-action="exp-form-archi">${icon('sparkles')} Sugerir con ARCHI</button><button class="btn primary" data-action="exp-form-save" data-id="${id || ''}">${icon('check')} Guardar</button>`,
    });
    const f = $('#exp-form');
    if (enTr) f.dataset.estadoFijo = v.estado;
    if (transferido) f.dataset.estadoFijo = 'Transferido';
    f.serie.addEventListener('change', () => { f.subserie.innerHTML = AI.fmt(subOptions(f.serie.value, '')); });
    f.estado.addEventListener('change', () => { if (f.estado.value === 'Cerrado' && !f.fechaCierre.value) f.fechaCierre.value = AI.todayISO(); if (f.estado.value === 'Activo') f.fechaCierre.value = ''; });
    f.addEventListener('submit', (ev) => ev.preventDefault());
  }
  function formData(f) {
    const o = {}; ['codigo', 'dependencia', 'serie', 'subserie', 'nombre', 'fechaApertura', 'fechaCierre', 'responsable', 'estado', 'ubicacion', 'observaciones', 'proximaRevision', 'soporte', 'folios'].forEach((k) => { o[k] = f[k] ? f[k].value : ''; });
    if (f.dataset.estadoFijo) o.estado = f.dataset.estadoFijo;
    return o;
  }
  AI.actions['exp-new'] = () => expForm(null);
  AI.actions['exp-edit'] = (el) => expForm(el.dataset.id);
  AI.actions['exp-gen-code'] = () => {
    const f = $('#exp-form');
    if (!f.dependencia.value) { AI.toast('Seleccione primero la dependencia.', 'warn'); f.dependencia.focus(); return; }
    f.codigo.value = st().suggestCode(f.dependencia.value, f.serie.value, f.fechaApertura.value);
  };
  AI.actions['exp-form-archi'] = async () => {
    const f = $('#exp-form');
    const d = formData(f);
    if (AI.clean(d.nombre).length < 8) { AI.toast('Escriba primero la descripción del expediente.', 'warn'); f.nombre.focus(); return; }
    const r = await AI.archi.analyze({ texto: d.nombre + ' ' + d.observaciones, dependencia: d.dependencia });
    const s = r.sugerencias[0];
    const msg = $('#exp-form-msg');
    if (!s) { msg.hidden = false; msg.textContent = 'ARCHI no encontró una clasificación probable. Agregue más detalle o clasifique manualmente.'; return; }
    f.serie.value = s.serieId; f.subserie.innerHTML = AI.fmt(subOptions(s.serieId, s.subserieId));
    const dm = r.metadatos.find((m) => m.campo === 'dependencia');
    if (!f.dependencia.value && dm) f.dependencia.value = dm.valor;
    msg.hidden = false; msg.style.color = 'var(--emerald-600)';
    msg.textContent = `Sugerencia (${r.modo === 'demo' ? 'simulación por reglas' : 'IA'}): ${s.serie}${s.subserie ? ' / ' + s.subserie : ''} — confianza ${s.confianza}%. Verifique antes de guardar.`;
  };
  AI.actions['exp-form-save'] = async (el) => {
    const f = $('#exp-form');
    const id = el.dataset.id || null;
    const res = await st().saveExpediente(formData(f), id);
    $$('.field', f).forEach((x) => { x.classList.remove('invalid'); const er = x.querySelector('.err'); if (er && !er.dataset.keep) er.textContent = ''; });
    if (!res.ok) {
      Object.entries(res.errors).forEach(([k, m]) => { const inp = f[k]; if (!inp) return; const fl = inp.closest('.field'); fl.classList.add('invalid'); fl.querySelector('.err').textContent = m; });
      const first = f.querySelector('.invalid input, .invalid select'); if (first) first.focus();
      AI.toast('Revise los campos marcados.', 'err');
      return;
    }
    AI.closeModal();
    AI.toast(id ? 'Expediente actualizado.' : `Expediente ${res.exp.codigo} registrado.`);
    if (res.warnings.length) setTimeout(() => AI.toast('Quedó con información pendiente: ' + res.warnings.join(', ') + '.', 'warn'), 400);
    AI.refresh();
  };

  /* ---------- Detalle de expediente ---------- */
  function expDetail(id) {
    const e = st().expById(id); if (!e) return;
    const alertas = st().computeAlertas().filter((a) => a.entidadId === id);
    const hist = S.auditoria.filter((a) => a.entidadId === id).sort((a, b) => b.fecha.localeCompare(a.fecha));
    const enTr = st().enTransferenciaActiva(id);
    const body = html`
      <div class="row" style="margin-bottom:12px"><span class="code-tag">${e.codigo}</span>${estadoBadge(e.estado)}${enTr ? html`<span class="badge b-tr-revision">En ${enTr.numero}</span>` : ''}<span class="badge nodot">${e.archivo === 'Central' ? 'Archivo central' : 'Archivo de gestión'}</span></div>
      <h3 style="font-size:16px;margin-bottom:14px">${e.nombre}</h3>
      <div class="detail-grid">
        <div><b>Dependencia</b>${st().depName(e.dependencia)}</div>
        <div><b>Serie / subserie</b>${clasif(e)}</div>
        <div><b>Apertura</b>${AI.fmtDate(e.fechaApertura)}</div>
        <div><b>Cierre</b>${AI.fmtDate(e.fechaCierre)}</div>
        <div><b>Responsable</b>${missing(e.responsable)}</div>
        <div><b>Ubicación</b>${missing(e.ubicacion)}</div>
        <div><b>Soporte / folios</b>${e.soporte || '—'} · ${e.folios || 0} folios</div>
        <div><b>Próxima revisión</b>${AI.fmtDate(e.proximaRevision)}</div>
        <div style="grid-column:1/-1"><b>Observaciones</b>${e.observaciones || '—'}</div>
      </div>
      ${alertas.length ? html`<h4 style="margin:18px 0 8px;font-size:14px">Alertas</h4><div class="stack" style="gap:8px">${alertas.map((a) => html`<div class="notice ${a.severidad === 'alta' ? 'warn' : ''}">${icon('alert')}<div><b>${a.tipo}.</b> ${a.detalle}${a.atendida ? ' (atendida)' : ''}</div></div>`)}</div>` : html`<div class="notice ok" style="margin-top:16px">${icon('check')}<div>Sin alertas activas para este expediente.</div></div>`}
      <h4 style="margin:18px 0 10px;font-size:14px">Historial de cambios</h4>
      ${hist.length ? html`<ul class="timeline">${hist.slice(0, 12).map((h) => html`<li><b>${h.accion}</b> — ${h.detalle}<div class="when">${AI.fmtDateTime(h.fecha)} · ${h.usuario}</div></li>`)}</ul>` : html`<p class="muted">Sin registros.</p>`}`;
    const canState = e.estado !== 'Transferido' && !enTr;
    AI.openModal('Detalle del expediente', body, {
      wide: true,
      foot: html`<button class="btn" data-action="archi-analyze-exp" data-id="${id}">${icon('sparkles')} Analizar con ARCHI</button>${canState ? html`<button class="btn" data-action="exp-state" data-id="${id}" data-to="${e.estado === 'Activo' ? 'Cerrado' : 'Activo'}">${e.estado === 'Activo' ? 'Cerrar expediente' : 'Reabrir'}</button>` : ''}<button class="btn primary" data-action="exp-edit" data-id="${id}">${icon('edit')} Editar</button>`,
    });
  }
  AI.actions['exp-view'] = (el) => expDetail(el.dataset.id);
  AI.actions['exp-state'] = async (el) => {
    const to = el.dataset.to; const e = st().expById(el.dataset.id);
    const r0 = await AI.confirmDialog(to === 'Cerrado' ? 'Cerrar expediente' : 'Reabrir expediente', `${e.codigo}: el estado cambiará de «${e.estado}» a «${to}».${to === 'Cerrado' && !e.fechaCierre ? ' Se registrará la fecha de hoy como fecha de cierre.' : ''}`, { notaLabel: 'Observación (opcional)' });
    if (!r0.ok) return;
    const r = await st().changeEstado(e.id, to, r0.nota);
    if (!r.ok) { AI.toast(r.msg, 'err'); return; }
    AI.toast(`Estado actualizado a «${to}».`);
    AI.refresh();
  };

  /* ================= DASHBOARD ================= */
  AI.views.dashboard = {
    title: 'Panel administrativo', sub: () => `Indicadores calculados en tiempo real · ${st().municipio().etiqueta}`,
    render(root) {
      const E = S.expedientes; const T = S.transferencias;
      const alertas = st().computeAlertas().filter((a) => !a.atendida);
      const k = {
        total: E.length, activos: E.filter((e) => e.estado === 'Activo').length, cerrados: E.filter((e) => e.estado === 'Cerrado').length,
        transferidos: E.filter((e) => e.estado === 'Transferido').length, pend: E.filter(st().isPendienteClasif).length,
        trPend: T.filter((t) => t.estado !== 'Completada').length, alertas: alertas.length, altas: alertas.filter((a) => a.severidad === 'alta').length,
      };
      // Evolución mensual (12 meses)
      const now = new Date(); const months = [];
      for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ key: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'), label: AI.MESES[d.getMonth()] }); }
      const count = (field) => months.map((m) => E.filter((e) => (e[field] || '').startsWith(m.key)).length);
      const series = [{ nombre: 'Aperturas', color: '#12657C', valores: count('fechaApertura') }, { nombre: 'Cierres', color: '#10B981', valores: count('fechaCierre') }];
      // Por dependencia
      const deps = st().deps();
      const rows = deps.map((d) => { const de = E.filter((e) => e.dependencia === d.id); return { label: d.nombre.replace('Secretaría de ', 'Sec. '), segs: [{ v: de.filter((e) => e.estado === 'Activo').length, color: '#10B981', title: 'Activos' }, { v: de.filter((e) => e.estado === 'Cerrado').length, color: '#12657C', title: 'Cerrados' }, { v: de.filter((e) => e.estado === 'Transferido').length, color: '#8B6FE8', title: 'Transferidos' }] }; });
      const hace30 = new Date(Date.now() - 30 * 86400000).toISOString();
      const act = deps.map((d) => ({ d, n: S.auditoria.filter((a) => a.dependencia === d.id && a.fecha >= hace30).length, al: alertas.filter((a) => a.dependencia === d.id).length, pend: E.filter((e) => e.dependencia === d.id && st().isPendienteClasif(e)).length })).sort((a, b) => b.n - a.n);
      const maxAct = Math.max(1, ...act.map((x) => x.n));
      const recientes = S.auditoria.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 6);
      const KPI = (href, label, val, sub, ic, cls) => html`<a class="card kpi" href="${href}"><div class="kpi-top"><span>${label}</span><span class="kpi-ic ${cls}">${icon(ic)}</span></div><div class="val">${val}</div><div class="sub">${sub}</div></a>`;
      root.innerHTML = AI.fmt(html`
        <div class="muni-strip"><span class="muni-strip-t">${icon('map')} ${st().municipio().etiqueta}</span>${st().municipio().ficha.filter(([k]) => k !== 'Sitio web oficial' && k !== 'Uso').map(([k, v]) => html`<span><b>${k}:</b> ${v}</span>`)}<a href="#/configuracion">Ver ficha y fuentes</a></div>
        <div class="kpis">
          ${KPI('#/inventario', 'Expedientes registrados', k.total, `${k.transferidos} en archivo central`, 'folder', '')}
          ${KPI('#/expedientes', 'Expedientes activos', k.activos, `${Math.round((k.activos / Math.max(1, k.total)) * 100)}% del total`, 'trend', 'em')}
          ${KPI('#/inventario', 'Expedientes cerrados', k.cerrados, 'En archivo de gestión', 'archive', 'bl')}
          ${KPI('#/asistente', 'Pendientes de clasificación', k.pend, 'Sin serie/subserie', 'sparkles', 'am')}
          ${KPI('#/transferencias', 'Transferencias pendientes', k.trPend, `${T.filter((t) => t.estado === 'Completada').length} completadas`, 'transfer', 'vi')}
          ${KPI('#/alertas', 'Alertas de seguimiento', k.alertas, `${k.altas} de prioridad alta`, 'bell', 'rd')}
        </div>
        <div class="grid g-21">
          <section class="card"><div class="card-head"><div><h3>Evolución mensual</h3><p class="muted">Aperturas y cierres de expedientes · últimos 12 meses</p></div>${AI.charts.legend(series)}</div><div class="card-pad">${AI.charts.groupedBars(months.map((m) => m.label), series)}</div></section>
          <section class="card"><div class="card-head"><div><h3>Expedientes por dependencia</h3><p class="muted">Distribución por estado</p></div></div><div class="card-pad">${AI.charts.hbars(rows)}<div style="margin-top:14px">${AI.charts.legend([{ nombre: 'Activos', color: '#10B981' }, { nombre: 'Cerrados', color: '#12657C' }, { nombre: 'Transferidos', color: '#8B6FE8' }])}</div></div></section>
        </div>
        <div class="grid g-21" style="margin-top:16px">
          <section class="card"><div class="card-head"><div><h3>Actividades por dependencia</h3><p class="muted">Movimientos registrados en los últimos 30 días</p></div></div>
            <div class="table-wrap" style="margin-top:10px"><table class="tbl responsive"><thead><tr><th>Dependencia</th><th>Actividades (30 días)</th><th>Alertas abiertas</th><th>Sin clasificar</th></tr></thead><tbody>
            ${act.map((x) => html`<tr><td data-label="Dependencia"><b>${x.d.nombre}</b></td><td data-label="Actividades"><div class="row" style="flex-wrap:nowrap"><span class="hbar" style="display:block;width:120px"><span class="track" style="display:flex"><span class="seg" style="width:${(x.n / maxAct) * 100}%;background:#12657C"></span></span></span><b>${x.n}</b></div></td><td data-label="Alertas">${x.al ? html`<a href="#/alertas?dep=${x.d.id}" class="badge b-media">${x.al}</a>` : html`<span class="badge b-ok">0</span>`}</td><td data-label="Sin clasificar">${x.pend}</td></tr>`)}
            </tbody></table></div></section>
          <section class="card"><div class="card-head"><div><h3>Últimos movimientos</h3><p class="muted">Registro de cambios (auditoría de demostración)</p></div></div>
            <div class="list" style="margin-top:8px">${recientes.map((a) => html`<div class="list-item"><span class="dot">${icon(a.entidad === 'transferencia' ? 'transfer' : 'history')}</span><div class="body"><div class="t">${a.accion} · <span class="code-tag">${a.codigo}</span></div><div class="d">${a.detalle.length > 90 ? a.detalle.slice(0, 90) + '…' : a.detalle}</div><div class="m">${AI.fmtDateTime(a.fecha)} · ${a.usuario}</div></div></div>`)}</div></section>
        </div>`);
    },
  };

  /* ================= EXPEDIENTES ================= */
  AI.views.expedientes = {
    title: 'Registro de expedientes', sub: () => 'Registro estructurado con validaciones, búsqueda y filtros',
    render(root, params) {
      const u = AI.ui.exp;
      if (params.pend === '1') u.pend = true;
      const pendN = S.expedientes.filter(st().isPendienteClasif).length;
      root.innerHTML = AI.fmt(html`
        <div class="section-title"><div><h2>Expedientes</h2><p class="muted small">Cree, edite y consulte expedientes. Las sugerencias de ARCHI IA siempre requieren validación del funcionario.</p></div>
          <button class="btn primary" data-action="exp-new">${icon('plus')} Registrar expediente</button></div>
        <div class="card" style="margin-bottom:14px">
          <div class="toolbar">
            <label class="search">${icon('search')}<input id="exp-q" type="search" placeholder="Buscar por código, descripción, responsable, ubicación…" value="${u.q}" maxlength="80" aria-label="Buscar expedientes"></label>
            <select class="select" id="exp-dep" aria-label="Filtrar por dependencia">${depOptions(u.dep)}</select>
            <select class="select" id="exp-estado" aria-label="Filtrar por estado"><option value="">Todos los estados</option>${AI.catalog.ESTADOS.map((x) => html`<option ${x === u.estado ? 'selected' : ''}>${x}</option>`)}</select>
            <button class="chip ${u.pend ? 'on' : ''}" id="exp-pend" aria-pressed="${u.pend}">${icon('sparkles')} Pendientes de clasificación <span class="n">${pendN}</span></button>
          </div>
        </div>
        <div id="exp-results"></div>`);
      const upd = () => { u.page = 1; this.results(); };
      $('#exp-q').addEventListener('input', AI.debounce((e) => { u.q = AI.clean(e.target.value, 80); upd(); }));
      $('#exp-dep').addEventListener('change', (e) => { u.dep = e.target.value; upd(); });
      $('#exp-estado').addEventListener('change', (e) => { u.estado = e.target.value; upd(); });
      $('#exp-pend').addEventListener('click', (e) => { u.pend = !u.pend; e.currentTarget.classList.toggle('on', u.pend); e.currentTarget.setAttribute('aria-pressed', u.pend); upd(); });
      this.results();
    },
    results() {
      const u = AI.ui.exp; const PAGE = 24;
      const list = S.expedientes.filter((e) => (!u.dep || e.dependencia === u.dep) && (!u.estado || e.estado === u.estado) && (!u.pend || st().isPendienteClasif(e)) && matchExp(e, u.q))
        .sort((a, b) => (b.actualizado || '').localeCompare(a.actualizado || ''));
      const pages = Math.max(1, Math.ceil(list.length / PAGE)); u.page = Math.min(u.page, pages);
      const items = list.slice((u.page - 1) * PAGE, u.page * PAGE);
      $('#exp-results').innerHTML = AI.fmt(list.length ? html`
        <p class="muted small" style="margin-bottom:10px">${list.length} expediente(s) · ordenados por última actualización</p>
        <div class="exp-grid">${items.map((e) => { const falt = st().faltantes(e); return html`
          <article class="card exp-card">
            <div class="top"><span class="code-tag">${e.codigo}</span>${estadoBadge(e.estado)}</div>
            <h4>${e.nombre}</h4>
            <div class="small">${clasif(e)}</div>
            <div class="meta"><div><b>Dependencia</b>${st().depName(e.dependencia)}</div><div><b>Apertura</b>${AI.fmtDate(e.fechaApertura)}</div><div><b>Responsable</b>${missing(e.responsable)}</div><div><b>Ubicación</b>${missing(e.ubicacion)}</div></div>
            ${falt.length ? html`<div class="small" style="color:var(--amber-600)">${icon('alert', 'sm')} Falta: ${falt.map((k) => AI.catalog.CAMPOS[k]).join(', ')}</div>` : ''}
            <div class="foot">${st().isPendienteClasif(e) ? html`<button class="btn sm" data-action="archi-analyze-exp" data-id="${e.id}">${icon('sparkles')} Clasificar</button>` : ''}<button class="btn sm ghost" data-action="exp-view" data-id="${e.id}">${icon('eye')} Ver</button><button class="btn sm" data-action="exp-edit" data-id="${e.id}">${icon('edit')} Editar</button></div>
          </article>`; })}</div>
        ${pages > 1 ? html`<div class="pager"><span>Página ${u.page} de ${pages}</span><span class="row"><button class="btn sm" data-action="exp-page" data-d="-1" ${u.page === 1 ? 'disabled' : ''}>Anterior</button><button class="btn sm" data-action="exp-page" data-d="1" ${u.page === pages ? 'disabled' : ''}>Siguiente</button></span></div>` : ''}`
        : html`<div class="card empty">${icon('search')}<p>No hay expedientes que coincidan con la búsqueda.</p></div>`);
    },
  };
  AI.actions['exp-page'] = (el) => { AI.ui.exp.page += Number(el.dataset.d); AI.views.expedientes.results(); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  /* ================= INVENTARIO ================= */
  const INV_COLS = [
    ['codigo', 'Identificador'], ['dependencia', 'Dependencia'], ['serie', 'Serie / subserie'], ['fechaApertura', 'Fecha'], ['estado', 'Estado'], ['ubicacion', 'Ubicación'], ['responsable', 'Responsable'],
  ];
  function invFiltered() {
    const u = AI.ui.inv;
    const sv = (e, k) => (k === 'dependencia' ? st().depName(e.dependencia) : k === 'serie' ? st().serieName(e.serie) + st().subName(e.subserie) : e[k] || '');
    return S.expedientes.filter((e) => (!u.dep || e.dependencia === u.dep) && (!u.serie || e.serie === u.serie) && (!u.estado || e.estado === u.estado) && (!u.archivo || e.archivo === u.archivo) && (!u.desde || e.fechaApertura >= u.desde) && (!u.hasta || e.fechaApertura <= u.hasta) && matchExp(e, u.q))
      .sort((a, b) => { const x = sv(a, u.sort), y = sv(b, u.sort); if (!x && y) return 1; if (x && !y) return -1; return x.localeCompare(y, 'es') * u.dir; });
  }
  function invRows(list) {
    return list.map((e) => [e.codigo, st().depName(e.dependencia), st().serieName(e.serie) || 'Sin clasificar', st().subName(e.subserie), e.nombre, AI.fmtDate(e.fechaApertura), e.fechaCierre ? AI.fmtDate(e.fechaCierre) : '', e.estado, e.archivo, e.ubicacion, e.responsable, e.soporte || '', e.folios || '']);
  }
  const INV_HEAD = ['Código', 'Dependencia', 'Serie', 'Subserie', 'Descripción', 'Fecha apertura', 'Fecha cierre', 'Estado', 'Archivo', 'Ubicación', 'Responsable', 'Soporte', 'Folios'];

  AI.views.inventario = {
    title: 'Inventario documental', sub: () => 'Tabla interactiva con búsqueda instantánea, filtros, ordenamiento y exportación',
    render(root, params) {
      const u = AI.ui.inv;
      if (params.q !== undefined) { u.q = AI.clean(params.q, 80); u.page = 1; u.tab = 'inv'; }
      root.innerHTML = AI.fmt(html`
        <div class="tabs" role="tablist"><button class="tab ${u.tab === 'inv' ? 'on' : ''}" data-action="inv-tab" data-tab="inv" role="tab">Inventario</button><button class="tab ${u.tab === 'log' ? 'on' : ''}" data-action="inv-tab" data-tab="log" role="tab">Registro de cambios</button></div>
        <div id="inv-body"></div>`);
      this.body();
    },
    body() {
      const u = AI.ui.inv;
      const box = $('#inv-body');
      if (u.tab === 'log') { box.innerHTML = AI.fmt(auditTable()); return; }
      box.innerHTML = AI.fmt(html`
        <div class="card">
          <div class="toolbar">
            <label class="search">${icon('search')}<input id="inv-q" type="search" value="${u.q}" placeholder="Búsqueda instantánea en todo el inventario…" maxlength="80" aria-label="Buscar en inventario"></label>
            <button class="btn" data-action="inv-csv">${icon('download')} CSV</button>
            <button class="btn" data-action="inv-print">${icon('printer')} Imprimir</button>
          </div>
          <div class="toolbar" style="padding-top:0">
            <select class="select" data-f="dep" aria-label="Dependencia">${depOptions(u.dep)}</select>
            <select class="select" data-f="serie" aria-label="Serie">${serieOptions(u.serie)}</select>
            <select class="select" data-f="estado" aria-label="Estado"><option value="">Todos los estados</option>${AI.catalog.ESTADOS.map((x) => html`<option ${x === u.estado ? 'selected' : ''}>${x}</option>`)}</select>
            <select class="select" data-f="archivo" aria-label="Archivo"><option value="">Gestión y central</option><option value="Gestión" ${u.archivo === 'Gestión' ? 'selected' : ''}>Archivo de gestión</option><option value="Central" ${u.archivo === 'Central' ? 'selected' : ''}>Archivo central</option></select>
            <label class="row small muted" style="gap:6px">Desde <input class="input" style="width:150px" type="date" data-f="desde" value="${u.desde}" aria-label="Fecha desde"></label>
            <label class="row small muted" style="gap:6px">Hasta <input class="input" style="width:150px" type="date" data-f="hasta" value="${u.hasta}" aria-label="Fecha hasta"></label>
            <select class="select" id="inv-sort" aria-label="Ordenar por">${INV_COLS.map(([k, l]) => html`<option value="${k}:1" ${u.sort === k && u.dir === 1 ? 'selected' : ''}>Ordenar: ${l} ↑</option><option value="${k}:-1" ${u.sort === k && u.dir === -1 ? 'selected' : ''}>Ordenar: ${l} ↓</option>`)}</select>
            <button class="btn ghost sm" data-action="inv-clear">${icon('reset')} Limpiar filtros</button>
          </div>
          <div id="inv-table"></div>
        </div>`);
      $('#inv-q').addEventListener('input', AI.debounce((e) => { u.q = AI.clean(e.target.value, 80); u.page = 1; this.table(); }));
      $$('[data-f]', box).forEach((s) => s.addEventListener('change', () => { u[s.dataset.f] = s.value; u.page = 1; this.table(); }));
      $('#inv-sort').addEventListener('change', (e) => { const [k, d] = e.target.value.split(':'); u.sort = k; u.dir = Number(d); this.table(); });
      this.table();
    },
    table() {
      const u = AI.ui.inv; const PAGE = 25;
      const list = invFiltered();
      const pages = Math.max(1, Math.ceil(list.length / PAGE)); u.page = Math.min(u.page, pages);
      const items = list.slice((u.page - 1) * PAGE, u.page * PAGE);
      $('#inv-table').innerHTML = AI.fmt(html`
        <div class="table-wrap"><table class="tbl responsive"><thead><tr>${INV_COLS.map(([k, l]) => html`<th scope="col"><button data-action="inv-sort" data-k="${k}" class="${u.sort === k ? 'sorted' : ''}" aria-label="Ordenar por ${l}">${l} ${icon('sort')}</button></th>`)}<th class="actions">Acciones</th></tr></thead>
        <tbody>${items.length ? items.map((e) => html`<tr>
          <td data-label="Código"><span class="code">${e.codigo}</span></td>
          <td data-label="Dependencia">${st().depName(e.dependencia)}</td>
          <td data-label="Serie" class="desc">${clasif(e)}<div class="muted small">${e.nombre}</div></td>
          <td data-label="Fecha">${AI.fmtDate(e.fechaApertura)}</td>
          <td data-label="Estado">${estadoBadge(e.estado)}</td>
          <td data-label="Ubicación">${missing(e.ubicacion)}</td>
          <td data-label="Responsable">${missing(e.responsable)}</td>
          <td class="actions"><button class="icon-btn" data-action="exp-view" data-id="${e.id}" title="Ver detalle" aria-label="Ver ${e.codigo}">${icon('eye')}</button><button class="icon-btn" data-action="exp-edit" data-id="${e.id}" title="Editar" aria-label="Editar ${e.codigo}">${icon('edit')}</button>${e.estado !== 'Transferido' && !st().enTransferenciaActiva(e.id) ? html`<button class="icon-btn" data-action="exp-state" data-id="${e.id}" data-to="${e.estado === 'Activo' ? 'Cerrado' : 'Activo'}" title="${e.estado === 'Activo' ? 'Cerrar' : 'Reabrir'}" aria-label="Cambiar estado de ${e.codigo}">${icon(e.estado === 'Activo' ? 'archive' : 'reset')}</button>` : ''}</td>
        </tr>`) : html`<tr><td colspan="8"><div class="empty">${icon('search')}<p>Sin resultados con los filtros actuales.</p></div></td></tr>`}</tbody></table></div>
        <div class="pager"><span id="inv-count">${list.length} de ${S.expedientes.length} expedientes</span>${pages > 1 ? html`<span class="row"><span>Página ${u.page} de ${pages}</span><button class="btn sm" data-action="inv-page" data-d="-1" ${u.page === 1 ? 'disabled' : ''}>Anterior</button><button class="btn sm" data-action="inv-page" data-d="1" ${u.page === pages ? 'disabled' : ''}>Siguiente</button></span>` : ''}</div>`);
    },
  };
  function auditTable() {
    const rows = S.auditoria.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 200);
    return html`<div class="card"><div class="card-head"><div><h3>Registro de cambios (demostración)</h3><p class="muted">Últimos 200 eventos. En una versión institucional la auditoría debe ser persistente, inalterable y centralizada.</p></div><button class="btn sm" data-action="audit-csv">${icon('download')} CSV</button></div>
      <div class="table-wrap" style="margin-top:12px"><table class="tbl responsive"><thead><tr><th>Fecha</th><th>Referencia</th><th>Acción</th><th>Detalle</th><th>Usuario</th></tr></thead><tbody>
      ${rows.map((a) => html`<tr><td data-label="Fecha">${AI.fmtDateTime(a.fecha)}</td><td data-label="Referencia"><span class="code">${a.codigo}</span></td><td data-label="Acción">${a.accion}</td><td data-label="Detalle" class="desc">${a.detalle}</td><td data-label="Usuario">${a.usuario}</td></tr>`)}
      </tbody></table></div></div>`;
  }
  AI.actions['inv-tab'] = (el) => { AI.ui.inv.tab = el.dataset.tab; $$('.tab').forEach((t) => t.classList.toggle('on', t === el)); AI.views.inventario.body(); };
  AI.actions['inv-sort'] = (el) => { const u = AI.ui.inv; if (u.sort === el.dataset.k) u.dir *= -1; else { u.sort = el.dataset.k; u.dir = 1; } const s = $('#inv-sort'); if (s) s.value = `${u.sort}:${u.dir}`; AI.views.inventario.table(); };
  AI.actions['inv-page'] = (el) => { AI.ui.inv.page += Number(el.dataset.d); AI.views.inventario.table(); };
  AI.actions['inv-clear'] = () => { Object.assign(AI.ui.inv, { q: '', dep: '', serie: '', estado: '', archivo: '', desde: '', hasta: '', page: 1 }); AI.views.inventario.body(); };
  AI.actions['inv-csv'] = () => {
    const list = invFiltered();
    AI.download(`inventario-documental-${st().municipio().id}-${AI.todayISO()}.csv`, AI.toCSV(INV_HEAD, invRows(list)), 'text/csv;charset=utf-8');
    st().audit('sistema', { id: 'inventario', codigo: 'Inventario' }, 'Exportación CSV', `${list.length} registros exportados`);
    AI.toast(`CSV generado con ${list.length} registros.`);
  };
  AI.actions['audit-csv'] = () => {
    const rows = S.auditoria.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)).map((a) => [AI.fmtDateTime(a.fecha), a.entidad, a.codigo, st().depName(a.dependencia), a.accion, a.detalle, a.usuario]);
    AI.download(`registro-cambios-${AI.todayISO()}.csv`, AI.toCSV(['Fecha', 'Entidad', 'Referencia', 'Dependencia', 'Acción', 'Detalle', 'Usuario'], rows), 'text/csv;charset=utf-8');
  };
  AI.actions['inv-print'] = () => {
    const list = invFiltered(); const m = st().municipio();
    printDoc(html`<div class="card report"><div class="report-head"><div><h2>Inventario documental</h2><p class="muted">${m.etiqueta} · Generado el ${AI.fmtDateTime(new Date().toISOString())}</p></div><div class="muted small">${list.length} expedientes</div></div>
      <table class="tbl"><thead><tr>${['Código', 'Dependencia', 'Serie / subserie', 'Descripción', 'Apertura', 'Estado', 'Ubicación', 'Responsable'].map((h) => html`<th>${h}</th>`)}</tr></thead><tbody>${list.map((e) => html`<tr><td>${e.codigo}</td><td>${st().depName(e.dependencia)}</td><td>${st().serieName(e.serie) || 'Sin clasificar'}${e.subserie ? ' / ' + st().subName(e.subserie) : ''}</td><td>${e.nombre}</td><td>${AI.fmtDate(e.fechaApertura)}</td><td>${e.estado}</td><td>${e.ubicacion || '—'}</td><td>${e.responsable || '—'}</td></tr>`)}</tbody></table>
      <p class="disclaimer">Prototipo demostrativo independiente — Datos ficticios. Catálogo de series de demostración, no corresponde a una TRD/CCD oficial.</p></div>`);
  };

  Object.assign(AI, { estadoBadge, trBadge, sevBadge, depOptions, serieOptions, subOptions, clasif, missing, expForm, expDetail, printDoc, matchExp });
})();
