/* Archivo Inteligente IA — catálogo configurable de DEMOSTRACIÓN.
 * IMPORTANTE: los códigos (S01, S01.1, …) son identificadores internos de esta
 * demostración. NO son códigos archivísticos oficiales ni provienen de ninguna
 * Tabla de Retención Documental (TRD) o Cuadro de Clasificación Documental (CCD)
 * aprobado. Cada entidad debe cargar sus propios instrumentos archivísticos. */
(function () {
  'use strict';
  const AI = (window.AI = window.AI || {});

  const DEPENDENCIAS = [
    { id: 'GOB', nombre: 'Secretaría de Gobierno', series: ['S03', 'S06', 'S07', 'S01', 'S05'] },
    { id: 'HAC', nombre: 'Secretaría de Hacienda', series: ['S08', 'S09', 'S05', 'S06'] },
    { id: 'PLA', nombre: 'Secretaría de Planeación', series: ['S07', 'S10', 'S02', 'S05'] },
    { id: 'SAL', nombre: 'Secretaría de Salud', series: ['S10', 'S03', 'S05', 'S01'] },
    { id: 'EDU', nombre: 'Secretaría de Educación', series: ['S10', 'S02', 'S01', 'S05'] },
    { id: 'TH', nombre: 'Talento Humano', series: ['S04', 'S11', 'S06', 'S01'] },
    { id: 'GA', nombre: 'Gestión Administrativa', series: ['S12', 'S02', 'S09', 'S01'] },
  ];

  // keywords en minúscula y sin tildes (se comparan normalizados)
  const SERIES = [
    { id: 'S01', nombre: 'Actas', kw: ['acta', 'comite', 'reunion', 'sesion', 'consejo de gobierno', 'asamblea'], subseries: [
      { id: 'S01.1', nombre: 'Actas de comité', kw: ['comite'] },
      { id: 'S01.2', nombre: 'Actas de reunión', kw: ['reunion', 'mesa de trabajo'] },
      { id: 'S01.3', nombre: 'Actas de consejo de gobierno', kw: ['consejo de gobierno', 'consejo'] } ] },
    { id: 'S02', nombre: 'Contratos', kw: ['contrato', 'contratista', 'prestacion de servicios', 'obra', 'suministro', 'licitacion', 'proveedor', 'interventoria', 'liquidacion del contrato', 'minuta'], subseries: [
      { id: 'S02.1', nombre: 'Contratos de prestación de servicios', kw: ['prestacion de servicios', 'servicios profesionales', 'apoyo a la gestion'] },
      { id: 'S02.2', nombre: 'Contratos de obra', kw: ['obra', 'pavimentacion', 'construccion de', 'mejoramiento', 'interventoria'] },
      { id: 'S02.3', nombre: 'Contratos de suministro', kw: ['suministro', 'compra', 'adquisicion', 'dotacion'] } ] },
    { id: 'S03', nombre: 'Peticiones, quejas y reclamos (PQRSD)', kw: ['peticion', 'derecho de peticion', 'queja', 'reclamo', 'pqrs', 'pqrsd', 'solicitud ciudadana', 'denuncia', 'sugerencia'], subseries: [
      { id: 'S03.1', nombre: 'Derechos de petición', kw: ['peticion', 'derecho de peticion'] },
      { id: 'S03.2', nombre: 'Quejas y reclamos', kw: ['queja', 'reclamo', 'denuncia'] },
      { id: 'S03.3', nombre: 'Solicitudes de información pública', kw: ['solicitud de informacion', 'acceso a la informacion', 'copia de'] } ] },
    { id: 'S04', nombre: 'Historias laborales', kw: ['historia laboral', 'hoja de vida', 'vinculacion', 'posesion', 'servidor publico', 'retiro del servicio', 'nombramiento'], subseries: [
      { id: 'S04.1', nombre: 'Historias laborales de servidores activos', kw: ['vinculacion', 'posesion', 'nombramiento', 'activo'] },
      { id: 'S04.2', nombre: 'Historias laborales de servidores retirados', kw: ['retiro', 'retirado', 'desvinculacion', 'renuncia'] } ] },
    { id: 'S05', nombre: 'Informes', kw: ['informe', 'reporte', 'rendicion de cuentas', 'contraloria', 'procuraduria', 'ente de control', 'seguimiento', 'indicadores'], subseries: [
      { id: 'S05.1', nombre: 'Informes de gestión', kw: ['gestion', 'rendicion de cuentas', 'trimestral', 'anual'] },
      { id: 'S05.2', nombre: 'Informes a entes de control', kw: ['contraloria', 'procuraduria', 'ente de control', 'personeria'] },
      { id: 'S05.3', nombre: 'Informes de seguimiento', kw: ['seguimiento', 'indicadores', 'avance', 'monitoreo'] } ] },
    { id: 'S06', nombre: 'Actos administrativos', kw: ['resolucion', 'decreto', 'circular', 'acto administrativo', 'acuerdo municipal'], subseries: [
      { id: 'S06.1', nombre: 'Resoluciones', kw: ['resolucion'] },
      { id: 'S06.2', nombre: 'Decretos', kw: ['decreto'] },
      { id: 'S06.3', nombre: 'Circulares', kw: ['circular'] } ] },
    { id: 'S07', nombre: 'Licencias y permisos', kw: ['licencia', 'permiso', 'uso del suelo', 'espacio publico', 'urbanistica', 'construccion', 'certificado de', 'nomenclatura'], subseries: [
      { id: 'S07.1', nombre: 'Licencias urbanísticas', kw: ['licencia de construccion', 'urbanistica', 'licencia', 'subdivision'] },
      { id: 'S07.2', nombre: 'Permisos de espacio público y eventos', kw: ['espacio publico', 'evento', 'permiso'] },
      { id: 'S07.3', nombre: 'Certificados de uso del suelo y nomenclatura', kw: ['uso del suelo', 'nomenclatura', 'certificado'] } ] },
    { id: 'S08', nombre: 'Impuestos y rentas', kw: ['predial', 'industria y comercio', 'ica', 'impuesto', 'contribuyente', 'acuerdo de pago', 'cobro coactivo', 'cobro persuasivo', 'rentas', 'facturacion'], subseries: [
      { id: 'S08.1', nombre: 'Impuesto predial', kw: ['predial', 'avaluo'] },
      { id: 'S08.2', nombre: 'Industria y comercio', kw: ['industria y comercio', 'ica', 'establecimiento'] },
      { id: 'S08.3', nombre: 'Acuerdos de pago y cobro', kw: ['acuerdo de pago', 'cobro', 'coactivo', 'persuasivo', 'cartera'] } ] },
    { id: 'S09', nombre: 'Comprobantes contables', kw: ['comprobante', 'egreso', 'ingreso', 'conciliacion', 'tesoreria', 'cuenta por pagar', 'pago a', 'contable', 'presupuestal'], subseries: [
      { id: 'S09.1', nombre: 'Comprobantes de egreso', kw: ['egreso', 'pago a', 'cuenta por pagar'] },
      { id: 'S09.2', nombre: 'Comprobantes de ingreso', kw: ['ingreso', 'recaudo'] },
      { id: 'S09.3', nombre: 'Conciliaciones bancarias', kw: ['conciliacion', 'bancaria', 'extracto'] } ] },
    { id: 'S10', nombre: 'Planes, programas y proyectos', kw: ['plan', 'programa', 'proyecto', 'vacunacion', 'salud publica', 'alimentacion escolar', 'educativo', 'jornada', 'campana', 'estrategia'], subseries: [
      { id: 'S10.1', nombre: 'Seguimiento al plan de desarrollo', kw: ['plan de desarrollo', 'plan de accion', 'metas'] },
      { id: 'S10.2', nombre: 'Programas de salud pública', kw: ['salud publica', 'vacunacion', 'vigilancia epidemiologica', 'jornada de salud', 'nutricion'] },
      { id: 'S10.3', nombre: 'Programas y proyectos educativos', kw: ['educativo', 'alimentacion escolar', 'transporte escolar', 'institucion educativa', 'docente', 'becas'] },
      { id: 'S10.4', nombre: 'Proyectos de inversión', kw: ['proyecto de inversion', 'banco de proyectos', 'formulacion'] } ] },
    { id: 'S11', nombre: 'Bienestar y capacitación del personal', kw: ['bienestar', 'capacitacion', 'induccion', 'evaluacion del desempeno', 'clima laboral', 'seguridad y salud en el trabajo', 'incentivos'], subseries: [
      { id: 'S11.1', nombre: 'Planes de bienestar e incentivos', kw: ['bienestar', 'incentivos', 'clima laboral'] },
      { id: 'S11.2', nombre: 'Planes de capacitación', kw: ['capacitacion', 'induccion', 'reinduccion', 'formacion'] },
      { id: 'S11.3', nombre: 'Evaluación del desempeño', kw: ['evaluacion del desempeno', 'evaluacion'] } ] },
    { id: 'S12', nombre: 'Bienes e inventarios', kw: ['inventario', 'bienes', 'baja de', 'almacen', 'activo fijo', 'vehiculo', 'poliza', 'seguro', 'mantenimiento'], subseries: [
      { id: 'S12.1', nombre: 'Inventarios de bienes muebles', kw: ['inventario', 'activo fijo', 'almacen'] },
      { id: 'S12.2', nombre: 'Bajas de bienes', kw: ['baja de', 'baja', 'obsoleto'] },
      { id: 'S12.3', nombre: 'Pólizas y mantenimiento', kw: ['poliza', 'seguro', 'mantenimiento', 'vehiculo'] } ] },
  ];

  /* Ficha pública de referencia (consultada en nov. 2026). Los nombres de dependencias
   * provienen de documentos públicos (SIGEP, decretos, informes de gestión) y pueden
   * haber cambiado: verificar con la estructura administrativa vigente de cada alcaldía.
   * Solo se sobrescriben los nombres encontrados; el resto queda genérico. */
  const MUNICIPIOS = {
    girardota: {
      id: 'girardota', nombre: 'Girardota', depto: 'Antioquia', etiqueta: 'Alcaldía de Girardota (demostración)',
      ficha: [
        ['Departamento', 'Antioquia'], ['Subregión', 'Valle de Aburrá (Área Metropolitana)'], ['Código DANE', '05308'],
        ['Población proyectada 2026', '62.138 habitantes (proyección DANE)'], ['Sitio web oficial', 'www.girardota.gov.co'],
      ],
      dependencias: { GOB: 'Secretaría de Gobierno y Derechos Humanos', PLA: 'Secretaría de Planeación y Desarrollo Urbano', GA: 'Secretaría de Servicios Administrativos' },
      fuentes: ['Proyecciones de población DANE (2026)', 'Hojas de vida públicas SIGEP — Función Pública', 'Decretos y documentos OCAD publicados por la Gobernación de Antioquia'],
    },
    laestrella: {
      id: 'laestrella', nombre: 'La Estrella', depto: 'Antioquia', etiqueta: 'Alcaldía de La Estrella (demostración)',
      ficha: [
        ['Departamento', 'Antioquia'], ['Subregión', 'Valle de Aburrá (Área Metropolitana)'], ['Código DANE', '05380'],
        ['Población proyectada 2026', '84.068 habitantes (proyección DANE)'], ['Área aproximada', '36,6 km²'], ['Sitio web oficial', 'www.laestrella.gov.co'],
      ],
      dependencias: { SAL: 'Secretaría de Seguridad Social y Familia', EDU: 'Secretaría de Educación y Cultura', GA: 'Secretaría General' },
      fuentes: ['Proyecciones de población DANE (2026)', 'Informes de gestión y rendición de cuentas publicados en laestrella.gov.co', 'Hojas de vida públicas SIGEP — Función Pública'],
    },
    generico: { id: 'generico', nombre: 'Municipio genérico', depto: 'Colombia', etiqueta: 'Administración municipal (demostración)', ficha: [['Uso', 'Plantilla adaptable a cualquier municipio de Colombia']], dependencias: {}, fuentes: [] },
  };

  const ESTADOS = ['Activo', 'Cerrado', 'Transferido'];
  const ESTADOS_TR = ['Borrador', 'En revisión', 'Pendiente de aprobación', 'Aprobada', 'Completada', 'Devuelta para corrección'];
  // Transiciones permitidas (siempre ejecutadas por una persona, nunca por la IA)
  const TRANSICIONES = {
    'Borrador': [{ to: 'En revisión', label: 'Enviar a revisión' }],
    'En revisión': [{ to: 'Pendiente de aprobación', label: 'Marcar como revisada' }, { to: 'Devuelta para corrección', label: 'Devolver para corrección', nota: true, danger: true }],
    'Pendiente de aprobación': [{ to: 'Aprobada', label: 'Aprobar transferencia' }, { to: 'Devuelta para corrección', label: 'Devolver para corrección', nota: true, danger: true }],
    'Aprobada': [{ to: 'Completada', label: 'Registrar recepción en archivo central' }],
    'Devuelta para corrección': [{ to: 'En revisión', label: 'Reenviar a revisión' }],
    'Completada': [],
  };

  const CAMPOS = {
    codigo: 'Código', dependencia: 'Dependencia', serie: 'Serie', subserie: 'Subserie', nombre: 'Nombre o descripción',
    fechaApertura: 'Fecha de apertura', fechaCierre: 'Fecha de cierre', responsable: 'Responsable', estado: 'Estado',
    ubicacion: 'Ubicación documental', observaciones: 'Observaciones', proximaRevision: 'Próxima revisión',
  };

  const DEFAULT_PRODUCTIVIDAD = {
    funcionarios: 3, dias: 21,
    actividades: [
      { id: 'registro', nombre: 'Registro de expedientes', tradicional: 12, digital: 4, diarias: 15 },
      { id: 'consulta', nombre: 'Consulta y búsqueda de expedientes', tradicional: 10, digital: 1.5, diarias: 25 },
      { id: 'actualizacion', nombre: 'Actualización de hojas de cálculo e inventarios', tradicional: 8, digital: 2, diarias: 20 },
      { id: 'informes', nombre: 'Elaboración de informes', tradicional: 120, digital: 15, diarias: 1 },
    ],
  };

  const DEFAULT_CONFIG = {
    municipio: 'girardota',
    usuario: 'Técnico de archivo (perfil demo)',
    reglas: {
      camposObligatorios: ['serie', 'subserie', 'responsable', 'ubicacion'],
      diasSinActualizar: 365,         // recordatorio interno de revisión, NO es un plazo legal
      diasTransferenciaDetenida: 10,   // días sin avance de estado en una transferencia
      diasAvisoRevision: 7,            // anticipación del recordatorio de revisión programada
      pendienteClasificacion: true,
      inconsistencias: true,
    },
    ia: { modo: 'demo', endpoint: '', autorizado: false },
    productividad: DEFAULT_PRODUCTIVIDAD,
  };

  AI.catalog = {
    DEPENDENCIAS, SERIES, MUNICIPIOS, ESTADOS, ESTADOS_TR, TRANSICIONES, CAMPOS, DEFAULT_CONFIG, DEFAULT_PRODUCTIVIDAD,
    defaultCatalogo: () => JSON.parse(JSON.stringify({ dependencias: DEPENDENCIAS, series: SERIES })),
  };
})();
