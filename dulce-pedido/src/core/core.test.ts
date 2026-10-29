import { describe, expect, it } from 'vitest';
import { cop, copConMoneda, leerPesos } from './dinero';
import {
  ahoraEn,
  fechaMinimaPorPreparacion,
  fechasDisponibles,
  fechaLarga,
  revisarFecha,
  textoPreparacion,
  type ReglasFecha,
} from './fechas';
import { calcularLineas, claveLinea, costoDomicilio, precioDesde, resumenLocal, subtotalCarrito } from './carrito';
import { enlaceWhatsApp, mensajePedido, whatsappValido } from './whatsapp';
import { validarPedido } from './validar';
import type { Catalogo, DatosPedido, LineaCarrito, Producto } from './tipos';

const prod = (p: Partial<Producto>): Producto => ({
  id: 'p',
  categoria_id: null,
  nombre: 'Producto',
  descripcion: '',
  precio: 10000,
  presentacion: '',
  fotos: [],
  disponible: true,
  destacado: false,
  nuevo: false,
  por_encargo: false,
  horas_preparacion: 0,
  cantidad_minima: 1,
  sabores: [],
  sabores_max: 1,
  ingredientes: '',
  alergenos: '',
  conservacion: '',
  variantes: [],
  orden: 0,
  ...p,
});

const TORTA = prod({
  id: 'torta',
  nombre: 'Torta de chocolate',
  precio: 60000,
  horas_preparacion: 48,
  variantes: [
    { id: 'v8', nombre: '8 porciones', precio: 60000, disponible: true },
    { id: 'v16', nombre: '16 porciones', precio: 110000, disponible: true },
    { id: 'v30', nombre: '30 porciones', precio: 190000, disponible: false },
  ],
});
const BROWNIE = prod({ id: 'brownie', nombre: 'Brownie', precio: 4500, cantidad_minima: 6, sabores: ['Arequipe', 'Nutella', 'Clásico'], sabores_max: 2 });
const AGOTADO = prod({ id: 'agotado', nombre: 'Galletas', precio: 3000, disponible: false });

const linea = (producto_id: string, cantidad: number, variante_id: string | null = null, sabores: string[] = []): LineaCarrito => ({
  clave: claveLinea(producto_id, variante_id, sabores),
  producto_id,
  variante_id,
  sabores,
  cantidad,
});

describe('Pesos colombianos', () => {
  it('formatea con punto de miles y sin decimales', () => {
    expect(cop(0)).toBe('$0');
    expect(cop(4500)).toBe('$4.500');
    expect(cop(1250000)).toBe('$1.250.000');
    expect(cop(999.6)).toBe('$1.000');
    expect(copConMoneda(45000)).toBe('$45.000 COP');
  });
  it('lee lo que escribe la vendedora', () => {
    expect(leerPesos('45.000')).toBe(45000);
    expect(leerPesos('$ 1,250,000')).toBe(1250000);
    expect(leerPesos('')).toBeNull();
  });
});

describe('Fechas y tiempos de preparación', () => {
  const reglas = (p: Partial<ReglasFecha> = {}): ReglasFecha => ({
    ahora: '2026-10-29T14:15', // jueves
    horasPreparacion: 0,
    diasAtencion: [1, 2, 3, 4, 5, 6],
    diasMaxAnticipacion: 30,
    bloqueadas: [],
    ...p,
  });

  it('no permite fechas anteriores a hoy', () => {
    expect(revisarFecha('2026-10-28', reglas())).toBe('pasada');
    expect(revisarFecha('2026-10-29', reglas())).toBeNull();
  });
  it('respeta las horas de preparación desde la hora actual', () => {
    expect(fechaMinimaPorPreparacion('2026-10-29T14:15', 24)).toBe('2026-10-30');
    expect(fechaMinimaPorPreparacion('2026-10-29T14:15', 10)).toBe('2026-10-30'); // 00:15 del día siguiente
    expect(fechaMinimaPorPreparacion('2026-10-29T08:00', 10)).toBe('2026-10-29');
    expect(revisarFecha('2026-10-30', reglas({ horasPreparacion: 48 }))).toBe('preparacion');
    expect(revisarFecha('2026-10-31', reglas({ horasPreparacion: 48 }))).toBeNull();
  });
  it('respeta días de atención, fechas bloqueadas y anticipación máxima', () => {
    expect(revisarFecha('2026-11-01', reglas())).toBe('cerrado'); // domingo
    expect(revisarFecha('2026-11-02', reglas({ bloqueadas: ['2026-11-02'] }))).toBe('bloqueada');
    expect(revisarFecha('2026-12-15', reglas())).toBe('muy_lejana');
    expect(revisarFecha('2026-02-30', reglas())).toBe('invalida');
  });
  it('lista solo fechas elegibles', () => {
    const f = fechasDisponibles(reglas({ horasPreparacion: 48, bloqueadas: ['2026-11-02'] }), 3);
    expect(f).toEqual(['2026-10-31', '2026-11-03', '2026-11-04']);
  });
  it('textos legibles', () => {
    expect(fechaLarga('2026-11-07')).toBe('sábado 7 de noviembre');
    expect(textoPreparacion(0)).toBe('Disponible para hoy');
    expect(textoPreparacion(6)).toBe('6 horas de preparación');
    expect(textoPreparacion(48)).toBe('2 días de anticipación');
  });
  it('calcula la hora local de Colombia', () => {
    expect(ahoraEn('America/Bogota', new Date('2026-10-29T18:15:00Z'))).toBe('2026-10-29T13:15');
    expect(ahoraEn('America/Bogota', new Date('2026-10-30T03:30:00Z'))).toBe('2026-10-29T22:30');
  });
});

