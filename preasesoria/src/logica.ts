import { CONFIG } from './config';
import {
  NO_ACTIVIDAD_FISICA,
  OTRO,
  OTRO_OBJETIVO,
  PREFIERO_NO,
  SI,
  NO,
} from './opciones';
import type { Errores, Respuestas } from './types';

// ─────────────────────────── Pasos ───────────────────────────

export const PASOS = [
  { id: 'inicio', titulo: 'Bienvenida' },
  { id: 'personales', titulo: 'Datos personales' },
  { id: 'habitos', titulo: 'Actividad y hábitos' },
  { id: 'sueno', titulo: 'Sueño y descanso' },
  { id: 'salud', titulo: 'Salud y medicamentos' },
  { id: 'objetivos', titulo: 'Objetivos personales' },
  { id: 'privacidad', titulo: 'Autorización y privacidad' },
  { id: 'revision', titulo: 'Revisa tus respuestas' },
  { id: 'listo', titulo: 'Tu formulario está listo' },
] as const;

export type PasoId = (typeof PASOS)[number]['id'];

// ─────────────────────── Preguntas condicionales ───────────────────────

export const mostrar = {
  actividadLaboralOtro: (r: Respuestas) => r.actividadLaboral === OTRO,
  tipoEjercicio: (r: Respuestas) =>
    r.actividadFisica !== '' && r.actividadFisica !== NO_ACTIVIDAD_FISICA,
  volverDormir: (r: Respuestas) => r.interrupciones !== '' && r.interrupciones !== NO,
  condiciones: (r: Respuestas) => r.tieneCondicion === SI,
  medicamentos: (r: Respuestas) => r.tomaMedicamentos === SI,
  alergias: (r: Respuestas) => r.tieneAlergias === SI,
  objetivoOtro: (r: Respuestas) => r.objetivo === OTRO_OBJETIVO,
};

// ─────────────────────────── Números ───────────────────────────

/** Convierte "72,5" o "72.5" en 72.5. Devuelve null si no es un número válido. */
export function leerDecimal(valor: string): number | null {
  const limpio = valor.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(limpio)) return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

export function edadNumero(r: Respuestas): number | null {
  const v = r.edad.trim();
  if (!/^\d{1,3}$/.test(v)) return null;
  return Number(v);
}

export function esMenorDeEdad(r: Respuestas): boolean {
  const e = edadNumero(r);
  return e !== null && e > 0 && e < 18;
}

function formatoNumero(valor: string): string {
  const n = leerDecimal(valor);
  return n === null ? valor.trim() : String(n);
}

// ─────────────────────────── Validación ───────────────────────────

const LIMITE_TEXTO_CORTO = 120;
export const LIMITE_TEXTO_LARGO = 800;
export const MAX_MEDICAMENTOS = 25;

