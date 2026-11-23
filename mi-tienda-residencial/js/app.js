/* ==========================================================================
   MI TIENDA RESIDENCIAL — Aplicación del residente (Fase 1)
   Pantallas: catálogo, carrito, datos del pedido, confirmación y estado.
   ========================================================================== */
(function () {
  "use strict";

  const C = window.TIENDA_CONFIG;
  const U = window.Util;
  const D = window.Datos;
  const K = window.Carrito;
  const $ = (sel) => document.querySelector(sel);
  const CLAVE_CLIENTE = `mtr:${C.slug}:cliente`;

  const estado = {
    categorias: [],
    productos: [],
    porId: new Map(),
    filtroTexto: "",
    filtroCategoria: "todas",
    entrega: C.entrega.domicilioActivo ? "domicilio" : "recogida",
    metodoPago: null,
    solicitudId: null, // se crea al abrir el formulario; evita pedidos duplicados
    enviando: false
  };

  /* ---------------------------------------------------------------------
     Arranque
     --------------------------------------------------------------------- */
  async function iniciar() {
    aplicarMarca();
    pintarHorario();
    setInterval(pintarHorario, 60000);

    const catalogo = await D.obtenerCatalogo();
    estado.categorias = catalogo.categorias;
    estado.productos = catalogo.productos;
    estado.porId = new Map(catalogo.productos.map((p) => [p.id, p]));
    K.sincronizar(estado.productos);

    pintarCategorias();
    pintarProductos();
    pintarBarraCarrito();
    prepararFormulario();
    enlazarEventos();

    K.alCambiar(() => {
      pintarBarraCarrito();
      const p = pantallaActual();
      if (p === "carrito") pintarCarrito();
      if (p === "pedido") pintarResumenPedido();
    });

    window.addEventListener("hashchange", enrutar);
    enrutar();
    registrarServiceWorker();
  }

  function aplicarMarca() {
    document.title = C.nombre;
    $("#nombreTienda").textContent = C.nombre;
    $("#nombreConjunto").textContent = C.conjunto;
    if (C.logo) $("#logoTienda").src = C.logo;
    const e = C.entrega;
    const partes = [];
    if (e.domicilioActivo) {
      partes.push(e.costoDomicilio > 0
        ? `Domicilio a tu apartamento por ${U.dinero(e.costoDomicilio)}`
        : "Domicilio gratis a tu apartamento");
      if (e.domicilioGratisDesde > 0 && e.costoDomicilio > 0) {
        partes.push(`gratis desde ${U.dinero(e.domicilioGratisDesde)}`);
      }
    }
    if (e.recogidaActiva) partes.push("o recoge en la tienda");
    $("#textoEntrega").textContent = (C.eslogan ? C.eslogan + ". " : "") + partes.join(", ") + ".";
    $("#pieTienda").textContent = `${C.nombre} · ${C.conjunto}`;
    const cr = C.creditos || {};
    if (cr.desarrollador) {
      $("#pieCreditos").innerHTML =
        `Desarrollado por <strong>${U.escaparHTML(cr.desarrollador)}</strong>` +
        (cr.telefono ? ` · ${U.escaparHTML(cr.telefono)}` : "") +
        (cr.correo ? ` · ${U.escaparHTML(cr.correo)}` : "");
    }
  }

  function pintarHorario() {
    const h = U.estadoHorario(C.horarios);
    const chip = $("#chipHorario");
    chip.classList.toggle("chip-horario--cerrado", !h.abierta);
    chip.lastElementChild.textContent = h.texto;
    estado.abierta = h.abierta;
  }

  /* ---------------------------------------------------------------------
     Navegación entre pantallas (#/ , #/carrito, #/pedido, ...)
     --------------------------------------------------------------------- */
  function pantallaActual() {
    const r = location.hash.replace(/^#\/?/, "").split("/")[0];
    return r || "catalogo";
  }

  function enrutar() {
    const partes = location.hash.replace(/^#\/?/, "").split("/");
    let nombre = partes[0] || "catalogo";
    if (!document.querySelector(`[data-pantalla="${nombre}"]`)) nombre = "catalogo";

    if (nombre === "pedido" && K.totalUnidades() === 0) {
      location.replace("#/carrito");
      return;
    }

    document.querySelectorAll("[data-pantalla]").forEach((s) => {
      s.hidden = s.dataset.pantalla !== nombre;
    });

    if (nombre === "carrito") pintarCarrito();
    if (nombre === "pedido") abrirFormulario();
    if (nombre === "confirmacion") pintarConfirmacion(decodeURIComponent(partes[1] || ""));
    if (nombre === "estado") pintarMisPedidos();

    $("#barraCarrito").classList.toggle("oculta", nombre !== "catalogo");
    $("#avisoFlotante").classList.remove("visible");
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  /* ---------------------------------------------------------------------
     Catálogo
     --------------------------------------------------------------------- */
  function pintarCategorias() {
    const usadas = new Set(estado.productos.map((p) => p.categoria));
    const cats = [{ id: "todas", nombre: "Todo", emoji: "🛒" }]
      .concat(estado.categorias.filter((c) => usadas.has(c.id)));
    $("#categorias").innerHTML = cats.map((c) => `
      <button type="button" class="categoria" data-categoria="${U.escaparHTML(c.id)}"
        aria-pressed="${c.id === estado.filtroCategoria}">
        <span aria-hidden="true">${U.escaparHTML(c.emoji || "")}</span> ${U.escaparHTML(c.nombre)}
      </button>`).join("");
  }

  function productosFiltrados() {
    const q = U.normalizar(estado.filtroTexto.trim());
    return estado.productos.filter((p) => {
      if (estado.filtroCategoria !== "todas" && p.categoria !== estado.filtroCategoria) return false;
      if (!q) return true;
      const cat = estado.categorias.find((c) => c.id === p.categoria);
      return U.normalizar(`${p.nombre} ${p.descripcion || ""} ${cat ? cat.nombre : ""}`).includes(q);
    }).sort((a, b) => (b.stock > 0) - (a.stock > 0));
  }

  function imagenProducto(p) {
    if (p.imagen) {
      // Si la foto no carga (sin internet o enlace roto) se reemplaza por el emoji
      return `<img src="${U.escaparHTML(p.imagen)}" alt="" loading="lazy" decoding="async"
        referrerpolicy="no-referrer" data-emoji="${U.escaparHTML(p.emoji || "🛍️")}">`;
    }
    return `<span class="producto__emoji" aria-hidden="true">${U.escaparHTML(p.emoji || "🛍️")}</span>`;
  }

  function controlesProducto(p) {
    if (p.stock <= 0) return `<span class="etiqueta etiqueta--agotado">Agotado</span>`;
    const n = K.cantidadDe(p.id);
    if (n === 0) {
      return `<button type="button" class="boton boton--principal boton--bloque" data-accion="sumar" data-id="${p.id}"
        aria-label="Agregar ${U.escaparHTML(p.nombre)}">Agregar</button>`;
    }
    return `
      <div class="selector" role="group" aria-label="Cantidad de ${U.escaparHTML(p.nombre)}">
        <button type="button" data-accion="restar" data-id="${p.id}" aria-label="Quitar uno">−</button>
        <span aria-live="polite">${n}</span>
        <button type="button" data-accion="sumar" data-id="${p.id}" aria-label="Agregar uno"
          ${n >= p.stock ? "disabled" : ""}>+</button>
      </div>`;
  }

  function tarjetaProducto(p) {
    const pocas = p.stock > 0 && p.stock <= 5;
    return `
      <article class="producto ${p.stock <= 0 ? "producto--agotado" : ""}" data-producto="${p.id}">
        <div class="producto__imagen">${imagenProducto(p)}
          ${pocas ? `<span class="etiqueta etiqueta--pocas">Quedan ${p.stock}</span>` : ""}
        </div>
        <div class="producto__cuerpo">
          <h3 class="producto__nombre">${U.escaparHTML(p.nombre)}</h3>
          <p class="producto__unidad">${U.escaparHTML(p.unidad || "")}</p>
          <p class="producto__precio">${U.dinero(p.precio)}</p>
          <div class="producto__accion">${controlesProducto(p)}</div>
        </div>
      </article>`;
  }

  function pintarProductos() {
    const lista = productosFiltrados();
    const grilla = $("#grillaProductos");
    grilla.setAttribute("aria-busy", "false");
    grilla.innerHTML = lista.length
      ? lista.map(tarjetaProducto).join("")
      : `<div class="vacio"><p class="vacio__icono">🔎</p><p>No encontramos productos con esa búsqueda.</p>
         <button type="button" class="boton boton--fantasma" data-accion="limpiar-busqueda">Ver todo</button></div>`;
    const filtrando = estado.filtroTexto.trim() || estado.filtroCategoria !== "todas";
    $("#resultadoBusqueda").textContent = filtrando
      ? `${lista.length} producto${lista.length === 1 ? "" : "s"}` : "";
  }

  function repintarTarjeta(id) {
    const p = estado.porId.get(id);
    const nodo = document.querySelector(`[data-producto="${CSS.escape(id)}"] .producto__accion`);
    if (p && nodo) nodo.innerHTML = controlesProducto(p);
  }

  /* ---------------------------------------------------------------------
     Carrito
     --------------------------------------------------------------------- */
  function cotizacion(tipoEntrega = estado.entrega) {
    return D.cotizar(K.lineas(), estado.productos, tipoEntrega);
  }

  function pintarBarraCarrito() {
    const unidades = K.totalUnidades();
    const barra = $("#barraCarrito");
    barra.hidden = unidades === 0;
    $("#barraCantidad").textContent = unidades;
    $("#barraTotal").textContent = U.dinero(cotizacion("recogida").subtotal);
    document.body.classList.toggle("con-carrito", unidades > 0);
  }

  function pintarCarrito() {
    const cot = cotizacion();
    const lista = $("#listaCarrito");
    if (!cot.items.length) {
      lista.innerHTML = `<div class="vacio"><p class="vacio__icono">🛒</p><p>Tu carrito está vacío.</p>
        <a class="boton boton--principal" href="#/">Ver productos</a></div>`;
      $("#resumenCarrito").innerHTML = "";
      return;
    }
    lista.innerHTML = cot.items.map((i) => {
      const p = estado.porId.get(i.id);
      return `
        <div class="linea" data-producto="${i.id}">
          <div class="linea__imagen">${imagenProducto(p)}</div>
          <div class="linea__info">
            <p class="linea__nombre">${U.escaparHTML(i.nombre)}</p>
            <p class="linea__precio">${U.dinero(i.precio)} c/u</p>
            <div class="selector selector--chico" role="group" aria-label="Cantidad de ${U.escaparHTML(i.nombre)}">
              <button type="button" data-accion="restar" data-id="${i.id}" aria-label="Quitar uno">−</button>
              <span>${i.cantidad}</span>
              <button type="button" data-accion="sumar" data-id="${i.id}" aria-label="Agregar uno"
                ${i.cantidad >= p.stock ? "disabled" : ""}>+</button>
            </div>
          </div>
          <div class="linea__fin">
            <p class="linea__subtotal">${U.dinero(i.subtotal)}</p>
            <button type="button" class="enlace-quitar" data-accion="quitar" data-id="${i.id}">Quitar</button>
          </div>
        </div>`;
    }).join("");

    const faltante = C.entrega.pedidoMinimo - cot.subtotal;
    const gratisDesde = C.entrega.domicilioGratisDesde;
    const faltaGratis = gratisDesde > 0 && C.entrega.domicilioActivo && C.entrega.costoDomicilio > 0
      ? gratisDesde - cot.subtotal : 0;
    $("#resumenCarrito").innerHTML = `
      <div class="tarjeta tarjeta--resumen">
        <div class="total-fila"><span>Subtotal</span><strong>${U.dinero(cot.subtotal)}</strong></div>
        ${faltaGratis > 0 ? `<p class="ayuda">Agrega ${U.dinero(faltaGratis)} más y el domicilio te sale gratis.</p>` : ""}
        <p class="ayuda">El costo del domicilio se calcula en el siguiente paso.</p>
      </div>
      ${faltante > 0 ? `<p class="alerta">El pedido mínimo es ${U.dinero(C.entrega.pedidoMinimo)}. Te faltan ${U.dinero(faltante)}.</p>` : ""}
      <a class="boton boton--principal boton--bloque ${faltante > 0 ? "deshabilitado" : ""}"
         href="#/pedido" ${faltante > 0 ? 'aria-disabled="true" tabindex="-1"' : ""}>Continuar con el pedido</a>
      <button type="button" class="boton boton--fantasma boton--bloque" data-accion="vaciar">Vaciar carrito</button>`;
  }

  /* ---------------------------------------------------------------------
     Formulario del pedido
     --------------------------------------------------------------------- */
  function prepararFormulario() {
    const e = C.entrega;
    const opcEntrega = [];
    if (e.domicilioActivo) opcEntrega.push({
      id: "domicilio", titulo: "A mi apartamento", icono: "🏠",
      detalle: e.costoDomicilio > 0 ? `${U.dinero(e.costoDomicilio)} · ${e.tiempoEstimado}` : `Gratis · ${e.tiempoEstimado}`
    });
    if (e.recogidaActiva) opcEntrega.push({
      id: "recogida", titulo: "Recojo en la tienda", icono: "🛍️", detalle: e.puntoRecogida
    });
    $("#opcionesEntrega").innerHTML = opcEntrega.map((o) => opcionHTML("entrega", o, o.id === estado.entrega)).join("");

    const pagos = C.pagos.filter((p) => p.activo);
    const iconos = { nequi: "📱", daviplata: "📲", transferencia: "🏦" };
    $("#opcionesPago").innerHTML = pagos.map((p) => opcionHTML("pago", {
      id: p.id, titulo: p.nombre, icono: iconos[p.id] || "💳", detalle: p.banco || p.numero
    }, false)).join("");

    $("#torre").innerHTML = `<option value="">Elige</option>` +
      C.torres.map((t) => `<option value="${U.escaparHTML(t)}">Torre ${U.escaparHTML(t)}</option>`).join("");

    const guardado = U.almacen.leer(CLAVE_CLIENTE, null);
    if (guardado) {
      ["nombre", "telefono", "torre", "apto"].forEach((k) => { if (guardado[k]) $("#" + k).value = guardado[k]; });
      $("#recordarDatos").checked = true;
    }
  }

  function opcionHTML(grupo, o, marcado) {
    return `
      <label class="opcion">
        <input type="radio" name="${grupo}" value="${U.escaparHTML(o.id)}" ${marcado ? "checked" : ""}>
        <span class="opcion__caja">
          <span class="opcion__icono" aria-hidden="true">${o.icono}</span>
          <span><span class="opcion__titulo">${U.escaparHTML(o.titulo)}</span>
          <span class="opcion__detalle">${U.escaparHTML(o.detalle || "")}</span></span>
        </span>
      </label>`;
  }

  function abrirFormulario() {
    if (!estado.solicitudId) estado.solicitudId = U.idUnico();
    $("#camposApto").hidden = estado.entrega !== "domicilio";
    $("#errorGeneral").textContent = "";
    pintarResumenPedido();
  }

  function pintarResumenPedido() {
    const cot = cotizacion();
    const aviso = estado.abierta ? "" :
      `<p class="alerta">La tienda está cerrada en este momento. Tu pedido se atenderá cuando abra.</p>`;
    $("#resumenPedido").innerHTML = `
      ${aviso}
      <h3 class="resumen__titulo">Resumen</h3>
      <ul class="resumen__items">
        ${cot.items.map((i) => `<li><span>${i.cantidad} × ${U.escaparHTML(i.nombre)}</span><span>${U.dinero(i.subtotal)}</span></li>`).join("")}
      </ul>
      <div class="total-fila"><span>Subtotal</span><span>${U.dinero(cot.subtotal)}</span></div>
      <div class="total-fila"><span>Domicilio</span><span>${estado.entrega === "domicilio" ? (cot.costoDomicilio ? U.dinero(cot.costoDomicilio) : "Gratis") : "No aplica"}</span></div>
      <div class="total-fila total-fila--grande"><span>Total a pagar</span><strong>${U.dinero(cot.total)}</strong></div>`;
    const cuenta = C.pagos.find((p) => p.id === estado.metodoPago);
    if (cuenta) pintarDatosCuenta(cuenta, cot.total);
  }

  function pintarDatosCuenta(p, total) {
    const filas = [
      ["Valor exacto", U.dinero(total)],
      p.banco && ["Banco", p.banco],
      p.tipoCuenta && ["Tipo de cuenta", p.tipoCuenta],
      [p.id === "transferencia" ? "Número de cuenta" : "Número", p.numero],
      ["Titular", p.titular],
      p.documento && ["Documento", p.documento]
    ].filter(Boolean);
    const caja = $("#datosCuenta");
    caja.hidden = false;
    caja.innerHTML = `
      <p class="datos-cuenta__titulo">Paga a esta cuenta de ${U.escaparHTML(p.nombre)}</p>
      <dl>${filas.map(([k, v]) => `<div><dt>${U.escaparHTML(k)}</dt><dd>${U.escaparHTML(v)}</dd></div>`).join("")}</dl>
      <button type="button" class="boton boton--fantasma boton--chico" data-accion="copiar"
        data-texto="${U.escaparHTML(U.soloDigitos(p.numero))}">Copiar número</button>
      ${p.instrucciones ? `<p class="ayuda">${U.escaparHTML(p.instrucciones)}</p>` : ""}`;
  }

  function mostrarError(campo, texto) {
    const p = document.querySelector(`[data-error-de="${campo}"]`);
    if (p) p.textContent = texto || "";
    const input = document.getElementById(campo);
    if (input) input.setAttribute("aria-invalid", texto ? "true" : "false");
  }

  function validarFormulario() {
    ["nombre", "telefono", "torre", "apto", "metodo", "comprobante"].forEach((c) => mostrarError(c, ""));
    const errores = {};
    const nombre = $("#nombre").value.trim().replace(/\s+/g, " ");
    if (nombre.length < 3) errores.nombre = "Escribe tu nombre.";
    const telefono = U.celularValido($("#telefono").value);
    if (!telefono) errores.telefono = "Escribe un celular de 10 dígitos que empiece por 3.";
    const torre = $("#torre").value;
    const apto = $("#apto").value.trim().toUpperCase();
    if (estado.entrega === "domicilio") {
      if (!torre) errores.torre = "Elige tu torre.";
      if (!/^[0-9A-Z-]{1,6}$/.test(apto)) errores.apto = "Escribe tu apartamento.";
    }
    if (!estado.metodoPago) errores.metodo = "Elige cómo vas a pagar.";
    const archivo = $("#comprobante").files[0];
    if (archivo) {
      if (archivo.size > 5 * 1024 * 1024) errores.comprobante = "El archivo pesa más de 5 MB.";
      else if (!/^image\/|application\/pdf/.test(archivo.type)) errores.comprobante = "Solo imágenes o PDF.";
    }
    Object.entries(errores).forEach(([c, t]) => mostrarError(c, t));
    const primero = Object.keys(errores)[0];
    if (primero) {
      const el = document.getElementById(primero === "metodo" ? "opcionesPago" : primero);
      el && el.scrollIntoView({ behavior: "smooth", block: "center" });
      if (el && el.focus && primero !== "metodo") el.focus({ preventScroll: true });
      return null;
    }
    return {
      nombre, telefono,
      torre: estado.entrega === "domicilio" ? torre : "",
      apto: estado.entrega === "domicilio" ? apto : "",
      notas: $("#notas").value.trim().slice(0, 200),
      referencia: $("#referencia").value.trim().slice(0, 40),
      comprobanteNombre: archivo ? archivo.name : ""
    };
  }

  async function enviarPedido(ev) {
    ev.preventDefault();
    if (estado.enviando) return; // evita doble clic
    const datos = validarFormulario();
    if (!datos) return;

    const boton = $("#botonConfirmar");
    estado.enviando = true;
    boton.disabled = true;
    boton.textContent = "Creando pedido…";
    $("#errorGeneral").textContent = "";

    try {
      const r = await D.crearPedido({
        solicitudId: estado.solicitudId,
        lineas: K.lineas(),
        cliente: { nombre: datos.nombre, telefono: datos.telefono, torre: datos.torre, apto: datos.apto },
        entrega: { tipo: estado.entrega },
        pago: { metodo: estado.metodoPago, referencia: datos.referencia, comprobanteNombre: datos.comprobanteNombre },
        notas: datos.notas
      });
      if (!r.ok) {
        $("#errorGeneral").textContent = r.error;
        return;
      }
      if ($("#recordarDatos").checked) {
        U.almacen.guardar(CLAVE_CLIENTE, { nombre: datos.nombre, telefono: datos.telefono, torre: datos.torre, apto: datos.apto });
      } else {
        localStorage.removeItem(CLAVE_CLIENTE);
      }
      K.vaciar();
      estado.solicitudId = null;
      $("#referencia").value = "";
      $("#comprobante").value = "";
      $("#notas").value = "";
      // Recargar catálogo (stock actualizado)
      const cat = await D.obtenerCatalogo();
      estado.productos = cat.productos;
      estado.porId = new Map(cat.productos.map((p) => [p.id, p]));
      pintarProductos();
      location.hash = `#/confirmacion/${encodeURIComponent(r.pedido.numero)}`;
    } catch (e) {
      $("#errorGeneral").textContent = "Ocurrió un problema. Intenta de nuevo; no se duplicará tu pedido.";
    } finally {
      estado.enviando = false;
      boton.disabled = false;
      boton.textContent = "Confirmar pedido";
    }
  }

  /* ---------------------------------------------------------------------
     WhatsApp
     --------------------------------------------------------------------- */
  function mensajeWhatsApp(p) {
    const metodo = (C.pagos.find((x) => x.id === p.pago.metodo) || {}).nombre || p.pago.metodo;
    const l = [];
    l.push(`*Nuevo pedido ${p.numero}*`);
    l.push(`${C.nombre}`);
    l.push("");
    l.push(`👤 ${p.cliente.nombre}`);
    l.push(`📞 ${p.cliente.telefono}`);
    l.push(p.entrega.tipo === "domicilio"
      ? `🏠 Domicilio: Torre ${p.cliente.torre}, Apto ${p.cliente.apto}`
      : `🛍️ Recojo en la tienda`);
    l.push("");
    l.push("*Productos*");
    p.items.forEach((i) => l.push(`• ${i.cantidad} × ${i.nombre} — ${U.dinero(i.subtotal)}`));
    l.push("");
    l.push(`Subtotal: ${U.dinero(p.subtotal)}`);
    if (p.entrega.tipo === "domicilio") l.push(`Domicilio: ${p.costoDomicilio ? U.dinero(p.costoDomicilio) : "Gratis"}`);
    l.push(`*Total: ${U.dinero(p.total)}*`);
    l.push("");
    l.push(`💳 Pago: ${metodo}`);
    l.push(p.pago.referencia ? `Referencia: ${p.pago.referencia}` : "Referencia: la envío en este chat");
    if (p.pago.comprobanteAdjunto) l.push("Adjunto el comprobante en este chat.");
    if (p.notas) { l.push(""); l.push(`📝 ${p.notas}`); }
    return l.join("\n");
  }

  function enlaceWhatsApp(p) {
    return `https://wa.me/${U.soloDigitos(C.whatsapp)}?text=${encodeURIComponent(mensajeWhatsApp(p))}`;
  }

  /* ---------------------------------------------------------------------
     Confirmación y estado
     --------------------------------------------------------------------- */
  function buscarLocal(numero) {
    return D.pedidosDeEsteDispositivo().find((p) => p.numero === numero);
  }

  function chipsEstado(p) {
    return `
      <div class="chips-estado">
        <span class="chip chip--pedido chip--${p.estado}">Pedido: ${D.ESTADOS_PEDIDO[p.estado]}</span>
        <span class="chip chip--pago chip--${p.pago.estado}">${D.ESTADOS_PAGO[p.pago.estado]}</span>
      </div>`;
  }

  function pintarConfirmacion(numero) {
    const p = buscarLocal(numero);
    const caja = $("#confirmacion");
    if (!p) {
      caja.innerHTML = `<div class="vacio"><p>No encontramos ese pedido en este dispositivo.</p>
        <a class="boton boton--principal" href="#/">Volver a la tienda</a></div>`;
      return;
    }
    caja.innerHTML = `
      <div class="confirmacion__icono" aria-hidden="true">✓</div>
      <h2 id="tituloConfirmacion">¡Pedido creado!</h2>
      <p class="confirmacion__texto">Último paso: <strong>envíalo a la tienda por WhatsApp</strong>.
        La tienda lo recibe por ese mensaje.</p>
      <div class="numero-pedido">
        <span>Tu número de pedido</span>
        <strong>${U.escaparHTML(p.numero)}</strong>
        <button type="button" class="boton boton--fantasma boton--chico" data-accion="copiar" data-texto="${U.escaparHTML(p.numero)}">Copiar</button>
      </div>
      <a class="boton boton--whatsapp boton--bloque" href="${enlaceWhatsApp(p)}" target="_blank" rel="noopener">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3Z"/></svg>
        Enviar pedido por WhatsApp
      </a>
      ${chipsEstado(p)}
      <div class="tarjeta tarjeta--resumen">
        <ul class="resumen__items">
          ${p.items.map((i) => `<li><span>${i.cantidad} × ${U.escaparHTML(i.nombre)}</span><span>${U.dinero(i.subtotal)}</span></li>`).join("")}
        </ul>
        <div class="total-fila total-fila--grande"><span>Total</span><strong>${U.dinero(p.total)}</strong></div>
        <p class="ayuda">${p.entrega.tipo === "domicilio"
          ? `Entrega en Torre ${U.escaparHTML(p.cliente.torre)}, Apto ${U.escaparHTML(p.cliente.apto)}.`
          : `Recoges en: ${U.escaparHTML(C.entrega.puntoRecogida)}.`}</p>
      </div>
      <p class="ayuda centrado">La tienda verifica tu pago manualmente y te confirma por WhatsApp.
        ${p.pago.comprobanteAdjunto ? "Recuerda adjuntar el comprobante en el chat." : ""}</p>
      <a class="boton boton--fantasma boton--bloque" href="#/">Volver a la tienda</a>`;
  }

  function tarjetaEstado(p) {
    const pasos = ["pendiente", "confirmado", "preparando", "listo", "entregado"];
    const actual = pasos.indexOf(p.estado);
    const fecha = new Date(p.creadoEn).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
    return `
      <div class="tarjeta">
        <p class="estado__numero">${U.escaparHTML(p.numero)}</p>
        <p class="ayuda">${fecha} · ${U.dinero(p.total)}</p>
        ${chipsEstado(p)}
        ${p.estado === "cancelado" ? `<p class="alerta">Este pedido fue cancelado.</p>` : `
        <ol class="linea-tiempo">
          ${pasos.map((s, i) => `<li class="${i <= actual ? "hecho" : ""} ${i === actual ? "actual" : ""}">${D.ESTADOS_PEDIDO[s]}</li>`).join("")}
        </ol>`}
        <a class="boton boton--fantasma boton--chico" href="${enlaceWhatsApp(p)}" target="_blank" rel="noopener">Reenviar por WhatsApp</a>
      </div>`;
  }

  async function consultarEstado(ev) {
    ev.preventDefault();
    const numero = $("#numeroConsulta").value.trim().toUpperCase();
    const ult = U.soloDigitos($("#ultimos4").value);
    const caja = $("#resultadoEstado");
    if (!numero || ult.length !== 4) {
      caja.innerHTML = `<p class="alerta">Escribe el número de pedido y los últimos 4 dígitos de tu celular.</p>`;
      return;
    }
    const p = await D.consultarPedido(numero, ult);
    caja.innerHTML = p ? tarjetaEstado(p)
      : `<p class="alerta">No encontramos ese pedido en este dispositivo. Revisa el número o pregunta a la tienda por WhatsApp.</p>`;
  }

  function pintarMisPedidos() {
    const lista = D.pedidosDeEsteDispositivo().slice(0, 5);
    $("#misPedidos").innerHTML = lista.length
      ? `<h3 class="subtitulo">Pedidos hechos en este teléfono</h3>` + lista.map(tarjetaEstado).join("")
      : "";
  }

  /* ---------------------------------------------------------------------
     Eventos
     --------------------------------------------------------------------- */
  function enlazarEventos() {
    let temporizador;
    $("#buscar").addEventListener("input", (e) => {
      clearTimeout(temporizador);
      temporizador = setTimeout(() => { estado.filtroTexto = e.target.value; pintarProductos(); }, 120);
    });

    $("#categorias").addEventListener("click", (e) => {
      const b = e.target.closest("[data-categoria]");
      if (!b) return;
      estado.filtroCategoria = b.dataset.categoria;
      document.querySelectorAll("[data-categoria]").forEach((x) =>
        x.setAttribute("aria-pressed", String(x === b)));
      pintarProductos();
    });

    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-accion]");
      if (!b) return;
      const id = b.dataset.id;
      const p = id && estado.porId.get(id);
      switch (b.dataset.accion) {
        case "sumar": {
          if (!p) return;
          const antes = K.cantidadDe(id);
          const n = K.sumar(id, 1, p.stock);
          if (n === antes) avisar(`No hay más unidades de ${p.nombre}.`);
          else if (antes === 0) avisar(`${p.nombre} agregado al carrito`);
          repintarTarjeta(id);
          break;
        }
        case "restar": K.sumar(id, -1, p ? p.stock : undefined); repintarTarjeta(id); break;
        case "quitar": K.fijar(id, 0); repintarTarjeta(id); break;
        case "vaciar":
          if (confirm("¿Vaciar el carrito?")) { K.vaciar(); pintarProductos(); }
          break;
        case "limpiar-busqueda":
          estado.filtroTexto = ""; estado.filtroCategoria = "todas";
          $("#buscar").value = ""; pintarCategorias(); pintarProductos();
          break;
        case "copiar": copiar(b.dataset.texto); break;
      }
    });

    $("#opcionesEntrega").addEventListener("change", (e) => {
      estado.entrega = e.target.value;
      $("#camposApto").hidden = estado.entrega !== "domicilio";
      pintarResumenPedido();
    });
    $("#opcionesPago").addEventListener("change", (e) => {
      estado.metodoPago = e.target.value;
      mostrarError("metodo", "");
      pintarResumenPedido();
    });
    $("#telefono").addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/[^\d+\s]/g, "");
    });
    // Borra el mensaje de error de un campo en cuanto el residente lo corrige
    ["nombre", "telefono", "torre", "apto", "comprobante"].forEach((id) => {
      const el = document.getElementById(id);
      el.addEventListener(el.tagName === "SELECT" || el.type === "file" ? "change" : "input", () => mostrarError(id, ""));
    });
    $("#formPedido").addEventListener("submit", enviarPedido);
    $("#formEstado").addEventListener("submit", consultarEstado);
  }

  async function copiar(texto) {
    try {
      await navigator.clipboard.writeText(texto);
      avisar("Copiado");
    } catch (e) {
      avisar(texto);
    }
  }

  let tAviso;
  function avisar(texto) {
    const a = $("#avisoFlotante");
    a.textContent = texto;
    a.classList.add("visible");
    clearTimeout(tAviso);
    tAviso = setTimeout(() => a.classList.remove("visible"), 2200);
  }

  function registrarServiceWorker() {
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  // Respaldo de fotos: si una imagen de producto falla, mostrar su emoji
  document.addEventListener("error", (e) => {
    const img = e.target;
    if (img.tagName !== "IMG" || !img.dataset.emoji) return;
    const span = document.createElement("span");
    span.className = "producto__emoji";
    span.setAttribute("aria-hidden", "true");
    span.textContent = img.dataset.emoji;
    img.replaceWith(span);
  }, true);

  document.addEventListener("DOMContentLoaded", iniciar);
})();
