/* ==========================================================================
   CARRITO
   Guarda solo { id, cantidad }. Los precios siempre se toman del catálogo.
   ========================================================================== */
(function () {
  "use strict";

  const CLAVE = `mtr:${window.TIENDA_CONFIG.slug}:carrito`;
  const U = window.Util;
  let lineas = U.almacen.leer(CLAVE, []).filter((l) => l && l.id && l.cantidad > 0);
  const oyentes = new Set();

  function avisar() {
    U.almacen.guardar(CLAVE, lineas);
    oyentes.forEach((fn) => fn(lineas));
  }

  const Carrito = {
    lineas: () => lineas.map((l) => ({ ...l })),
    cantidadDe: (id) => (lineas.find((l) => l.id === id) || {}).cantidad || 0,
    totalUnidades: () => lineas.reduce((s, l) => s + l.cantidad, 0),

    /** Fija la cantidad de un producto respetando el máximo disponible. */
    fijar(id, cantidad, maximo) {
      let c = Math.max(0, Math.floor(Number(cantidad) || 0));
      if (Number.isFinite(maximo)) c = Math.min(c, maximo);
      const i = lineas.findIndex((l) => l.id === id);
      if (c === 0) { if (i >= 0) lineas.splice(i, 1); }
      else if (i >= 0) lineas[i].cantidad = c;
      else lineas.push({ id, cantidad: c });
      avisar();
      return c;
    },
    sumar(id, delta, maximo) {
      return this.fijar(id, this.cantidadDe(id) + delta, maximo);
    },
    /** Quita productos que ya no existen y ajusta a lo disponible. */
    sincronizar(productos) {
      const porId = new Map(productos.map((p) => [p.id, p]));
      const antes = JSON.stringify(lineas);
      lineas = lineas
        .filter((l) => porId.has(l.id) && porId.get(l.id).stock > 0)
        .map((l) => ({ id: l.id, cantidad: Math.min(l.cantidad, porId.get(l.id).stock) }));
      if (JSON.stringify(lineas) !== antes) avisar();
    },
    vaciar() { lineas = []; avisar(); },
    alCambiar(fn) { oyentes.add(fn); }
  };

  window.Carrito = Carrito;
})();
