/* ==========================================================================
   INICIO DE SESIÓN (Supabase Auth) — sin librerías externas
   --------------------------------------------------------------------------
   Guarda la sesión del personal en este navegador y la renueva sola.
   Solo usa la clave PUBLICABLE; los permisos los decide la base de datos
   (reglas RLS + invitaciones por correo).
   ========================================================================== */
(function () {
  "use strict";

  const S = (window.TIENDA_CONFIG || {}).supabase || {};
  const CLAVE = "mtr:panel:sesion";
  let sesion = leer();
  let renovando = null;

  function leer() {
    try { return JSON.parse(localStorage.getItem(CLAVE)) || null; } catch (e) { return null; }
  }
  function guardar(s) {
    sesion = s;
    try { s ? localStorage.setItem(CLAVE, JSON.stringify(s)) : localStorage.removeItem(CLAVE); } catch (e) { /* sin almacenamiento */ }
  }

  function mensajeError(cuerpo, estado) {
    const txt = (cuerpo && (cuerpo.msg || cuerpo.error_description || cuerpo.message || cuerpo.error)) || "";
    const codigo = (cuerpo && (cuerpo.error_code || cuerpo.code)) || "";
    if (/invalid login credentials|invalid_credentials/i.test(txt + codigo)) return "Correo o contraseña incorrectos.";
    if (/email not confirmed|email_not_confirmed/i.test(txt + codigo)) return "Primero confirma tu correo: abre el enlace que te enviamos.";
    if (/already registered|user_already_exists/i.test(txt + codigo)) return "Ese correo ya tiene cuenta. Usa «Entrar» o «Olvidé mi contraseña».";
    if (/password should be at least|weak_password/i.test(txt + codigo)) return "La contraseña debe tener al menos 8 caracteres, con letras y números.";
    if (/rate limit|over_email_send_rate_limit|over_request_rate_limit/i.test(txt + codigo)) return "Demasiados intentos. Espera unos minutos y vuelve a intentar.";
    if (estado === 401 || estado === 403) return "Tu sesión terminó. Vuelve a entrar.";
    return txt || "Algo salió mal. Intenta de nuevo.";
  }

  async function llamarAuth(ruta, cuerpo, opciones = {}) {
    const r = await fetch(`${S.url}/auth/v1/${ruta}`, {
      method: opciones.metodo || "POST",
      headers: {
        apikey: S.clave, "Content-Type": "application/json",
        ...(opciones.token ? { Authorization: `Bearer ${opciones.token}` } : {})
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined
    });
    const datos = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(mensajeError(datos, r.status));
    return datos;
  }

  function aSesion(d) {
    return {
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      expira: Date.now() + (Number(d.expires_in) || 3600) * 1000,
      usuario: { id: d.user && d.user.id, email: d.user && d.user.email }
    };
  }

  const Auth = {
    usuario: () => (sesion ? sesion.usuario : null),
    haySesion: () => !!sesion,

    async entrar(email, clave) {
      const d = await llamarAuth("token?grant_type=password", { email: email.trim().toLowerCase(), password: clave });
      guardar(aSesion(d));
      return sesion.usuario;
    },

    /** Crea la cuenta. Supabase envía un correo para confirmarla. */
    async registrarse(email, clave, volverA) {
      const d = await llamarAuth(`signup?redirect_to=${encodeURIComponent(volverA)}`, { email: email.trim().toLowerCase(), password: clave });
      if (d.access_token) { guardar(aSesion(d)); return { conSesion: true }; }
      return { conSesion: false };
    },

    async recuperar(email, volverA) {
      await llamarAuth(`recover?redirect_to=${encodeURIComponent(volverA)}`, { email: email.trim().toLowerCase() });
    },

    async cambiarClave(nueva) {
      await Auth.token();
      await llamarAuth("user", { password: nueva }, { metodo: "PUT", token: sesion.access_token });
    },

    async salir() {
      const s = sesion;
      guardar(null);
      if (s) { try { await llamarAuth("logout", null, { token: s.access_token }); } catch (e) { /* ya cerrada */ } }
    },

    /**
     * Al volver del enlace del correo (confirmación o recuperación), Supabase
     * agrega la sesión en la dirección (#access_token=…). La tomamos y la limpiamos.
     * Devuelve "recovery", "signup", "error:<texto>" o null.
     */
    async leerRegresoDelCorreo() {
      const h = new URLSearchParams(location.hash.replace(/^#/, ""));
      if (h.get("error_description")) {
        history.replaceState(null, "", location.pathname + location.search);
        return "error:" + h.get("error_description");
      }
      if (!h.get("access_token")) return null;
      const tipo = h.get("type") || "signup";
      const s = { access_token: h.get("access_token"), refresh_token: h.get("refresh_token"),
        expira: Date.now() + (Number(h.get("expires_in")) || 3600) * 1000, usuario: {} };
      history.replaceState(null, "", location.pathname + location.search);
      try {
        const u = await llamarAuth("user", null, { metodo: "GET", token: s.access_token });
        s.usuario = { id: u.id, email: u.email };
        guardar(s);
      } catch (e) { return "error:" + e.message; }
      return tipo;
    },

    /** Token vigente (lo renueva si está por vencer). */
    async token() {
      if (!sesion) throw new Error("Tu sesión terminó. Vuelve a entrar.");
      if (Date.now() < sesion.expira - 60000) return sesion.access_token;
      if (!renovando) {
        renovando = llamarAuth("token?grant_type=refresh_token", { refresh_token: sesion.refresh_token })
          .then((d) => { guardar(aSesion(d)); })
          .catch((e) => { guardar(null); throw e; })
          .finally(() => { renovando = null; });
      }
      await renovando;
      return sesion.access_token;
    },

    /** Llamada a la base de datos con la sesión del personal. */
    async api(ruta, opciones = {}) {
      const t = await Auth.token();
      const r = await fetch(`${S.url}/rest/v1/${ruta}`, {
        ...opciones,
        headers: {
          apikey: S.clave, Authorization: `Bearer ${t}`, "Content-Type": "application/json",
          ...(opciones.headers || {})
        }
      });
      if (r.status === 401) { guardar(null); throw new Error("Tu sesión terminó. Vuelve a entrar."); }
      const texto = await r.text();
      const datos = texto ? JSON.parse(texto) : null;
      if (!r.ok) {
        const m = (datos && (datos.message || datos.hint)) || `Error ${r.status}`;
        throw new Error(/duplicate key.*codigo_barras/i.test(m) ? "Ese código de barras ya está en otro producto."
          : /duplicate key.*slug/i.test(m) ? "Ya existe un producto con un nombre muy parecido." : m);
      }
      return datos;
    },

    rpc: (nombre, params) => Auth.api(`rpc/${nombre}`, { method: "POST", body: JSON.stringify(params || {}) }),

    /** Sube una foto al almacenamiento público de productos. */
    async subirFoto(ruta, archivo) {
      const t = await Auth.token();
      const r = await fetch(`${S.url}/storage/v1/object/productos/${ruta}`, {
        method: "POST",
        headers: { apikey: S.clave, Authorization: `Bearer ${t}`, "Content-Type": archivo.type, "x-upsert": "true" },
        body: archivo
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.message || d.error || "No se pudo subir la foto.");
      }
      return `${S.url}/storage/v1/object/public/productos/${ruta}`;
    }
  };

  window.Auth = Auth;
})();
