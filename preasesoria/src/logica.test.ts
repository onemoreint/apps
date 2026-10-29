import { describe, expect, it } from 'vitest';
import {
  compartioDatosSensibles,
  construirMensaje,
  enlaceWhatsApp,
  leerDecimal,
  planificarEnvio,
  primerPasoConErrores,
  validarPaso,
} from './logica';
import { RESPUESTAS_VACIAS, type Respuestas } from './types';

// Datos ficticios para pruebas
const FECHA = new Date(2026, 9, 29, 15, 30);

function base(extra: Partial<Respuestas> = {}): Respuestas {
  return {
    ...RESPUESTAS_VACIAS,
    nombre: 'Ana Prueba Ficticia',
    edad: '34',
    actividadLaboral: 'Empleado',
    actividadFisica: 'No realizo actividad física',
    agua: 'Entre 500 ml y 1 litro',
    comidas: 'Tres veces',
    objetivo: 'Mejorar mi descanso',
    autorizaDatos: true,
    ...extra,
  };
}

const decodificar = (url: string) => decodeURIComponent(url.split('?text=')[1]);

describe('validaciones', () => {
  it('exige nombre y edad', () => {
    const e = validarPaso('personales', RESPUESTAS_VACIAS);
    expect(e.nombre).toBeTruthy();
    expect(e.edad).toBeTruthy();
  });

  it('rechaza valores numéricos inválidos o negativos', () => {
    expect(validarPaso('personales', base({ edad: '-5' })).edad).toBeTruthy();
    expect(validarPaso('personales', base({ edad: '0' })).edad).toBeTruthy();
    expect(validarPaso('personales', base({ edad: '150' })).edad).toBeTruthy();
    expect(validarPaso('personales', base({ peso: '-70' })).peso).toBeTruthy();
    expect(validarPaso('personales', base({ peso: '1000' })).peso).toBeTruthy();
    expect(validarPaso('personales', base({ estatura: '3.5' })).estatura).toBeTruthy();
  });

  it('detecta estatura escrita en centímetros', () => {
    expect(validarPaso('personales', base({ estatura: '168' })).estatura).toContain('1.68');
  });

  it('acepta decimales con punto o coma', () => {
    expect(leerDecimal('72,5')).toBe(72.5);
    expect(leerDecimal('1.68')).toBe(1.68);
    expect(validarPaso('personales', base({ peso: '72,5', estatura: '1,68' }))).toEqual({});
  });

  it('el campo «Otro» es obligatorio solo si se elige', () => {
    expect(validarPaso('habitos', base()).actividadLaboralOtro).toBeUndefined();
    expect(validarPaso('habitos', base({ actividadLaboral: 'Otro' })).actividadLaboralOtro).toBeTruthy();
    expect(validarPaso('objetivos', base({ objetivo: 'Otro objetivo' })).objetivoOtro).toBeTruthy();
  });

  it('un medicamento con dosis pero sin nombre es un error', () => {
    const r = base({
      tomaMedicamentos: 'Sí',
      medicamentos: [{ id: 'a', nombre: '', dosis: '160 mg', frecuencia: '', observaciones: '' }],
    });
    expect(validarPaso('salud', r)['med-a']).toBeTruthy();
  });

  it('exige autorización de datos personales', () => {
    expect(validarPaso('privacidad', base({ autorizaDatos: false })).autorizaDatos).toBeTruthy();
  });

  it('exige autorización de datos sensibles solo si se compartieron', () => {
    expect(compartioDatosSensibles(base())).toBe(false);
    expect(validarPaso('privacidad', base()).autorizaSensibles).toBeUndefined();
    const conSalud = base({ horasSueno: 'Entre 6 y 7 horas' });
    expect(compartioDatosSensibles(conSalud)).toBe(true);
    expect(validarPaso('privacidad', conSalud).autorizaSensibles).toBeTruthy();
    expect(validarPaso('privacidad', { ...conSalud, autorizaSensibles: true })).toEqual({});
  });

  it('«Prefiero no responder» no cuenta como dato de salud', () => {
    expect(compartioDatosSensibles(base({ evacuacion: 'Prefiero no responder', tieneCondicion: 'Prefiero no responder' }))).toBe(false);
  });

  it('pide autorización del representante si es menor de edad', () => {
    expect(validarPaso('privacidad', base({ edad: '16' })).autorizaRepresentante).toBeTruthy();
    expect(validarPaso('privacidad', base({ edad: '16', autorizaRepresentante: true }))).toEqual({});
  });

  it('localiza el primer paso incompleto antes del envío', () => {
    expect(primerPasoConErrores(base())).toBeNull();
    expect(primerPasoConErrores(base({ comidas: '' }))).toBe('habitos');
    expect(primerPasoConErrores(base({ autorizaDatos: false }))).toBe('privacidad');
  });
});

