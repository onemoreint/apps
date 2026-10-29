/**
 * Cálculos del carrito. Son funciones puras: la tienda las usa para mostrar
 * valores y el modo demostración para el resumen. Con backend, el servidor
 * recalcula todo desde la base de datos y su resultado es el que vale.
 */
import type { Catalogo, LineaCarrito, Modalidad, Producto, ResumenPedido, Variante, Zona } from './tipos';

export function claveLinea(productoId: string, varianteId: string | null, sabores: string[]): string {
  return [productoId, varianteId ?? '-', [...sabores].sort().join('+')].join('|');
}

export function precioUnitario(p: Producto, v: Variante | null | undefined): number {
  return v?.precio ?? p.precio;
}

/** Precio "desde": el menor entre el precio base y las variantes disponibles. */
export function precioDesde(p: Producto): { valor: number; varios: boolean } {
  const precios = p.variantes.filter((v) => v.disponible).map((v) => v.precio ?? p.precio);
  if (precios.length === 0) return { valor: p.precio, varios: false };
  const min = Math.min(...precios);
  return { valor: min, varios: new Set(precios).size > 1 };
}

export type LineaCalculada = {
  linea: LineaCarrito;
  producto: Producto;
  variante: Variante | null;
  precio: number;
  subtotal: number;
  /** Motivo por el que la línea no se puede pedir (agotado, cambió el catálogo…). */
  problema: string | null;
};

export function calcularLineas(lineas: LineaCarrito[], productos: Producto[]): LineaCalculada[] {
  const porId = new Map(productos.map((p) => [p.id, p]));
  const res: LineaCalculada[] = [];
  for (const linea of lineas) {
    const producto = porId.get(linea.producto_id);
    if (!producto) continue; // el producto ya no existe en el catálogo
    const variante = linea.variante_id ? (producto.variantes.find((v) => v.id === linea.variante_id) ?? null) : null;
    const precio = precioUnitario(producto, variante);
    let problema: string | null = null;
    if (!producto.disponible) problema = 'Agotado por ahora';
    else if (linea.variante_id && (!variante || !variante.disponible)) problema = 'Esta opción ya no está disponible';
    else if (!linea.variante_id && producto.variantes.length > 0) problema = 'Elige una presentación';
    else if (linea.cantidad < producto.cantidad_minima) problema = `Mínimo ${producto.cantidad_minima} unidades`;
    res.push({ linea, producto, variante, precio, subtotal: precio * linea.cantidad, problema });
  }
  return res;
}

export function subtotalCarrito(lineas: LineaCalculada[]): number {
  return lineas.reduce((s, l) => s + l.subtotal, 0);
}

export function unidadesCarrito(lineas: LineaCarrito[]): number {
  return lineas.reduce((s, l) => s + l.cantidad, 0);
}

export function maxHorasPreparacion(lineas: LineaCalculada[]): number {
  return lineas.reduce((m, l) => Math.max(m, l.producto.horas_preparacion), 0);
}

export function costoDomicilio(modalidad: Modalidad, zona: Zona | undefined): { valor: number | null; pendiente: boolean } {
  if (modalidad === 'recogida') return { valor: 0, pendiente: false };
  if (!zona || zona.tarifa === null) return { valor: null, pendiente: true };
  return { valor: zona.tarifa, pendiente: false };
}

export function detalleLinea(variante: Variante | null, sabores: string[]): string {
  return [variante?.nombre, sabores.length ? sabores.join(', ') : null].filter(Boolean).join(' · ');
}

/** Resumen calculado en el navegador (modo demostración, sin servidor). */
export function resumenLocal(
  catalogo: Catalogo,
  lineas: LineaCarrito[],
  modalidad: Modalidad,
  zonaId: string,
): ResumenPedido {
  const calc = calcularLineas(lineas, catalogo.productos).filter((l) => !l.problema);
  const subtotal = subtotalCarrito(calc);
  const dom = costoDomicilio(modalidad, catalogo.zonas.find((z) => z.id === zonaId));
  return {
    codigo: null,
    items: calc.map((l) => ({
      nombre: l.producto.nombre,
      detalle: detalleLinea(l.variante, l.linea.sabores),
      cantidad: l.linea.cantidad,
      precio_unitario: l.precio,
      subtotal: l.subtotal,
    })),
    subtotal,
    domicilio: modalidad === 'domicilio' ? dom.valor : null,
    domicilio_pendiente: dom.pendiente,
    total: subtotal + (dom.valor ?? 0),
  };
}