export function validarPaso(paso: PasoId, r: Respuestas): Errores {
  const e: Errores = {};

  if (paso === 'personales') {
    const nombre = r.nombre.trim();
    if (!nombre) e.nombre = 'Escribe tu nombre completo.';
    else if (nombre.length < 3) e.nombre = 'El nombre parece incompleto.';
    else if (/\d/.test(nombre)) e.nombre = 'El nombre no debe contener números.';
    else if (nombre.length > LIMITE_TEXTO_CORTO) e.nombre = 'El nombre es demasiado largo.';

    if (!r.edad.trim()) e.edad = 'Escribe tu edad.';
    else {
      const edad = edadNumero(r);
      if (edad === null) e.edad = 'Escribe tu edad en años, solo con números (por ejemplo, 35).';
      else if (edad < 1 || edad > 120) e.edad = 'Escribe una edad entre 1 y 120 años.';
    }

    if (!r.peso.trim()) e.peso = 'Escribe tu peso actual en kilogramos.';
    else {
      const peso = leerDecimal(r.peso);
      if (peso === null) e.peso = 'Escribe el peso solo con números, por ejemplo 72.5.';
      else if (peso < 2 || peso > 400) e.peso = 'Revisa el peso: debe estar entre 2 y 400 kg.';
    }

    if (!r.estatura.trim()) e.estatura = 'Escribe tu estatura en metros, por ejemplo 1.68.';
    else {
      const est = leerDecimal(r.estatura);
      if (est === null) e.estatura = 'Escribe la estatura en metros, por ejemplo 1.68.';
      else if (est >= 40 && est <= 260)
        e.estatura = `Parece que escribiste centímetros. Escríbela en metros: ${(est / 100).toFixed(2)}.`;
      else if (est < 0.4 || est > 2.6) e.estatura = 'Revisa la estatura: debe estar entre 0.40 y 2.60 m.';
    }
  }

  if (paso === 'habitos') {
    if (!r.actividadLaboral) e.actividadLaboral = 'Elige tu actividad laboral.';
    if (mostrar.actividadLaboralOtro(r)) {
      if (!r.actividadLaboralOtro.trim()) e.actividadLaboralOtro = 'Cuéntanos cuál es tu actividad.';
      else if (r.actividadLaboralOtro.length > LIMITE_TEXTO_CORTO) e.actividadLaboralOtro = 'El texto es demasiado largo.';
    }
    if (!r.actividadFisica) e.actividadFisica = 'Elige una opción.';
    if (mostrar.tipoEjercicio(r) && r.tipoEjercicio.length > LIMITE_TEXTO_CORTO)
      e.tipoEjercicio = 'El texto es demasiado largo.';
    if (!r.agua) e.agua = 'Elige una opción.';
    if (!r.comidas) e.comidas = 'Elige una opción.';
  }

  if (paso === 'salud') {
    if (mostrar.condiciones(r) && r.condiciones.length > LIMITE_TEXTO_LARGO)
      e.condiciones = 'El texto es demasiado largo.';
    if (mostrar.alergias(r) && r.alergias.length > LIMITE_TEXTO_LARGO)
      e.alergias = 'El texto es demasiado largo.';
    if (mostrar.medicamentos(r)) {
      r.medicamentos.forEach((m, i) => {
        const tieneAlgo = m.dosis.trim() || m.frecuencia.trim() || m.observaciones.trim();
        if (!m.nombre.trim() && tieneAlgo)
          e[`med-${m.id}`] = `Escribe el nombre del producto ${i + 1} o elimínalo.`;
      });
    }
  }

  if (paso === 'objetivos') {
    if (!r.objetivo) e.objetivo = 'Elige tu objetivo principal.';
    if (mostrar.objetivoOtro(r) && !r.objetivoOtro.trim()) e.objetivoOtro = 'Cuéntanos cuál es tu objetivo.';
    if (r.observaciones.length > LIMITE_TEXTO_LARGO) e.observaciones = 'El texto es demasiado largo.';
  }

  if (paso === 'privacidad') {
    if (!r.autorizaDatos)
      e.autorizaDatos = 'Para preparar tu mensaje necesitamos tu autorización para el tratamiento de tus datos personales.';
    if (compartioDatosSensibles(r) && !r.autorizaSensibles)
      e.autorizaSensibles =
        'Para tu valoración necesitamos tu autorización expresa para tratar tus datos de salud (peso, estatura y los que compartiste).';
    if (esMenorDeEdad(r) && !r.autorizaRepresentante)
      e.autorizaRepresentante = 'Si eres menor de edad, tu padre, madre o representante legal debe autorizar el envío.';
  }

  return e;
}

/** Pasos con preguntas, en orden, para validar todo antes del envío. */
export const PASOS_CON_PREGUNTAS: PasoId[] = ['personales', 'habitos', 'sueno', 'salud', 'objetivos', 'privacidad'];

export function primerPasoConErrores(r: Respuestas): PasoId | null {
  for (const p of PASOS_CON_PREGUNTAS) {
    if (Object.keys(validarPaso(p, r)).length) return p;
  }
  return null;
}

// ───────────────────────── Datos sensibles ─────────────────────────

/** ¿El prospecto compartió algún dato relacionado con su salud (dato sensible, Ley 1581 de 2012)? */
export function compartioDatosSensibles(r: Respuestas): boolean {
  const respondida = (v: string) => v.trim() !== '' && v !== PREFIERO_NO;
  return (
    respondida(r.peso) ||
    respondida(r.estatura) ||
    respondida(r.evacuacion) ||
    respondida(r.horasSueno) ||
    respondida(r.interrupciones) ||
    (mostrar.volverDormir(r) && respondida(r.volverDormir)) ||
    respondida(r.tieneCondicion) ||
    respondida(r.tomaMedicamentos) ||
    respondida(r.tieneAlergias)
  );
}

// ─────────────────────────── Mensaje ───────────────────────────

const SIN_RESPUESTA = 'Sin respuesta';

function valor(v: string): string {
  const t = limpiarTexto(v);
  return t || SIN_RESPUESTA;
}