describe('Carrito', () => {
  const productos = [TORTA, BROWNIE, AGOTADO];

  it('usa el precio de la variante y multiplica por cantidad', () => {
    const c = calcularLineas([linea('torta', 2, 'v16'), linea('brownie', 6, null, ['Nutella'])], productos);
    expect(c.map((l) => l.subtotal)).toEqual([220000, 27000]);
    expect(subtotalCarrito(c)).toBe(247000);
    expect(c.every((l) => l.problema === null)).toBe(true);
  });
  it('marca problemas: agotado, variante no disponible, sin variante y mínimo', () => {
    const c = calcularLineas(
      [linea('agotado', 1), linea('torta', 1, 'v30'), linea('torta', 1), linea('brownie', 3)],
      productos,
    );
    expect(c.map((l) => l.problema)).toEqual([
      'Agotado por ahora',
      'Esta opción ya no está disponible',
      'Elige una presentación',
      'Mínimo 6 unidades',
    ]);
  });
  it('ignora productos que ya no existen', () => {
    expect(calcularLineas([linea('borrado', 1)], productos)).toHaveLength(0);
  });
  it('la misma combinación produce la misma clave sin importar el orden de los sabores', () => {
    expect(claveLinea('b', null, ['Nutella', 'Arequipe'])).toBe(claveLinea('b', null, ['Arequipe', 'Nutella']));
  });
  it('precio "desde" usa solo variantes disponibles', () => {
    expect(precioDesde(TORTA)).toEqual({ valor: 60000, varios: true });
    expect(precioDesde(BROWNIE)).toEqual({ valor: 4500, varios: false });
  });
  it('domicilio: recogida gratis, zona con tarifa o pendiente de cotizar', () => {
    expect(costoDomicilio('recogida', undefined)).toEqual({ valor: 0, pendiente: false });
    expect(costoDomicilio('domicilio', { id: 'z', nombre: 'Centro', tarifa: 6000 })).toEqual({ valor: 6000, pendiente: false });
    expect(costoDomicilio('domicilio', { id: 'z', nombre: 'Lejos', tarifa: null })).toEqual({ valor: null, pendiente: true });
  });
});

const CATALOGO: Catalogo = {
  tienda: {
    slug: 'demo',
    nombre: 'Dulce Pedido',
    whatsapp: '+573001234567',
    demo: true,
    dias_atencion: [1, 2, 3, 4, 5, 6],
    dias_max_anticipacion: 30,
    franjas: ['Mañana (9 a. m. – 12 m.)', 'Tarde (2 – 6 p. m.)'],
    recogida: true,
    domicilio: true,
    direccion_recogida: '',
    contenido: {} as Catalogo['tienda']['contenido'],
  },
  categorias: [],
  productos: [TORTA, BROWNIE],
  zonas: [
    { id: 'z1', nombre: 'Centro', tarifa: 6000 },
    { id: 'z2', nombre: 'Afueras', tarifa: null },
  ],
  fechas_bloqueadas: [],
  ahora: '2026-10-29T14:15',
};

const DATOS: DatosPedido = {
  nombre: 'María Pérez',
  telefono: '300 123 4567',
  fecha: '2026-11-07',
  franja: 'Tarde (2 – 6 p. m.)',
  modalidad: 'domicilio',
  zona_id: 'z1',
  direccion: 'Calle 10 # 5-20, apto 301',
  barrio: 'La Ferrería',
  observaciones: 'Escribir "Feliz cumpleaños, Ana" & poner velas',
  acepta_datos: true,
};

