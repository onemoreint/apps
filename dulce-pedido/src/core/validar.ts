import { MENSAJE_FECHA, revisarFecha, type ReglasFecha } from './fechas';
import type { DatosPedido, Tienda, Zona } from './tipos';

export type ErroresPedido = Partial<Record<keyof DatosPedido | 'carrito', string>>;

export function telefonoValido(tel: string): boolean {
  const d = tel.replace(/\D/g, '');
  return d.length >= 7 && d.length <= 15;
}

export function validarPedido(
  d: DatosPedido,
  ctx: { tienda: Tienda; zonas: Zona[]; reglas: ReglasFecha; lineasValidas: number; lineasConProblema: number },
): ErroresPedido {
  const e: ErroresPedido = {};
  if (ctx.lineasValidas === 0) e.carrito = 'Tu carrito está vacío.';
  else if (ctx.lineasConProblema > 0) e.carrito = 'Revisa los productos marcados en tu carrito.';

  const nombre = d.nombre.trim();
  if (nombre.length < 2) e.nombre = 'Escribe tu nombre.';
  else if (nombre.length > 80) e.nombre = 'El nombre es demasiado largo.';

  if (!telefonoValido(d.telefono)) e.telefono = 'Escribe un número de contacto válido (solo números).';

  if (!d.fecha) e.fecha = 'Elige la fecha en que quieres tu pedido.';
  else {
    const motivo = revisarFecha(d.fecha, ctx.reglas);
    if (motivo) e.fecha = MENSAJE_FECHA[motivo];
  }

  if (ctx.tienda.franjas.length > 0 && !ctx.tienda.franjas.includes(d.franja)) e.franja = 'Elige una franja horaria.';

  if (d.modalidad === 'recogida' && !ctx.tienda.recogida) e.modalidad = 'Por ahora no hay recogida; elige domicilio.';
  if (d.modalidad === 'domicilio') {
    if (!ctx.tienda.domicilio) e.modalidad = 'Por ahora no hacemos domicilios; elige recogida.';
    if (!ctx.zonas.some((z) => z.id === d.zona_id)) e.zona_id = 'Elige tu zona de entrega.';
    if (d.direccion.trim().length < 5) e.direccion = 'Escribe la dirección de entrega.';
    if (d.barrio.trim().length < 2) e.barrio = 'Escribe el barrio.';
  }
  if (d.observaciones.length > 500) e.observaciones = 'Máximo 500 caracteres.';
  if (!d.acepta_datos) e.acepta_datos = 'Necesitamos tu autorización para gestionar el pedido.';
  return e;
}
