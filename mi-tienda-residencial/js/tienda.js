/* ==========================================================================
   MODO TIENDA — uso con pistola lectora (o cámara)
   La pistola funciona como un teclado: escribe el código y presiona Enter.
   Este archivo decide qué es lo escaneado:
     · QR de pedido  → muestra el pedido para verificarlo y entregarlo
     · Código de barras de producto → lo suma a la venta de mostrador
       o muestra su precio y existencias (pestaña Productos)
   Todo lo que se registra aquí queda SOLO en este equipo (fase 1).
   ========================================================================== */
(function () {
  "use strict";

  const C = window.TIENDA_CONFIG;
  const U = window.Util;
  const K = window.Codigos;
  const $ = (s) => document.querySelector(s);
  const hoy = () => new Date().toISOString().slice(0, 10);
  const CLAVE_ENTREGAS = `mtr:${C.slug}:tienda:entregas`;
  const CLAVE_VENTAS = `mtr:${C.slug}:tienda:ventas`;
  const METODOS = { nequi: "Nequi", daviplata: "Daviplata", transferencia: "Transferencia", efectivo: "Efectivo" };

  let productos = window.PRODUCTOS_DEMO.filter((p) => p.activo);
  let categorias = window.CATEGORIAS_DEMO;
  let porCodigo = new Map();
  function indexar() {
    porCodigo = new Map(productos.filter((p) => p.codigoBarras).map((p) => [p.codigoBarras, p]));
  }

  const estado = {
    pestana: "pedido",
    venta: [],          // [{ id, cantidad }]
    efectivoVenta: 0,
    pedidoActual: null
  };

  /* ---------------------------------------------------------------------
     Arranque
     --------------------------------------------------------------------- */
  async function iniciar() {
    if (window.Datos) {
      try {
        await window.Datos.cargarTienda();
        const cat = await window.Datos.obtenerCatalogo();
        productos = cat.productos; categorias = cat.categorias;
      } catch (e) { avisar("Sin conexión: usando el catálogo de demostración."); }
    }
    indexar();
    document.title = `Modo tienda · ${C.nombre}`;
    $("#nombreTienda").textContent = C.nombre;
    if (C.logo) $("#logoTienda").src = C.logo;

    $("#formLector").addEventListener("submit", (e) => {
      e.preventDefault();
      const valor = $("#entradaCodigo").value;
      $("#entradaCodigo").value = "";
      if (valor.trim()) procesar(valor);
    });

    // Si el foco está en otro lado, lo que escriba la pistola va al lector
    document.addEventListener("keydown", (e) => {
      const t = e.target;
      const escribiendo = t.matches && t.matches("input, textarea, select");
      if (!escribiendo && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        $("#entradaCodigo").focus();
      }
    });

    document.querySelectorAll('[role="tab"]').forEach((b) =>
      b.addEventListener("click", () => cambiarPestana(b.id.replace("tab-", ""))));

    document.addEventListener("click", alHacerClic);
    $("#botonImprimir").addEventListener("click", () => window.print());

    prepararCamara();
    pintarEntregas();
    pintarVenta();
    pintarVentasDia();
    pintarHojaCodigos();
    $("#entradaCodigo").focus();
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  function cambiarPestana(nombre) {
    estado.pestana = nombre;
    document.querySelectorAll('[role="tab"]').forEach((b) =>
      b.setAttribute("aria-selected", String(b.id === "tab-" + nombre)));
    document.querySelectorAll(".panel").forEach((p) => (p.hidden = p.id !== "panel-" + nombre));
    $("#entradaCodigo").focus();
  }

  /* ---------------------------------------------------------------------
     Qué hacer con un código leído
     --------------------------------------------------------------------- */
  function procesar(texto) {
    const crudo = String(texto).trim();
    const pedido = K.leerPedido(crudo);
    if (pedido) {
      sonido(true);
      estado.pedidoActual = pedido;
      cambiarPestana("pedido");
      pintarPedido(pedido);
      marcarLector(`Pedido ${pedido.numero}`, true);
      return;
    }
    const codigo = U.soloDigitos(crudo);
    const producto = porCodigo.get(codigo);
    if (producto) {
      sonido(true);
      if (estado.pestana === "mostrador") {
        agregarAVenta(producto);
      } else {
        if (estado.pestana !== "productos") cambiarPestana("productos");
        pintarProducto(producto);
      }
      marcarLector(producto.nombre, true);
      return;
    }
    sonido(false);
    marcarLector(`Código no reconocido: ${crudo.slice(0, 30)}`, false);
    avisar(codigo.length >= 8 && !K.eanValido(codigo)
      ? "El código no se leyó completo. Escanéalo de nuevo."
      : "Ese código no está en el catálogo.");
  }

  function marcarLector(texto, ok) {
    $("#lectorEstado").textContent = texto;
    const punto = $("#lectorPunto");
    punto.className = "lector__punto " + (ok ? "lector__punto--ok" : "lector__punto--error");
    clearTimeout(marcarLector.t);
    marcarLector.t = setTimeout(() => {
      $("#lectorEstado").textContent = "Listo para escanear";
      punto.className = "lector__punto";
    }, 2500);
  }

  /* ---------------------------------------------------------------------
     Pedidos
     --------------------------------------------------------------------- */
  function entregas() {
    return U.almacen.leer(CLAVE_ENTREGAS, []).filter((e) => e.fecha.slice(0, 10) === hoy());
  }

  function pintarPedido(p) {
    const ya = entregas().find((e) => e.numero === p.numero);
    const efectivo = p.metodo === "efectivo";
    $("#pedidoEscaneado").innerHTML = `
      <div class="tarjeta pedido-leido ${ya ? "pedido-leido--entregado" : ""}">
        <p class="estado__numero">${U.escaparHTML(p.numero)}</p>
        ${ya ? `<p class="alerta">⚠️ Este pedido ya se marcó como entregado hoy a las ${new Date(ya.fecha).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</p>` : ""}
        <dl class="pago__datos">
          <div><dt>Entrega</dt><dd>${p.entrega === "domicilio"
            ? `🏠 Torre ${U.escaparHTML(p.torre)} · Apto ${U.escaparHTML(p.apto)}` : "🛍️ Recoge en tienda"}</dd></div>
          <div><dt>Productos</dt><dd>${p.unidades} unidad${p.unidades === 1 ? "" : "es"}</dd></div>
          <div><dt>Pago</dt><dd>${METODOS[p.metodo] || "Otro"}</dd></div>
          <div class="dato-grande"><dt>Total</dt><dd>${U.dinero(p.total)}</dd></div>
          ${efectivo ? `
          <div><dt>Paga con</dt><dd>${U.dinero(p.efectivoCon)}</dd></div>
          <div class="dato-grande dato-cambio"><dt>Cambio a entregar</dt><dd>${U.dinero(p.cambio)}</dd></div>` : `
          <div><dt>Verificar</dt><dd>Transferencia recibida en ${METODOS[p.metodo] || "la cuenta"}</dd></div>`}
        </dl>
        <p class="ayuda">Compara con el mensaje de WhatsApp del pedido: número, productos y total deben coincidir.</p>
        ${ya ? "" : `<button type="button" class="boton boton--principal boton--bloque" data-accion="entregar">✓ Marcar como entregado</button>`}
      </div>`;
  }

  function pintarEntregas() {
    const lista = entregas();
    const total = lista.reduce((s, e) => s + e.total, 0);
    $("#listaEntregas").innerHTML = lista.length ? `
      <div class="tarjeta">
        ${lista.map((e) => `<div class="total-fila"><span>${new Date(e.fecha).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })} · ${U.escaparHTML(e.numero)}</span><span>${U.dinero(e.total)}</span></div>`).join("")}
        <div class="total-fila total-fila--grande"><span>${lista.length} entregado${lista.length === 1 ? "" : "s"}</span><strong>${U.dinero(total)}</strong></div>
      </div>` : `<p class="ayuda">Aún no hay entregas registradas hoy.</p>`;
  }

  /* ---------------------------------------------------------------------
     Venta de mostrador
     --------------------------------------------------------------------- */
  function agregarAVenta(p, delta = 1) {
    const linea = estado.venta.find((l) => l.id === p.id);
    const actual = linea ? linea.cantidad : 0;
    const nueva = Math.max(0, actual + delta);
    if (delta > 0 && nueva > p.stock) avisar(`Atención: el inventario registrado de ${p.nombre} es ${p.stock}.`);
    if (linea) linea.cantidad = nueva; else estado.venta.push({ id: p.id, cantidad: nueva });
    estado.venta = estado.venta.filter((l) => l.cantidad > 0);
    pintarVenta();
  }

  function totalVenta() {
    return estado.venta.reduce((s, l) => s + productos.find((p) => p.id === l.id).precio * l.cantidad, 0);
  }

  function pintarVenta() {
    const total = totalVenta();
    if (!estado.venta.length) {
      $("#ventaLineas").innerHTML = `<div class="vacio"><p class="vacio__icono">🧾</p>
        <p>Escanea los productos del cliente. Cada lectura suma una unidad.</p></div>`;
      $("#ventaResumen").innerHTML = "";
      return;
    }
    $("#ventaLineas").innerHTML = estado.venta.map((l) => {
      const p = productos.find((x) => x.id === l.id);
      return `
        <div class="linea">
          <div class="linea__info">
            <p class="linea__nombre">${U.escaparHTML(p.nombre)}</p>
            <p class="linea__precio">${U.dinero(p.precio)} c/u</p>
            <div class="selector selector--chico">
              <button type="button" data-accion="venta-restar" data-id="${p.id}" aria-label="Quitar uno">−</button>
              <span>${l.cantidad}</span>
              <button type="button" data-accion="venta-sumar" data-id="${p.id}" aria-label="Agregar uno">+</button>
            </div>
          </div>
          <p class="linea__subtotal">${U.dinero(p.precio * l.cantidad)}</p>
        </div>`;
    }).join("");
    const recibido = estado.efectivoVenta;
    $("#ventaResumen").innerHTML = `
      <div class="tarjeta tarjeta--resumen">
        <div class="total-fila total-fila--grande"><span>Total</span><strong>${U.dinero(total)}</strong></div>
        <div class="campo">
          <label for="efectivoVenta">Efectivo recibido <span class="opcional">(opcional)</span></label>
          <input id="efectivoVenta" inputmode="numeric" placeholder="Ej: 50.000" value="${recibido ? recibido.toLocaleString("es-CO") : ""}">
        </div>
        <div id="cambioVenta">${textoCambio(total, recibido)}</div>
      </div>
      <button type="button" class="boton boton--principal boton--bloque" data-accion="cerrar-venta">Registrar venta · ${U.dinero(total)}</button>
      <button type="button" class="boton boton--fantasma boton--bloque" data-accion="cancelar-venta">Cancelar venta</button>`;
    $("#efectivoVenta").addEventListener("input", (e) => {
      const n = U.soloDigitos(e.target.value).slice(0, 8);
      e.target.value = n ? Number(n).toLocaleString("es-CO") : "";
      estado.efectivoVenta = Number(n) || 0;
      $("#cambioVenta").innerHTML = textoCambio(totalVenta(), estado.efectivoVenta);
    });
  }

  function textoCambio(total, recibido) {
    if (!recibido) return "";
    if (recibido < total) return `<p class="cambio__falta">Faltan ${U.dinero(total - recibido)}.</p>`;
    return `<p class="cambio__ok cambio__ok--grande">Cambio: <strong>${U.dinero(recibido - total)}</strong></p>`;
  }

  function pintarVentasDia() {
    const ventas = U.almacen.leer(CLAVE_VENTAS, []).filter((v) => v.fecha.slice(0, 10) === hoy());
    const total = ventas.reduce((s, v) => s + v.total, 0);
    $("#ventasDia").innerHTML = ventas.length ? `
      <div class="tarjeta">
        ${ventas.slice(0, 10).map((v) => `<div class="total-fila"><span>${new Date(v.fecha).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })} · ${v.unidades} und</span><span>${U.dinero(v.total)}</span></div>`).join("")}
        <div class="total-fila total-fila--grande"><span>${ventas.length} venta${ventas.length === 1 ? "" : "s"}</span><strong>${U.dinero(total)}</strong></div>
      </div>` : `<p class="ayuda">Aún no hay ventas registradas hoy.</p>`;
  }

  /* ---------------------------------------------------------------------
     Productos
     --------------------------------------------------------------------- */
  function pintarProducto(p) {
    const cat = (categorias.find((c) => c.id === p.categoria) || {}).nombre || "";
    $("#productoEscaneado").innerHTML = `
      <div class="tarjeta producto-leido">
        <div class="producto-leido__imagen">${p.imagen
          ? `<img src="${U.escaparHTML(p.imagen)}" alt="" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'producto__emoji',textContent:'${U.escaparHTML(p.emoji || "🛍️")}'}))">`
          : `<span class="producto__emoji">${U.escaparHTML(p.emoji || "🛍️")}</span>`}</div>
        <div>
          <p class="linea__nombre">${U.escaparHTML(p.nombre)}</p>
          <p class="ayuda">${U.escaparHTML(cat)} · ${U.escaparHTML(p.unidad || "")} · ${p.codigoBarras}</p>
          <p class="producto__precio">${U.dinero(p.precio)}</p>
          <p class="${p.stock <= 5 ? "alerta" : "ayuda"}">Existencias registradas: <strong>${p.stock}</strong></p>
        </div>
      </div>
      <p class="ayuda">Cambiar precio o existencias desde aquí llega con el panel administrativo (fase 3).</p>`;
  }

  function pintarHojaCodigos() {
    $("#hojaCodigos").innerHTML = productos.filter((p) => p.codigoBarras).map((p) => `
      <figure class="etiqueta-codigo">
        ${K.svgEAN13(p.codigoBarras)}
        <figcaption>${U.escaparHTML(p.nombre)} · ${U.dinero(p.precio)}</figcaption>
      </figure>`).join("");
  }

  /* ---------------------------------------------------------------------
     Clics
     --------------------------------------------------------------------- */
  function alHacerClic(e) {
    const b = e.target.closest("[data-accion]");
    if (!b) return;
    const p = b.dataset.id && productos.find((x) => x.id === b.dataset.id);
    switch (b.dataset.accion) {
      case "venta-sumar": agregarAVenta(p, 1); break;
      case "venta-restar": agregarAVenta(p, -1); break;
      case "cancelar-venta":
        estado.venta = []; estado.efectivoVenta = 0; pintarVenta(); break;
      case "cerrar-venta": {
        const ventas = U.almacen.leer(CLAVE_VENTAS, []);
        ventas.unshift({
          fecha: new Date().toISOString(),
          total: totalVenta(),
          unidades: estado.venta.reduce((s, l) => s + l.cantidad, 0),
          items: estado.venta.slice()
        });
        U.almacen.guardar(CLAVE_VENTAS, ventas.slice(0, 500));
        estado.venta = []; estado.efectivoVenta = 0;
        pintarVenta(); pintarVentasDia();
        avisar("Venta registrada");
        break;
      }
      case "entregar": {
        const p2 = estado.pedidoActual;
        if (!p2) return;
        const lista = U.almacen.leer(CLAVE_ENTREGAS, []);
        lista.unshift({ numero: p2.numero, total: p2.total, fecha: new Date().toISOString() });
        U.almacen.guardar(CLAVE_ENTREGAS, lista.slice(0, 500));
        pintarPedido(p2); pintarEntregas();
        avisar(`Pedido ${p2.numero} entregado`);
        break;
      }
    }
    $("#entradaCodigo").focus({ preventScroll: true });
  }

  /* ---------------------------------------------------------------------
     Cámara (BarcodeDetector: Chrome en Android y algunos computadores)
     --------------------------------------------------------------------- */
  async function prepararCamara() {
    if (!("BarcodeDetector" in window) || !navigator.mediaDevices) return;
    let formatos = [];
    try { formatos = await window.BarcodeDetector.getSupportedFormats(); } catch (e) { return; }
    const quiero = ["qr_code", "ean_13", "ean_8", "code_128", "upc_a"].filter((f) => formatos.includes(f));
    if (!quiero.length) return;
    const detector = new window.BarcodeDetector({ formats: quiero });
    const boton = $("#botonCamara");
    boton.hidden = false;
    let flujo = null, activo = false;

    async function cerrar() {
      activo = false;
      if (flujo) flujo.getTracks().forEach((t) => t.stop());
      flujo = null;
      $("#camara").hidden = true;
      $("#entradaCodigo").focus();
    }

    boton.addEventListener("click", async () => {
      try {
        flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      } catch (e) {
        avisar("No se pudo abrir la cámara. Revisa el permiso del navegador.");
        return;
      }
      const video = $("#video");
      video.srcObject = flujo;
      await video.play();
      $("#camara").hidden = false;
      activo = true;
      const buscar = async () => {
        if (!activo) return;
        try {
          const r = await detector.detect(video);
          if (r.length) { const v = r[0].rawValue; await cerrar(); procesar(v); return; }
        } catch (e) { /* se reintenta */ }
        setTimeout(buscar, 250);
      };
      buscar();
    });
    $("#cerrarCamara").addEventListener("click", cerrar);
  }

  /* ---------------------------------------------------------------------
     Apoyo
     --------------------------------------------------------------------- */
  let audio;
  function sonido(ok) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = ok ? 1250 : 300;
      g.gain.value = 0.08;
      o.connect(g); g.connect(audio.destination);
      o.start(); o.stop(audio.currentTime + (ok ? 0.08 : 0.25));
    } catch (e) { /* sin sonido */ }
  }

  let tAviso;
  function avisar(texto) {
    const a = $("#avisoFlotante");
    a.textContent = texto;
    a.classList.add("visible");
    clearTimeout(tAviso);
    tAviso = setTimeout(() => a.classList.remove("visible"), 2600);
  }

  document.addEventListener("DOMContentLoaded", iniciar);
  window.ModoTienda = { procesar }; // útil para pruebas
})();
