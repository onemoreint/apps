/* ==========================================================================
   CONEXIÓN CON SUPABASE (fase 2)
   --------------------------------------------------------------------------
   Si config.tienda.js tiene `supabase.url` y `supabase.clave`, este archivo
   reemplaza el modo demo:
     · La configuración de la tienda, el catálogo y las existencias se leen
       de la base de datos.
     · Los pedidos se crean con la función del servidor `crear_pedido`, que
       recalcula precios, domicilio, total y número de pedido (el navegador
       no puede alterarlos) y descuenta existencias.
     · La consulta de estado usa `consultar_pedido` (número + 4 dígitos).

   La clave usada aquí es la PUBLICABLE (sb_publishable_…): está hecha para ir
   en páginas públicas. La seguridad la dan las reglas RLS de la base de datos.
   Nunca pongas aquí la clave secreta (service_role / sb_secret_…).
   ========================================================================== */
(function () {
  "use strict";

  const C = window.TIENDA_CONFIG;
  const S = C.supabase || {};
  const D = window.Datos;
  const U = window.Util;
  if (!S.url || !S.clave) return; // sin Supabase: se queda el modo demo

  const CLAVE_CACHE = `mtr:${C.slug}:catalogo-nube`;
  const CLAVE_PEDIDOS = `mtr:${C.slug}:pedidos`;
  let catalogo = null;

  async function api(ruta, opciones = {}) {
    const r = await fetch(`${S.url}/rest/v1/${ruta}`, {
      ...opciones,
      headers: { apikey: S.clave, "Content-Type": "application/json", ...(opciones.headers || {}) }
    });
    if (!r.ok) throw new Error(`Supabase ${r.status}`);
    return r.status === 204 ? null : r.json();
  }

  const rpc = (nombre, params) => api(`rpc/${nombre}`, { method: "POST", body: JSON.stringify(params) });

  /** Pasa los datos de la base de datos al formato que usa la app. */
  function aplicar(t) {
    C.nombre = t.nombre;
    C.conjunto = t.conjunto;
    C.eslogan = t.eslogan;
    if (t.logo_url) C.logo = t.logo_url;
    C.whatsapp = t.whatsapp;
    C.prefijoPedido = t.prefijo_pedido;
    C.torres = t.torres || [];
    C.entrega = {
      domicilioActivo: t.domicilio_activo,
      recogidaActiva: t.recogida_activa,
      costoDomicilio: t.costo_domicilio,
      domicilioGratisDesde: t.domicilio_gratis_desde,
      domicilioMinimo: t.domicilio_minimo,
      pedidoMinimo: t.pedido_minimo,
      puntoRecogida: t.punto_recogida,
      tiempoEstimado: t.tiempo_estimado
    };
    C.horarios = (t.horarios || []).map((h) => ({ dias: h.dias, abre: h.abre.slice(0, 5), cierra: h.cierra.slice(0, 5) }));
    C.pagos = (t.metodos_pago || []).sort((a, b) => a.orden - b.orden).map((p) => ({
      id: p.tipo, nombre: p.nombre, activo: p.activo, titular: p.titular, banco: p.banco,
      tipoCuenta: p.tipo_cuenta, numero: p.numero, documento: p.documento,
      qrImagen: p.qr_imagen, instrucciones: p.instrucciones
    }));
    const cats = (t.categorias || []).sort((a, b) => a.orden - b.orden);
    const slugCat = new Map(cats.map((c) => [c.id, c.slug]));
    catalogo = {
      categorias: cats.map((c) => ({ id: c.slug, nombre: c.nombre, emoji: c.emoji })),
      productos: (t.productos || []).sort((a, b) => a.orden - b.orden).map((p) => ({
        id: p.slug, nombre: p.nombre, categoria: slugCat.get(p.categoria_id) || "", precio: p.precio,
        stock: p.stock, activo: true, imagen: p.imagen_url || "", emoji: p.emoji, unidad: p.unidad,
        descripcion: p.descripcion, codigoBarras: p.codigo_barras || ""
      }))
    };
  }

  /** Carga la tienda desde Supabase; sin internet usa la última copia guardada. */
  async function cargarTienda() {
    const sel = "*,horarios(dias,abre,cierra),metodos_pago(*),categorias(id,slug,nombre,emoji,orden)," +
      "productos(slug,nombre,descripcion,unidad,precio,stock,imagen_url,emoji,codigo_barras,orden,categoria_id)";
    try {
      const filas = await api(`tiendas?slug=eq.${encodeURIComponent(C.slug)}&select=${encodeURIComponent(sel)}`);
      if (!filas.length) throw new Error("Tienda no encontrada");
      U.almacen.guardar(CLAVE_CACHE, { fecha: Date.now(), tienda: filas[0] });
      aplicar(filas[0]);
      return { modo: "nube", enLinea: true };
    } catch (e) {
      const copia = U.almacen.leer(CLAVE_CACHE, null);
      if (!copia) throw e;
      aplicar(copia.tienda);
      return { modo: "nube", enLinea: false, desde: copia.fecha };
    }
  }

  async function obtenerCatalogo(refrescar) {
    if (!catalogo || refrescar) await cargarTienda();
    return { modo: "nube", categorias: catalogo.categorias.slice(), productos: catalogo.productos.slice() };
  }

  /** Convierte la respuesta del servidor al formato de pedido de la app. */
  function aPedido(s, extra = {}) {
    return {
      numero: s.numero,
      solicitudId: extra.solicitudId || "",
      tienda: C.slug,
      creadoEn: s.creado_en,
      cliente: {
        nombre: (extra.cliente || {}).nombre || "",
        telefono: (extra.cliente || {}).telefono || "",
        torre: s.torre, apto: s.apto
      },
      entrega: { tipo: s.tipo_entrega },
      items: s.items,
      subtotal: s.subtotal,
      costoDomicilio: s.costo_domicilio,
      total: s.total,
      totalAprobado: s.total_aprobado,
      pago: {
        metodo: s.metodo_pago,
        referencia: s.referencia_pago,
        comprobanteAdjunto: !!extra.comprobanteAdjunto,
        efectivoCon: s.efectivo_con,
        cambio: s.cambio,
        estado: s.estado_pago
      },
      notas: extra.notas || "",
      estado: s.estado_pedido,
      historial: (s.historial || []).map((h) => ({ tipo: h.tipo, estado: h.estado, fecha: h.fecha })),
      modo: "nube"
    };
  }

  function guardarLocal(p) {
    const lista = U.almacen.leer(CLAVE_PEDIDOS, []).filter((x) => x.numero !== p.numero);
    lista.unshift(p);
    U.almacen.guardar(CLAVE_PEDIDOS, lista.slice(0, 30));
  }

  async function crearPedido(datos) {
    const r = await rpc("crear_pedido", {
      p_tienda: C.slug,
      p_solicitud_id: datos.solicitudId,
      p_items: datos.lineas.map((l) => ({ id: l.id, cantidad: l.cantidad })),
      p_cliente: datos.cliente,
      p_entrega: datos.entrega.tipo,
      p_pago: { metodo: datos.pago.metodo, referencia: datos.pago.referencia || "", efectivo_con: datos.pago.efectivoCon || 0 },
      p_total_aprobado: datos.totalAprobado,
      p_notas: datos.notas || ""
    });
    if (!r || !r.ok) return { ok: false, error: (r && r.error) || "No se pudo crear el pedido.", totalNuevo: r && r.totalNuevo };
    const pedido = aPedido(r.pedido, {
      solicitudId: datos.solicitudId, cliente: datos.cliente, notas: datos.notas,
      comprobanteAdjunto: !!datos.pago.comprobanteNombre
    });
    guardarLocal(pedido);
    catalogo = null; // las existencias cambiaron
    return { ok: true, pedido, repetido: !!r.repetido };
  }

  async function consultarPedido(numero, ultimos4) {
    const r = await rpc("consultar_pedido", { p_tienda: C.slug, p_numero: String(numero).trim().toUpperCase(), p_ultimos4: String(ultimos4) });
    if (!r) return null;
    const local = U.almacen.leer(CLAVE_PEDIDOS, []).find((x) => x.numero === r.numero) || {};
    const p = aPedido(r, { cliente: local.cliente, notas: local.notas, solicitudId: local.solicitudId,
      comprobanteAdjunto: local.pago && local.pago.comprobanteAdjunto });
    if (local.numero) guardarLocal(p);
    return p;
  }

  /** Actualiza el estado de los pedidos guardados en este teléfono. */
  async function actualizarPedidosLocales() {
    const lista = U.almacen.leer(CLAVE_PEDIDOS, []).filter((p) => p.modo === "nube").slice(0, 5);
    await Promise.all(lista.map((p) => consultarPedido(p.numero, String(p.cliente.telefono).slice(-4)).catch(() => null)));
    return U.almacen.leer(CLAVE_PEDIDOS, []);
  }

  Object.assign(D, { modo: "nube", cargarTienda, obtenerCatalogo, crearPedido, consultarPedido, actualizarPedidosLocales });
})();
