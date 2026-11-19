/* Vistas: Informes, Simulador de productividad y Configuración. */
(function () {
  'use strict';
  const AI = (window.AI = window.AI || {});
  const { html, icon, $, $$ } = AI;
  const S = AI.state;
  const st = () => AI.store;
  AI.ui.rep = AI.ui.rep || { tipo: 'general', dep: '', desde: '', hasta: '', data: null };

  /* ================= INFORMES ================= */
  const TIPOS = {
    general: 'Informe general de expedientes', dependencia: 'Informe por dependencia', transferencias: 'Informe de transferencias',
    incompletos: 'Informe de registros incompletos', pendientes: 'Informe de actividades pendientes', ejecutivo: 'Resumen ejecutivo',
  };
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  function buildReport({ tipo, dep, desde, hasta }) {
    const inRange = (e) => (!desde || e.fechaApertura >= desde) && (!hasta || e.fechaApertura <= hasta);
    const E = S.expedientes.filter((e) => (!dep || e.dependencia === dep) && inRange(e));
    const T = S.transferencias.filter((t) => !dep || t.dependencia === dep);
    const alertas = st().computeAlertas().filter((a) => !a.atendida && (!dep || a.dependencia === dep));
    const cnt = (f) => E.filter(f).length;
    const base = { titulo: TIPOS[tipo], filtro: `${dep ? st().depName(dep) : 'Todas las dependencias'}${desde || hasta ? ` · Apertura ${desde ? 'desde ' + AI.fmtDate(desde) : ''} ${hasta ? 'hasta ' + AI.fmtDate(hasta) : ''}` : ''}` };
    const expRow = (e) => [e.codigo, st().depName(e.dependencia), st().serieName(e.serie) || 'Sin clasificar', st().subName(e.subserie), e.nombre, AI.fmtDate(e.fechaApertura), e.fechaCierre ? AI.fmtDate(e.fechaCierre) : '', e.estado, e.ubicacion, e.responsable];
    const expHead = ['Código', 'Dependencia', 'Serie', 'Subserie', 'Descripción', 'Apertura', 'Cierre', 'Estado', 'Ubicación', 'Responsable'];
    const stats4 = [{ v: E.length, l: 'Expedientes' }, { v: cnt((e) => e.estado === 'Activo'), l: 'Activos' }, { v: cnt((e) => e.estado === 'Cerrado'), l: 'Cerrados' }, { v: cnt((e) => e.estado === 'Transferido'), l: 'Transferidos' }];
    const incompl = E.filter((e) => st().faltantes(e).length || (e.estado === 'Cerrado' && !e.fechaCierre));
    switch (tipo) {
      case 'general':
        return Object.assign(base, { stats: stats4, narr: [`El inventario filtrado contiene ${E.length} expedientes; ${pct(cnt(st().isPendienteClasif), E.length)}% está pendiente de clasificación y ${pct(incompl.length, E.length)}% tiene información incompleta.`], headers: expHead, rows: E.slice().sort((a, b) => a.codigo.localeCompare(b.codigo)).map(expRow) });
      case 'dependencia': {
        const deps = st().deps().filter((d) => !dep || d.id === dep);
        const rows = deps.map((d) => { const de = E.filter((e) => e.dependencia === d.id); return [d.nombre, de.length, de.filter((e) => e.estado === 'Activo').length, de.filter((e) => e.estado === 'Cerrado').length, de.filter((e) => e.estado === 'Transferido').length, de.filter(st().isPendienteClasif).length, de.filter((e) => st().faltantes(e).length).length, T.filter((t) => t.dependencia === d.id && t.estado !== 'Completada').length, alertas.filter((a) => a.dependencia === d.id).length]; });
        const top = rows.slice().sort((a, b) => b[8] - a[8])[0];
        return Object.assign(base, { stats: stats4, narr: [top && top[8] ? `La dependencia con más alertas abiertas es ${top[0]} (${top[8]}).` : 'No hay alertas abiertas en el alcance seleccionado.'], headers: ['Dependencia', 'Total', 'Activos', 'Cerrados', 'Transferidos', 'Sin clasificar', 'Incompletos', 'Transf. pendientes', 'Alertas abiertas'], rows });
      }
      case 'transferencias':
        return Object.assign(base, {
          stats: [{ v: T.length, l: 'Transferencias' }, { v: T.filter((t) => t.estado === 'Completada').length, l: 'Completadas' }, { v: T.filter((t) => t.estado !== 'Completada').length, l: 'En curso' }, { v: T.reduce((a, t) => a + t.expedientes.length, 0), l: 'Expedientes relacionados' }],
          narr: [`${T.filter((t) => t.estado === 'Devuelta para corrección').length} transferencia(s) fueron devueltas para corrección y ${T.filter((t) => t.estado === 'Pendiente de aprobación').length} esperan aprobación.`],
          headers: ['Número', 'Dependencia', 'Estado', 'Expedientes', 'Fecha propuesta', 'Responsable', 'Última actualización', 'Última observación'],
          rows: T.map((t) => [t.numero, st().depName(t.dependencia), t.estado, t.expedientes.length, AI.fmtDate(t.fechaPropuesta), t.responsable, AI.fmtDateTime(t.actualizado), (t.historial[t.historial.length - 1] || {}).nota || '']),
        });
      case 'incompletos':
        return Object.assign(base, {
          stats: [{ v: incompl.length, l: 'Registros incompletos' }, { v: pct(incompl.length, E.length) + '%', l: 'Del total filtrado' }, { v: cnt(st().isPendienteClasif), l: 'Sin clasificar' }, { v: cnt((e) => !e.ubicacion), l: 'Sin ubicación' }],
          narr: ['Campos evaluados según la regla configurable: ' + st().cfg().reglas.camposObligatorios.map((k) => AI.catalog.CAMPOS[k]).join(', ') + '.'],
          headers: ['Código', 'Dependencia', 'Descripción', 'Estado', 'Campos faltantes', 'Responsable'],
          rows: incompl.map((e) => [e.codigo, st().depName(e.dependencia), e.nombre, e.estado, st().faltantes(e).map((k) => AI.catalog.CAMPOS[k]).concat(e.estado === 'Cerrado' && !e.fechaCierre ? ['Fecha de cierre'] : []).join(', '), e.responsable]),
        });
      case 'pendientes':
        return Object.assign(base, {
          stats: [{ v: alertas.length, l: 'Actividades pendientes' }, { v: alertas.filter((a) => a.severidad === 'alta').length, l: 'Prioridad alta' }, { v: alertas.filter((a) => a.regla === 'trpend').length, l: 'Transferencias' }, { v: alertas.filter((a) => a.regla === 'revision' || a.regla === 'sinact').length, l: 'Revisiones' }],
          narr: ['Listado derivado de las alertas abiertas (reglas configurables). Incluye acciones correctivas en curso.'],
          headers: ['Prioridad', 'Tipo', 'Referencia', 'Dependencia', 'Detalle', 'Responsable', 'Acción registrada'],
          rows: alertas.map((a) => [a.severidad, a.tipo, a.ref, st().depName(a.dependencia), a.detalle, a.responsable || 'Sin asignar', a.acciones.length ? a.acciones[a.acciones.length - 1].descripcion : '']),
        });
      default: { // ejecutivo
        const deps = st().deps();
        const pc = cnt(st().isPendienteClasif);
        const comp = E.length - incompl.length;
        const trComp = T.filter((t) => t.estado === 'Completada').length;
        const masAlertas = deps.map((d) => [d.nombre, alertas.filter((a) => a.dependencia === d.id).length]).sort((a, b) => b[1] - a[1])[0];
        return Object.assign(base, {
          stats: [{ v: E.length, l: 'Expedientes' }, { v: pct(comp, E.length) + '%', l: 'Registros completos' }, { v: alertas.length, l: 'Alertas abiertas' }, { v: `${trComp}/${T.length}`, l: 'Transferencias completadas' }],
          narr: [
            `${st().municipio().etiqueta}: el inventario de demostración reúne ${E.length} expedientes de ${new Set(E.map((e) => e.dependencia)).size} dependencias, con ${cnt((e) => e.estado === 'Activo')} activos y ${cnt((e) => e.estado !== 'Activo')} cerrados o transferidos.`,
            `La calidad del registro es de ${pct(comp, E.length)}%: ${incompl.length} expedientes requieren completar información y ${pc} están pendientes de clasificación (ARCHI IA puede proponer serie y subserie para validación humana).`,
            `Se han gestionado ${T.length} transferencias documentales; ${trComp} completadas y ${T.length - trComp} en curso.`,
            masAlertas && masAlertas[1] ? `Prioridad sugerida: ${masAlertas[0]} concentra ${masAlertas[1]} alertas abiertas.` : 'No hay alertas abiertas.',
          ],
          headers: ['Indicador', 'Valor'],
          rows: [['Expedientes registrados', E.length], ['Activos', cnt((e) => e.estado === 'Activo')], ['Cerrados', cnt((e) => e.estado === 'Cerrado')], ['Transferidos', cnt((e) => e.estado === 'Transferido')], ['Pendientes de clasificación', pc], ['Registros incompletos', incompl.length], ['Transferencias en curso', T.length - trComp], ['Alertas abiertas', alertas.length], ['Alertas de prioridad alta', alertas.filter((a) => a.severidad === 'alta').length]],
        });
      }
    }
  }
  function reportHtml(r) {
    const m = st().municipio();
    return html`<div class="card report" id="report-doc">
      <div class="report-head"><div class="row" style="align-items:flex-start;flex-wrap:nowrap">${st().cfg().logo ? html`<img src="${st().cfg().logo}" alt="" style="height:48px;max-width:120px;object-fit:contain">` : ''}<div><h2>${r.titulo}</h2><p class="muted">${m.etiqueta} · ${r.filtro}</p></div></div><div class="muted small" style="text-align:right">Generado: ${AI.fmtDateTime(new Date().toISOString())}<br>Por: ${st().cfg().usuario}</div></div>
      <div class="stats">${r.stats.map((s) => html`<div class="stat"><b>${s.v}</b><span>${s.l}</span></div>`)}</div>
      <div class="narr">${r.narr.map((p) => html`<p>${p}</p>`)}</div>
      <div class="table-wrap"><table class="tbl"><thead><tr>${r.headers.map((h) => html`<th>${h}</th>`)}</tr></thead><tbody>${r.rows.length ? r.rows.map((row) => html`<tr>${row.map((c) => html`<td>${c === '' || c === undefined ? '—' : c}</td>`)}</tr>`) : html`<tr><td colspan="${r.headers.length}" class="muted">Sin registros.</td></tr>`}</tbody></table></div>
      <p class="disclaimer">Prototipo demostrativo independiente — Datos ficticios. Este informe no constituye un documento oficial. El catálogo de series es de demostración y no corresponde a una TRD/CCD aprobada.</p>
    </div>`;
  }
  AI.views.informes = {
    title: 'Generador de informes', sub: () => 'Exportación CSV y vista imprimible (Guardar como PDF desde el navegador)',
    render(root) {
      const u = AI.ui.rep;
      root.innerHTML = AI.fmt(html`
        <div class="card" style="margin-bottom:16px"><div class="toolbar">
          <select class="select" id="rep-tipo" style="flex:1 1 260px" aria-label="Tipo de informe">${Object.entries(TIPOS).map(([k, l]) => html`<option value="${k}" ${k === u.tipo ? 'selected' : ''}>${l}</option>`)}</select>
          <select class="select" id="rep-dep" aria-label="Dependencia">${AI.depOptions(u.dep)}</select>
          <label class="row small muted" style="gap:6px">Desde <input class="input" style="width:150px" type="date" id="rep-desde" value="${u.desde}"></label>
          <label class="row small muted" style="gap:6px">Hasta <input class="input" style="width:150px" type="date" id="rep-hasta" value="${u.hasta}"></label>
          <button class="btn primary" data-action="rep-gen">${icon('report')} Generar</button>
          <button class="btn" data-action="rep-csv">${icon('download')} CSV</button>
          <button class="btn" data-action="rep-print">${icon('printer')} Imprimir / PDF</button>
        </div></div>
        <div id="rep-out"></div>`);
      AI.actions['rep-gen']();
    },
  };
  const repParams = () => { const u = AI.ui.rep; u.tipo = $('#rep-tipo').value; u.dep = $('#rep-dep').value; u.desde = $('#rep-desde').value; u.hasta = $('#rep-hasta').value; return u; };
  AI.actions['rep-gen'] = () => { const u = repParams(); u.data = buildReport(u); $('#rep-out').innerHTML = AI.fmt(reportHtml(u.data)); };
  AI.actions['rep-csv'] = () => {
    AI.actions['rep-gen']();
    const r = AI.ui.rep.data;
    AI.download(`${AI.ui.rep.tipo}-${st().municipio().id}-${AI.todayISO()}.csv`, AI.toCSV(r.headers, r.rows), 'text/csv;charset=utf-8');
    st().audit('sistema', { id: 'informes', codigo: 'Informe' }, 'Exportación CSV', r.titulo);
    AI.toast('Informe exportado a CSV.');
  };
  AI.actions['rep-print'] = () => { AI.actions['rep-gen'](); AI.printDoc(reportHtml(AI.ui.rep.data)); };

  /* ================= PRODUCTIVIDAD ================= */
  function calc(p) {
    const f = Math.max(0, Number(p.funcionarios) || 0), d = Math.max(0, Number(p.dias) || 0);
    const acts = p.actividades.map((a) => { const n = Math.max(0, Number(a.diarias) || 0); const tr = (Math.max(0, Number(a.tradicional) || 0) * n * f * d) / 60; const dg = (Math.max(0, Number(a.digital) || 0) * n * f * d) / 60; return Object.assign({}, a, { horasTrad: tr, horasDig: dg }); });
    const trad = acts.reduce((s, a) => s + a.horasTrad, 0); const dig = acts.reduce((s, a) => s + a.horasDig, 0);
    return { acts, trad, dig, ahorro: trad - dig, pct: trad ? ((trad - dig) / trad) * 100 : 0, jornadas: (trad - dig) / 8 };
  }
  AI.views.productividad = {
    title: 'Simulador de productividad', sub: () => 'Comparación hipotética: proceso tradicional vs. flujo digital',
    render(root) {
      const p = st().cfg().productividad;
      root.innerHTML = AI.fmt(html`
        <div class="notice warn" style="margin-bottom:16px">${icon('alert')}<div><b>Simulación hipotética.</b> Los valores son supuestos editables, no resultados medidos en ninguna alcaldía. Para una estimación real, mida los tiempos actuales en la entidad y reemplace estos valores.</div></div>
        <div class="compare" style="margin-bottom:16px">
          <section class="card flow trad"><h3>${icon('report')} Proceso administrativo tradicional</h3><ol><li>Registro manual en formatos y libros</li><li>Consulta en diferentes archivos, carpetas y correos</li><li>Actualización de varias hojas de cálculo</li><li>Elaboración manual de informes consolidados</li></ol></section>
          <section class="card flow dig"><h3>${icon('sparkles')} Proceso digital con Archivo Inteligente IA</h3><ol><li>Registro estructurado con validaciones</li><li>Búsqueda centralizada e instantánea</li><li>Validaciones y alertas automáticas</li><li>Generación de reportes con un clic</li></ol></section>
        </div>
        <div class="grid g-2">
          <section class="card card-pad stack" style="gap:14px">
            <h3 style="font-size:15px">Parámetros</h3>
            <div class="form-grid">
              <label class="field"><span>Número de funcionarios</span><input type="number" min="0" max="500" step="1" data-p="funcionarios" value="${p.funcionarios}"></label>
              <label class="field"><span>Días laborales al mes</span><input type="number" min="0" max="31" step="1" data-p="dias" value="${p.dias}"></label>
            </div>
            <div class="table-wrap"><table class="tbl act-table"><thead><tr><th>Actividad</th><th>Min. actual</th><th>Min. con app</th><th>Diarias × func.</th></tr></thead><tbody>
              ${p.actividades.map((a, i) => html`<tr><td>${a.nombre}</td><td><input type="number" min="0" max="999" step="0.5" data-a="${i}" data-k="tradicional" value="${a.tradicional}" aria-label="${a.nombre}: minutos actuales"></td><td><input type="number" min="0" max="999" step="0.5" data-a="${i}" data-k="digital" value="${a.digital}" aria-label="${a.nombre}: minutos con la app"></td><td><input type="number" min="0" max="500" step="0.1" data-a="${i}" data-k="diarias" value="${a.diarias}" aria-label="${a.nombre}: actividades diarias"></td></tr>`)}
            </tbody></table></div>
            <div class="row"><button class="btn ghost sm" data-action="prod-reset">${icon('reset')} Restablecer supuestos</button></div>
          </section>
          <div id="prod-out"></div>
        </div>`);
      const save = () => { st().saveConfig(); };
      $$('[data-p], [data-a]', root).forEach((inp) => inp.addEventListener('input', () => {
        const v = Math.max(0, Math.min(Number(inp.max) || 9999, Number(inp.value) || 0));
        if (inp.dataset.p) p[inp.dataset.p] = v; else p.actividades[Number(inp.dataset.a)][inp.dataset.k] = v;
        this.out(); save();
      }));
      this.out();
    },
    out() {
      const r = calc(st().cfg().productividad);
      const max = Math.max(1, r.trad);
      const h = (n) => AI.num(Math.round(n * 10) / 10);
      $('#prod-out').innerHTML = AI.fmt(html`<div class="stack">
        <div class="big-result two">
          <div class="card kpi"><div class="kpi-top">Tiempo total tradicional<span class="kpi-ic am">${icon('clock')}</span></div><div class="val">${h(r.trad)} h</div><div class="sub">por mes</div></div>
          <div class="card kpi"><div class="kpi-top">Tiempo total digital<span class="kpi-ic em">${icon('sparkles')}</span></div><div class="val">${h(r.dig)} h</div><div class="sub">por mes</div></div>
          <div class="card kpi"><div class="kpi-top">Horas potencialmente ahorradas<span class="kpi-ic">${icon('trend')}</span></div><div class="val">${h(r.ahorro)} h</div><div class="sub">≈ ${h(r.jornadas)} jornadas de 8 h</div></div>
          <div class="card kpi"><div class="kpi-top">Reducción estimada<span class="kpi-ic vi">${icon('gauge')}</span></div><div class="val">${Math.round(r.pct)}%</div><div class="sub">del tiempo operativo</div></div>
        </div>
        <section class="card card-pad stack" style="gap:14px"><h3 style="font-size:15px">Comparación mensual (horas)</h3>
          <div class="bar-compare"><div class="bc-row"><span>Tradicional</span><span class="track"><span class="fill trad" style="display:block;width:${(r.trad / max) * 100}%"></span></span><b>${h(r.trad)} h</b></div>
          <div class="bc-row"><span>Digital</span><span class="track"><span class="fill dig" style="display:block;width:${(r.dig / max) * 100}%"></span></span><b>${h(r.dig)} h</b></div></div>
          <h4 style="font-size:13.5px;margin-top:4px">Por actividad</h4>
          ${AI.charts.hbars(r.acts.map((a) => ({ label: a.nombre, segs: [{ v: Math.round(a.horasDig), color: '#10B981', title: 'Digital (h)' }, { v: Math.round(Math.max(0, a.horasTrad - a.horasDig)), color: '#F59E0B', title: 'Ahorro potencial (h)' }] })))}
          ${AI.charts.legend([{ nombre: 'Horas con la app', color: '#10B981' }, { nombre: 'Ahorro potencial', color: '#F59E0B' }])}
          <p class="muted small">Fórmula: minutos por actividad × actividades diarias × funcionarios × días laborales ÷ 60. Simulación hipotética, no medida.</p>
        </section></div>`);
    },
  };
  AI.actions['prod-reset'] = async () => { st().cfg().productividad = JSON.parse(JSON.stringify(AI.catalog.DEFAULT_PRODUCTIVIDAD)); await st().saveConfig(); AI.refresh(); AI.toast('Supuestos restablecidos.'); };

  /* ================= CONFIGURACIÓN ================= */
  AI.views.configuracion = {
    title: 'Configuración', sub: () => 'Municipio, reglas, catálogo, modo de IA y respaldos',
    render(root) {
      const c = st().cfg(); const R = c.reglas;
      const camposOpc = ['serie', 'subserie', 'responsable', 'ubicacion', 'fechaCierre', 'observaciones'];
      root.innerHTML = AI.fmt(html`
        <div class="grid g-2">
          <section class="card cfg-section"><h3>${icon('building')} Demostración</h3>
            <label class="field"><span>Municipio de la demostración</span><select id="cfg-muni">${Object.values(AI.catalog.MUNICIPIOS).map((m) => html`<option value="${m.id}" ${m.id === c.municipio ? 'selected' : ''}>${m.nombre} (${m.depto})</option>`)}</select></label>
            <label class="field"><span>Perfil de usuario de demostración <span class="hint">· solo etiqueta para el historial, no es autenticación</span></span><input id="cfg-user" maxlength="60" value="${c.usuario}"></label>
            <div class="notice">${icon('shield')}<div>Este prototipo <b>no tiene autenticación ni control de acceso</b>. El perfil solo identifica quién hizo cada cambio en la demostración.</div></div>
            <div><button class="btn primary" data-action="cfg-save-demo">${icon('check')} Guardar</button></div>
          </section>
          <section class="card cfg-section"><h3>${icon('map')} Ficha pública de ${st().municipio().nombre}</h3>
            <dl class="kv">${st().municipio().ficha.map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}</dl>
            ${Object.keys(st().municipio().dependencias).length ? html`<div class="field"><span>Dependencias con nombre real en la demo</span><ul class="reasons">${Object.values(st().municipio().dependencias).map((n) => html`<li>${n}</li>`)}</ul></div>` : ''}
            ${st().municipio().otras && st().municipio().otras.length ? html`<div class="field"><span>Otras dependencias de la alcaldía (no incluidas en los datos demo)</span><ul class="reasons">${st().municipio().otras.map((n) => html`<li>${n}</li>`)}</ul></div>` : ''}
            ${st().municipio().fuentes.length ? html`<p class="muted small"><b>Fuentes:</b> ${st().municipio().fuentes.join(' · ')}. Estructura tomada de los sitios oficiales en noviembre de 2026. Las series documentales siguen siendo de demostración.</p>` : ''}
          </section>
          <section class="card cfg-section"><h3>${icon('shield')} Identidad visual institucional</h3>
            <p class="muted small">La app no incluye escudos ni logotipos oficiales. Si la alcaldía autoriza por escrito el uso de su imagen para esta presentación, puede cargar el logo aquí: queda guardado <b>solo en este navegador</b>, no se publica y la leyenda «Prototipo demostrativo independiente» se mantiene siempre.</p>
            ${c.logo ? html`<div class="row"><img src="${c.logo}" alt="Logo cargado localmente" style="height:56px;max-width:180px;object-fit:contain;border:1px solid var(--border);border-radius:10px;padding:4px;background:#fff"><button class="btn danger sm" data-action="cfg-logo-del">${icon('x')} Quitar logo</button></div>` : ''}
            <label class="check"><input type="checkbox" id="cfg-logo-auth"> Cuento con autorización de la entidad para usar su imagen institucional en esta demostración.</label>
            <label class="btn" style="align-self:flex-start">${icon('upload')} Cargar logo (PNG, JPG o WEBP · máx. 300 KB)<input type="file" id="cfg-logo" accept="image/png,image/jpeg,image/webp" hidden></label>
          </section>
          <section class="card cfg-section"><h3>${icon('bell')} Reglas de alertas</h3>
            <p class="muted small">Reglas internas configurables. No representan plazos legales ni de retención documental; esos deben venir de los instrumentos archivísticos oficiales de la entidad.</p>
            <div class="field"><span>Campos que generan alerta si están vacíos</span><div class="row">${camposOpc.map((k) => html`<label class="check"><input type="checkbox" class="cfg-campo" value="${k}" ${R.camposObligatorios.includes(k) ? 'checked' : ''}> ${AI.catalog.CAMPOS[k]}</label>`)}</div></div>
            <div class="form-grid">
              <label class="field"><span>Revisión sugerida tras (días sin actualizar)</span><input type="number" id="cfg-dsa" min="0" max="3650" value="${R.diasSinActualizar}"></label>
              <label class="field"><span>Transferencia detenida tras (días)</span><input type="number" id="cfg-dtd" min="1" max="365" value="${R.diasTransferenciaDetenida}"></label>
              <label class="field"><span>Avisar revisiones programadas con (días)</span><input type="number" id="cfg-dar" min="0" max="90" value="${R.diasAvisoRevision}"></label>
            </div>
            <label class="check"><input type="checkbox" id="cfg-pc" ${R.pendienteClasificacion ? 'checked' : ''}> Alertar expedientes pendientes de clasificación</label>
            <label class="check"><input type="checkbox" id="cfg-inc" ${R.inconsistencias ? 'checked' : ''}> Alertar inconsistencias de fechas y estados</label>
            <div><button class="btn primary" data-action="cfg-save-rules">${icon('check')} Guardar reglas</button></div>
          </section>
          <section class="card cfg-section"><h3>${icon('sparkles')} Modo de ARCHI IA</h3>
            <label class="check"><input type="radio" name="ia-modo" value="demo" ${c.ia.modo === 'demo' ? 'checked' : ''}> <span><b>Modo demostración</b><br><span class="muted small">Simulación por reglas locales. Nada sale del navegador.</span></span></label>
            <label class="check"><input type="radio" name="ia-modo" value="real" ${c.ia.modo === 'real' ? 'checked' : ''}> <span><b>Modo IA real (preparado)</b><br><span class="muted small">Requiere un backend propio de la entidad que custodie la clave del proveedor. El navegador nunca almacena claves API.</span></span></label>
            <label class="field"><span>URL HTTPS del backend institucional</span><input id="cfg-endpoint" type="url" maxlength="200" placeholder="https://api.entidad.gov.co/archi/clasificar" value="${c.ia.endpoint}"></label>
            <label class="check"><input type="checkbox" id="cfg-auth" ${c.ia.autorizado ? 'checked' : ''}> Autorizo enviar únicamente la descripción del expediente a ese backend durante esta configuración.</label>
            <div class="notice warn">${icon('alert')}<div>No conecte servicios externos ni transmita documentos institucionales sin autorización formal, análisis de riesgos y política de tratamiento de datos. Si el backend falla, ARCHI vuelve automáticamente a la simulación local.</div></div>
            <div><button class="btn primary" data-action="cfg-save-ia">${icon('check')} Guardar modo</button></div>
          </section>
          <section class="card cfg-section"><h3>${icon('archive')} Respaldos y datos</h3>
            <p class="muted small">Almacenamiento actual: <b>${S.storage === 'memory' || AI.db.isMemory() ? 'Memoria temporal (IndexedDB no disponible: los datos se pierden al cerrar)' : 'IndexedDB de este navegador'}</b>. ${S.expedientes.length} expedientes · ${S.transferencias.length} transferencias · ${S.auditoria.length} eventos de auditoría.</p>
            <div class="row"><button class="btn" data-action="cfg-export">${icon('download')} Exportar respaldo JSON</button><label class="btn">${icon('upload')} Importar respaldo JSON<input type="file" id="cfg-import" accept="application/json,.json" hidden></label></div>
            <div class="row"><button class="btn danger" data-action="cfg-reset">${icon('reset')} Restaurar base de demostración</button></div>
            <p class="muted small">Restaurar borra los cambios locales y vuelve a generar los ${72} expedientes ficticios.</p>
          </section>
          <section class="card cfg-section"><h3>${icon('folder')} Catálogo de demostración</h3>
            <p class="muted small">Series y subseries de ejemplo con códigos internos (S01, S01.1…). <b>No son códigos archivísticos oficiales.</b> Cada entidad debe cargar su CCD/TRD aprobados.</p>
            <div class="cat-list">${st().catalogo().series.map((s) => html`<details><summary>${s.id} · ${s.nombre} <span class="muted small">(${s.subseries.length})</span></summary><ul>${s.subseries.map((u) => html`<li>${u.id} · ${u.nombre}</li>`)}</ul></details>`)}</div>
            <div class="form-grid">
              <label class="field"><span>Serie</span><select id="cat-serie"><option value="__new">+ Nueva serie</option>${st().catalogo().series.map((s) => html`<option value="${s.id}">${s.id} · ${s.nombre}</option>`)}</select></label>
              <label class="field"><span>Nombre (serie nueva o subserie)</span><input id="cat-nombre" maxlength="80" placeholder="Ej.: Conceptos jurídicos"></label>
              <label class="field full"><span>Palabras clave para ARCHI (separadas por coma)</span><input id="cat-kw" maxlength="300" placeholder="concepto, juridico, asesoria legal"></label>
            </div>
            <div class="row"><button class="btn" data-action="cat-add">${icon('plus')} Agregar al catálogo</button><button class="btn ghost" data-action="cat-reset">${icon('reset')} Restablecer catálogo</button></div>
          </section>
          <section class="card cfg-section"><h3>${icon('shield')} Marco normativo de referencia</h3>
            <p class="muted small">Normas consideradas como referencia de diseño. <b>Verifique su vigencia, modificaciones y aplicabilidad</b> con el área jurídica y el Archivo General de la Nación antes de convertirlas en reglas del sistema. Este prototipo no cumple integralmente los requisitos de un SGDEA.</p>
            <ul class="reasons"><li>Ley 594 de 2000 — Ley General de Archivos.</li><li>Ley 1712 de 2014 — Transparencia y acceso a la información pública.</li><li>Ley 1581 de 2012 — Protección de datos personales.</li><li>Decreto 1080 de 2015 — Sector Cultura (disposiciones archivísticas).</li><li>Decreto 1078 de 2015 — Sector TIC y Gobierno Digital.</li><li>Modelo Integrado de Planeación y Gestión (MIPG).</li><li>Lineamientos vigentes del Archivo General de la Nación; TRD y CCD de la entidad.</li></ul>
          </section>
        </div>`);
      $('#cfg-logo').addEventListener('change', (e) => {
        const file = e.target.files[0]; e.target.value = '';
        if (!file) return;
        if (!$('#cfg-logo-auth').checked) { AI.toast('Confirme primero que cuenta con autorización de la entidad.', 'warn'); return; }
        if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { AI.toast('Formato no permitido. Use PNG, JPG o WEBP.', 'err'); return; }
        if (file.size > 300 * 1024) { AI.toast('El logo supera 300 KB.', 'err'); return; }
        const rd = new FileReader();
        rd.onload = async () => { c.logo = String(rd.result); await st().saveConfig(); await st().audit('sistema', { id: 'logo', codigo: 'Configuración' }, 'Logo institucional cargado', 'Uso declarado como autorizado por la entidad'); AI.syncShell(); AI.refresh(); AI.toast('Logo cargado en este navegador.'); };
        rd.readAsDataURL(file);
      });
      $('#cfg-import').addEventListener('change', async (e) => {
        const file = e.target.files[0]; e.target.value = '';
        if (!file) return;
        if (file.size > 15 * 1024 * 1024) { AI.toast('El archivo supera 15 MB.', 'err'); return; }
        const r0 = await AI.confirmDialog('Importar respaldo', `Se reemplazarán todos los datos locales por el contenido de «${file.name}».`, { okText: 'Importar', danger: true });
        if (!r0.ok) return;
        try { await st().importBackup(JSON.parse(await file.text())); AI.toast('Respaldo importado correctamente.'); AI.syncShell(); AI.refresh(); } catch (err) { AI.toast(err.message || 'No se pudo leer el archivo.', 'err'); }
      });
    },
  };
  AI.actions['cfg-save-demo'] = async () => {
    const c = st().cfg(); c.municipio = $('#cfg-muni').value; c.usuario = AI.clean($('#cfg-user').value, 60) || 'Usuario demo';
    await st().saveConfig(); AI.syncShell(); AI.toast('Configuración de demostración guardada.'); AI.refresh();
  };
  AI.actions['cfg-save-rules'] = async () => {
    const R = st().cfg().reglas;
    R.camposObligatorios = $$('.cfg-campo').filter((x) => x.checked).map((x) => x.value);
    R.diasSinActualizar = Math.max(0, Math.min(3650, parseInt($('#cfg-dsa').value, 10) || 0));
    R.diasTransferenciaDetenida = Math.max(1, Math.min(365, parseInt($('#cfg-dtd').value, 10) || 10));
    R.diasAvisoRevision = Math.max(0, Math.min(90, parseInt($('#cfg-dar').value, 10) || 0));
    R.pendienteClasificacion = $('#cfg-pc').checked; R.inconsistencias = $('#cfg-inc').checked;
    await st().saveConfig(); AI.syncShell(); AI.toast('Reglas de alertas actualizadas.');
  };
  AI.actions['cfg-save-ia'] = async () => {
    const ia = st().cfg().ia;
    const modo = ($$('input[name="ia-modo"]').find((x) => x.checked) || {}).value || 'demo';
    const ep = AI.clean($('#cfg-endpoint').value, 200);
    if (modo === 'real' && !/^https:\/\/[^\s]+$/i.test(ep)) { AI.toast('Para el modo IA real indique una URL HTTPS de su backend.', 'err'); return; }
    if (modo === 'real' && !$('#cfg-auth').checked) { AI.toast('Marque la autorización explícita para usar el modo IA real.', 'err'); return; }
    Object.assign(ia, { modo, endpoint: ep, autorizado: modo === 'real' && $('#cfg-auth').checked });
    await st().saveConfig(); AI.toast(modo === 'demo' ? 'ARCHI en modo demostración.' : 'Modo IA real configurado (requiere backend disponible).');
  };
  AI.actions['cfg-logo-del'] = async () => { delete st().cfg().logo; await st().saveConfig(); AI.syncShell(); AI.refresh(); AI.toast('Logo eliminado.'); };
  AI.actions['cfg-export'] = () => {
    AI.download(`respaldo-archivo-inteligente-${AI.todayISO()}.json`, JSON.stringify(st().exportBackup(), null, 2), 'application/json');
    AI.toast('Respaldo JSON descargado.');
  };
  AI.actions['cfg-reset'] = async () => {
    const r0 = await AI.confirmDialog('Restaurar base de demostración', 'Se eliminarán todos los cambios locales (expedientes, transferencias, acciones y configuración de reglas) y se regenerarán los datos ficticios.', { okText: 'Restaurar', danger: true });
    if (!r0.ok) return;
    await st().resetDemo(); AI.syncShell(); AI.toast('Base de demostración restaurada.'); AI.go('#/dashboard');
  };
  AI.actions['cat-add'] = async () => {
    const cat = st().catalogo(); const sel = $('#cat-serie').value; const nombre = AI.clean($('#cat-nombre').value, 80);
    const kw = AI.clean($('#cat-kw').value, 300).split(',').map((k) => AI.norm(k).trim()).filter((k) => k.length > 2).slice(0, 15);
    if (nombre.length < 4) { AI.toast('Escriba el nombre de la serie o subserie.', 'warn'); return; }
    if (sel === '__new') {
      const n = cat.series.reduce((m, s) => Math.max(m, parseInt(s.id.slice(1), 10) || 0), 0) + 1;
      const id = 'S' + String(n).padStart(2, '0');
      cat.series.push({ id, nombre, kw, subseries: [] });
      AI.toast(`Serie ${id} agregada. Agregue al menos una subserie.`);
    } else {
      const s = st().serieById(sel); const id = `${s.id}.${s.subseries.length + 1}`;
      s.subseries.push({ id, nombre, kw }); kw.forEach((k) => { if (!s.kw.includes(k)) s.kw.push(k); });
      AI.toast(`Subserie ${id} agregada a ${s.nombre}.`);
    }
    await st().saveConfig(); AI.refresh();
  };
  AI.actions['cat-reset'] = async () => {
    const r0 = await AI.confirmDialog('Restablecer catálogo', 'Se eliminarán las series y subseries agregadas manualmente.', { okText: 'Restablecer', danger: true });
    if (!r0.ok) return;
    st().cfg().catalogo = AI.catalog.defaultCatalogo(); await st().saveConfig(); AI.refresh();
  };
})();
