import { describe, expect, it } from 'vitest';
import { COTIZACION_VACIA, coordenadasDeEnlace, mensajeCotizacion, urlComoLlegar, urlMapaIncrustado, validarCotizacion } from './cotizacion';

const ENLACE =
  'https://www.google.com/maps/place/Urbanizaci%C3%B3n+Felicity/@6.1526068,-76.2615824,10z/data=!4m10!1m2!2m1!1sfelicity!3m6!1s0x8e468116cccc3d0b:0x214e76627bf4ee47!8m2!3d6.1526068!4d-75.6518412!15sCghmZWxpY2l0eZIBEmFwYXJ0bWVudF9idWlsZGluZ-ABAA!16s%2Fg%2F11c7t2jz7j?entry=ttu';

describe('Ubicación', () => {
  it('toma el punto exacto del lugar y no el centro de la vista', () => {
    expect(coordenadasDeEnlace(ENLACE)).toEqual({ lat: 6.1526068, lng: -75.6518412 });
  });
  it('acepta otros formatos y rechaza basura', () => {
    expect(coordenadasDeEnlace('https://maps.google.com/?q=6.15,-75.65')).toEqual({ lat: 6.15, lng: -75.65 });
    expect(coordenadasDeEnlace('6.1526, -75.6518')).toEqual({ lat: 6.1526, lng: -75.6518 });
    expect(coordenadasDeEnlace('https://www.google.com/maps/@6.2,-75.6,14z')).toEqual({ lat: 6.2, lng: -75.6 });
    expect(coordenadasDeEnlace('hola')).toBeNull();
    expect(coordenadasDeEnlace('95, 200')).toBeNull();
  });
  it('arma el mapa incrustado y el enlace para llegar', () => {
    expect(urlMapaIncrustado(6.1526068, -75.6518412)).toBe('https://www.google.com/maps?q=6.1526068,-75.6518412&z=16&hl=es&output=embed');
    expect(urlComoLlegar(6.1526068, -75.6518412)).toBe('https://www.google.com/maps/dir/?api=1&destination=6.1526068,-75.6518412');
  });
});

describe('Cotización', () => {
  const datos = {
    ...COTIZACION_VACIA,
    nombre: 'Laura Díaz',
    telefono: '311 555 0000',
    tipo_evento: 'Cumpleaños',
    fecha_evento: '2026-11-21',
    personas: '40',
    presupuesto: '400.000',
    descripcion: 'Torta de dos pisos temática de unicornio y 30 cupcakes.',
    acepta_datos: true,
  };
  it('valida lo mínimo y deja opcionales fecha, personas y presupuesto', () => {
    expect(validarCotizacion(datos, '2026-10-29')).toEqual({});
    expect(validarCotizacion({ ...datos, fecha_evento: '', personas: '', presupuesto: '' }, '2026-10-29')).toEqual({});
    expect(validarCotizacion({ ...COTIZACION_VACIA, personas: 'muchas', fecha_evento: '2026-10-01' }, '2026-10-29')).toEqual({
      nombre: 'Escribe tu nombre.',
      telefono: 'Escribe un número de contacto válido (solo números).',
      fecha_evento: 'La fecha del evento ya pasó.',
      personas: 'Escribe un número.',
      descripcion: 'Cuéntanos qué necesitas (mínimo 10 caracteres).',
      acepta_datos: 'Necesitamos tu autorización para responder tu solicitud.',
    });
  });
  it('arma el mensaje de WhatsApp', () => {
    const m = mensajeCotizacion(datos, 'CT-0004');
    expect(m).toContain('Hola, quiero solicitar una cotización.');
    expect(m).toContain('Solicitud N.º CT-0004');
    expect(m).toContain('Ocasión: Cumpleaños');
    expect(m).toContain('Fecha del evento: sábado 21 de noviembre');
    expect(m).toContain('Personas: 40');
    expect(m).toContain('Presupuesto aproximado: $400.000 COP');
    expect(m).toContain('Torta de dos pisos temática de unicornio y 30 cupcakes.');
  });
});
