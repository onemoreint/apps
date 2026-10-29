/**
 * Estado de la tienda pública: catálogo cargado, carrito y borrador del formulario.
 * El carrito se guarda en el navegador del cliente (por tienda) para no perderlo
 * si cierra la pestaña. Si el almacenamiento no está disponible, sigue en memoria.
 */
import { create } from 'zustand';
import { claveLinea } from '@/core/carrito';
import type { Catalogo, DatosPedido, LineaCarrito, ResumenPedido } from '@/core/tipos';

function leer<T>(clave: string): T | null {
  try {
    const v = localStorage.getItem(clave);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}
function guardar(clave: string, valor: unknown): void {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* modo privado o almacenamiento lleno: se mantiene en memoria */
  }
}

export const DATOS_VACIOS: DatosPedido = {
  nombre: '',
  telefono: '',
  fecha: '',
  franja: '',
  modalidad: 'recogida',
  zona_id: '',
  direccion: '',
  barrio: '',
  observaciones: '',
  acepta_datos: false,
};

export type PedidoEnviado = { resumen: ResumenPedido; datos: DatosPedido; mensaje: string; enlace: string };

type Estado = {
  slug: string;
  catalogo: Catalogo | null;
  lineas: LineaCarrito[];
  datos: DatosPedido;
  enviado: PedidoEnviado | null;
  aviso: string | null;
  iniciar: (slug: string, catalogo: Catalogo) => void;
  agregar: (l: Omit<LineaCarrito, 'clave'>) => void;
  cambiarCantidad: (clave: string, cantidad: number) => void;
  quitar: (clave: string) => void;
  vaciar: () => void;
  editarDatos: (cambios: Partial<DatosPedido>) => void;
  marcarEnviado: (p: PedidoEnviado) => void;
  avisar: (texto: string | null) => void;
};

const kCarrito = (s: string) => `dulce-pedido:${s}:carrito`;
const kDatos = (s: string) => `dulce-pedido:${s}:datos`;
const kEnviado = (s: string) => `dulce-pedido:${s}:enviado`;

export const useTienda = create<Estado>((set, get) => ({
  slug: '',
  catalogo: null,
  lineas: [],
  datos: DATOS_VACIOS,
  enviado: null,
  aviso: null,

  iniciar: (slug, catalogo) => {
    const guardadas = leer<LineaCarrito[]>(kCarrito(slug)) ?? [];
    const datos = { ...DATOS_VACIOS, ...(leer<Partial<DatosPedido>>(kDatos(slug)) ?? {}), acepta_datos: false };
    // Se descartan líneas de productos que ya no existen.
    const ids = new Set(catalogo.productos.map((p) => p.id));
    set({
      slug,
      catalogo,
      lineas: guardadas.filter((l) => ids.has(l.producto_id) && l.cantidad > 0),
      datos,
      enviado: leer<PedidoEnviado>(kEnviado(slug)),
    });
  },

  agregar: (nueva) => {
    const clave = claveLinea(nueva.producto_id, nueva.variante_id, nueva.sabores);
    const lineas = [...get().lineas];
    const i = lineas.findIndex((l) => l.clave === clave);
    if (i >= 0) lineas[i] = { ...lineas[i]!, cantidad: Math.min(999, lineas[i]!.cantidad + nueva.cantidad) };
    else lineas.push({ ...nueva, clave });
    set({ lineas });
    guardar(kCarrito(get().slug), lineas);
  },

  cambiarCantidad: (clave, cantidad) => {
    const lineas = get()
      .lineas.map((l) => (l.clave === clave ? { ...l, cantidad: Math.max(0, Math.min(999, Math.round(cantidad))) } : l))
      .filter((l) => l.cantidad > 0);
    set({ lineas });
    guardar(kCarrito(get().slug), lineas);
  },

  quitar: (clave) => {
    const lineas = get().lineas.filter((l) => l.clave !== clave);
    set({ lineas });
    guardar(kCarrito(get().slug), lineas);
  },

  vaciar: () => {
    set({ lineas: [] });
    guardar(kCarrito(get().slug), []);
  },

  editarDatos: (cambios) => {
    const datos = { ...get().datos, ...cambios };
    set({ datos });
    // La autorización de datos no se recuerda: se pide en cada pedido.
    const { acepta_datos: _omitida, ...recordar } = datos;
    guardar(kDatos(get().slug), recordar);
  },

  marcarEnviado: (p) => {
    set({ enviado: p, lineas: [] });
    guardar(kEnviado(get().slug), p);
    guardar(kCarrito(get().slug), []);
  },

  avisar: (aviso) => set({ aviso }),
}));