describe('mensaje de WhatsApp', () => {
  it('usa solo las respuestas reales y marca «Sin respuesta» en opcionales vacías', () => {
    const m = construirMensaje(base(), FECHA);
    expect(m.startsWith('📋 *NUEVA SOLICITUD DE ASESORÍA*')).toBe(true);
    expect(m).toContain('Nombre: Ana Prueba Ficticia');
    expect(m).toContain('Edad: 34 años');
    expect(m).toContain('Peso: Sin respuesta');
    expect(m).toContain('Comidas al día: Tres veces');
    expect(m).toContain('Objetivo principal: Mejorar mi descanso');
    expect(m).toContain('✅ Autorizó el tratamiento de sus datos personales');
    expect(m).toContain('Datos de salud: no compartió');
    expect(m).toContain('Fecha de diligenciamiento: 29/10/2026 15:30');
  });

  it('omite preguntas condicionales que no corresponden', () => {
    const m = construirMensaje(base({ interrupciones: 'No', volverDormir: 'Más de una hora' }), FECHA);
    expect(m).not.toContain('Tipo de ejercicio');
    expect(m).not.toContain('Tiempo para volver a dormir');
    expect(m).not.toContain('Más de una hora');
  });

  it('incluye las condicionales cuando aplican', () => {
    const m = construirMensaje(
      base({
        actividadFisica: 'Sí, todos los días',
        tipoEjercicio: 'Natación',
        interrupciones: 'Sí, dos veces',
        volverDormir: 'Entre 10 y 30 minutos',
        actividadLaboral: 'Otro',
        actividadLaboralOtro: 'Artesana',
      }),
      FECHA,
    );
    expect(m).toContain('Tipo de ejercicio: Natación');
    expect(m).toContain('Tiempo para volver a dormir: Entre 10 y 30 minutos');
    expect(m).toContain('Actividad laboral: Otro: Artesana');
  });

  it('lista cada medicamento con dosis y frecuencia, ignorando registros vacíos', () => {
    const m = construirMensaje(
      base({
        tomaMedicamentos: 'Sí',
        medicamentos: [
          { id: '1', nombre: 'Producto ficticio A', dosis: '160 mg', frecuencia: 'Cada 12 horas', observaciones: '' },
          { id: '2', nombre: '', dosis: '', frecuencia: '', observaciones: '' },
          { id: '3', nombre: 'Vitamina ficticia B', dosis: '', frecuencia: '', observaciones: 'En ayunas' },
        ],
        autorizaSensibles: true,
      }),
      FECHA,
    );
    expect(m).toContain('Medicamentos y productos (2):');
    expect(m).toContain('1. Producto ficticio A\n   Dosis: 160 mg\n   Frecuencia: Cada 12 horas');
    expect(m).toContain('2. Vitamina ficticia B\n   Dosis: Sin respuesta');
    expect(m).toContain('Observaciones: En ayunas');
  });

  it('codifica acentos, ñ, emojis, saltos de línea y símbolos', () => {
    const r = base({ nombre: 'José Peña Núñez', observaciones: 'Línea 1 & más\nLínea 2 #50% ¿sí? 🙂' });
    const texto = construirMensaje(r, FECHA);
    const url = enlaceWhatsApp(texto);
    expect(url.startsWith('https://wa.me/573022917846?text=')).toBe(true);
    expect(url.split('?text=')[1]).not.toMatch(/[ \n#&]/);
    expect(url).toContain('%0A');
    expect(decodificar(url)).toBe(texto);
    expect(texto).toContain('José Peña Núñez');
    expect(texto).toContain('Observaciones adicionales:\nLínea 1 & más\nLínea 2 #50% ¿sí? 🙂');
  });

  it('dirige exactamente al número configurado', () => {
    const plan = planificarEnvio(base(), { fecha: FECHA });
    expect(plan.enlaces).toHaveLength(1);
    expect(new URL(plan.enlaces[0]).pathname).toBe('/573022917846');
    expect(new URL(plan.enlaces[0]).hostname).toBe('wa.me');
  });
});

describe('mensajes muy largos', () => {
  const largo = base({
    tieneCondicion: 'Sí',
    condiciones: 'Condición ficticia de prueba con descripción extensa. '.repeat(14),
    tomaMedicamentos: 'Sí',
    autorizaSensibles: true,
    medicamentos: Array.from({ length: 25 }, (_, i) => ({
      id: String(i),
      nombre: `Producto ficticio número ${i + 1} con nombre largo`,
      dosis: `${(i + 1) * 10} mg`,
      frecuencia: 'Dos veces al día después de las comidas',
      observaciones: 'Observación ficticia de prueba con acentos: además, también',
    })),
    observaciones: 'Texto ficticio adicional. '.repeat(30),
  });

  it('divide en partes sin perder ni una línea y respetando el límite', () => {
    const plan = planificarEnvio(largo, { fecha: FECHA });
    expect(plan.partes.length).toBeGreaterThan(1);
    plan.enlaces.forEach((u) => expect(u.length).toBeLessThanOrEqual(6000));
    plan.partes.forEach((p, i) => {
      expect(p).toContain(`Parte ${i + 1} de ${plan.partes.length}`);
      expect(p).toContain('Nombre: Ana Prueba Ficticia');
    });
    // Cada línea de contenido del mensaje completo aparece en alguna parte
    const unidas = plan.partes.join('\n');
    const lineas = plan.completo.split('\n').filter((l) => l.trim() && !l.startsWith('📋'));
    for (const l of lineas) expect(unidas).toContain(l);
    // Los enlaces decodificados coinciden con las partes
    plan.enlaces.forEach((u, i) => expect(decodificar(u)).toBe(plan.partes[i]));
  });

  it('no divide cuando cabe en un solo mensaje', () => {
    expect(planificarEnvio(base(), { fecha: FECHA }).partes).toHaveLength(1);
  });

  it('parte incluso una línea enorme sin perder caracteres', () => {
    const r = base({ observaciones: 'á'.repeat(3000) });
    const plan = planificarEnvio(r, { fecha: FECHA, maxLongitud: 3000 });
    plan.enlaces.forEach((u) => expect(u.length).toBeLessThanOrEqual(3000));
    const total = plan.partes.join('').split('á').length - 1;
    expect(total).toBe(3000);
  });
});
