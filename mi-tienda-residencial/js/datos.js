/* ==========================================================================
   CAPA DE DATOS
   --------------------------------------------------------------------------
   Todo lo que la tienda lee o guarda pasa por aquí. La interfaz nunca habla
   directamente con la base de datos: llama a Datos.obtenerCatalogo(),
   Datos.crearPedido(), Datos.consultarPedido().

   FASE 1 (este archivo): MODO DEMO LOCAL
     - Los pedidos se guardan SOLO en el navegador de quien los hace.
     - La tienda NO los recibe por aquí: los recibe por el mensaje de WhatsApp.
     - La consulta de estado solo encuentra pedidos hechos en este mismo
       teléfono/computador, y el estado no cambia (no hay panel todavía).

   FASE 2: este mismo contrato se implementa con Supabase. Los precios,
   el inventario, el total y el número de pedido los calculará el servidor
   (función SQL), no el navegador. La interfaz no tendrá que cambiar.
   ========================================================================== */
(function () {
  "use strict";

  const C = window.TIENDA_CONFIG;
  const U = window.Util;
  const CLAVE_PEDIDOS = `mtr:${C.slug}:pedidos`;
  const CLAVE_STOCK = `mtr:${C.slug}:stock-demo`;

  const ESTADOS_PEDIDO = {
    pendiente: "Pendiente",
    confirmado: "Confirmado",
    preparando: "Preparando",
    listo: "Listo",
    entregado: "Entregado",
    cancelado: "Cancelado"
  };

  const ESTADOS_PAGO = {
    pendiente_verificacion: "Pago por verificar",
    contra_entrega: "Pago en efectivo al recibir",
    verificado: "Pago verificado",
    rechazado: "Pago rechazado"
  };

  /** Catálogo con el stock que se ha ido descontando en esta demo. */
  function catalogoDemo() {
    const descontado = U.almacen.leer(CLAVE_STOCK, {});
    return window.PRODUCTOS_DEMO.map((p) => ({
      ...p,
      stock: Math.max(0, p.stock - (descontado[p.id] || 0))
    }));
  }

  async function obtenerCatalogo() {
    return {
      modo: "demo",
      categorias: window.CATEGORIAS_DEMO.slice(),
      productos: catalogoDemo().filter((p) => p.activo)
    };
  }

  function calcularEnvio(tipoEntrega, subtotal) {
    if (tipoEntrega !== "domicilio") return 0;
    const e = C.entrega;
    if (e.domicilioGratisDesde > 0 && subtotal >= e.domicilioGratisDesde) return 0;
    return e.costoDomicilio;
  }

  /**
   * Recalcula un carrito a partir del catálogo (nunca confía en precios
   * que vengan del carrito guardado). Devuelve líneas, totales y problemas.
   */
  function cotizar(lineas, productos, tipoEntrega) {
    const porId = new Map(productos.map((p) => [p.id, p]));
    const items = [];
    const problemas = [];
    for (const l of lineas) {
      const p = porId.get(l.id);
      const cantidad = Math.floor(Number(l.cantidad) || 0);
      if (!p) { problemas.push(`Un producto ya no está disponible.`); continue; }
      if (cantidad < 1) continue;
      if (p.stock < cantidad) {
        problemas.push(p.stock === 0
          ? `${p.nombre} se agotó.`
          : `De ${p.nombre} solo quedan ${p.stock}.`);
      }
      items.push({ id: p.id, nombre: p.nombre, precio: p.precio, cantidad, subtotal: p.precio * cantidad });
    }
    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const costoDomicilio = calcularEnvio(tipoEntrega, subtotal);
    return { items, subtotal, costoDomicilio, total: subtotal + costoDomicilio, problemas };
  }

  function generarNumero() {
    const f = new Date();
    const fecha = String(f.getFullYear()).slice(2) +
      String(f.getMonth() + 1).padStart(2, "0") +
      String(f.getDate()).padStart(2, "0");
    return `${C.prefijoPedido}-${fecha}-${U.codigoCorto(4)}`;
  }

  /**
   * Crea un pedido. "solicitudId" se genera UNA vez por intento de compra:
   * si el residente toca dos veces el botón o la red reintenta, se devuelve
   * el mismo pedido en lugar de crear uno duplicado.
   */
  async function crearPedido(datos) {
    const pedidos = U.almacen.leer(CLAVE_PEDIDOS, []);
    const existente = pedidos.find((p) => p.solicitudId === datos.solicitudId);
    if (existente) return { ok: true, pedido: existente, repetido: true };

    const productos = catalogoDemo().filter((p) => p.activo);
    const cot = cotizar(datos.lineas, productos, datos.entrega.tipo);
    if (!cot.items.length) return { ok: false, error: "El carrito está vacío." };
    if (cot.problemas.length) return { ok: false, error: cot.problemas.join(" ") };
    if (cot.subtotal < C.entrega.pedidoMinimo) {
      return { ok: false, error: `El pedido mínimo es ${U.dinero(C.entrega.pedidoMinimo)}.` };
    }
    if (datos.entrega.tipo === "domicilio" && cot.subtotal < (C.entrega.domicilioMinimo || 0)) {
      return { ok: false, error: `El domicilio es para compras desde ${U.dinero(C.entrega.domicilioMinimo)}.` };
    }
    // El residente aprobó un monto: si el total real cambió (precio o domicilio),
    // no se crea el pedido y se le pide aprobar de nuevo.
    if (Number(datos.totalAprobado) !== cot.total) {
      return { ok: false, error: `El total cambió a ${U.dinero(cot.total)}. Revísalo y apruébalo de nuevo.`, totalNuevo: cot.total };
    }
    const metodo = C.pagos.find((m) => m.id === datos.pago.metodo && m.activo);
    if (!metodo) return { ok: false, error: "Elige un método de pago válido." };
    const esEfectivo = metodo.id === "efectivo";
    let efectivoCon = 0;
    if (esEfectivo) {
      efectivoCon = Math.round(Number(datos.pago.efectivoCon) || 0);
      if (efectivoCon < cot.total) {
        return { ok: false, error: `El efectivo con el que pagas debe ser de al menos ${U.dinero(cot.total)}.` };
      }
    }

    const ahora = new Date().toISOString();
    const pedido = {
      numero: generarNumero(),
      solicitudId: datos.solicitudId,
      tienda: C.slug,
      creadoEn: ahora,
      cliente: datos.cliente,
      entrega: { tipo: datos.entrega.tipo },
      items: cot.items,
      subtotal: cot.subtotal,
      costoDomicilio: cot.costoDomicilio,
      total: cot.total,
      totalAprobado: cot.total,
      pago: {
        metodo: metodo.id,
        referencia: esEfectivo ? "" : (datos.pago.referencia || ""),
        comprobanteAdjunto: !esEfectivo && !!datos.pago.comprobanteNombre,
        efectivoCon: esEfectivo ? efectivoCon : 0,
        cambio: esEfectivo ? efectivoCon - cot.total : 0,
        estado: esEfectivo ? "contra_entrega" : "pendiente_verificacion"
      },
      notas: datos.notas || "",
      estado: "pendiente",
      historial: [{ estado: "pendiente", fecha: ahora }],
      modo: "demo"
    };

    // Descontar stock de la demo
    const descontado = U.almacen.leer(CLAVE_STOCK, {});
    cot.items.forEach((i) => (descontado[i.id] = (descontado[i.id] || 0) + i.cantidad));
    U.almacen.guardar(CLAVE_STOCK, descontado);

    pedidos.unshift(pedido);
    if (!U.almacen.guardar(CLAVE_PEDIDOS, pedidos.slice(0, 50))) {
      return { ok: false, error: "No se pudo guardar el pedido en este dispositivo." };
    }
    return { ok: true, pedido };
  }

  /** Busca un pedido por número + últimos 4 dígitos del celular. */
  async function consultarPedido(numero, ultimos4) {
    const n = String(numero || "").trim().toUpperCase();
    const pedidos = U.almacen.leer(CLAVE_PEDIDOS, []);
    const p = pedidos.find((x) => x.numero === n);
    if (!p || !p.cliente.telefono.endsWith(String(ultimos4))) return null;
    return p;
  }

  function pedidosDeEsteDispositivo() {
    return U.almacen.leer(CLAVE_PEDIDOS, []);
  }

  /** Solo para pruebas: devuelve el inventario demo a su estado inicial. */
  function reiniciarDemo() {
    localStorage.removeItem(CLAVE_STOCK);
    localStorage.removeItem(CLAVE_PEDIDOS);
  }

  window.Datos = {
    modo: "demo",
    ESTADOS_PEDIDO, ESTADOS_PAGO,
    obtenerCatalogo, cotizar, calcularEnvio, crearPedido,
    consultarPedido, pedidosDeEsteDispositivo, reiniciarDemo
  };
})();
