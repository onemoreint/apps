/* ==========================================================================
   Utilidades generales (formato de moneda, seguridad de texto, horarios...)
   ========================================================================== */
(function () {
  "use strict";

  const formatoCOP = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  });

  /** Convierte 12500 en "$ 12.500" */
  function dinero(valor) {
    return formatoCOP.format(Math.round(Number(valor) || 0));
  }

  /** Evita que un texto escrito por alguien se interprete como HTML. */
  function escaparHTML(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  /** Deja solo los dígitos de un teléfono. */
  function soloDigitos(texto) {
    return String(texto ?? "").replace(/\D/g, "");
  }

  /** Celular colombiano: 10 dígitos empezando por 3 (acepta +57 delante). */
  function celularValido(texto) {
    let d = soloDigitos(texto);
    if (d.length === 12 && d.startsWith("57")) d = d.slice(2);
    return /^3\d{9}$/.test(d) ? d : null;
  }

  /** Identificador aleatorio para evitar pedidos duplicados. */
  function idUnico() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  /** Código corto legible sin letras confusas (sin O, 0, I, 1). */
  function codigoCorto(largo = 4) {
    const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const valores = new Uint32Array(largo);
    (window.crypto || {}).getRandomValues
      ? crypto.getRandomValues(valores)
      : valores.forEach((_, i) => (valores[i] = Math.floor(Math.random() * 1e9)));
    return Array.from(valores, (v) => letras[v % letras.length]).join("");
  }

  /** Lee/guarda JSON en el navegador sin romper la app si falla. */
  const almacen = {
    leer(clave, porDefecto) {
      try {
        const v = localStorage.getItem(clave);
        return v ? JSON.parse(v) : porDefecto;
      } catch (e) {
        return porDefecto;
      }
    },
    guardar(clave, valor) {
      try {
        localStorage.setItem(clave, JSON.stringify(valor));
        return true;
      } catch (e) {
        return false;
      }
    }
  };

  function aMinutos(hhmm) {
    const [h, m] = String(hhmm).split(":").map(Number);
    return h * 60 + (m || 0);
  }

  /**
   * Indica si la tienda está abierta ahora según la configuración.
   * Devuelve { abierta, texto }.
   */
  function estadoHorario(horarios, ahora = new Date()) {
    const dia = ahora.getDay();
    const minutos = ahora.getHours() * 60 + ahora.getMinutes();
    const hoy = (horarios || []).find((h) => h.dias.includes(dia));
    if (hoy && minutos >= aMinutos(hoy.abre) && minutos < aMinutos(hoy.cierra)) {
      return { abierta: true, texto: `Abierto · cierra a las ${hoy.cierra}` };
    }
    // Buscar la próxima apertura en los próximos 7 días
    const nombres = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    for (let i = 0; i < 8; i++) {
      const d = (dia + i) % 7;
      const h = (horarios || []).find((x) => x.dias.includes(d));
      if (!h) continue;
      if (i === 0 && minutos >= aMinutos(h.abre)) continue;
      const cuando = i === 0 ? "hoy" : i === 1 ? "mañana" : `el ${nombres[d]}`;
      return { abierta: false, texto: `Cerrado · abre ${cuando} a las ${h.abre}` };
    }
    return { abierta: false, texto: "Cerrado" };
  }

  /** Normaliza texto para buscar sin importar tildes ni mayúsculas. */
  function normalizar(texto) {
    return String(texto ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
  }

  window.Util = {
    dinero, escaparHTML, soloDigitos, celularValido, idUnico,
    codigoCorto, almacen, estadoHorario, normalizar
  };
})();
