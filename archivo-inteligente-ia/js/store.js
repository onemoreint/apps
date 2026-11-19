/* Archivo Inteligente IA — estado de la aplicación, reglas de negocio y auditoría. */
(function () {
  'use strict';
  const AI = (window.AI = window.AI || {});
  const S = (AI.state = { expedientes: [], transferencias: [], auditoria: [], acciones: [], config: null, storage: 'indexeddb' });

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const cfg = () => S.config;
  const catalogo = () => S.config.catalogo;
  const depName = (id) => (catalogo().dependencias.find((d) => d.id === id) || {}).nombre || id || '—';
  const serieById = (id) => catalogo().series.find((s) => s.id === id);
  const serieName = (id) => (serieById(id) || {}).nombre || '';
  function subName(id) { for (const s of catalogo().series) { const x = s.subseries.find((u) => u.id === id); if (x) return x.nombre; } return ''; }
  const expById = (id) => S.expedientes.find((e) => e.id === id);
  const trById = (id) => S.transferencias.find((t) => t.id === id);
  const municipio = () => AI.catalog.MUNICIPIOS[S.config.municipio] || AI.catalog.MUNICIPIOS.generico;

  async function saveConfig() { await AI.db.put('config', { key: 'main', value: S.config }); }

  async function load() {
    S.storage = await AI.db.open();
    const conf = await AI.db.getAll('config');
    const main = conf.find((c) => c.key === 'main');
    if (!main) { await resetDemo(true); return; }
    S.config = Object.assign(clone(AI.catalog.DEFAULT_CONFIG), main.value);
    S.config.reglas = Object.assign(clone(AI.catalog.DEFAULT_CONFIG.reglas), main.value.reglas || {});
    if (!S.config.catalogo) S.config.catalogo = AI.catalog.defaultCatalogo();
    [S.expedientes, S.transferencias, S.auditoria, S.acciones] = await Promise.all(['expedientes', 'transferencias', 'auditoria', 'acciones'].map(AI.db.getAll));
  }

  async function resetDemo(keepNothing) {
    const prevMunicipio = S.config && !keepNothing ? S.config.municipio : 'girardota';
    await AI.db.clearAll();
    const data = AI.seed.generate();
    S.config = clone(AI.catalog.DEFAULT_CONFIG);
    S.config.municipio = prevMunicipio;
    S.config.catalogo = AI.catalog.defaultCatalogo();
    Object.assign(S, data);
    await Promise.all([
      AI.db.putMany('expedientes', S.expedientes), AI.db.putMany('transferencias', S.transferencias),
      AI.db.putMany('auditoria', S.auditoria), saveConfig(),
    ]);
  }

  async function audit(entidad, obj, accion, detalle) {
    const a = { id: AI.uid('aud'), fecha: new Date().toISOString(), entidad, entidadId: obj.id, codigo: obj.codigo || obj.numero || '', dependencia: obj.dependencia || '', accion, detalle: AI.clean(detalle, 600), usuario: S.config.usuario };
    S.auditoria.push(a);
    await AI.db.put('auditoria', a);
    return a;
  }

  /* ---------- Expedientes ---------- */
  const CODE_RE = /^[A-Z0-9][A-Z0-9.\-/]{2,39}$/;
  function sanitizeExp(input) {
    const c = AI.clean;
    return {
      codigo: c(input.codigo, 40).toUpperCase(), dependencia: c(input.dependencia, 10), serie: c(input.serie, 12), subserie: c(input.subserie, 12),
      nombre: c(input.nombre, 200), fechaApertura: c(input.fechaApertura, 10), fechaCierre: c(input.fechaCierre, 10),
      responsable: c(input.responsable, 80), estado: c(input.estado, 20), ubicacion: c(input.ubicacion, 160),
      observaciones: c(input.observaciones, 1000), proximaRevision: c(input.proximaRevision, 10),
      soporte: c(input.soporte || 'Físico', 20), folios: Math.max(0, Math.min(99999, parseInt(input.folios, 10) || 0)),
    };
  }
  /** Valida y devuelve {errors:{campo:msg}, warnings:[...]} */
  function validateExp(d, id) {
    const errors = {}; const warnings = [];
    const today = AI.todayISO();
    if (!d.codigo) errors.codigo = 'El código es obligatorio.';
    else if (!CODE_RE.test(d.codigo)) errors.codigo = 'Usa 3–40 caracteres: letras, números, guion, punto o barra.';
    else if (S.expedientes.some((e) => e.codigo === d.codigo && e.id !== id)) errors.codigo = 'Ya existe un expediente con este código.';
    if (!catalogo().dependencias.some((x) => x.id === d.dependencia)) errors.dependencia = 'Selecciona la dependencia responsable.';
    if (d.nombre.length < 8) errors.nombre = 'Describe el expediente (mínimo 8 caracteres).';
    if (!AI.isISODate(d.fechaApertura)) errors.fechaApertura = 'Indica la fecha de apertura.';
    else if (d.fechaApertura > today) errors.fechaApertura = 'La fecha de apertura no puede ser futura.';
    if (d.fechaCierre) {
      if (!AI.isISODate(d.fechaCierre)) errors.fechaCierre = 'Fecha no válida.';
      else if (d.fechaCierre < d.fechaApertura) errors.fechaCierre = 'El cierre no puede ser anterior a la apertura.';
      else if (d.fechaCierre > today) errors.fechaCierre = 'La fecha de cierre no puede ser futura.';
    }
    if (!AI.catalog.ESTADOS.includes(d.estado)) errors.estado = 'Estado no válido.';
    if (d.estado === 'Cerrado' && !d.fechaCierre) errors.fechaCierre = 'Un expediente cerrado requiere fecha de cierre.';
    if (d.estado === 'Activo' && d.fechaCierre) errors.estado = 'Si tiene fecha de cierre, el estado debe ser «Cerrado».';
    if (d.serie && !serieById(d.serie)) errors.serie = 'Serie no encontrada en el catálogo.';
    if (d.subserie && !(serieById(d.serie) || { subseries: [] }).subseries.some((u) => u.id === d.subserie)) errors.subserie = 'La subserie no pertenece a la serie seleccionada.';
    if (d.proximaRevision && !AI.isISODate(d.proximaRevision)) errors.proximaRevision = 'Fecha no válida.';
    S.config.reglas.camposObligatorios.forEach((k) => { if (!d[k]) warnings.push(AI.catalog.CAMPOS[k]); });
    return { errors, warnings };
  }
  function suggestCode(dep, serie, fecha) {
    const y = (fecha || AI.todayISO()).slice(0, 4);
    const pre = `${dep || 'DEP'}-${serie || 'SC'}-${y}-`;
    let n = 1;
    S.expedientes.forEach((e) => { if (e.codigo.startsWith(`${dep}-`) && e.codigo.includes(`-${y}-`)) { const m = e.codigo.match(/-(\d+)$/); if (m) n = Math.max(n, Number(m[1]) + 1); } });
    let code = pre + String(n).padStart(3, '0');
    while (S.expedientes.some((e) => e.codigo === code)) { n++; code = pre + String(n).padStart(3, '0'); }
    return code;
  }
  function diffText(a, b) {
    const keys = ['codigo', 'dependencia', 'serie', 'subserie', 'nombre', 'fechaApertura', 'fechaCierre', 'responsable', 'estado', 'ubicacion', 'observaciones', 'proximaRevision'];
    return keys.filter((k) => (a[k] || '') !== (b[k] || '')).map((k) => `${AI.catalog.CAMPOS[k]}: «${a[k] || '—'}» → «${b[k] || '—'}»`).join('; ');
  }
  async function saveExpediente(input, id) {
    const d = sanitizeExp(input);
    const prev = id ? expById(id) : null;
    if (prev && prev.estado === 'Transferido') d.estado = 'Transferido';
    const v = validateExp(d, id);
    if (prev && prev.estado === 'Transferido') delete v.errors.estado;
    if (Object.keys(v.errors).length) return { ok: false, ...v };
    const now = new Date().toISOString();
    if (prev) {
      const changes = diffText(prev, d);
      Object.assign(prev, d, { actualizado: now });
      await AI.db.put('expedientes', prev);
      await audit('expediente', prev, 'Edición', changes || 'Sin cambios de contenido');
      return { ok: true, exp: prev, warnings: v.warnings };
    }
    const exp = Object.assign({ id: AI.uid('exp'), archivo: 'Gestión', creado: now, actualizado: now }, d);
    S.expedientes.push(exp);
    await AI.db.put('expedientes', exp);
    await audit('expediente', exp, 'Creación', 'Registro manual desde formulario');
    return { ok: true, exp, warnings: v.warnings };
  }
  async function changeEstado(id, estado, nota) {
    const e = expById(id);
    if (!e) return { ok: false, msg: 'Expediente no encontrado.' };
    if (e.estado === 'Transferido') return { ok: false, msg: 'Un expediente transferido solo se gestiona desde el archivo central.' };
    if (enTransferenciaActiva(id)) return { ok: false, msg: 'El expediente está incluido en una transferencia en curso.' };
    const prev = e.estado;
    if (estado === 'Cerrado' && !e.fechaCierre) e.fechaCierre = AI.todayISO();
    if (estado === 'Activo') e.fechaCierre = '';
    e.estado = estado; e.actualizado = new Date().toISOString();
    await AI.db.put('expedientes', e);
    await audit('expediente', e, 'Cambio de estado', `${prev} → ${estado}${nota ? '. ' + nota : ''}`);
    return { ok: true };
  }
  const isPendienteClasif = (e) => !e.serie || !e.subserie;
  const faltantes = (e) => S.config.reglas.camposObligatorios.filter((k) => !e[k]);

  /* ---------- Transferencias ---------- */
  const TR_ACTIVAS = ['Borrador', 'En revisión', 'Pendiente de aprobación', 'Aprobada', 'Devuelta para corrección'];
  const enTransferenciaActiva = (expId, exceptTr) => S.transferencias.find((t) => t.id !== exceptTr && TR_ACTIVAS.includes(t.estado) && t.expedientes.includes(expId));
  /** Requisitos de un expediente para ser transferido (reglas de demostración configurables). */
  function motivoNoElegible(e, trId) {
    if (e.estado === 'Transferido') return 'Ya está en el archivo central';
    if (e.estado !== 'Cerrado') return 'Debe estar cerrado';
    if (!e.fechaCierre) return 'Sin fecha de cierre';
    if (isPendienteClasif(e)) return 'Sin clasificar (serie/subserie)';
    const f = ['responsable', 'ubicacion'].filter((k) => !e[k]);
    if (f.length) return 'Falta: ' + f.map((k) => AI.catalog.CAMPOS[k].toLowerCase()).join(', ');
    const t = enTransferenciaActiva(e.id, trId);
    if (t) return 'Incluido en ' + t.numero;
    return '';
  }
  function nextTrNumber() {
    const y = AI.todayISO().slice(0, 4);
    let n = 0;
    S.transferencias.forEach((t) => { const m = t.numero.match(new RegExp(`^TR-${y}-(\\d+)$`)); if (m) n = Math.max(n, Number(m[1])); });
    return `TR-${y}-${String(n + 1).padStart(3, '0')}`;
  }
  async function saveTransferencia(input, id) {
    const c = AI.clean;
    const d = { dependencia: c(input.dependencia, 10), responsable: c(input.responsable, 80), fechaPropuesta: c(input.fechaPropuesta, 10), observaciones: c(input.observaciones, 1000), expedientes: (input.expedientes || []).map(String) };
    const errors = {};
    if (!catalogo().dependencias.some((x) => x.id === d.dependencia)) errors.dependencia = 'Selecciona la dependencia remitente.';
    if (d.responsable.length < 3) errors.responsable = 'Indica el responsable.';
    if (!AI.isISODate(d.fechaPropuesta)) errors.fechaPropuesta = 'Indica la fecha propuesta.';
    if (!d.expedientes.length) errors.expedientes = 'Selecciona al menos un expediente.';
    d.expedientes.forEach((eid) => { const e = expById(eid); if (!e || e.dependencia !== d.dependencia || motivoNoElegible(e, id)) errors.expedientes = 'Hay expedientes no elegibles en la relación.'; });
    if (Object.keys(errors).length) return { ok: false, errors };
    const now = new Date().toISOString();
    if (id) {
      const t = trById(id);
      if (!['Borrador', 'Devuelta para corrección'].includes(t.estado)) return { ok: false, errors: { general: 'Solo se edita en Borrador o Devuelta para corrección.' } };
      Object.assign(t, d, { actualizado: now });
      await AI.db.put('transferencias', t);
      await audit('transferencia', t, 'Edición', `Relación con ${t.expedientes.length} expediente(s)`);
      return { ok: true, tr: t };
    }
    const t = Object.assign({ id: AI.uid('tr'), numero: nextTrNumber(), estado: 'Borrador', creado: now, actualizado: now, historial: [{ estado: 'Borrador', fecha: now, usuario: S.config.usuario, nota: 'Creación de la transferencia' }] }, d);
    S.transferencias.push(t);
    await AI.db.put('transferencias', t);
    await audit('transferencia', t, 'Creación', `Transferencia con ${t.expedientes.length} expediente(s)`);
    return { ok: true, tr: t };
  }
  async function advanceTransferencia(id, to, nota) {
    const t = trById(id);
    const allowed = (AI.catalog.TRANSICIONES[t.estado] || []).some((x) => x.to === to);
    if (!allowed) return { ok: false, msg: 'Transición no permitida.' };
    if (to === 'Completada') {
      const bad = t.expedientes.map(expById).filter((e) => !e || e.estado !== 'Cerrado');
      if (bad.length) return { ok: false, msg: 'Todos los expedientes deben seguir cerrados para completar la transferencia.' };
      for (const e of t.expedientes.map(expById)) {
        const prevUb = e.ubicacion;
        e.estado = 'Transferido'; e.archivo = 'Central'; e.ubicacion = `Archivo central · Recibido en ${t.numero}`; e.actualizado = new Date().toISOString();
        await AI.db.put('expedientes', e);
        await audit('expediente', e, 'Transferencia completada', `Ubicación: «${prevUb}» → «${e.ubicacion}»`);
      }
    }
    const prev = t.estado;
    t.estado = to; t.actualizado = new Date().toISOString();
    t.historial.push({ estado: to, fecha: t.actualizado, usuario: S.config.usuario, nota: AI.clean(nota, 400) });
    await AI.db.put('transferencias', t);
    await audit('transferencia', t, 'Cambio de estado', `${prev} → ${to}${nota ? '. ' + nota : ''}`);
    return { ok: true };
  }

  /* ---------- Alertas (reglas configurables; no asumen plazos legales) ---------- */
  function computeAlertas() {
    const R = S.config.reglas; const today = AI.todayISO(); const out = [];
    const push = (a) => { a.key = a.regla + ':' + a.entidadId; const acc = S.acciones.filter((x) => x.alertKey === a.key); a.acciones = acc; a.atendida = acc.some((x) => x.estado === 'Resuelta'); out.push(a); };
    S.expedientes.forEach((e) => {
      if (e.estado === 'Transferido') return;
      const falt = faltantes(e).filter((k) => !(R.pendienteClasificacion && (k === 'serie' || k === 'subserie')));
      if (falt.length) push({ regla: 'campos', tipo: 'Información obligatoria incompleta', severidad: 'alta', entidad: 'expediente', entidadId: e.id, ref: e.codigo, dependencia: e.dependencia, responsable: e.responsable, detalle: 'Faltan: ' + falt.map((k) => AI.catalog.CAMPOS[k]).join(', ') });
      if (R.pendienteClasificacion && isPendienteClasif(e)) push({ regla: 'clasif', tipo: 'Pendiente de clasificación', severidad: 'media', entidad: 'expediente', entidadId: e.id, ref: e.codigo, dependencia: e.dependencia, responsable: e.responsable, detalle: 'Sin serie/subserie del catálogo. Puede usar ARCHI IA para obtener una sugerencia.' });
      if (R.inconsistencias) {
        if (e.estado === 'Cerrado' && !e.fechaCierre) push({ regla: 'incons', tipo: 'Inconsistencia de fechas', severidad: 'alta', entidad: 'expediente', entidadId: e.id, ref: e.codigo, dependencia: e.dependencia, responsable: e.responsable, detalle: 'Estado «Cerrado» sin fecha de cierre.' });
        if (e.fechaCierre && e.fechaCierre < e.fechaApertura) push({ regla: 'incons', tipo: 'Inconsistencia de fechas', severidad: 'alta', entidad: 'expediente', entidadId: e.id, ref: e.codigo, dependencia: e.dependencia, responsable: e.responsable, detalle: 'Fecha de cierre anterior a la apertura.' });
      }
      if (e.proximaRevision && AI.daysBetween(today, e.proximaRevision) <= R.diasAvisoRevision) {
        const d = AI.daysBetween(today, e.proximaRevision);
        push({ regla: 'revision', tipo: 'Revisión programada', severidad: d < 0 ? 'alta' : 'baja', entidad: 'expediente', entidadId: e.id, ref: e.codigo, dependencia: e.dependencia, responsable: e.responsable, detalle: d < 0 ? `Revisión vencida hace ${-d} día(s) (${AI.fmtDate(e.proximaRevision)}).` : d === 0 ? 'Revisión programada para hoy.' : `Revisión programada en ${d} día(s) (${AI.fmtDate(e.proximaRevision)}).` });
      } else if (e.estado === 'Activo' && R.diasSinActualizar > 0 && AI.daysBetween(e.actualizado, today) > R.diasSinActualizar) {
        push({ regla: 'sinact', tipo: 'Revisión periódica sugerida', severidad: 'baja', entidad: 'expediente', entidadId: e.id, ref: e.codigo, dependencia: e.dependencia, responsable: e.responsable, detalle: `Sin actualizaciones hace ${AI.daysBetween(e.actualizado, today)} días (regla interna configurable: ${R.diasSinActualizar} días).` });
      }
    });
    S.transferencias.forEach((t) => {
      if (t.estado === 'Completada') return;
      const dias = AI.daysBetween(t.actualizado, today);
      const pend = { regla: 'trpend', tipo: 'Transferencia pendiente', severidad: t.estado === 'Devuelta para corrección' || dias > R.diasTransferenciaDetenida ? 'alta' : 'media', entidad: 'transferencia', entidadId: t.id, ref: t.numero, dependencia: t.dependencia, responsable: t.responsable, detalle: `Estado «${t.estado}» desde hace ${dias} día(s)${dias > R.diasTransferenciaDetenida ? ' — supera el umbral configurado' : ''}.` };
      push(pend);
    });
    const sev = { alta: 0, media: 1, baja: 2 };
    return out.sort((a, b) => sev[a.severidad] - sev[b.severidad] || a.ref.localeCompare(b.ref));
  }
  async function addAccion(alerta, input) {
    const a = { id: AI.uid('acc'), alertKey: alerta.key, fecha: new Date().toISOString(), descripcion: AI.clean(input.descripcion, 500), responsable: AI.clean(input.responsable, 80), estado: input.estado === 'Resuelta' ? 'Resuelta' : 'En curso', usuario: S.config.usuario };
    if (a.descripcion.length < 5) return { ok: false, msg: 'Describe la acción correctiva.' };
    S.acciones.push(a);
    await AI.db.put('acciones', a);
    await audit(alerta.entidad, { id: alerta.entidadId, codigo: alerta.ref, dependencia: alerta.dependencia }, 'Acción correctiva', `${alerta.tipo}: ${a.descripcion} (${a.estado})`);
    return { ok: true };
  }

  /* ---------- Respaldo ---------- */
  function exportBackup() {
    return { app: 'archivo-inteligente-ia', version: 1, exportado: new Date().toISOString(), aviso: 'Respaldo de prototipo demostrativo con datos ficticios', config: S.config, expedientes: S.expedientes, transferencias: S.transferencias, auditoria: S.auditoria, acciones: S.acciones };
  }
  async function importBackup(obj) {
    if (!obj || obj.app !== 'archivo-inteligente-ia' || !Array.isArray(obj.expedientes) || !Array.isArray(obj.transferencias)) throw new Error('El archivo no es un respaldo válido de Archivo Inteligente IA.');
    const okExp = obj.expedientes.every((e) => e && typeof e.id === 'string' && typeof e.codigo === 'string' && typeof e.nombre === 'string');
    const okTr = obj.transferencias.every((t) => t && typeof t.id === 'string' && Array.isArray(t.expedientes) && Array.isArray(t.historial));
    if (!okExp || !okTr) throw new Error('El respaldo tiene registros con estructura no válida.');
    const sanitizeObj = (o) => { const r = {}; Object.keys(o).forEach((k) => { const v = o[k]; r[k] = typeof v === 'string' ? AI.clean(v, 2000) : v; }); return r; };
    await AI.db.clearAll();
    S.expedientes = obj.expedientes.map(sanitizeObj);
    S.transferencias = obj.transferencias.map(sanitizeObj);
    S.auditoria = (Array.isArray(obj.auditoria) ? obj.auditoria : []).filter((a) => a && a.id).map(sanitizeObj);
    S.acciones = (Array.isArray(obj.acciones) ? obj.acciones : []).filter((a) => a && a.id).map(sanitizeObj);
    const base = clone(AI.catalog.DEFAULT_CONFIG);
    S.config = Object.assign(base, obj.config && typeof obj.config === 'object' ? obj.config : {});
    if (!AI.catalog.MUNICIPIOS[S.config.municipio]) S.config.municipio = 'generico';
    if (!S.config.catalogo || !Array.isArray(S.config.catalogo.series)) S.config.catalogo = AI.catalog.defaultCatalogo();
    S.config.ia = Object.assign({ modo: 'demo', endpoint: '', autorizado: false }, S.config.ia, { autorizado: false });
    await Promise.all([AI.db.putMany('expedientes', S.expedientes), AI.db.putMany('transferencias', S.transferencias), AI.db.putMany('auditoria', S.auditoria), AI.db.putMany('acciones', S.acciones), saveConfig()]);
    await audit('sistema', { id: 'backup', codigo: 'Respaldo' }, 'Importación de respaldo', `${S.expedientes.length} expedientes importados`);
  }

  AI.store = { load, resetDemo, saveConfig, audit, cfg, catalogo, depName, serieById, serieName, subName, expById, trById, municipio, sanitizeExp, validateExp, suggestCode, saveExpediente, changeEstado, isPendienteClasif, faltantes, enTransferenciaActiva, motivoNoElegible, saveTransferencia, advanceTransferencia, computeAlertas, addAccion, exportBackup, importBackup, TR_ACTIVAS };
})();
