/* ==========================================================================
   PANEL ADMINISTRATIVO — Mi Tienda Residencial (fase 3)
   Pedidos · Escáner · Productos · Ventas · Ajustes
   Todo pasa por la base de datos con la sesión del personal; las reglas de
   seguridad (RLS) deciden qué puede ver y cambiar cada rol.
   ========================================================================== */
(function () {
  "use strict";

  const C = window.TIENDA_CONFIG;
  const U = window.Util;
  const A = window.Auth;
  const K = window.Codigos;
  const $ = (s) => document.querySelector(s);
  const esc = U.escaparHTML;
  const URL_PANEL = location.origin + location.pathname;

  const ESTADOS = { pendiente: "Pendiente", confirmado: "Confirmado", preparando: "Preparando", listo: "Listo", entregado: "Entregado", cancelado: "Cancelado" };
  const PAGOS = { pendiente_verificacion: "Pago por verificar", contra_entrega: "Efectivo al entregar", verificado: "Pago recibido", rechazado: "Pago no recibido" };
  const METODOS = { nequi: "Nequi", daviplata: "Daviplata", transferencia: "Transferencia", efectivo: "Efectivo" };
  const SIGUIENTE = {
    pendiente: ["confirmado", "✓ Confirmar pedido"],
    confirmado: ["preparando", "🧺 Empezar a preparar"],
    preparando: ["listo", "📦 Marcar listo"],
    listo: ["entregado", "🏁 Marcar entregado"]
  };
  const ROLES = { dueno: "Dueño", admin: "Administrador", vendedor: "Vendedor" };

  const est = {
    tienda: null, rol: null, pedidos: [], productos: [], categorias: [],
    filtro: "activos", filtroProd: "todos", busqueda: "", dias: 1,
    vistos: null, nuevos: 0, pestana: "pedidos", hojaPedido: null, temporizador: null
  };

  /* =====================================================================
     ARRANQUE Y ACCESO
     ===================================================================== */
  async function iniciar() {
    if (C.logo) $("#logoTienda").src = C.logo;
    if (!C.supabase || !C.supabase.url) {
      mostrarVista("vistaAcceso");
      $("#errorAcceso").textContent = "Esta tienda no tiene base de datos configurada (falta el bloque supabase en config.tienda.js).";
      return;
    }
    enlazarEventos();
    const regreso = await A.leerRegresoDelCorreo();
    if (regreso === "recovery") return mostrarVista("vistaNuevaClave");
    if (regreso && regreso.startsWith("error:")) {
      modoAcceso("entrar");
      $("#errorAcceso").textContent = "El enlace del correo no es válido o ya venció. Pide uno nuevo.";
      return;
    }
    if (regreso === "signup") avisar("¡Correo confirmado!");
    if (!A.haySesion()) return modoAcceso("entrar");
    await cargarCuenta();
  }

  function mostrarVista(id) {
    ["vistaAcceso", "vistaNuevaClave", "vistaSinTienda", "vistaPanel"].forEach((v) => ($("#" + v).hidden = v !== id));
    $("#botonSalir").hidden = !A.haySesion();
    const u = A.usuario();
    $("#usuarioActual").textContent = u && u.email ? u.email : "Panel de la tienda";
  }

  function modoAcceso(modo) {
    mostrarVista("vistaAcceso");
    est.modoAcceso = modo;
    const t = { entrar: ["Entrar al panel", "Entrar", "Solo para el personal de la tienda."],
      registro: ["Crear mi cuenta", "Crear cuenta", "Usa el correo con el que te invitaron. Te enviaremos un enlace para confirmarlo."],
      recuperar: ["Recuperar contraseña", "Enviar enlace", "Te enviaremos un correo con un enlace para crear una contraseña nueva."] }[modo];
    $("#tituloAcceso").textContent = t[0];
    $("#botonAcceso").textContent = t[1];
    $("#ayudaAcceso").textContent = t[2];
    $("#campoClave").hidden = modo === "recuperar";
    $("#clave").autocomplete = modo === "registro" ? "new-password" : "current-password";
    $("#errorAcceso").textContent = "";
    $("#okAcceso").hidden = true;
    document.querySelectorAll("[data-modo]").forEach((b) => (b.hidden = b.dataset.modo === modo));
  }

  async function enviarAcceso(e) {
    e.preventDefault();
    const correo = $("#correo").value.trim();
    const clave = $("#clave").value;
    const boton = $("#botonAcceso");
    $("#errorAcceso").textContent = "";
    $("#okAcceso").hidden = true;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) return ($("#errorAcceso").textContent = "Escribe un correo válido.");
    if (est.modoAcceso !== "recuperar" && clave.length < 8) return ($("#errorAcceso").textContent = "La contraseña debe tener al menos 8 caracteres.");
    boton.disabled = true;
    try {
      if (est.modoAcceso === "entrar") {
        await A.entrar(correo, clave);
        await cargarCuenta();
      } else if (est.modoAcceso === "registro") {
        const r = await A.registrarse(correo, clave, URL_PANEL);
        if (r.conSesion) return cargarCuenta();
        ok(`Te enviamos un correo a ${correo}. Abre el enlace para confirmar tu cuenta y luego entra aquí con tu contraseña.`);
        modoAccesoSinLimpiar("entrar");
      } else {
        await A.recuperar(correo, URL_PANEL);
        ok(`Si ${correo} tiene cuenta, te llegará un correo con el enlace para crear una contraseña nueva.`);
      }
    } catch (err) {
      $("#errorAcceso").textContent = err.message;
    } finally {
      boton.disabled = false;
    }
    function ok(t) { const p = $("#okAcceso"); p.textContent = t; p.hidden = false; }
  }

  function modoAccesoSinLimpiar(modo) {
    const okTxt = $("#okAcceso").textContent;
    modoAcceso(modo);
    $("#okAcceso").textContent = okTxt;
    $("#okAcceso").hidden = false;
  }

  async function cargarCuenta() {
    let tiendas;
    try { tiendas = await A.rpc("reclamar_invitaciones"); }
    catch (e) { modoAcceso("entrar"); $("#errorAcceso").textContent = e.message; return; }
    const t = tiendas.find((x) => x.slug === C.slug) || tiendas[0];
    if (!t) {
      mostrarVista("vistaSinTienda");
      $("#correoSinTienda").textContent = (A.usuario() || {}).email || "";
      return;
    }
    est.rol = t.rol;
    try {
      const [tienda] = await A.api(`tiendas?id=eq.${t.id}&select=*,horarios(*),metodos_pago(*)`);
      est.tienda = tienda;
    } catch (e) { avisar(e.message); return; }
    document.title = `Panel · ${est.tienda.nombre}`;
    $("#nombreTienda").textContent = est.tienda.nombre;
    if (est.tienda.logo_url) $("#logoTienda").src = est.tienda.logo_url;
    document.body.classList.toggle("rol-vendedor", est.rol === "vendedor");
    mostrarVista("vistaPanel");
    $("#usuarioActual").textContent = `${(A.usuario() || {}).email || ""} · ${ROLES[est.rol]}`;
    await Promise.all([cargarPedidos(), cargarProductos()]);
    clearInterval(est.temporizador);
    est.temporizador = setInterval(() => { if (!document.hidden) cargarPedidos(true); }, 30000);
    prepararCamara();
  }

  /* =====================================================================
     PESTAÑAS
     ===================================================================== */
  function cambiarPestana(nombre) {
    est.pestana = nombre;
    document.querySelectorAll(".pestanas--panel [role=tab]").forEach((b) => b.setAttribute("aria-selected", String(b.id === "tab-" + nombre)));
    document.querySelectorAll("#vistaPanel .panel").forEach((p) => (p.hidden = p.id !== "panel-" + nombre));
    if (nombre === "pedidos") { est.nuevos = 0; pintarContador(); }
    if (nombre === "escaner") $("#entradaCodigo").focus();
    if (nombre === "ventas") cargarVentas();
    if (nombre === "ajustes") pintarAjustes();
  }

  /* =====================================================================
     PEDIDOS
     ===================================================================== */
  async function cargarPedidos(silencioso) {
    try {
      const sel = "*,pedido_items(nombre,cantidad,precio_unitario,subtotal),pedido_eventos(tipo,de,a,fecha)";
      est.pedidos = await A.api(`pedidos?tienda_id=eq.${est.tienda.id}&select=${encodeURIComponent(sel)}&order=creado_en.desc&limit=300`);
    } catch (e) {
      if (!silencioso) avisar(e.message);
      if (!A.haySesion()) modoAcceso("entrar");
      return;
    }
    const ids = new Set(est.pedidos.map((p) => p.id));
    if (est.vistos) {
      const nuevos = est.pedidos.filter((p) => !est.vistos.has(p.id));
      if (nuevos.length) {
        sonido(true); setTimeout(() => sonido(true), 220);
        avisar(nuevos.length === 1 ? `Nuevo pedido ${nuevos[0].numero}` : `${nuevos.length} pedidos nuevos`);
        if (est.pestana !== "pedidos") { est.nuevos += nuevos.length; pintarContador(); }
      }
    }
    est.vistos = ids;
    $("#actualizadoPedidos").textContent = `Actualizado ${new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })} · se revisa solo cada 30 segundos`;
    pintarPedidos();
    if (est.hojaPedido) {
      const p = est.pedidos.find((x) => x.id === est.hojaPedido);
      if (p && !$("#hoja").hidden) abrirPedido(p, true);
    }
  }

  function pintarContador() {
    const c = $("#contadorNuevos");
    c.hidden = !est.nuevos;
    c.textContent = est.nuevos;
  }

  const esHoy = (f) => new Date(f).toDateString() === new Date().toDateString();

  function pedidosFiltrados() {
    const f = est.filtro;
    return est.pedidos.filter((p) =>
      f === "activos" ? ["pendiente", "confirmado", "preparando", "listo"].includes(p.estado_pedido)
      : f === "pago" ? p.estado_pago === "pendiente_verificacion" && p.estado_pedido !== "cancelado"
      : f === "hoy" ? esHoy(p.creado_en)
      : f === "entregados" ? p.estado_pedido === "entregado"
      : f === "cancelados" ? p.estado_pedido === "cancelado" : true);
  }

  function hora(f) {
    const d = new Date(f);
    return esHoy(f) ? d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  function chips(p) {
    return `<span class="chip chip--${p.estado_pedido}">${ESTADOS[p.estado_pedido]}</span>
      <span class="chip chip--${p.estado_pago}">${PAGOS[p.estado_pago]}</span>`;
  }

  function pintarPedidos() {
    const lista = pedidosFiltrados();
    const conteo = {
      activos: est.pedidos.filter((p) => ["pendiente", "confirmado", "preparando", "listo"].includes(p.estado_pedido)).length,
      pago: est.pedidos.filter((p) => p.estado_pago === "pendiente_verificacion" && p.estado_pedido !== "cancelado").length
    };
    document.querySelectorAll("[data-filtro]").forEach((b) => {
      const n = conteo[b.dataset.filtro];
      b.textContent = b.textContent.replace(/\s\(\d+\)$/, "") + (n ? ` (${n})` : "");
    });
    $("#listaPedidos").innerHTML = lista.length ? lista.map((p) => `
      <button type="button" class="pedido-fila pedido-fila--${p.estado_pedido}" data-accion="abrir-pedido" data-id="${p.id}">
        <span class="pedido-fila__arriba">
          <strong>${esc(p.numero)}</strong>
          <span class="pedido-fila__hora">${hora(p.creado_en)}</span>
        </span>
        <span class="pedido-fila__cliente">${esc(p.cliente_nombre)} · ${p.tipo_entrega === "domicilio" ? `🏠 T${esc(p.torre)} · ${esc(p.apto)}` : "🛍️ Recoge"}</span>
        <span class="pedido-fila__abajo">
          <span class="pedido-fila__chips">${chips(p)}</span>
          <strong class="pedido-fila__total">${U.dinero(p.total)}</strong>
        </span>
      </button>`).join("")
      : `<div class="vacio"><p class="vacio__icono">📭</p><p>No hay pedidos en esta lista.</p></div>`;
  }

  function mensajeCliente(p) {
    const n = p.cliente_nombre.split(" ")[0];
    const t = est.tienda.nombre;
    switch (p.estado_pedido) {
      case "pendiente":
      case "confirmado": return `Hola ${n}, ${t} confirmó tu pedido ${p.numero} por ${U.dinero(p.total)}. Ya lo estamos preparando.`;
      case "preparando": return `Hola ${n}, estamos preparando tu pedido ${p.numero}.`;
      case "listo": return p.tipo_entrega === "domicilio"
        ? `Hola ${n}, tu pedido ${p.numero} va en camino a la Torre ${p.torre}, Apto ${p.apto}.${p.metodo_pago === "efectivo" ? ` Llevamos ${U.dinero(p.cambio)} de cambio.` : ""}`
        : `Hola ${n}, tu pedido ${p.numero} está listo para recoger en ${est.tienda.punto_recogida}.`;
      case "entregado": return `Hola ${n}, gracias por tu compra en ${t}. ¡Que lo disfrutes!`;
      case "cancelado": return `Hola ${n}, tu pedido ${p.numero} fue cancelado. Escríbenos si tienes dudas.`;
    }
    return `Hola ${n}, te escribimos de ${t} por tu pedido ${p.numero}.`;
  }

  function abrirPedido(p, refrescar) {
    est.hojaPedido = p.id;
    const sig = SIGUIENTE[p.estado_pedido];
    const tel = "57" + p.cliente_telefono;
    const eventos = (p.pedido_eventos || []).slice().sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    const html = `
      <div class="detalle">
        <div class="chips-estado">${chips(p)}</div>
        <dl class="pago__datos">
          <div><dt>Cliente</dt><dd>${esc(p.cliente_nombre)}</dd></div>
          <div><dt>Celular</dt><dd><a href="tel:${esc(p.cliente_telefono)}">${esc(p.cliente_telefono)}</a></dd></div>
          <div><dt>Entrega</dt><dd>${p.tipo_entrega === "domicilio" ? `🏠 Torre ${esc(p.torre)} · Apto ${esc(p.apto)}` : "🛍️ Recoge en tienda"}</dd></div>
          <div><dt>Hora</dt><dd>${hora(p.creado_en)}</dd></div>
        </dl>
        ${p.notas ? `<p class="alerta">📝 ${esc(p.notas)}</p>` : ""}
        <div class="tarjeta tarjeta--resumen">
          <ul class="resumen__items">${(p.pedido_items || []).map((i) => `<li><span>${i.cantidad} × ${esc(i.nombre)}</span><span>${U.dinero(i.subtotal)}</span></li>`).join("")}</ul>
          <div class="total-fila"><span>Subtotal</span><span>${U.dinero(p.subtotal)}</span></div>
          ${p.tipo_entrega === "domicilio" ? `<div class="total-fila"><span>Domicilio</span><span>${p.costo_domicilio ? U.dinero(p.costo_domicilio) : "Gratis"}</span></div>` : ""}
          <div class="total-fila total-fila--grande"><span>Total</span><strong>${U.dinero(p.total)}</strong></div>
        </div>
        <dl class="pago__datos">
          <div><dt>Pago</dt><dd>${METODOS[p.metodo_pago]}</dd></div>
          ${p.metodo_pago === "efectivo"
            ? `<div><dt>Paga con</dt><dd>${U.dinero(p.efectivo_con)}</dd></div>
               <div class="dato-grande dato-cambio"><dt>Llevar cambio</dt><dd>${U.dinero(p.cambio)}</dd></div>`
            : `<div><dt>Referencia</dt><dd>${p.referencia_pago ? esc(p.referencia_pago) : "La envía por WhatsApp"}</dd></div>`}
        </dl>

        <div class="acciones">
          ${sig ? `<button type="button" class="boton boton--principal boton--bloque" data-accion="estado" data-tipo="pedido" data-estado="${sig[0]}">${sig[1]}</button>` : ""}
          ${p.estado_pedido !== "entregado" && p.estado_pedido !== "cancelado" && p.estado_pedido !== "listo"
            ? `<button type="button" class="boton boton--fantasma boton--bloque" data-accion="estado" data-tipo="pedido" data-estado="entregado">Marcar entregado directamente</button>` : ""}
          ${p.estado_pago === "pendiente_verificacion" && p.estado_pedido !== "cancelado" ? `
            <div class="acciones__fila">
              <button type="button" class="boton boton--principal" data-accion="estado" data-tipo="pago" data-estado="verificado">✓ Pago recibido</button>
              <button type="button" class="boton boton--fantasma" data-accion="estado" data-tipo="pago" data-estado="rechazado">✗ No llegó</button>
            </div>` : ""}
          ${p.estado_pago === "rechazado" ? `<button type="button" class="boton boton--fantasma boton--bloque" data-accion="estado" data-tipo="pago" data-estado="verificado">El pago sí llegó</button>` : ""}
          <a class="boton boton--whatsapp boton--bloque" target="_blank" rel="noopener"
            href="https://wa.me/${tel}?text=${encodeURIComponent(mensajeCliente(p))}">Escribir al cliente</a>
          ${p.estado_pedido !== "cancelado" && p.estado_pedido !== "entregado"
            ? `<button type="button" class="boton boton--peligro boton--bloque" data-accion="estado" data-tipo="pedido" data-estado="cancelado">Cancelar pedido</button>` : ""}
        </div>

        <h3 class="subtitulo">Historial</h3>
        <ol class="historial">${eventos.map((e) => `<li><span>${new Date(e.fecha).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          ${e.tipo === "pago" ? "Pago: " + (PAGOS[e.a] || e.a) : "Pedido: " + (ESTADOS[e.a] || e.a)}</li>`).join("")}</ol>
      </div>`;
    abrirHoja(`Pedido ${p.numero}`, html, refrescar);
  }

  async function cambiarEstado(tipo, estado, boton) {
    const p = est.pedidos.find((x) => x.id === est.hojaPedido);
    if (!p) return;
    if (estado === "cancelado" && !confirm(`¿Cancelar el pedido ${p.numero}? Las existencias vuelven al inventario y no se puede reabrir.`)) return;
    if (tipo === "pago" && estado === "rechazado" && !confirm("¿Confirmas que el pago NO llegó?")) return;
    boton.disabled = true;
    try {
      const r = await A.rpc("cambiar_estado_pedido", { p_pedido: p.id, p_tipo: tipo, p_estado: estado });
      if (!r.ok) throw new Error(r.error);
      avisar(tipo === "pago" ? PAGOS[estado] : `Pedido ${ESTADOS[estado].toLowerCase()}`);
      await cargarPedidos(true);
      if (estado === "cancelado") cargarProductos();
    } catch (e) {
      avisar(e.message);
      boton.disabled = false;
    }
  }

  /* =====================================================================
     PRODUCTOS
     ===================================================================== */
  async function cargarProductos() {
    try {
      [est.productos, est.categorias] = await Promise.all([
        A.api(`productos?tienda_id=eq.${est.tienda.id}&select=*&order=orden.asc,nombre.asc`),
        A.api(`categorias?tienda_id=eq.${est.tienda.id}&select=*&order=orden.asc`)
      ]);
      pintarProductos();
    } catch (e) { avisar(e.message); }
  }

  function nombreCategoria(id) { return (est.categorias.find((c) => c.id === id) || {}).nombre || "Sin categoría"; }

  function fotoHTML(p, clase = "") {
    return p.imagen_url
      ? `<img class="${clase}" src="${esc(p.imagen_url)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
      : `<span class="producto__emoji ${clase}">${esc(p.emoji || "🛍️")}</span>`;
  }

  function pintarProductos() {
    const q = U.normalizar(est.busqueda.trim());
    const f = est.filtroProd;
    const lista = est.productos.filter((p) => {
      if (f === "pocos" && !(p.activo && p.stock > 0 && p.stock <= 5)) return false;
      if (f === "agotados" && !(p.activo && p.stock === 0)) return false;
      if (f === "inactivos" && p.activo) return false;
      if (!q) return true;
      return (p.codigo_barras || "") === q || U.normalizar(p.nombre + " " + nombreCategoria(p.categoria_id)).includes(q);
    });
    $("#listaProductos").innerHTML = lista.length ? lista.map((p) => `
      <button type="button" class="producto-fila ${p.activo ? "" : "producto-fila--oculto"}" data-accion="editar-producto" data-id="${p.id}">
        <span class="producto-fila__foto">${fotoHTML(p)}</span>
        <span class="producto-fila__info">
          <strong>${esc(p.nombre)}</strong>
          <span class="ayuda">${esc(nombreCategoria(p.categoria_id))}${p.codigo_barras ? " · " + esc(p.codigo_barras) : ""}${p.activo ? "" : " · oculto"}</span>
        </span>
        <span class="producto-fila__datos">
          <strong>${U.dinero(p.precio)}</strong>
          <span class="existencias ${p.stock === 0 ? "existencias--cero" : p.stock <= 5 ? "existencias--pocas" : ""}">${p.stock} und</span>
        </span>
      </button>`).join("")
      : `<div class="vacio"><p class="vacio__icono">🏷️</p><p>No hay productos en esta lista.</p></div>`;
  }

  function editorProducto(p, codigoNuevo) {
    const nuevo = !p;
    p = p || { nombre: "", categoria_id: (est.categorias[0] || {}).id, precio: "", stock: "", unidad: "und", emoji: "🛍️",
      codigo_barras: codigoNuevo || "", descripcion: "", imagen_url: "", activo: true };
    const soloVer = est.rol === "vendedor";
    const html = `
      <form class="formulario" id="formProducto" novalidate>
        <div class="editor-foto">
          <div class="editor-foto__vista" id="vistaFoto">${fotoHTML(p)}</div>
          ${soloVer ? "" : `<label class="boton boton--fantasma boton--chico">📷 ${p.imagen_url ? "Cambiar foto" : "Agregar foto"}
            <input type="file" id="fotoProducto" accept="image/*" hidden></label>`}
        </div>
        <div class="campo"><label for="pNombre">Nombre</label>
          <input id="pNombre" maxlength="80" required value="${esc(p.nombre)}" placeholder="Ej: Arroz Diana 500 g"></div>
        <div class="fila-2">
          <div class="campo"><label for="pPrecio">Precio ($)</label>
            <input id="pPrecio" inputmode="numeric" required value="${p.precio !== "" ? Number(p.precio).toLocaleString("es-CO") : ""}"></div>
          <div class="campo"><label for="pStock">Existencias</label>
            <div class="stock-rapido">
              <button type="button" data-accion="stock" data-delta="-1" aria-label="Restar uno">−</button>
              <input id="pStock" inputmode="numeric" required value="${p.stock}">
              <button type="button" data-accion="stock" data-delta="1" aria-label="Sumar uno">+</button>
            </div></div>
        </div>
        <div class="fila-2">
          <div class="campo"><label for="pCategoria">Categoría</label>
            <select id="pCategoria">${est.categorias.map((c) => `<option value="${c.id}" ${c.id === p.categoria_id ? "selected" : ""}>${esc(c.emoji)} ${esc(c.nombre)}</option>`).join("")}</select></div>
          <div class="campo"><label for="pUnidad">Unidad</label>
            <input id="pUnidad" maxlength="20" value="${esc(p.unidad)}" placeholder="und, lb, bolsa…"></div>
        </div>
        <div class="fila-2">
          <div class="campo"><label for="pCodigo">Código de barras</label>
            <input id="pCodigo" inputmode="numeric" maxlength="14" value="${esc(p.codigo_barras || "")}" placeholder="Escanéalo aquí"></div>
          <div class="campo"><label for="pEmoji">Ícono</label>
            <input id="pEmoji" maxlength="4" value="${esc(p.emoji)}"></div>
        </div>
        <div class="campo"><label for="pDescripcion">Descripción <span class="opcional">(opcional)</span></label>
          <input id="pDescripcion" maxlength="120" value="${esc(p.descripcion || "")}"></div>
        <label class="casilla"><input type="checkbox" id="pActivo" ${p.activo ? "checked" : ""}><span>Visible en la tienda</span></label>
        <p class="error error--general" id="errorProducto" role="alert"></p>
        ${soloVer ? `<p class="ayuda">Tu rol (vendedor) solo puede ver los productos.</p>` :
          `<button type="submit" class="boton boton--principal boton--bloque" id="guardarProducto">${nuevo ? "Crear producto" : "Guardar cambios"}</button>`}
      </form>`;
    abrirHoja(nuevo ? "Nuevo producto" : p.nombre, html);
    est.editando = { producto: nuevo ? null : p, foto: null };
    const form = $("#formProducto");
    if (soloVer) form.querySelectorAll("input, select").forEach((i) => (i.disabled = true));
    ["#pPrecio", "#pStock"].forEach((s) => $(s).addEventListener("input", (e) => {
      const n = U.soloDigitos(e.target.value).slice(0, 9);
      e.target.value = s === "#pPrecio" && n ? Number(n).toLocaleString("es-CO") : n;
    }));
    const f = $("#fotoProducto");
    if (f) f.addEventListener("change", async () => {
      const archivo = f.files[0];
      if (!archivo) return;
      try {
        est.editando.foto = await reducirImagen(archivo);
        $("#vistaFoto").innerHTML = `<img src="${URL.createObjectURL(est.editando.foto)}" alt="">`;
      } catch (e) { $("#errorProducto").textContent = "No se pudo leer esa imagen."; }
    });
    form.addEventListener("submit", guardarProducto);
    if (nuevo) $("#pNombre").focus();
  }

  /** Reduce la foto a 600×600 (webp) para que cargue rápido. */
  function reducirImagen(archivo) {
    return new Promise((ok, mal) => {
      const img = new Image();
      img.onload = () => {
        const lado = Math.min(img.width, img.height);
        const c = document.createElement("canvas");
        c.width = c.height = Math.min(600, lado);
        c.getContext("2d").drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, c.width, c.height);
        c.toBlob((b) => (b ? ok(b) : mal(new Error("imagen"))), "image/webp", 0.82);
      };
      img.onerror = mal;
      img.src = URL.createObjectURL(archivo);
    });
  }

  function slugDe(texto) {
    return U.normalizar(texto).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "producto";
  }

  async function guardarProducto(e) {
    e.preventDefault();
    const err = $("#errorProducto");
    err.textContent = "";
    const nombre = $("#pNombre").value.trim().replace(/\s+/g, " ");
    const precio = Number(U.soloDigitos($("#pPrecio").value));
    const stock = Number(U.soloDigitos($("#pStock").value));
    const codigo = U.soloDigitos($("#pCodigo").value);
    if (nombre.length < 2) return (err.textContent = "Escribe el nombre del producto.");
    if ($("#pPrecio").value.trim() === "") return (err.textContent = "Escribe el precio.");
    if ($("#pStock").value.trim() === "") return (err.textContent = "Escribe las existencias (puede ser 0).");
    if (codigo && (codigo.length < 6 || codigo.length > 14)) return (err.textContent = "El código de barras debe tener entre 6 y 14 dígitos.");
    const datos = {
      nombre, precio, stock,
      categoria_id: Number($("#pCategoria").value) || null,
      unidad: $("#pUnidad").value.trim(),
      emoji: $("#pEmoji").value.trim() || "🛍️",
      codigo_barras: codigo || null,
      descripcion: $("#pDescripcion").value.trim(),
      activo: $("#pActivo").checked,
      actualizado_en: new Date().toISOString()
    };
    const boton = $("#guardarProducto");
    boton.disabled = true;
    try {
      const actual = est.editando.producto;
      const slug = actual ? actual.slug : `${slugDe(nombre)}-${Date.now().toString(36).slice(-4)}`;
      if (est.editando.foto) {
        datos.imagen_url = await A.subirFoto(`${est.tienda.id}/${slug}-${Date.now()}.webp`,
          new File([est.editando.foto], "foto.webp", { type: "image/webp" }));
      }
      if (actual) {
        await A.api(`productos?id=eq.${actual.id}`, { method: "PATCH", body: JSON.stringify(datos) });
      } else {
        const orden = est.productos.reduce((m, p) => Math.max(m, p.orden), 0) + 1;
        await A.api("productos", { method: "POST", body: JSON.stringify({ ...datos, slug, orden, tienda_id: est.tienda.id }) });
      }
      cerrarHoja();
      avisar(actual ? "Producto actualizado" : "Producto creado");
      await cargarProductos();
    } catch (e2) {
      err.textContent = e2.message;
      boton.disabled = false;
    }
  }

  /* =====================================================================
     VENTAS
     ===================================================================== */
  async function cargarVentas() {
    const caja = $("#resumenVentas");
    caja.innerHTML = `<p class="ayuda">Cargando…</p>`;
    let r;
    try { r = await A.rpc("resumen_ventas", { p_tienda: est.tienda.id, p_dias: est.dias }); }
    catch (e) { caja.innerHTML = `<p class="alerta">${esc(e.message)}</p>`; return; }
    if (!r.ok) { caja.innerHTML = `<p class="alerta">${esc(r.error)}</p>`; return; }
    const promedio = r.pedidos ? Math.round(r.ventas / r.pedidos) : 0;
    const max = Math.max(1, ...r.por_dia.map((d) => d.ventas));
    caja.innerHTML = `
      <div class="indicadores">
        <div class="indicador indicador--destacado"><span>Ventas</span><strong>${U.dinero(r.ventas)}</strong><small>sin cancelados</small></div>
        <div class="indicador"><span>Pedidos</span><strong>${r.pedidos}</strong><small>${r.cancelados} cancelado${r.cancelados === 1 ? "" : "s"}</small></div>
        <div class="indicador"><span>Ticket promedio</span><strong>${U.dinero(promedio)}</strong></div>
        <div class="indicador"><span>Ya entregado</span><strong>${U.dinero(r.entregado)}</strong></div>
        <div class="indicador ${r.por_verificar ? "indicador--alerta" : ""}"><span>Pagos por verificar</span><strong>${r.por_verificar}</strong><small>todos los días</small></div>
      </div>
      ${r.por_dia.length > 1 ? `
      <div class="tarjeta">
        <h3 class="resumen__titulo">Ventas por día</h3>
        <div class="barras">${r.por_dia.map((d) => `
          <div class="barra" title="${d.dia}: ${U.dinero(d.ventas)} · ${d.pedidos} pedidos">
            <span class="barra__valor" style="height:${Math.max(4, (d.ventas / max) * 100)}%"></span>
            <span class="barra__dia">${new Date(d.dia + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" })}</span>
          </div>`).join("")}</div>
      </div>` : ""}
      <div class="tarjeta">
        <h3 class="resumen__titulo">Productos más pedidos</h3>
        ${r.top_productos.length ? `<ol class="ranking">${r.top_productos.map((t) => `<li><span>${esc(t.nombre)}</span><span>${t.cantidad} und · ${U.dinero(t.ventas)}</span></li>`).join("")}</ol>`
          : `<p class="ayuda">Aún no hay ventas en este periodo.</p>`}
      </div>
      <div class="tarjeta">
        <h3 class="resumen__titulo">Por método de pago</h3>
        ${r.por_metodo.length ? r.por_metodo.map((m) => `<div class="total-fila"><span>${METODOS[m.metodo] || m.metodo} · ${m.pedidos}</span><strong>${U.dinero(m.ventas)}</strong></div>`).join("")
          : `<p class="ayuda">Sin datos.</p>`}
      </div>`;
  }

  /* =====================================================================
     AJUSTES
     ===================================================================== */
  async function pintarAjustes() {
    const caja = $("#ajustes");
    const t = est.tienda;
    const puede = est.rol !== "vendedor";
    const urlTienda = new URL("./", location.href).href;
    let qr = "";
    try { qr = window.QR ? window.QR.svg(urlTienda, { margen: 2, color: "#0E3B2E" }) : ""; } catch (e) { /* sin QR */ }
    const enlaces = `
      <div class="tarjeta">
        <h3 class="resumen__titulo">Enlaces de la tienda</h3>
        <dl class="pago__datos">
          <div><dt>Tienda (residentes)</dt><dd><a href="${urlTienda}" target="_blank" rel="noopener">Abrir</a></dd></div>
          <div><dt>Modo tienda (mostrador)</dt><dd><a href="tienda.html" target="_blank" rel="noopener">Abrir</a></dd></div>
        </dl>
        ${qr ? `<div class="qr-tienda"><div class="qr qr--chico">${qr}</div><p class="ayuda">QR para pegar en portería y ascensores: abre la tienda.</p></div>` : ""}
        <button type="button" class="boton boton--fantasma boton--chico" data-accion="copiar-enlace" data-texto="${esc(urlTienda)}">Copiar enlace de la tienda</button>
      </div>`;
    if (!puede) { caja.innerHTML = enlaces + `<p class="ayuda">Los ajustes los cambia el dueño o un administrador.</p>`; return; }

    let invitaciones = [];
    try { invitaciones = await A.api(`invitaciones?tienda_id=eq.${t.id}&select=*&order=creada_en.asc`); } catch (e) { /* sin permiso */ }
    const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    caja.innerHTML = `
      <form class="tarjeta formulario" id="formTienda" novalidate>
        <h3 class="resumen__titulo">Tienda y domicilio</h3>
        <div class="campo"><label for="aNombre">Nombre</label><input id="aNombre" maxlength="60" value="${esc(t.nombre)}"></div>
        <div class="campo"><label for="aConjunto">Conjunto</label><input id="aConjunto" maxlength="80" value="${esc(t.conjunto)}"></div>
        <div class="campo"><label for="aEslogan">Frase</label><input id="aEslogan" maxlength="90" value="${esc(t.eslogan)}"></div>
        <div class="campo"><label for="aWhatsapp">WhatsApp de la tienda (57 + celular)</label><input id="aWhatsapp" inputmode="numeric" value="${esc(t.whatsapp)}"></div>
        <div class="fila-2">
          <div class="campo"><label for="aCosto">Costo domicilio</label><input id="aCosto" inputmode="numeric" value="${t.costo_domicilio}"></div>
          <div class="campo"><label for="aMinDom">Compra mínima domicilio</label><input id="aMinDom" inputmode="numeric" value="${t.domicilio_minimo}"></div>
        </div>
        <div class="fila-2">
          <div class="campo"><label for="aGratis">Domicilio gratis desde (0 = nunca)</label><input id="aGratis" inputmode="numeric" value="${t.domicilio_gratis_desde}"></div>
          <div class="campo"><label for="aMinimo">Pedido mínimo (0 = sin mínimo)</label><input id="aMinimo" inputmode="numeric" value="${t.pedido_minimo}"></div>
        </div>
        <div class="campo"><label for="aTiempo">Tiempo de entrega</label><input id="aTiempo" maxlength="40" value="${esc(t.tiempo_estimado)}"></div>
        <div class="campo"><label for="aRecogida">Punto de recogida</label><input id="aRecogida" maxlength="80" value="${esc(t.punto_recogida)}"></div>
        <div class="campo"><label for="aTorres">Torres (separadas por coma)</label><input id="aTorres" value="${esc((t.torres || []).join(", "))}"></div>
        <label class="casilla"><input type="checkbox" id="aDomicilio" ${t.domicilio_activo ? "checked" : ""}><span>Ofrecer domicilio</span></label>
        <label class="casilla"><input type="checkbox" id="aRecoge" ${t.recogida_activa ? "checked" : ""}><span>Ofrecer recogida en tienda</span></label>
        <p class="error" id="errorTienda"></p>
        <button class="boton boton--principal boton--bloque" type="submit">Guardar tienda</button>
      </form>

      <div class="tarjeta">
        <h3 class="resumen__titulo">Métodos de pago</h3>
        ${(t.metodos_pago || []).sort((a, b) => a.orden - b.orden).map((m) => `
          <form class="metodo formulario" data-metodo="${m.id}" novalidate>
            <label class="casilla"><input type="checkbox" name="activo" ${m.activo ? "checked" : ""}><span><strong>${esc(m.nombre)}</strong></span></label>
            ${m.tipo === "efectivo" ? "" : `
            <div class="fila-2">
              <div class="campo"><label>Número</label><input name="numero" value="${esc(m.numero)}"></div>
              <div class="campo"><label>Titular</label><input name="titular" value="${esc(m.titular)}"></div>
            </div>
            ${m.tipo === "transferencia" ? `
            <div class="fila-2">
              <div class="campo"><label>Banco</label><input name="banco" value="${esc(m.banco)}"></div>
              <div class="campo"><label>Tipo de cuenta</label><input name="tipo_cuenta" value="${esc(m.tipo_cuenta)}"></div>
            </div>
            <div class="campo"><label>Documento del titular</label><input name="documento" value="${esc(m.documento)}"></div>` : ""}`}
            <div class="campo"><label>Instrucciones</label><input name="instrucciones" maxlength="160" value="${esc(m.instrucciones)}"></div>
            <button class="boton boton--fantasma boton--chico" type="submit">Guardar ${esc(m.nombre)}</button>
          </form>`).join("")}
      </div>

      <div class="tarjeta">
        <h3 class="resumen__titulo">Horario de atención</h3>
        ${(t.horarios || []).map((h) => `<div class="total-fila"><span>${h.dias.map((d) => dias[d]).join(", ")}</span>
          <span>${h.abre.slice(0, 5)} – ${h.cierra.slice(0, 5)} <button type="button" class="enlace-quitar" data-accion="borrar-horario" data-id="${h.id}">Quitar</button></span></div>`).join("")
          || `<p class="ayuda">Sin horario: la tienda aparecerá como cerrada.</p>`}
        <form id="formHorario" class="formulario" novalidate>
          <div class="dias">${dias.map((d, i) => `<label><input type="checkbox" value="${i}"><span>${d}</span></label>`).join("")}</div>
          <div class="fila-2">
            <div class="campo"><label for="hAbre">Abre</label><input id="hAbre" type="time" value="07:00"></div>
            <div class="campo"><label for="hCierra">Cierra</label><input id="hCierra" type="time" value="21:00"></div>
          </div>
          <button class="boton boton--fantasma boton--chico" type="submit">+ Agregar horario</button>
        </form>
      </div>

      <div class="tarjeta">
        <h3 class="resumen__titulo">Equipo</h3>
        ${invitaciones.map((i) => `<div class="total-fila"><span>${esc(i.email)} · ${ROLES[i.rol]}</span>
          <span>${i.usada_en ? "✓ Activo" : "Pendiente"} ${i.rol !== "dueno" ? `<button type="button" class="enlace-quitar" data-accion="borrar-invitacion" data-id="${i.id}">Quitar</button>` : ""}</span></div>`).join("")}
        <form id="formInvitar" class="formulario" novalidate>
          <div class="fila-2">
            <div class="campo"><label for="iCorreo">Correo</label><input id="iCorreo" type="email" placeholder="persona@correo.com"></div>
            <div class="campo"><label for="iRol">Rol</label><select id="iRol"><option value="vendedor">Vendedor (pedidos)</option><option value="admin">Administrador (todo)</option></select></div>
          </div>
          <button class="boton boton--fantasma boton--chico" type="submit">Invitar</button>
          <p class="ayuda">La persona entra al panel con «Primera vez: crear mi cuenta» usando ese correo. Quitar la invitación no cierra un acceso ya activo.</p>
        </form>
      </div>
      ${enlaces}`;

    $("#formTienda").addEventListener("submit", guardarTienda);
    document.querySelectorAll("form.metodo").forEach((f) => f.addEventListener("submit", guardarMetodo));
    $("#formHorario").addEventListener("submit", agregarHorario);
    $("#formInvitar").addEventListener("submit", invitar);
  }

  async function recargarTienda() {
    const [t] = await A.api(`tiendas?id=eq.${est.tienda.id}&select=*,horarios(*),metodos_pago(*)`);
    est.tienda = t;
    $("#nombreTienda").textContent = t.nombre;
  }

  async function guardarTienda(e) {
    e.preventDefault();
    const num = (id) => Number(U.soloDigitos($(id).value)) || 0;
    const wa = U.soloDigitos($("#aWhatsapp").value);
    const err = $("#errorTienda");
    err.textContent = "";
    if (!/^57[0-9]{10}$/.test(wa)) return (err.textContent = "El WhatsApp debe ser 57 seguido del celular de 10 dígitos.");
    if (!$("#aDomicilio").checked && !$("#aRecoge").checked) return (err.textContent = "Activa al menos domicilio o recogida.");
    const datos = {
      nombre: $("#aNombre").value.trim(), conjunto: $("#aConjunto").value.trim(), eslogan: $("#aEslogan").value.trim(),
      whatsapp: wa, costo_domicilio: num("#aCosto"), domicilio_minimo: num("#aMinDom"), domicilio_gratis_desde: num("#aGratis"),
      pedido_minimo: num("#aMinimo"), tiempo_estimado: $("#aTiempo").value.trim(), punto_recogida: $("#aRecogida").value.trim(),
      torres: $("#aTorres").value.split(",").map((x) => x.trim()).filter(Boolean),
      domicilio_activo: $("#aDomicilio").checked, recogida_activa: $("#aRecoge").checked
    };
    if (!datos.nombre) return (err.textContent = "Escribe el nombre de la tienda.");
    try {
      await A.api(`tiendas?id=eq.${est.tienda.id}`, { method: "PATCH", body: JSON.stringify(datos) });
      await recargarTienda();
      avisar("Tienda guardada");
    } catch (e2) { err.textContent = e2.message; }
  }

  async function guardarMetodo(e) {
    e.preventDefault();
    const f = e.target;
    const datos = { activo: f.activo.checked };
    ["numero", "titular", "banco", "tipo_cuenta", "documento", "instrucciones"].forEach((k) => { if (f[k]) datos[k] = f[k].value.trim(); });
    try {
      await A.api(`metodos_pago?id=eq.${f.dataset.metodo}`, { method: "PATCH", body: JSON.stringify(datos) });
      await recargarTienda();
      avisar("Método de pago guardado");
    } catch (e2) { avisar(e2.message); }
  }

  async function agregarHorario(e) {
    e.preventDefault();
    const dias = [...e.target.querySelectorAll(".dias input:checked")].map((i) => Number(i.value));
    if (!dias.length) return avisar("Marca al menos un día.");
    if ($("#hAbre").value >= $("#hCierra").value) return avisar("La hora de cierre debe ser después de la de apertura.");
    try {
      await A.api("horarios", { method: "POST", body: JSON.stringify({ tienda_id: est.tienda.id, dias, abre: $("#hAbre").value, cierra: $("#hCierra").value }) });
      await recargarTienda(); pintarAjustes(); avisar("Horario agregado");
    } catch (e2) { avisar(e2.message); }
  }

  async function invitar(e) {
    e.preventDefault();
    const correo = $("#iCorreo").value.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) return avisar("Escribe un correo válido.");
    if (est.rol !== "dueno" && $("#iRol").value === "admin") return avisar("Solo el dueño puede invitar administradores.");
    try {
      await A.api("invitaciones", { method: "POST", body: JSON.stringify({ tienda_id: est.tienda.id, email: correo, rol: $("#iRol").value }) });
      pintarAjustes(); avisar("Invitación creada");
    } catch (e2) { avisar(/duplicate/i.test(e2.message) ? "Ese correo ya está invitado." : e2.message); }
  }

  /* =====================================================================
     ESCÁNER (pistola lectora o cámara)
     ===================================================================== */
  async function procesarCodigo(texto) {
    const crudo = String(texto).trim();
    const caja = $("#resultadoEscaner");
    const leido = K.leerPedido(crudo);
    if (leido) {
      let p = est.pedidos.find((x) => x.numero === leido.numero);
      if (!p) {
        try {
          const sel = "*,pedido_items(nombre,cantidad,precio_unitario,subtotal),pedido_eventos(tipo,de,a,fecha)";
          [p] = await A.api(`pedidos?tienda_id=eq.${est.tienda.id}&numero=eq.${encodeURIComponent(leido.numero)}&select=${encodeURIComponent(sel)}`);
        } catch (e) { /* abajo */ }
      }
      if (p) {
        sonido(true); marcarLector(`Pedido ${p.numero}`, true);
        caja.innerHTML = "";
        if (!est.pedidos.some((x) => x.id === p.id)) est.pedidos.unshift(p);
        abrirPedido(p);
      } else {
        sonido(false); marcarLector("Pedido no encontrado", false);
        caja.innerHTML = `<p class="alerta">El pedido ${esc(leido.numero)} no está en esta tienda.</p>`;
      }
      return;
    }
    const codigo = U.soloDigitos(crudo);
    const prod = codigo && est.productos.find((x) => x.codigo_barras === codigo);
    if (prod) {
      sonido(true); marcarLector(prod.nombre, true);
      caja.innerHTML = "";
      editorProducto(prod);
      return;
    }
    sonido(false);
    if (codigo.length >= 6 && est.rol !== "vendedor") {
      marcarLector(`Código nuevo: ${codigo}`, false);
      caja.innerHTML = `<div class="tarjeta"><p>El código <strong>${esc(codigo)}</strong> no está en el catálogo.</p>
        <button type="button" class="boton boton--principal boton--bloque" data-accion="crear-con-codigo" data-codigo="${esc(codigo)}">+ Crear producto con este código</button></div>`;
    } else {
      marcarLector("Código no reconocido", false);
      caja.innerHTML = `<p class="alerta">No reconocí ese código. Intenta escanearlo de nuevo.</p>`;
    }
  }

  function marcarLector(texto, ok) {
    $("#lectorEstado").textContent = texto;
    $("#lectorPunto").className = "lector__punto " + (ok ? "lector__punto--ok" : "lector__punto--error");
    clearTimeout(marcarLector.t);
    marcarLector.t = setTimeout(() => { $("#lectorEstado").textContent = "Listo para escanear"; $("#lectorPunto").className = "lector__punto"; }, 3000);
  }

  async function prepararCamara() {
    if (prepararCamara.lista || !("BarcodeDetector" in window) || !navigator.mediaDevices) return;
    let formatos = [];
    try { formatos = await window.BarcodeDetector.getSupportedFormats(); } catch (e) { return; }
    const usar = ["qr_code", "ean_13", "ean_8", "code_128", "upc_a"].filter((f) => formatos.includes(f));
    if (!usar.length) return;
    prepararCamara.lista = true;
    const detector = new window.BarcodeDetector({ formats: usar });
    $("#botonCamara").hidden = false;
    let flujo = null, activo = false;
    const cerrar = () => { activo = false; if (flujo) flujo.getTracks().forEach((t) => t.stop()); flujo = null; $("#camara").hidden = true; };
    $("#botonCamara").addEventListener("click", async () => {
      try { flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }); }
      catch (e) { return avisar("No se pudo abrir la cámara. Revisa el permiso del navegador."); }
      const v = $("#video"); v.srcObject = flujo; await v.play();
      $("#camara").hidden = false; activo = true;
      const buscar = async () => {
        if (!activo) return;
        try { const r = await detector.detect(v); if (r.length) { cerrar(); procesarCodigo(r[0].rawValue); return; } } catch (e) { /* reintenta */ }
        setTimeout(buscar, 250);
      };
      buscar();
    });
    $("#cerrarCamara").addEventListener("click", cerrar);
  }

  /* =====================================================================
     HOJA (ventana de detalle)
     ===================================================================== */
  function abrirHoja(titulo, html, conservarScroll) {
    const caja = document.querySelector(".hoja__caja");
    const scroll = caja.scrollTop;
    $("#hojaTitulo").textContent = titulo;
    $("#hojaCuerpo").innerHTML = html;
    $("#hoja").hidden = false;
    document.body.classList.add("con-hoja");
    caja.scrollTop = conservarScroll ? scroll : 0;
  }
  function cerrarHoja() {
    $("#hoja").hidden = true;
    document.body.classList.remove("con-hoja");
    est.hojaPedido = null;
    if (est.pestana === "escaner") $("#entradaCodigo").focus();
  }

  /* =====================================================================
     EVENTOS
     ===================================================================== */
  function enlazarEventos() {
    $("#formAcceso").addEventListener("submit", enviarAcceso);
    document.querySelectorAll("[data-modo]").forEach((b) => b.addEventListener("click", () => modoAcceso(b.dataset.modo)));
    $("#formNuevaClave").addEventListener("submit", async (e) => {
      e.preventDefault();
      const c = $("#nuevaClave").value;
      if (c.length < 8) return ($("#errorNuevaClave").textContent = "Mínimo 8 caracteres.");
      try { await A.cambiarClave(c); avisar("Contraseña guardada"); await cargarCuenta(); }
      catch (err) { $("#errorNuevaClave").textContent = err.message; }
    });
    $("#botonSalir").addEventListener("click", async () => {
      clearInterval(est.temporizador);
      await A.salir();
      est.vistos = null;
      modoAcceso("entrar");
    });
    $("#botonReintentar").addEventListener("click", cargarCuenta);
    document.querySelectorAll(".pestanas--panel [role=tab]").forEach((b) => b.addEventListener("click", () => cambiarPestana(b.id.replace("tab-", ""))));
    $("#filtrosPedidos").addEventListener("click", (e) => {
      const b = e.target.closest("[data-filtro]"); if (!b) return;
      est.filtro = b.dataset.filtro;
      document.querySelectorAll("[data-filtro]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      pintarPedidos();
    });
    document.querySelectorAll("[data-filtro-prod]").forEach((b) => b.addEventListener("click", () => {
      est.filtroProd = b.dataset.filtroProd;
      document.querySelectorAll("[data-filtro-prod]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      pintarProductos();
    }));
    document.querySelectorAll("[data-dias]").forEach((b) => b.addEventListener("click", () => {
      est.dias = Number(b.dataset.dias);
      document.querySelectorAll("[data-dias]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      cargarVentas();
    }));
    $("#buscarProducto").addEventListener("input", (e) => { est.busqueda = e.target.value; pintarProductos(); });
    $("#formLector").addEventListener("submit", (e) => {
      e.preventDefault();
      const v = $("#entradaCodigo").value; $("#entradaCodigo").value = "";
      if (v.trim()) procesarCodigo(v);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("#hoja").hidden) return cerrarHoja();
      if (est.pestana !== "escaner" || !$("#hoja").hidden) return;
      const t = e.target;
      if (!(t.matches && t.matches("input, textarea, select")) && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) $("#entradaCodigo").focus();
    });

    document.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-accion]");
      if (!b) return;
      switch (b.dataset.accion) {
        case "abrir-pedido": abrirPedido(est.pedidos.find((p) => p.id === b.dataset.id)); break;
        case "estado": cambiarEstado(b.dataset.tipo, b.dataset.estado, b); break;
        case "cerrar-hoja": cerrarHoja(); break;
        case "nuevo-producto": editorProducto(null); break;
        case "editar-producto": editorProducto(est.productos.find((p) => p.id === b.dataset.id)); break;
        case "crear-con-codigo": editorProducto(null, b.dataset.codigo); break;
        case "stock": {
          const i = $("#pStock");
          i.value = Math.max(0, (Number(U.soloDigitos(i.value)) || 0) + Number(b.dataset.delta));
          break;
        }
        case "borrar-horario":
          if (!confirm("¿Quitar este horario?")) return;
          try { await A.api(`horarios?id=eq.${b.dataset.id}`, { method: "DELETE" }); await recargarTienda(); pintarAjustes(); }
          catch (err) { avisar(err.message); }
          break;
        case "borrar-invitacion":
          if (!confirm("¿Quitar esta invitación?")) return;
          try { await A.api(`invitaciones?id=eq.${b.dataset.id}`, { method: "DELETE" }); pintarAjustes(); }
          catch (err) { avisar(err.message); }
          break;
        case "copiar-enlace":
          try { await navigator.clipboard.writeText(b.dataset.texto); avisar("Enlace copiado"); } catch (err) { avisar(b.dataset.texto); }
          break;
      }
    });
  }

  /* =====================================================================
     APOYO
     ===================================================================== */
  let audio;
  function sonido(ok) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = ok ? 1250 : 300; g.gain.value = 0.08;
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
    tAviso = setTimeout(() => a.classList.remove("visible"), 2800);
  }

  document.addEventListener("DOMContentLoaded", iniciar);
})();
