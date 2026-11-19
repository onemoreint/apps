/* Vistas: Transferencias documentales, Asistente ARCHI IA y Alertas. */
(function () {
  'use strict';
  const AI = (window.AI = window.AI || {});
  const { html, icon, $, $$ } = AI;
  const S = AI.state;
  const st = () => AI.store;
  AI.ui.tr = AI.ui.tr || { estado: '', dep: '' };
  AI.ui.al = AI.ui.al || { dep: '', tipo: '', sev: '', atendidas: false };
  AI.ui.archi = AI.ui.archi || { texto: '', dep: '', result: null, expId: '' };

  /* ================= TRANSFERENCIAS ================= */
  const FLOW = ['Borrador', 'En revisión', 'Pendiente de aprobación', 'Aprobada', 'Completada'];
  function stepper(t) {
    const devuelta = t.estado === 'Devuelta para corrección';
    const reached = devuelta ? 1 : FLOW.indexOf(t.estado);
    return html`<div class="stepper" aria-label="Avance: ${t.estado}">${FLOW.map((s, i) => html`${i ? html`<span class="line"></span>` : ''}<span class="step ${i < reached || t.estado === 'Completada' ? 'done' : ''} ${i === reached && t.estado !== 'Completada' ? (devuelta ? 'bad cur' : 'cur') : ''}" title="${s}"><span class="b">${i < reached || t.estado === 'Completada' ? '✓' : i + 1}</span><span class="lbl-s">${i === reached ? (devuelta ? 'Devuelta' : s) : ''}</span></span>`)}</div>`;
  }

  AI.views.transferencias = {
    title: 'Transferencias documentales', sub: () => 'Flujo controlado del archivo de gestión al archivo central',
    render(root) {
      const u = AI.ui.tr;
      const counts = {}; AI.catalog.ESTADOS_TR.forEach((e) => { counts[e] = S.transferencias.filter((t) => t.estado === e).length; });
      root.innerHTML = AI.fmt(html`
        <div class="section-title"><div><h2>Transferencias</h2><p class="muted small">Cada cambio de estado lo ejecuta una persona y queda en el historial. La IA nunca ejecuta transferencias.</p></div>
          <button class="btn primary" data-action="tr-new">${icon('plus')} Nueva transferencia</button></div>
        <div class="notice" style="margin-bottom:14px">${icon('info')}<div>Requisitos de demostración para incluir un expediente: estar <b>cerrado</b>, clasificado, con responsable y ubicación, y no pertenecer a otra transferencia en curso. Los tiempos y criterios reales deben provenir de la TRD y del cronograma de transferencias aprobados por la entidad.</div></div>
        <div class="chips" style="margin-bottom:14px">
          <button class="chip ${!u.estado ? 'on' : ''}" data-action="tr-filter" data-v="">Todas <span class="n">${S.transferencias.length}</span></button>
          ${AI.catalog.ESTADOS_TR.map((e) => html`<button class="chip ${u.estado === e ? 'on' : ''}" data-action="tr-filter" data-v="${e}">${e} <span class="n">${counts[e]}</span></button>`)}
        </div>
        <div id="tr-list"></div>`);
      this.list();
    },
    list() {
      const u = AI.ui.tr;
      const list = S.transferencias.filter((t) => !u.estado || t.estado === u.estado).sort((a, b) => b.actualizado.localeCompare(a.actualizado));
      $('#tr-list').innerHTML = AI.fmt(list.length ? html`<div class="grid g-2">${list.map((t) => html`
        <article class="card tr-card">
          <div class="row"><span class="code-tag">${t.numero}</span>${AI.trBadge(t.estado)}<span class="spacer"></span><span class="muted small">Propuesta: ${AI.fmtDate(t.fechaPropuesta)}</span></div>
          <div><b>${st().depName(t.dependencia)}</b> <span class="muted">→ Archivo central</span></div>
          ${stepper(t)}
          <div class="small muted">${t.expedientes.length} expediente(s) · Responsable: ${t.responsable} · Actualizada ${AI.fmtDateTime(t.actualizado)}</div>
          <div class="row" style="justify-content:flex-end"><button class="btn sm" data-action="tr-receipt" data-id="${t.id}">${icon('printer')} Comprobante</button><button class="btn sm primary" data-action="tr-view" data-id="${t.id}">${icon('eye')} Gestionar</button></div>
        </article>`)}</div>` : html`<div class="card empty">${icon('transfer')}<p>No hay transferencias en este estado.</p></div>`);
    },
  };
  AI.actions['tr-filter'] = (el) => { AI.ui.tr.estado = el.dataset.v; $$('.chips .chip').forEach((c) => c.classList.toggle('on', c === el)); AI.views.transferencias.list(); };

  function trForm(id) {
    const t = id ? st().trById(id) : null;
    const v = Object.assign({ dependencia: '', responsable: '', fechaPropuesta: AI.addDays(AI.todayISO(), 15), observaciones: '', expedientes: [] }, t || {});
    AI.openModal(t ? `Editar ${t.numero}` : 'Nueva transferencia documental', html`
      <form id="tr-form" novalidate>
        <div class="form-grid">
          <label class="field"><span>Dependencia remitente *</span><select name="dependencia">${AI.depOptions(v.dependencia, '')}</select><small class="err"></small></label>
          <label class="field"><span>Responsable *</span><input name="responsable" value="${v.responsable}" maxlength="80" placeholder="Cargo o código del responsable"><small class="err"></small></label>
          <label class="field"><span>Fecha propuesta *</span><input type="date" name="fechaPropuesta" value="${v.fechaPropuesta}"><small class="err"></small></label>
          <label class="field"><span>Destino</span><input value="Archivo central" disabled></label>
          <label class="field full"><span>Observaciones</span><textarea name="observaciones" rows="2" maxlength="1000">${v.observaciones}</textarea></label>
          <div class="field full"><span>Relación de expedientes * <span class="hint">· solo se habilitan los que cumplen los requisitos</span></span><div id="tr-exps" class="sel-list"></div><small class="err" id="tr-exps-err"></small></div>
        </div>
      </form>`, { wide: true, foot: html`<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-action="tr-save" data-id="${id || ''}">${icon('check')} ${t ? 'Guardar cambios' : 'Crear en borrador'}</button>` });
    const f = $('#tr-form');
    const sel = new Set(v.expedientes);
    const renderExps = () => {
      const dep = f.dependencia.value;
      if (!dep) { $('#tr-exps').innerHTML = AI.fmt(html`<div class="empty small">Seleccione la dependencia remitente.</div>`); return; }
      const list = S.expedientes.filter((e) => e.dependencia === dep && e.estado !== 'Transferido').sort((a, b) => (st().motivoNoElegible(a, id) ? 1 : 0) - (st().motivoNoElegible(b, id) ? 1 : 0) || a.codigo.localeCompare(b.codigo));
      $('#tr-exps').innerHTML = AI.fmt(list.length ? list.map((e) => { const why = st().motivoNoElegible(e, id); return html`<label class="sel-item ${why ? 'disabled' : ''}"><input type="checkbox" class="check" value="${e.id}" ${sel.has(e.id) && !why ? 'checked' : ''} ${why ? 'disabled' : ''} style="width:18px;height:18px;accent-color:var(--petrol-700)"><span style="flex:1"><span class="code">${e.codigo}</span> · ${e.nombre}<br><span class="muted small">${st().serieName(e.serie) || 'Sin clasificar'} · ${e.estado} · ${AI.fmtDate(e.fechaCierre)}</span>${why ? html`<div class="why">${why}</div>` : ''}</span></label>`; }) : html`<div class="empty small">La dependencia no tiene expedientes en archivo de gestión.</div>`);
      $$('#tr-exps input').forEach((c) => c.addEventListener('change', () => { if (c.checked) sel.add(c.value); else sel.delete(c.value); }));
    };
    f.dependencia.addEventListener('change', () => { sel.clear(); renderExps(); });
    f._sel = sel;
    renderExps();
  }
  AI.actions['tr-new'] = () => trForm(null);
  AI.actions['tr-edit'] = (el) => trForm(el.dataset.id);
  AI.actions['tr-save'] = async (el) => {
    const f = $('#tr-form');
    const res = await st().saveTransferencia({ dependencia: f.dependencia.value, responsable: f.responsable.value, fechaPropuesta: f.fechaPropuesta.value, observaciones: f.observaciones.value, expedientes: Array.from(f._sel) }, el.dataset.id || null);
    $$('.field', f).forEach((x) => { x.classList.remove('invalid'); const er = x.querySelector('.err'); if (er) er.textContent = ''; });
    if (!res.ok) {
      Object.entries(res.errors).forEach(([k, m]) => { if (k === 'expedientes') { $('#tr-exps-err').textContent = m; return; } if (k === 'general') { AI.toast(m, 'err'); return; } const fl = f[k] && f[k].closest('.field'); if (fl) { fl.classList.add('invalid'); fl.querySelector('.err').textContent = m; } });
      AI.toast('Revise los datos de la transferencia.', 'err'); return;
    }
    AI.closeModal(); AI.toast(`Transferencia ${res.tr.numero} guardada en «${res.tr.estado}».`); AI.refresh();
  };

  function trDetail(id) {
    const t = st().trById(id);
    const exps = t.expedientes.map(st().expById).filter(Boolean);
    const trans = AI.catalog.TRANSICIONES[t.estado] || [];
    AI.openModal(`Transferencia ${t.numero}`, html`
      <div class="row" style="margin-bottom:10px">${AI.trBadge(t.estado)}<span class="muted small">${st().depName(t.dependencia)} → Archivo central</span></div>
      ${stepper(t)}
      <div class="detail-grid" style="margin:14px 0">
        <div><b>Responsable</b>${t.responsable}</div><div><b>Fecha propuesta</b>${AI.fmtDate(t.fechaPropuesta)}</div>
        <div style="grid-column:1/-1"><b>Observaciones</b>${t.observaciones || '—'}</div>
      </div>
      <h4 style="font-size:14px;margin-bottom:8px">Relación de expedientes (${exps.length})</h4>
      <div class="table-wrap"><table class="tbl responsive"><thead><tr><th>Código</th><th>Descripción</th><th>Serie</th><th>Fechas extremas</th><th>Folios</th></tr></thead><tbody>
        ${exps.map((e) => html`<tr><td data-label="Código"><span class="code">${e.codigo}</span></td><td data-label="Descripción" class="desc">${e.nombre}</td><td data-label="Serie">${st().serieName(e.serie)}</td><td data-label="Fechas">${AI.fmtDate(e.fechaApertura)} – ${AI.fmtDate(e.fechaCierre)}</td><td data-label="Folios">${e.folios || 0}</td></tr>`)}
      </tbody></table></div>
      <h4 style="font-size:14px;margin:16px 0 10px">Historial de estados</h4>
      <ul class="timeline">${t.historial.slice().reverse().map((h) => html`<li><b>${h.estado}</b>${h.nota ? html` — ${h.nota}` : ''}<div class="when">${AI.fmtDateTime(h.fecha)} · ${h.usuario}</div></li>`)}</ul>
      ${t.estado === 'Aprobada' ? html`<div class="notice warn">${icon('alert')}<div>Al registrar la recepción, los expedientes pasarán a estado <b>Transferido</b> y su ubicación cambiará al archivo central. Verifique físicamente la entrega antes de confirmar.</div></div>` : ''}`,
    { wide: true, foot: html`<button class="btn" data-action="tr-receipt" data-id="${t.id}">${icon('printer')} Comprobante</button>${['Borrador', 'Devuelta para corrección'].includes(t.estado) ? html`<button class="btn" data-action="tr-edit" data-id="${t.id}">${icon('edit')} Editar relación</button>` : ''}${trans.map((x) => html`<button class="btn ${x.danger ? 'danger' : 'primary'}" data-action="tr-advance" data-id="${t.id}" data-to="${x.to}" data-nota="${x.nota ? 1 : ''}">${x.label}</button>`)}` });
  }
  AI.actions['tr-view'] = (el) => trDetail(el.dataset.id);
  AI.actions['tr-advance'] = async (el) => {
    const t = st().trById(el.dataset.id); const to = el.dataset.to;
    const r0 = await AI.confirmDialog(`${t.numero}: ${t.estado} → ${to}`, to === 'Completada' ? 'Confirma que el archivo central recibió físicamente los expedientes relacionados.' : `La transferencia pasará al estado «${to}». Esta acción queda registrada con su usuario de demostración.`, { notaLabel: el.dataset.nota ? 'Motivo de la devolución' : 'Observación (opcional)', notaRequired: !!el.dataset.nota, danger: !!el.dataset.nota });
    if (!r0.ok) return;
    const r = await st().advanceTransferencia(t.id, to, r0.nota);
    if (!r.ok) { AI.toast(r.msg, 'err'); return; }
    AI.toast(`${t.numero} ahora está «${to}».`);
    AI.refresh();
    trDetail(t.id);
  };
  AI.actions['tr-receipt'] = (el) => {
    const t = st().trById(el.dataset.id); const exps = t.expedientes.map(st().expById).filter(Boolean); const m = st().municipio();
    const folios = exps.reduce((a, e) => a + (Number(e.folios) || 0), 0);
    AI.printDoc(html`<div class="card report"><div class="report-head"><div><h2>Comprobante de transferencia documental</h2><p class="muted">${m.etiqueta}</p></div><div style="text-align:right"><b style="font-size:18px">${t.numero}</b><div class="muted small">Estado: ${t.estado}</div></div></div>
      <div class="detail-grid" style="margin-bottom:14px"><div><b>Dependencia remitente</b>${st().depName(t.dependencia)}</div><div><b>Destino</b>Archivo central</div><div><b>Responsable</b>${t.responsable}</div><div><b>Fecha propuesta</b>${AI.fmtDate(t.fechaPropuesta)}</div><div><b>Total expedientes</b>${exps.length}</div><div><b>Total folios</b>${folios}</div></div>
      <table class="tbl"><thead><tr><th>No.</th><th>Código</th><th>Descripción</th><th>Serie / subserie</th><th>Fechas extremas</th><th>Soporte</th><th>Folios</th></tr></thead><tbody>${exps.map((e, i) => html`<tr><td>${i + 1}</td><td>${e.codigo}</td><td>${e.nombre}</td><td>${st().serieName(e.serie)} / ${st().subName(e.subserie)}</td><td>${AI.fmtDate(e.fechaApertura)} – ${AI.fmtDate(e.fechaCierre)}</td><td>${e.soporte || ''}</td><td>${e.folios || 0}</td></tr>`)}</tbody></table>
      <h4 style="margin:14px 0 6px">Historial</h4><table class="tbl"><tbody>${t.historial.map((h) => html`<tr><td>${AI.fmtDateTime(h.fecha)}</td><td>${h.estado}</td><td>${h.usuario}</td><td>${h.nota || ''}</td></tr>`)}</tbody></table>
      <div class="grid g-2" style="margin-top:40px"><div style="border-top:1px solid #999;padding-top:6px" class="small">Entrega (dependencia)</div><div style="border-top:1px solid #999;padding-top:6px" class="small">Recibe (archivo central)</div></div>
      <p class="disclaimer">COMPROBANTE DE DEMOSTRACIÓN SIN VALIDEZ OFICIAL — Prototipo demostrativo independiente con datos ficticios. Generado el ${AI.fmtDateTime(new Date().toISOString())}.</p></div>`);
  };

  /* ================= ARCHI IA ================= */
  function resultHtml(r, expId) {
    if (!r) return html`<div class="card empty">${icon('sparkles')}<p>Escriba una descripción documental o elija un expediente y pulse <b>Analizar</b>.</p></div>`;
    return html`
      <div class="notice ${r.modo === 'demo' ? 'warn' : ''}" style="margin-bottom:14px">${icon('info')}<div><b>Motor:</b> ${r.motor}. Toda sugerencia debe ser validada por un funcionario antes de registrarse.</div></div>
      <div class="grid g-2">
        <section class="card card-pad stack" style="gap:12px">
          <h3 style="font-size:15px">1–2. Clasificación sugerida</h3>
          ${r.sugerencias.length ? r.sugerencias.map((s, i) => html`<div class="sug ${i === 0 ? 'top' : ''}">
            <div class="row"><b>${s.serie}</b>${s.subserie ? html`<span class="muted">/ ${s.subserie}</span>` : ''}<span class="spacer"></span><span class="badge ${i === 0 ? 'b-ok' : 'nodot'}">${s.confianza}%</span></div>
            <div class="conf"><i style="width:${s.confianza}%"></i></div>
            <ul>${s.motivos.map((m) => html`<li>${m}</li>`)}</ul>
            <div class="row" style="justify-content:flex-end">${expId ? html`<button class="btn sm primary" data-action="archi-apply" data-serie="${s.serieId}" data-sub="${s.subserieId}">${icon('check')} Validar y aplicar al expediente</button>` : html`<button class="btn sm primary" data-action="archi-create" data-serie="${s.serieId}" data-sub="${s.subserieId}">${icon('plus')} Usar en nuevo expediente</button>`}<button class="btn sm ghost" data-action="archi-reject" data-serie="${s.serieId}">Descartar</button></div>
          </div>`) : html`<p class="muted">Sin coincidencias suficientes en el catálogo.</p>`}
        </section>
        <div class="stack">
          <section class="card card-pad stack" style="gap:10px"><h3 style="font-size:15px">3. Metadatos propuestos</h3>
            ${r.metadatos.length ? html`<dl class="kv">${r.metadatos.map((m) => html`<dt>${m.campo}</dt><dd><b>${m.etiqueta}</b><div class="muted small">${m.motivo}</div></dd>`)}</dl>` : html`<p class="muted small">No se identificaron metadatos adicionales.</p>`}</section>
          <section class="card card-pad stack" style="gap:10px"><h3 style="font-size:15px">4. Campos incompletos</h3>
            ${r.incompletos.length ? html`<ul class="reasons">${r.incompletos.map((x) => html`<li>${x}</li>`)}</ul>` : html`<p class="small" style="color:var(--emerald-600)">No se detectaron campos faltantes.</p>`}</section>
          <section class="card card-pad stack" style="gap:10px"><h3 style="font-size:15px">5. Nombre normalizado</h3>
            ${r.nombreNormalizado ? html`<div class="code-tag" style="font-family:inherit;font-weight:600;padding:8px 10px">${r.nombreNormalizado}</div>${expId ? html`<div><button class="btn sm" data-action="archi-apply-name">${icon('check')} Validar y usar este nombre</button></div>` : ''}` : html`<p class="muted small">—</p>`}</section>
        </div>
      </div>
      <div class="grid g-2" style="margin-top:16px">
        <section class="card card-pad stack" style="gap:10px"><h3 style="font-size:15px">6. Resumen del expediente</h3><p class="small">${r.resumen || 'Seleccione un expediente existente para generar un resumen completo.'}</p></section>
        <section class="card card-pad stack" style="gap:10px"><h3 style="font-size:15px">7. Por qué se recomienda</h3><ul class="reasons">${r.razones.map((x) => html`<li>${x}</li>`)}</ul></section>
      </div>`;
  }
  AI.views.asistente = {
    title: 'Asistente ARCHI IA', sub: () => (st().cfg().ia.modo === 'demo' ? 'Modo demostración: simulación por reglas locales' : 'Modo IA real vía backend institucional'),
    render(root, params) {
      const u = AI.ui.archi;
      if (params.exp) { u.expId = params.exp; const e = st().expById(u.expId); if (e) { u.texto = e.nombre; u.dep = e.dependencia; } }
      const pend = S.expedientes.filter(st().isPendienteClasif);
      const modo = st().cfg().ia.modo;
      root.innerHTML = AI.fmt(html`
        <div class="archi-hero"><div class="orb">${icon('sparkles')}</div><div><h2>ARCHI IA · asistente de clasificación documental</h2><p style="opacity:.85;font-size:13.5px">Analiza descripciones, sugiere serie y subserie del catálogo, propone metadatos, detecta campos incompletos, normaliza nombres, resume expedientes y explica sus razones.</p>
          <span class="mode-pill">${icon(modo === 'demo' ? 'info' : 'shield')} ${modo === 'demo' ? 'MODO DEMOSTRACIÓN · simulación local, sin modelo de IA' : 'MODO IA REAL · requiere backend seguro'}</span></div></div>
        <div class="grid g-12">
          <section class="card card-pad stack" style="gap:12px">
            <h3 style="font-size:15px">Analizar</h3>
            <label class="field"><span>Expediente existente (opcional)</span><select id="archi-exp"><option value="">— Texto libre —</option>${pend.length ? html`<optgroup label="Pendientes de clasificación (${pend.length})">${pend.map((e) => html`<option value="${e.id}" ${u.expId === e.id ? 'selected' : ''}>${e.codigo} · ${e.nombre.slice(0, 50)}</option>`)}</optgroup>` : ''}<optgroup label="Otros expedientes">${S.expedientes.filter((e) => !st().isPendienteClasif(e)).slice(0, 80).map((e) => html`<option value="${e.id}" ${u.expId === e.id ? 'selected' : ''}>${e.codigo} · ${e.nombre.slice(0, 50)}</option>`)}</optgroup></select></label>
            <label class="field"><span>Descripción documental</span><textarea id="archi-text" rows="5" maxlength="1000" placeholder="Ej.: Derecho de petición de un ciudadano solicitando reparación del alumbrado público en el sector Norte, radicado en 2026.">${u.texto}</textarea></label>
            <label class="field"><span>Dependencia (opcional)</span><select id="archi-dep">${AI.depOptions(u.dep, 'Detectar automáticamente')}</select></label>
            <div class="row"><button class="btn accent" data-action="archi-run">${icon('sparkles')} Analizar</button><button class="btn ghost" data-action="archi-example">Probar un ejemplo</button></div>
            <p class="muted small">No ingrese datos personales reales. En modo demostración nada sale de este navegador.</p>
          </section>
          <div id="archi-result">${resultHtml(u.result, u.expId)}</div>
        </div>`);
      $('#archi-exp').addEventListener('change', (e) => { u.expId = e.target.value; u.result = null; const ex = st().expById(u.expId); if (ex) { $('#archi-text').value = ex.nombre; $('#archi-dep').value = ex.dependencia; } $('#archi-result').innerHTML = AI.fmt(resultHtml(null)); });
      if (params.exp && params.run) AI.actions['archi-run']();
    },
  };
  const EXAMPLES = [
    'Queja de un ciudadano por ruido excesivo de un establecimiento comercial en el barrio Ejemplo 3, recibida por correo electrónico en 2026.',
    'Contrato de suministro de dotación para personal operativo No. 045-2025, liquidado.',
    'Jornada de vacunación en vereda demostrativa A, informe de cobertura 2026.',
    'Acuerdo de pago de impuesto predial vigencia 2025 para predio demostrativo.',
  ];
  let exIdx = 0;
  AI.actions['archi-example'] = () => { $('#archi-exp').value = ''; AI.ui.archi.expId = ''; $('#archi-text').value = EXAMPLES[exIdx++ % EXAMPLES.length]; $('#archi-dep').value = ''; AI.actions['archi-run'](); };
  AI.actions['archi-run'] = async () => {
    const u = AI.ui.archi;
    u.texto = AI.clean($('#archi-text').value, 1000); u.dep = $('#archi-dep').value; u.expId = $('#archi-exp').value;
    const exp = u.expId ? st().expById(u.expId) : null;
    if (!exp && u.texto.length < 10) { AI.toast('Escriba una descripción de al menos 10 caracteres.', 'warn'); return; }
    const box = $('#archi-result');
    box.innerHTML = AI.fmt(html`<div class="card empty">${icon('sparkles')}<p>Analizando…</p></div>`);
    u.result = await AI.archi.analyze({ texto: exp && u.texto === exp.nombre ? '' : u.texto, dependencia: u.dep, expediente: exp });
    box.innerHTML = AI.fmt(resultHtml(u.result, u.expId));
  };
  AI.actions['archi-analyze-exp'] = (el) => { AI.closeModal(); AI.ui.archi.result = null; location.hash = `#/asistente?exp=${encodeURIComponent(el.dataset.id)}&run=1`; };
  AI.actions['archi-apply'] = async (el) => {
    const e = st().expById(AI.ui.archi.expId); if (!e) return;
    const s = st().serieName(el.dataset.serie); const sub = st().subName(el.dataset.sub);
    const r0 = await AI.confirmDialog('Validar clasificación', `¿Confirma, como funcionario responsable, clasificar ${e.codigo} en «${s}${sub ? ' / ' + sub : ''}»?${el.dataset.sub ? '' : ' La subserie quedará pendiente de selección manual.'}`, { notaLabel: 'Observación de la validación (opcional)', okText: 'Validar y aplicar' });
    if (!r0.ok) return;
    const res = await st().saveExpediente(Object.assign({}, e, { serie: el.dataset.serie, subserie: el.dataset.sub || '' }), e.id);
    if (!res.ok) { AI.toast(Object.values(res.errors)[0], 'err'); return; }
    await st().audit('expediente', e, 'Clasificación validada', `Sugerencia ARCHI (${AI.ui.archi.result.modo === 'demo' ? 'simulación por reglas' : 'IA'}) aceptada por el funcionario${r0.nota ? '. ' + r0.nota : ''}`);
    AI.toast('Clasificación aplicada y registrada en el historial.');
    AI.ui.archi.result = null; AI.ui.archi.expId = ''; AI.ui.archi.texto = '';
    AI.go('#/asistente');
  };
  AI.actions['archi-apply-name'] = async () => {
    const e = st().expById(AI.ui.archi.expId); const n = AI.ui.archi.result.nombreNormalizado;
    const r0 = await AI.confirmDialog('Validar nombre normalizado', `«${e.nombre}» será reemplazado por «${n}».`, { okText: 'Validar y aplicar' });
    if (!r0.ok) return;
    const res = await st().saveExpediente(Object.assign({}, e, { nombre: n }), e.id);
    if (!res.ok) { AI.toast(Object.values(res.errors)[0], 'err'); return; }
    AI.toast('Nombre actualizado.'); $('#archi-text').value = n;
  };
  AI.actions['archi-create'] = (el) => {
    const u = AI.ui.archi; const r = u.result;
    const dm = r.metadatos.find((m) => m.campo === 'dependencia');
    const est = r.metadatos.find((m) => m.campo === 'estado');
    const sop = r.metadatos.find((m) => m.campo === 'soporte');
    AI.expForm(null, { _fromArchi: true, nombre: r.nombreNormalizado || u.texto, serie: el.dataset.serie, subserie: el.dataset.sub, dependencia: u.dep || (dm ? dm.valor : ''), estado: est ? 'Cerrado' : 'Activo', fechaCierre: est ? AI.todayISO() : '', soporte: sop ? 'Híbrido' : 'Físico', observaciones: 'Clasificación sugerida por ARCHI IA y validada por el funcionario al guardar.' });
  };
  AI.actions['archi-reject'] = async (el) => {
    const e = st().expById(AI.ui.archi.expId);
    if (e) await st().audit('expediente', e, 'Sugerencia descartada', `El funcionario descartó la serie sugerida ${st().serieName(el.dataset.serie)}`);
    el.closest('.sug').style.opacity = .45; el.closest('.sug').querySelectorAll('button').forEach((b) => { b.disabled = true; });
    AI.toast('Sugerencia descartada.');
  };

  /* ================= ALERTAS ================= */
  const TIPOS = ['Información obligatoria incompleta', 'Pendiente de clasificación', 'Inconsistencia de fechas', 'Revisión programada', 'Revisión periódica sugerida', 'Transferencia pendiente'];
  AI.views.alertas = {
    title: 'Alertas y seguimiento', sub: () => 'Basadas en reglas configurables · no asumen plazos legales',
    render(root, params) {
      const u = AI.ui.al;
      if (params.dep !== undefined) u.dep = params.dep;
      root.innerHTML = AI.fmt(html`
        <div class="card" style="margin-bottom:14px"><div class="toolbar">
          <select class="select" id="al-dep" aria-label="Dependencia">${AI.depOptions(u.dep)}</select>
          <select class="select" id="al-tipo" aria-label="Tipo"><option value="">Todos los tipos</option>${TIPOS.map((x) => html`<option ${x === u.tipo ? 'selected' : ''}>${x}</option>`)}</select>
          <select class="select" id="al-sev" aria-label="Prioridad"><option value="">Todas las prioridades</option>${['alta', 'media', 'baja'].map((x) => html`<option value="${x}" ${x === u.sev ? 'selected' : ''}>Prioridad ${x}</option>`)}</select>
          <label class="check"><input type="checkbox" id="al-at" ${u.atendidas ? 'checked' : ''}> Mostrar atendidas</label>
          <span class="spacer"></span><a class="btn ghost sm" href="#/configuracion">${icon('settings')} Configurar reglas</a>
        </div></div>
        <div id="al-list"></div>`);
      const on = (id, k, prop = 'value') => $(id).addEventListener('change', (e) => { u[k] = e.target[prop]; this.list(); });
      on('#al-dep', 'dep'); on('#al-tipo', 'tipo'); on('#al-sev', 'sev'); on('#al-at', 'atendidas', 'checked');
      this.list();
    },
    list() {
      const u = AI.ui.al;
      const all = st().computeAlertas();
      const list = all.filter((a) => (!u.dep || a.dependencia === u.dep) && (!u.tipo || a.tipo === u.tipo) && (!u.sev || a.severidad === u.sev) && (u.atendidas || !a.atendida));
      const abiertas = all.filter((a) => !a.atendida);
      const by = (s) => abiertas.filter((a) => a.severidad === s).length;
      $('#al-list').innerHTML = AI.fmt(html`
        <div class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
          <div class="card kpi"><div class="kpi-top">Alertas abiertas<span class="kpi-ic rd">${icon('bell')}</span></div><div class="val">${abiertas.length}</div></div>
          <div class="card kpi"><div class="kpi-top">Prioridad alta<span class="kpi-ic rd">${icon('alert')}</span></div><div class="val">${by('alta')}</div></div>
          <div class="card kpi"><div class="kpi-top">Prioridad media<span class="kpi-ic am">${icon('clock')}</span></div><div class="val">${by('media')}</div></div>
          <div class="card kpi"><div class="kpi-top">Atendidas<span class="kpi-ic em">${icon('check')}</span></div><div class="val">${all.length - abiertas.length}</div></div>
        </div>
        <div class="card">${list.length ? html`<div class="list">${list.map((a) => html`
          <div class="list-item" style="${a.atendida ? 'opacity:.6' : ''}">
            <span class="dot ${a.severidad === 'alta' ? 'rd' : a.severidad === 'media' ? 'am' : 'bl'}">${icon(a.entidad === 'transferencia' ? 'transfer' : a.regla === 'revision' || a.regla === 'sinact' ? 'clock' : 'alert')}</span>
            <div class="body"><div class="row" style="gap:8px"><span class="t">${a.tipo}</span>${AI.sevBadge(a.severidad)}${a.atendida ? html`<span class="badge b-ok">Atendida</span>` : a.acciones.length ? html`<span class="badge b-tr-revision">Acción en curso</span>` : ''}</div>
              <div class="d"><span class="code-tag">${a.ref}</span> ${a.detalle}</div>
              <div class="m">${st().depName(a.dependencia)} · Responsable: ${a.responsable || 'sin asignar'}${a.acciones.length ? ` · Última acción: ${a.acciones[a.acciones.length - 1].descripcion}` : ''}</div></div>
            <div class="row" style="flex-wrap:nowrap">${a.entidad === 'expediente' ? html`<button class="btn sm ghost" data-action="exp-view" data-id="${a.entidadId}">Ver</button>` : html`<button class="btn sm ghost" data-action="tr-view" data-id="${a.entidadId}">Ver</button>`}<button class="btn sm" data-action="al-accion" data-key="${a.key}">Registrar acción</button></div>
          </div>`)}</div>` : html`<div class="empty">${icon('check')}<p>No hay alertas con los filtros seleccionados.</p></div>`}</div>`);
    },
  };
  AI.actions['al-accion'] = (el) => {
    const a = st().computeAlertas().find((x) => x.key === el.dataset.key); if (!a) return;
    AI.openModal('Registrar acción correctiva', html`
      <div class="notice warn" style="margin-bottom:14px">${icon('alert')}<div><b>${a.tipo}</b> · ${a.ref}<br>${a.detalle}</div></div>
      ${a.acciones.length ? html`<ul class="timeline" style="margin-bottom:10px">${a.acciones.map((x) => html`<li>${x.descripcion} <span class="badge nodot">${x.estado}</span><div class="when">${AI.fmtDateTime(x.fecha)} · ${x.responsable || x.usuario}</div></li>`)}</ul>` : ''}
      <form id="acc-form" class="form-grid" novalidate>
        <label class="field full"><span>Acción realizada o programada *</span><textarea name="descripcion" rows="3" maxlength="500" placeholder="Ej.: Se solicitó al responsable completar la ubicación física."></textarea></label>
        <label class="field"><span>Responsable de la acción</span><input name="responsable" maxlength="80" value="${a.responsable || ''}"></label>
        <label class="field"><span>Estado</span><select name="estado"><option>En curso</option><option>Resuelta</option></select></label>
      </form>
      <p class="muted small" style="margin-top:10px">Marcar como «Resuelta» oculta la alerta del listado, pero si la condición persiste se recomienda corregir el registro de origen.</p>`,
    { foot: html`<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-action="al-accion-save" data-key="${a.key}">${icon('check')} Registrar</button>` });
  };
  AI.actions['al-accion-save'] = async (el) => {
    const a = st().computeAlertas().find((x) => x.key === el.dataset.key); const f = $('#acc-form');
    const r = await st().addAccion(a, { descripcion: f.descripcion.value, responsable: f.responsable.value, estado: f.estado.value });
    if (!r.ok) { AI.toast(r.msg, 'err'); f.descripcion.focus(); return; }
    AI.closeModal(); AI.toast('Acción correctiva registrada.'); AI.refresh();
  };
})();
