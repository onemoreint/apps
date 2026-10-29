import { describe, expect, it } from 'vitest';
import { enlaceWhatsApp, fechaLegible, mensajeCita, mensajeGeneral, mensajeServicio } from './whatsapp';
import { validarSolicitud } from './validacion';

const leer = (url: string) => decodeURIComponent(new URL(url).searchParams.get('text') ?? '');

describe('enlaces de WhatsApp', () => {
  it('apunta al número de la doctora', () => {
    expect(enlaceWhatsApp()).toBe('https://wa.me/584167831789');
    expect(enlaceWhatsApp('Hola').startsWith('https://wa.me/584167831789?text=')).toBe(true);
  });

  it('codifica acentos, espacios y saltos de línea', () => {
    const url = enlaceWhatsApp('Hola, Dra. Rodríguez\nmañana & tarde?');
    expect(url).toContain('Rodr%C3%ADguez');
    expect(url).toContain('%0A');
    expect(url).toContain('%26');
    expect(url).not.toMatch(/\s/);
    expect(new URL(url).searchParams.get('text')).toBe('Hola, Dra. Rodríguez\nmañana & tarde?');
  });

  it('arma el mensaje general y el de cada servicio', () => {
    expect(mensajeGeneral()).toContain('Dra. Arelis Rodríguez');
    expect(mensajeServicio('la valoración odontológica')).toBe(
      'Hola, Dra. Arelis Rodríguez. Me gustaría recibir información sobre la valoración odontológica y consultar la disponibilidad de una cita.',
    );
  });
});

describe('solicitud de cita', () => {
  const base = {
    nombre: '  María José Pérez ',
    telefono: '',
    servicio: 'Limpieza dental',
    dia: '2026-11-05',
    horario: 'Mañana',
    comentario: '',
  };

  it('genera el mensaje ordenado', () => {
    const texto = leer(enlaceWhatsApp(mensajeCita(base)));
    expect(texto).toBe(
      [
        'Hola, Dra. Arelis Rodríguez. Quisiera solicitar una cita odontológica.',
        '',
        'Nombre: María José Pérez',
        'Servicio de interés: Limpieza dental',
        'Día preferido: jueves, 5 de noviembre de 2026',
        'Horario preferido: Mañana',
        'Comentario: Sin comentarios',
        '',
        'Quedo pendiente de la disponibilidad. Muchas gracias.',
      ].join('\n'),
    );
  });

  it('incluye el número de contacto cuando se escribe', () => {
    expect(mensajeCita({ ...base, telefono: '+58 412 555 1234' })).toContain('Número de contacto: +58 412 555 1234');
  });

  it('muestra la fecha en español', () => {
    expect(fechaLegible('2026-12-24')).toMatch(/jueves,? 24 de diciembre de 2026/);
  });

  it('valida los campos obligatorios', () => {
    const e = validarSolicitud({ nombre: '', telefono: 'abc', servicio: '', dia: '', horario: '', comentario: '' }, '2026-10-29');
    expect(Object.keys(e).sort()).toEqual(['dia', 'horario', 'nombre', 'servicio', 'telefono']);
  });

  it('no acepta días pasados', () => {
    expect(validarSolicitud({ ...base, dia: '2026-10-28' }, '2026-10-29').dia).toBeDefined();
    expect(validarSolicitud(base, '2026-10-29')).toEqual({});
  });
});