/** Quita espacios sobrantes y saltos de línea excesivos sin alterar el contenido. */
export function limpiarTexto(v: string): string {
  return v
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function textoLargo(etiqueta: string, v: string): string {
  const t = limpiarTexto(v);
  if (!t) return `${etiqueta}: ${SIN_RESPUESTA}`;
  return t.includes('\n') ? `${etiqueta}:\n${t}` : `${etiqueta}: ${t}`;
}

export interface Seccion {
  titulo: string;
  lineas: string[];
}

export const ENCABEZADO = '📋 *NUEVA SOLICITUD DE ASESORÍA*';

export function construirSecciones(r: Respuestas, fecha: Date = new Date()): Seccion[] {
  const personales: string[] = [
    `Nombre: ${valor(r.nombre)}`,
    `Edad: ${r.edad.trim() ? `${r.edad.trim()} años` : SIN_RESPUESTA}`,
    `Peso: ${r.peso.trim() ? `${formatoNumero(r.peso)} kg` : SIN_RESPUESTA}`,
    `Estatura: ${r.estatura.trim() ? `${formatoNumero(r.estatura)} m` : SIN_RESPUESTA}`,
    `Actividad laboral: ${
      mostrar.actividadLaboralOtro(r)
        ? `Otro: ${valor(r.actividadLaboralOtro)}`
        : valor(r.actividadLaboral)
    }`,
  ];

  const habitos: string[] = [`Actividad física: ${valor(r.actividadFisica)}`];
  if (mostrar.tipoEjercicio(r)) habitos.push(`Tipo de ejercicio: ${valor(r.tipoEjercicio)}`);
  habitos.push(
    `Frecuencia de evacuación: ${valor(r.evacuacion)}`,
    `Consumo de agua: ${valor(r.agua)}`,
    `Comidas al día: ${valor(r.comidas)}`,
  );

  const sueno: string[] = [
    `Horas de sueño: ${valor(r.horasSueno)}`,
    `Interrupciones nocturnas: ${valor(r.interrupciones)}`,
  ];
  if (mostrar.volverDormir(r)) sueno.push(`Tiempo para volver a dormir: ${valor(r.volverDormir)}`);

  const salud: string[] = [];
  if (mostrar.condiciones(r)) {
    const t = limpiarTexto(r.condiciones);
    salud.push(
      t
        ? t.includes('\n')
          ? `Condiciones de salud declaradas: Sí\n${t}`
          : `Condiciones de salud declaradas: Sí — ${t}`
        : 'Condiciones de salud declaradas: Sí (no las detalló)',
    );
  } else {
    salud.push(`Condiciones de salud declaradas: ${valor(r.tieneCondicion)}`);
  }

  if (mostrar.medicamentos(r)) {
    const lista = r.medicamentos.filter((m) => m.nombre.trim());
    if (!lista.length) {
      salud.push('Medicamentos y productos: Sí (no los detalló)');
    } else {
      salud.push(`Medicamentos y productos (${lista.length}):`);
      lista.forEach((m, i) => {
        const partes = [`${i + 1}. ${limpiarTexto(m.nombre)}`];
        partes.push(`   Dosis: ${valor(m.dosis)}`);
        partes.push(`   Frecuencia: ${valor(m.frecuencia)}`);
        if (m.observaciones.trim()) partes.push(`   Observaciones: ${limpiarTexto(m.observaciones).replace(/\n/g, ' ')}`);
        salud.push(partes.join('\n'));
      });
    }
  } else {
    salud.push(`Medicamentos y productos: ${valor(r.tomaMedicamentos)}`);
  }

  if (mostrar.alergias(r)) {
    const t = limpiarTexto(r.alergias);
    salud.push(t ? `Alergias o restricciones: Sí — ${t.replace(/\n/g, ' ')}` : 'Alergias o restricciones: Sí (no las detalló)');
  } else {
    salud.push(`Alergias o restricciones: ${valor(r.tieneAlergias)}`);
  }

  const objetivos: string[] = [
    `Objetivo principal: ${
      mostrar.objetivoOtro(r) ? `Otro: ${valor(r.objetivoOtro)}` : valor(r.objetivo)
    }`,
    textoLargo('Observaciones adicionales', r.observaciones),
  ];

  const privacidad: string[] = [
    r.autorizaDatos
      ? '✅ Autorizó el tratamiento de sus datos personales'
      : '❌ No autorizó el tratamiento de sus datos personales',
  ];
  if (compartioDatosSensibles(r)) {
    privacidad.push(
      r.autorizaSensibles
        ? '✅ Autorizó de forma expresa el tratamiento de sus datos de salud'
        : '❌ No autorizó el tratamiento de sus datos de salud',
    );
  } else {
    privacidad.push('Datos de salud: no compartió');
  }
  if (esMenorDeEdad(r)) {
    privacidad.push(
      r.autorizaRepresentante
        ? '✅ Autorización del padre, madre o representante legal (menor de edad)'
        : '❌ Falta autorización del representante legal (menor de edad)',
    );
  }
  privacidad.push(`Fecha de diligenciamiento: ${formatoFecha(fecha)}`);

  return [
    { titulo: 'DATOS PERSONALES', lineas: personales },
    { titulo: 'ACTIVIDAD Y HÁBITOS', lineas: habitos },
    { titulo: 'SUEÑO Y DESCANSO', lineas: sueno },
    { titulo: 'SALUD Y MEDICAMENTOS', lineas: salud },
    { titulo: 'OBJETIVOS', lineas: objetivos },
    { titulo: 'PRIVACIDAD', lineas: privacidad },
  ];
}

function formatoFecha(f: Date): string {
  const d = (n: number) => String(n).padStart(2, '0');
  return `${d(f.getDate())}/${d(f.getMonth() + 1)}/${f.getFullYear()} ${d(f.getHours())}:${d(f.getMinutes())}`;
}

function seccionATexto(s: Seccion): string {
  return `*${s.titulo}*\n${s.lineas.join('\n')}`;
}

export function construirMensaje(r: Respuestas, fecha?: Date): string {
  const secciones = construirSecciones(r, fecha);
  return [ENCABEZADO, ...secciones.map(seccionATexto)].join('\n\n');
}

// ─────────────────────────── WhatsApp ───────────────────────────

export function enlaceWhatsApp(texto: string, numero: string = CONFIG.whatsappNumero): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

export interface PlanEnvio {
  /** Mensaje completo (para copiar). */
  completo: string;
  /** Uno o varios mensajes a enviar en orden. */
  partes: string[];
  /** Enlaces wa.me, uno por parte. */
  enlaces: string[];
}

/**
 * Prepara el envío. Si el enlace con todo el mensaje supera el límite fiable, divide el
 * mensaje en partes completas (por secciones y, si hace falta, por líneas) sin quitar nada.
 */
export function planificarEnvio(
  r: Respuestas,
  opciones: { fecha?: Date; maxLongitud?: number; numero?: string } = {},
): PlanEnvio {
  const max = opciones.maxLongitud ?? CONFIG.maxLongitudEnlace;
  const numero = opciones.numero ?? CONFIG.whatsappNumero;
  const completo = construirMensaje(r, opciones.fecha);
  const largoEnlace = (t: string) => enlaceWhatsApp(t, numero).length;

  if (largoEnlace(completo) <= max) {
    return { completo, partes: [completo], enlaces: [enlaceWhatsApp(completo, numero)] };
  }

  // Bloques indivisibles: cada línea de cada sección, con su título repetido si la sección se corta.
  const secciones = construirSecciones(r, opciones.fecha);
  const nombre = limpiarTexto(r.nombre) || SIN_RESPUESTA;
  const reserva = largoEnlace(`${ENCABEZADO} — Parte 99 de 99\nNombre: ${nombre}\n\n`);
  const disponible = max - reserva;
  if (disponible < 200) throw new Error('El límite de longitud configurado es demasiado bajo.');

  const cuerpos: string[] = [];
  let actual = '';
  const cabe = (t: string) => encodeURIComponent(t).length <= disponible;
  const agregar = (bloque: string) => {
    const candidato = actual ? `${actual}\n\n${bloque}` : bloque;
    if (cabe(candidato)) actual = candidato;
    else {
      if (actual) cuerpos.push(actual);
      actual = bloque;
    }
  };

  for (const s of secciones) {
    const texto = seccionATexto(s);
    if (cabe(texto)) {
      agregar(texto);
      continue;
    }
    // Sección demasiado larga: se reparte por líneas (y una línea enorme, por fragmentos).
    let trozo = `*${s.titulo}*`;
    const lineas = s.lineas.flatMap((l) => partirLinea(l, disponible - 200));
    for (const l of lineas) {
      const cand = `${trozo}\n${l}`;
      if (cabe(cand)) trozo = cand;
      else {
        agregar(trozo);
        trozo = `*${s.titulo} (continuación)*\n${l}`;
      }
    }
    agregar(trozo);
  }
  if (actual) cuerpos.push(actual);

  const total = cuerpos.length;
  const partes = cuerpos.map(
    (c, i) => `${ENCABEZADO} — Parte ${i + 1} de ${total}\nNombre: ${nombre}\n\n${c}`,
  );
  return { completo, partes, enlaces: partes.map((p) => enlaceWhatsApp(p, numero)) };
}

function partirLinea(linea: string, maxCodificado: number): string[] {
  if (encodeURIComponent(linea).length <= maxCodificado) return [linea];
  const res: string[] = [];
  let actual = '';
  for (const caracter of Array.from(linea)) {
    if (encodeURIComponent(actual + caracter).length > maxCodificado) {
      res.push(actual);
      actual = caracter;
    } else actual += caracter;
  }
  if (actual) res.push(actual);
  return res;
}
