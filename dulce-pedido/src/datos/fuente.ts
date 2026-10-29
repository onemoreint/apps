/**
 * Acceso a datos de la tienda pública. Con servidor usa las funciones públicas de
 * Supabase por HTTP (sin cargar la librería completa en el celular del cliente).
 * Sin servidor, lee el catálogo de demostración incluido y calcula todo localmente.
 */
import { BASE, CON_SERVIDOR, SUPABASE_KEY, SUPABASE_URL } from '@/config';
import { resumenLocal } from '@/core/carrito';
import { ahoraEn } from '@/core/fechas';
import type { Catalogo, DatosPedido, LineaCarrito, ResumenPedido } from '@/core/tipos';

export class ErrorTienda extends Error {}

async function rpc<T>(fn: string, cuerpo: unknown): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorTienda('No hay conexión. Revisa tu internet e inténtalo de nuevo.');
  }
  const datos = await r.json().catch(() => null);
  if (!r.ok) {
    // Los mensajes de las funciones de la tienda ya están escritos para el cliente.
    // (código P0001 = "raise exception" de nuestras funciones).
    const e = datos as { message?: string; code?: string } | null;
    if (e?.code === 'P0001' && e.message) throw new ErrorTienda(e.message);
    throw new ErrorTienda('No pudimos completar la operación. Inténtalo de nuevo en un momento.');
  }
  return datos as T;
}

export async function cargarCatalogo(slug: string): Promise<Catalogo | null> {
  if (CON_SERVIDOR) return rpc<Catalogo | null>('dp_tienda_publica', { p_slug: slug });
  const r = await fetch(`${BASE}demo/catalogo.json`);
  if (!r.ok) throw new ErrorTienda('No pudimos cargar el catálogo de demostración.');
  const c = (await r.json()) as Catalogo;
  // En modo local la "hora del servidor" es la del navegador en Colombia.
  return { ...c, ahora: ahoraEn('America/Bogota') };
}

export async function registrarPedido(
  catalogo: Catalogo,
  lineas: LineaCarrito[],
  datos: DatosPedido,
): Promise<ResumenPedido> {
  if (!CON_SERVIDOR) return resumenLocal(catalogo, lineas, datos.modalidad, datos.zona_id);
  return rpc<ResumenPedido>('dp_crear_pedido', {
    p_slug: catalogo.tienda.slug,
    p_pedido: {
      // Solo identificadores y cantidades: los precios los pone el servidor.
      items: lineas.map((l) => ({ producto_id: l.producto_id, variante_id: l.variante_id, sabores: l.sabores, cantidad: l.cantidad })),
      cliente: { nombre: datos.nombre, telefono: datos.telefono },
      entrega: {
        fecha: datos.fecha,
        franja: datos.franja,
        modalidad: datos.modalidad,
        zona_id: datos.zona_id,
        direccion: datos.direccion,
        barrio: datos.barrio,
      },
      observaciones: datos.observaciones,
      acepta_datos: datos.acepta_datos,
    },
  });
}

/** Registra una solicitud de cotización (sin servidor, solo arma el mensaje). */
export async function registrarCotizacion(slug: string, datos: import('@/core/cotizacion').DatosCotizacion): Promise<{ codigo: string | null }> {
  if (!CON_SERVIDOR) return { codigo: null };
  return rpc<{ codigo: string }>('dp_crear_cotizacion', { p_slug: slug, p_datos: datos });
}
