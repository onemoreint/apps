/* ARCHI IA — asistente de clasificación.
 * MODO DEMOSTRACIÓN: simulación por reglas locales (coincidencia de palabras
 * clave contra el catálogo configurable). NO usa ningún modelo de IA.
 * MODO IA REAL: interfaz preparada para un backend propio y seguro de la entidad
 * (el navegador nunca guarda claves API). Solo envía la descripción, y solo si
 * hay endpoint configurado y autorización explícita del funcionario. */
(function () {
  'use strict';
  const AI = (window.AI = window.AI || {});
  const MOTOR_DEMO = 'Simulación por reglas locales (modo demostración — no se usó un modelo de IA)';

  const DEP_HINTS = {
    HAC: ['predial', 'impuesto', 'tesoreria', 'contribuyente', 'industria y comercio', 'egreso', 'ingreso', 'conciliacion', 'cobro', 'presupuest'],
    GOB: ['peticion', 'queja', 'espacio publico', 'convivencia', 'establecimiento', 'evento', 'ruido', 'juntas de accion comunal'],
    PLA: ['licencia', 'uso del suelo', 'nomenclatura', 'plan de desarrollo', 'banco de proyectos', 'urbanistic', 'obra'],
    SAL: ['salud', 'vacunacion', 'epidemiolog', 'nutricion', 'hospital', 'sanitari'],
    EDU: ['escolar', 'educativ', 'docente', 'becas', 'institucion educativa', 'estudiantes'],
    TH: ['historia laboral', 'nombramiento', 'bienestar', 'capacitacion', 'induccion', 'evaluacion del desempeno', 'servidor', 'nomina'],
    GA: ['inventario', 'bienes', 'almacen', 'vehiculo', 'poliza', 'mantenimiento', 'suministro', 'papeleria'],
  };

  function has(text, kw) {
    const k = AI.norm(kw);
    if (k.length <= 4) return new RegExp('(^|[^a-z0-9])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z0-9]|$)').test(text);
    return text.includes(k);
  }
  function scoreSeries(text, depId) {
    const cat = AI.store.catalogo();
    const dep = cat.dependencias.find((d) => d.id === depId);
    return cat.series.map((s) => {
      const hits = (s.kw || []).filter((k) => has(text, k));
      let score = hits.reduce((acc, k) => acc + (k.includes(' ') ? 3 : 2), 0);
      const nameHit = has(text, s.nombre.split(' ')[0].replace(/s$/, ''));
      if (nameHit) score += 1;
      const depBonus = dep && dep.series && dep.series.includes(s.id) && score > 0;
      if (depBonus) score += 1.5;
      let best = null; let bestHits = [];
      s.subseries.forEach((u) => { const h = (u.kw || []).filter((k) => has(text, k)); const sc = h.reduce((a, k) => a + (k.includes(' ') ? 3 : 2), 0); if (sc > 0 && (!best || sc > best.sc)) { best = { id: u.id, nombre: u.nombre, sc }; bestHits = h; } });
      if (best) score += best.sc * 0.8;
      return { serie: s, score, hits, sub: best, subHits: bestHits, depBonus };
    }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  }
  function detectDependencia(text) {
    let best = null;
    Object.entries(DEP_HINTS).forEach(([id, kws]) => { const h = kws.filter((k) => text.includes(k)); if (h.length && (!best || h.length > best.h.length)) best = { id, h }; });
    return best && AI.store.catalogo().dependencias.some((d) => d.id === best.id) ? best : null;
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function normalizedName(desc, subNombre, year) {
    let d = AI.clean(desc, 300).replace(/[“”"«»]/g, '').replace(/\s*[-–—]\s*/g, ' – ').replace(/\s{2,}/g, ' ').replace(/[.;,:\s]+$/, '');
    d = d.replace(/^(expediente|documento|carpeta|archivo)\s+(de|del|sobre)\s+/i, '');
    d = cap(d);
    const parts = [];
    if (subNombre && !AI.norm(d).startsWith(AI.norm(subNombre).slice(0, 12))) parts.push(subNombre);
    parts.push(d);
    if (year && !d.includes(year)) parts.push(year);
    return parts.join(' – ').slice(0, 160);
  }

  /** Analiza una descripción (y opcionalmente un expediente existente). */
  function analyzeDemo({ texto, dependencia, expediente }) {
    const raw = texto || (expediente ? expediente.nombre + ' ' + (expediente.observaciones || '') : '');
    const text = AI.norm(raw);
    const razones = [];
    const ranking = scoreSeries(text, dependencia || (expediente && expediente.dependencia));
    const max = ranking.length ? ranking[0].score : 0;
    const sugerencias = ranking.slice(0, 3).map((r) => {
      const conf = Math.round(Math.min(0.92, 0.35 + (r.score / (max + 4)) * 0.55 - (ranking[0] !== r ? 0.12 : 0)) * 100);
      const motivos = [];
      if (r.hits.length) motivos.push('Términos de la serie encontrados: ' + r.hits.map((h) => `«${h}»`).join(', '));
      if (r.sub) motivos.push(`Subserie «${r.sub.nombre}» por: ` + r.subHits.map((h) => `«${h}»`).join(', '));
      else motivos.push('No hubo términos suficientes para elegir subserie: selecciónela manualmente.');
      if (r.depBonus) motivos.push('La serie es habitual en la dependencia indicada (según el catálogo de demostración).');
      return { serieId: r.serie.id, serie: r.serie.nombre, subserieId: r.sub ? r.sub.id : '', subserie: r.sub ? r.sub.nombre : '', confianza: conf, motivos };
    });
    if (!sugerencias.length) razones.push('No se encontraron términos del catálogo en la descripción. Agregue más detalle (tipo de documento, asunto, trámite).');

    // Metadatos propuestos
    const metadatos = [];
    const dep = dependencia ? { id: dependencia, h: [] } : detectDependencia(text);
    if (!dependencia && dep) metadatos.push({ campo: 'dependencia', valor: dep.id, etiqueta: AI.store.depName(dep.id), motivo: 'Términos asociados: ' + dep.h.map((h) => `«${h}»`).join(', ') });
    const yearM = raw.match(/\b(20[0-3]\d)\b/);
    if (yearM) metadatos.push({ campo: 'vigencia', valor: yearM[1], etiqueta: yearM[1], motivo: 'Año mencionado en la descripción.' });
    if (/(liquidad|finaliz|cerrad|archivad|terminad)/.test(text)) metadatos.push({ campo: 'estado', valor: 'Cerrado', etiqueta: 'Cerrado', motivo: 'La descripción indica que el trámite terminó (requiere fecha de cierre).' });
    if (/(escanead|digitaliz|correo electronico|pdf|electronic)/.test(text)) metadatos.push({ campo: 'soporte', valor: 'Híbrido', etiqueta: 'Híbrido / electrónico', motivo: 'Menciona documentos digitales o escaneados.' });
    const numM = raw.match(/\b(?:No\.?|N°|número|numero)\s*([0-9]{1,5}(?:-[0-9]{2,4})?)/i);
    if (numM) metadatos.push({ campo: 'referencia', valor: numM[1], etiqueta: numM[1], motivo: 'Número de referencia identificado en el texto.' });
    if (/(cedula|c\.c\.|identificacion|telefono|direccion de residencia|correo personal)/.test(text) || /\b\d{7,10}\b/.test(raw)) {
      razones.push('⚠ La descripción parece contener datos personales (identificación, teléfono o similares). Revise si deben registrarse y aplique la política de tratamiento de datos (Ley 1581 de 2012).');
    }

    // Campos incompletos / inconsistencias (si se analiza un expediente)
    const incompletos = [];
    if (expediente) {
      AI.store.cfg().reglas.camposObligatorios.forEach((k) => { if (!expediente[k]) incompletos.push(AI.catalog.CAMPOS[k]); });
      if (expediente.estado === 'Cerrado' && !expediente.fechaCierre) incompletos.push('Fecha de cierre (el estado es «Cerrado»)');
      if (!expediente.observaciones) incompletos.push('Observaciones (recomendado)');
    } else {
      if (raw.length < 25) incompletos.push('Descripción muy corta: incluya asunto, tipo documental y año');
      if (!yearM) incompletos.push('Año o vigencia del expediente');
      if (!dep) incompletos.push('Dependencia responsable');
    }

    const top = sugerencias[0];
    const year = yearM ? yearM[1] : expediente ? (expediente.fechaApertura || '').slice(0, 4) : '';
    const nombreNormalizado = raw.trim() ? normalizedName(expediente ? expediente.nombre : raw, top ? top.subserie : '', year) : '';
    if (nombreNormalizado) razones.push('Nombre normalizado: «[Subserie] – [Asunto] – [Año]», sin abreviaturas ni signos innecesarios.');

    let resumen = '';
    if (expediente) {
      const e = expediente;
      resumen = `El expediente ${e.codigo} («${e.nombre}») pertenece a ${AI.store.depName(e.dependencia)}` +
        (e.serie ? `, clasificado en la serie ${AI.store.serieName(e.serie)}${e.subserie ? ' / ' + AI.store.subName(e.subserie) : ''}` : ', aún sin clasificación') +
        `. Se abrió el ${AI.fmtDate(e.fechaApertura)}` + (e.fechaCierre ? ` y se cerró el ${AI.fmtDate(e.fechaCierre)}` : '') +
        `; su estado actual es «${e.estado}». ` + (e.ubicacion ? `Ubicación: ${e.ubicacion}. ` : 'No tiene ubicación registrada. ') +
        (e.responsable ? `Responsable: ${e.responsable}.` : 'No tiene responsable asignado.') +
        (incompletos.length ? ` Pendientes: ${incompletos.join(', ')}.` : ' La información obligatoria está completa.');
    } else if (top) {
      resumen = `Documento relacionado con «${AI.clean(raw, 120)}». Clasificación sugerida: ${top.serie}${top.subserie ? ' / ' + top.subserie : ''} (confianza estimada por reglas: ${top.confianza}%).`;
    }
    razones.unshift('La confianza es un puntaje heurístico de coincidencia de términos, no una probabilidad estadística.');
    return { motor: MOTOR_DEMO, modo: 'demo', sugerencias, metadatos, incompletos, nombreNormalizado, resumen, razones, requiereValidacion: true };
  }

  /** Modo IA real: requiere backend propio. Nunca envía datos sin endpoint y autorización. */
  async function analyzeReal(input) {
    const ia = AI.store.cfg().ia;
    if (!ia.endpoint || !/^https:\/\//i.test(ia.endpoint)) throw new Error('No hay un backend HTTPS configurado para el modo IA real.');
    if (!ia.autorizado) throw new Error('Falta la autorización explícita para enviar la descripción al backend.');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    try {
      const res = await fetch(ia.endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal, credentials: 'omit',
        body: JSON.stringify({ tarea: 'clasificar_expediente', descripcion: AI.clean(input.texto || (input.expediente && input.expediente.nombre), 1000), dependencia: input.dependencia || '', catalogo: AI.store.catalogo().series.map((s) => ({ id: s.id, nombre: s.nombre, subseries: s.subseries.map((u) => ({ id: u.id, nombre: u.nombre })) })) }),
      });
      if (!res.ok) throw new Error('El backend respondió con estado ' + res.status);
      const data = await res.json();
      if (!data || !Array.isArray(data.sugerencias)) throw new Error('Respuesta del backend con formato inesperado.');
      const valid = new Set(AI.store.catalogo().series.map((s) => s.id));
      return {
        motor: 'Proveedor de IA vía backend institucional', modo: 'real', requiereValidacion: true,
        sugerencias: data.sugerencias.filter((s) => valid.has(s.serieId)).slice(0, 3).map((s) => ({ serieId: s.serieId, serie: AI.store.serieName(s.serieId), subserieId: s.subserieId || '', subserie: AI.store.subName(s.subserieId) || '', confianza: Math.max(0, Math.min(100, Number(s.confianza) || 0)), motivos: (s.motivos || []).map((m) => AI.clean(m, 300)).slice(0, 5) })),
        metadatos: [], incompletos: (data.incompletos || []).map((m) => AI.clean(m, 200)).slice(0, 10),
        nombreNormalizado: AI.clean(data.nombreNormalizado || '', 160), resumen: AI.clean(data.resumen || '', 1200),
        razones: (data.razones || []).map((m) => AI.clean(m, 300)).slice(0, 8),
      };
    } finally { clearTimeout(timer); }
  }

  async function analyze(input) {
    if (AI.store.cfg().ia.modo === 'real') {
      try { return await analyzeReal(input); } catch (err) {
        const r = analyzeDemo(input);
        r.razones.unshift('No se pudo usar el modo IA real (' + err.message + '). Se muestra la simulación local.');
        return r;
      }
    }
    return analyzeDemo(input);
  }

  AI.archi = { analyze, analyzeDemo, MOTOR_DEMO };
})();