describe('Mensaje de WhatsApp', () => {
  const lineas = [linea('torta', 1, 'v16'), linea('brownie', 6, null, ['Nutella', 'Arequipe'])];

  it('arma el mensaje con productos, subtotales, domicilio y total en COP', () => {
    const r = resumenLocal(CATALOGO, lineas, 'domicilio', 'z1');
    expect(r.subtotal).toBe(137000);
    expect(r.total).toBe(143000);
    const m = mensajePedido(DATOS, { ...r, codigo: 'DP-0007' }, CATALOGO.zonas[0]);
    expect(m).toContain('Hola, quiero realizar un pedido.');
    expect(m).toContain('Solicitud N.º DP-0007');
    expect(m).toContain('Nombre: María Pérez');
    expect(m).toContain('Fecha deseada: sábado 7 de noviembre (Tarde (2 – 6 p. m.))');
    expect(m).toContain('Dirección: Calle 10 # 5-20, apto 301, barrio La Ferrería, Centro');
    expect(m).toContain('- Torta de chocolate (16 porciones) x 1 = $110.000 COP');
    expect(m).toContain('- Brownie (Nutella, Arequipe) x 6 = $27.000 COP');
    expect(m).toContain('Subtotal: $137.000 COP');
    expect(m).toContain('Domicilio: $6.000 COP');
    expect(m).toContain('Total estimado: $143.000 COP');
    expect(m).toContain('Observaciones: Escribir "Feliz cumpleaños, Ana" & poner velas');
    expect(m.trim().endsWith('instrucciones para finalizar mi pedido.')).toBe(true);
  });

  it('cuando el domicilio se cotiza, lo dice y no lo suma', () => {
    const r = resumenLocal(CATALOGO, lineas, 'domicilio', 'z2');
    const m = mensajePedido({ ...DATOS, zona_id: 'z2' }, r, CATALOGO.zonas[1]);
    expect(m).toContain('Domicilio: pendiente de confirmar');
    expect(m).toContain('Total estimado: $137.000 COP + domicilio por confirmar');
  });

  it('recogida: sin dirección ni domicilio', () => {
    const r = resumenLocal(CATALOGO, lineas, 'recogida', '');
    const m = mensajePedido({ ...DATOS, modalidad: 'recogida' }, r, undefined);
    expect(m).not.toContain('Dirección:');
    expect(m).not.toContain('Domicilio:');
    expect(m).toContain('Total estimado: $137.000 COP');
  });

  it('codifica el enlace oficial (tildes, saltos de línea, # y &) y se puede decodificar igual', () => {
    const texto = mensajePedido(DATOS, resumenLocal(CATALOGO, lineas, 'domicilio', 'z1'), CATALOGO.zonas[0]);
    const url = enlaceWhatsApp('+57 300 123 4567', texto);
    expect(url.startsWith('https://wa.me/573001234567?text=')).toBe(true);
    expect(url.split('?text=')[1]).not.toMatch(/[\s#&ñáº"]/);
    expect(new URL(url).searchParams.get('text')).toBe(texto);
  });

  it('valida números de WhatsApp con código de país', () => {
    expect(whatsappValido('+57 300 123 4567')).toBe(true);
    expect(whatsappValido('3001')).toBe(false);
    expect(whatsappValido('0300123456')).toBe(false);
  });
});

describe('Validación del formulario', () => {
  const ctx = {
    tienda: CATALOGO.tienda,
    zonas: CATALOGO.zonas,
    reglas: { ahora: CATALOGO.ahora, horasPreparacion: 48, diasAtencion: [1, 2, 3, 4, 5, 6], diasMaxAnticipacion: 30, bloqueadas: [] },
    lineasValidas: 2,
    lineasConProblema: 0,
  };
  it('acepta un pedido completo', () => {
    expect(validarPedido(DATOS, ctx)).toEqual({});
  });
  it('muestra errores comprensibles', () => {
    const e = validarPedido(
      { ...DATOS, nombre: ' ', telefono: '12', fecha: '2026-10-30', franja: '', zona_id: '', direccion: '', barrio: '', acepta_datos: false },
      { ...ctx, lineasValidas: 0 },
    );
    expect(e).toEqual({
      carrito: 'Tu carrito está vacío.',
      nombre: 'Escribe tu nombre.',
      telefono: 'Escribe un número de contacto válido (solo números).',
      fecha: 'No alcanzamos a prepararlo para esa fecha. Elige una fecha posterior.',
      franja: 'Elige una franja horaria.',
      zona_id: 'Elige tu zona de entrega.',
      direccion: 'Escribe la dirección de entrega.',
      barrio: 'Escribe el barrio.',
      acepta_datos: 'Necesitamos tu autorización para gestionar el pedido.',
    });
  });
});
