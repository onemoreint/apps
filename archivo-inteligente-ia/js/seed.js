/* Archivo Inteligente IA — generador de datos de DEMOSTRACIÓN.
 * Todos los datos son inventados: no hay nombres de personas, números de
 * identificación ni información personal. Los responsables se representan
 * por cargo genérico + código ficticio. Generación determinista (misma semilla). */
(function () {
  'use strict';
  const AI = (window.AI = window.AI || {});

  function rng(seed) { // mulberry32
    return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  const SECTORES = ['sector Norte', 'vereda demostrativa A', 'vereda demostrativa B', 'barrio Ejemplo 3', 'zona urbana 2', 'corregimiento ficticio C', 'sector Centro', 'parque principal (demo)'];
  const TEMAS = {
    'S01.1': ['Acta de comité de archivo No. {n}', 'Acta de comité de conciliación No. {n}', 'Acta de comité de gestión y desempeño No. {n}'],
    'S01.2': ['Acta de reunión de seguimiento con juntas de acción comunal ({s})', 'Acta de mesa de trabajo interinstitucional No. {n}'],
    'S01.3': ['Acta de consejo de gobierno — sesión ordinaria No. {n}'],
    'S02.1': ['Contrato de prestación de servicios de apoyo a la gestión No. {n}-{y}', 'Contrato de prestación de servicios profesionales No. {n}-{y}'],
    'S02.2': ['Contrato de obra para mejoramiento de vía en {s}', 'Contrato de obra de adecuación de escenario deportivo ({s})', 'Interventoría del contrato de obra No. {n}-{y}'],
    'S02.3': ['Contrato de suministro de papelería y útiles de oficina {y}', 'Contrato de suministro de dotación para personal operativo', 'Adquisición de equipos de cómputo No. {n}-{y}'],
    'S03.1': ['Derecho de petición sobre alumbrado público en {s}', 'Derecho de petición por solicitud de reparcheo en {s}', 'Derecho de petición sobre poda de árboles en {s}'],
    'S03.2': ['Queja por ruido de establecimiento en {s}', 'Reclamo por atención en ventanilla única', 'Queja por manejo de residuos en {s}'],
    'S03.3': ['Solicitud de información pública sobre ejecución presupuestal {y}', 'Solicitud de copia de actos administrativos {y}'],
    'S04.1': ['Historia laboral — servidor activo código TH-{n}', 'Historia laboral — vinculación por nombramiento código TH-{n}'],
    'S04.2': ['Historia laboral — servidor retirado código TH-{n}'],
    'S05.1': ['Informe de gestión trimestral {y}', 'Informe de rendición de cuentas {y}'],
    'S05.2': ['Informe a Contraloría — vigencia {y}', 'Respuesta a requerimiento de ente de control No. {n}'],
    'S05.3': ['Informe de seguimiento a indicadores del plan de acción {y}', 'Informe de seguimiento a PQRSD — semestre {n}'],
    'S06.1': ['Resolución de reconocimiento No. {n} de {y}', 'Resolución de delegación de funciones No. {n} de {y}'],
    'S06.2': ['Decreto municipal de horario de atención (demo) No. {n}'],
    'S06.3': ['Circular informativa sobre trámites internos No. {n}'],
    'S07.1': ['Licencia de construcción — predio demostrativo {n} en {s}', 'Licencia urbanística de subdivisión — predio demo {n}'],
    'S07.2': ['Permiso de uso de espacio público para evento cultural en {s}', 'Permiso para feria de emprendimiento en {s}'],
    'S07.3': ['Certificado de uso del suelo — establecimiento demo {n}', 'Certificado de nomenclatura — predio demo {n}'],
    'S08.1': ['Impuesto predial — gestión de cartera vigencia {y}', 'Revisión de avalúo para impuesto predial — predio demo {n}'],
    'S08.2': ['Industria y comercio — declaraciones vigencia {y}', 'Registro de establecimiento comercial demo {n} (ICA)'],
    'S08.3': ['Acuerdo de pago de impuesto predial No. {n}-{y}', 'Cobro persuasivo de cartera — lote {n}'],
    'S09.1': ['Comprobantes de egreso — mes {m} de {y}', 'Cuentas por pagar a proveedores — lote {n}'],
    'S09.2': ['Comprobantes de ingreso por recaudo — mes {m} de {y}'],
    'S09.3': ['Conciliaciones bancarias — cuenta demo {n}, {y}'],
    'S10.1': ['Seguimiento a metas del plan de desarrollo {y}', 'Plan de acción institucional {y}'],
    'S10.2': ['Programa de vacunación — jornada en {s}', 'Programa de salud pública: vigilancia epidemiológica {y}', 'Jornada de salud y nutrición en {s}'],
    'S10.3': ['Programa de alimentación escolar {y}', 'Programa de transporte escolar — ruta {n}', 'Proyecto de becas para educación superior {y}'],
    'S10.4': ['Proyecto de inversión — formulación banco de proyectos No. {n}'],
    'S11.1': ['Plan de bienestar e incentivos {y}', 'Actividades de clima laboral {y}'],
    'S11.2': ['Plan institucional de capacitación {y}', 'Jornada de inducción y reinducción {y}'],
    'S11.3': ['Evaluación del desempeño — periodo {y}'],
    'S12.1': ['Inventario de bienes muebles — sede demo {n}', 'Actualización de inventario de activos fijos {y}'],
    'S12.2': ['Baja de bienes obsoletos — lote {n}'],
    'S12.3': ['Pólizas de seguros de vehículos oficiales {y}', 'Mantenimiento preventivo de vehículos {y}'],
  };
  const CARGOS = ['Auxiliar administrativo', 'Técnico de archivo', 'Profesional universitario', 'Profesional especializado'];

  function generate() {
    const r = rng(20260415);
    const pick = (a) => a[Math.floor(r() * a.length)];
    const int = (a, b) => a + Math.floor(r() * (b - a + 1));
    const { DEPENDENCIAS, SERIES } = AI.catalog;
    const today = AI.todayISO();
    const nowMs = Date.now();
    const seq = {};
    const expedientes = [];
    const auditoria = [];
    const TOTAL = 72;

    for (let i = 0; i < TOTAL; i++) {
      const dep = DEPENDENCIAS[i % DEPENDENCIAS.length];
      const serieId = pick(dep.series);
      const serie = SERIES.find((s) => s.id === serieId);
      const sub = pick(serie.subseries);
      const ago = Math.floor(Math.pow(r(), 1.35) * 820) + 3;
      const apertura = AI.addDays(today, -ago);
      const year = apertura.slice(0, 4);
      let estado = 'Activo';
      if (ago > 420) estado = r() < 0.55 ? 'Cerrado' : r() < 0.5 ? 'Transferido' : 'Activo';
      else if (ago > 60) estado = r() < 0.3 ? 'Cerrado' : 'Activo';
      let cierre = '';
      if (estado !== 'Activo') { cierre = AI.addDays(apertura, int(30, Math.min(320, ago - 1))); if (cierre > today) cierre = today; }
      const key = dep.id + year;
      seq[key] = (seq[key] || 0) + 1;
      const codigo = `${dep.id}-${serie.id}-${year}-${String(seq[key]).padStart(3, '0')}`;
      const n = int(1, 240);
      const nombre = pick(TEMAS[sub.id]).replace('{n}', String(n).padStart(3, '0')).replace('{y}', year).replace('{s}', pick(SECTORES)).replace('{m}', AI.MESES[Number(apertura.slice(5, 7)) - 1].toLowerCase());
      const responsable = `${pick(CARGOS)} ${dep.id}-${String(int(1, 4)).padStart(2, '0')}`;
      const ubicacion = estado === 'Transferido'
        ? `Archivo central · Módulo ${int(1, 4)} · Caja ${int(1, 120)}`
        : `Archivo de gestión ${dep.id} · Estante ${int(1, 6)} · Caja ${int(1, 40)} · Carpeta ${int(1, 12)}`;
      const exp = {
        id: 'exp-demo-' + String(i + 1).padStart(3, '0'), codigo, dependencia: dep.id, serie: serie.id, subserie: sub.id, nombre,
        fechaApertura: apertura, fechaCierre: cierre, responsable, estado, ubicacion,
        archivo: estado === 'Transferido' ? 'Central' : 'Gestión',
        soporte: pick(['Físico', 'Físico', 'Híbrido', 'Electrónico']), folios: int(4, 220),
        observaciones: '', proximaRevision: '',
        creado: new Date(apertura + 'T09:00:00').toISOString(),
        actualizado: new Date(Math.min(nowMs, new Date(AI.addDays(apertura, int(0, Math.min(ago, 200))) + 'T15:00:00').getTime())).toISOString(),
      };
      // Casos de demostración: registros incompletos, pendientes de clasificación e inconsistencias
      if (i % 11 === 7) { exp.serie = ''; exp.subserie = ''; exp.estado = 'Activo'; exp.fechaCierre = ''; exp.archivo = 'Gestión'; exp.observaciones = 'Registro migrado desde hoja de cálculo; falta clasificación.'; exp.ubicacion = exp.ubicacion.replace('Archivo central', 'Archivo de gestión'); }
      if (i % 13 === 5) { exp.responsable = ''; }
      if (i % 17 === 3) { exp.ubicacion = ''; }
      if (i === 40) { exp.estado = 'Cerrado'; exp.fechaCierre = ''; exp.archivo = 'Gestión'; exp.observaciones = 'Marcado como cerrado sin fecha de cierre (dato heredado).'; }
      if (exp.estado === 'Activo' && i % 9 === 2) exp.proximaRevision = AI.addDays(today, int(-6, 12));
      expedientes.push(exp);
      auditoria.push({ id: 'aud-seed-' + i, fecha: exp.creado, entidad: 'expediente', entidadId: exp.id, codigo: exp.codigo, dependencia: dep.id, accion: 'Creación', detalle: 'Carga inicial de datos de demostración', usuario: 'Sistema (demo)' });
    }

    // Actividad reciente (últimos 30 días) para el panel de actividades por dependencia
    const acciones = ['Actualización de metadatos', 'Consulta de expediente', 'Cambio de ubicación', 'Clasificación validada', 'Revisión de inventario'];
    for (let k = 0; k < 46; k++) {
      const e = pick(expedientes);
      const d = new Date(nowMs - int(0, 29) * 86400000 - int(0, 8) * 3600000);
      auditoria.push({ id: 'aud-act-' + k, fecha: d.toISOString(), entidad: 'expediente', entidadId: e.id, codigo: e.codigo, dependencia: e.dependencia, accion: pick(acciones), detalle: 'Actividad simulada de demostración', usuario: 'Usuario demo' });
    }

    // Transferencias en distintos estados
    const transferencias = [];
    const usados = new Set();
    const elegibles = (dep, estadoReq) => expedientes.filter((e) => e.dependencia === dep && e.estado === estadoReq && e.serie && e.subserie && e.responsable && e.ubicacion && e.fechaCierre && !usados.has(e.id));
    const plan = [
      ['HAC', 'Completada', 'Transferido'], ['GOB', 'Completada', 'Transferido'], ['TH', 'Aprobada', 'Cerrado'],
      ['PLA', 'Pendiente de aprobación', 'Cerrado'], ['SAL', 'En revisión', 'Cerrado'], ['EDU', 'Devuelta para corrección', 'Cerrado'], ['GA', 'Borrador', 'Cerrado'],
    ];
    const flujo = ['Borrador', 'En revisión', 'Pendiente de aprobación', 'Aprobada', 'Completada'];
    plan.forEach(([dep, estadoFinal, estExp], idx) => {
      let lista = elegibles(dep, estExp).slice(0, int(2, 4));
      if (!lista.length) lista = elegibles(dep, estExp === 'Transferido' ? 'Cerrado' : 'Transferido').slice(0, 2);
      if (!lista.length) return;
      lista.forEach((e) => usados.add(e.id));
      const inicio = AI.addDays(today, -int(18, 75));
      const historial = [];
      const pasos = estadoFinal === 'Devuelta para corrección' ? ['Borrador', 'En revisión', 'Devuelta para corrección'] : flujo.slice(0, flujo.indexOf(estadoFinal) + 1);
      let dia = 0;
      pasos.forEach((p, j) => {
        dia += j === 0 ? 0 : int(2, 7);
        historial.push({ estado: p, fecha: new Date(AI.addDays(inicio, Math.min(dia, AI.daysBetween(inicio, today))) + 'T10:30:00').toISOString(), usuario: j === 0 ? `Profesional universitario ${dep}-01` : 'Técnico de archivo central (demo)', nota: p === 'Devuelta para corrección' ? 'Falta foliación en dos expedientes; corregir y reenviar.' : p === 'Completada' ? 'Recepción verificada contra el inventario.' : '' });
      });
      transferencias.push({
        id: 'tr-demo-' + (idx + 1), numero: `TR-${today.slice(0, 4)}-${String(idx + 1).padStart(3, '0')}`, dependencia: dep,
        responsable: `Profesional universitario ${dep}-01`, expedientes: lista.map((e) => e.id), fechaPropuesta: AI.addDays(inicio, int(20, 45)),
        observaciones: 'Transferencia primaria de demostración (archivo de gestión → archivo central).', estado: estadoFinal, historial,
        creado: historial[0].fecha, actualizado: historial[historial.length - 1].fecha,
      });
      if (estadoFinal === 'Completada') lista.forEach((e) => { e.estado = 'Transferido'; e.archivo = 'Central'; e.ubicacion = `Archivo central · Módulo ${int(1, 4)} · Caja ${int(1, 120)}`; if (!e.fechaCierre) e.fechaCierre = AI.addDays(e.fechaApertura, 60); });
    });
    // Un transferido "suelto" sin transferencia queda como dato histórico previo al prototipo.
    return { expedientes, transferencias, auditoria, acciones: [] };
  }

  AI.seed = { generate };
})();
