/* ==========================================================================
   CÓDIGOS: QR del pedido y códigos de barras de productos
   --------------------------------------------------------------------------
   El QR del pedido usa SOLO letras, números y espacios. Así lo leen bien las
   pistolas lectoras aunque el computador tenga el teclado en español (los
   símbolos como - | : suelen cambiarse por otros al escanear).

   Formato:  PED FDL261123RXE3 TOT 24700 ENT D T 3 A 502 PAG EF CON 50000 IT 2
   ========================================================================== */
(function () {
  "use strict";

  const PAGOS = { nequi: "NQ", daviplata: "DP", transferencia: "TR", efectivo: "EF" };
  const PAGOS_INV = Object.fromEntries(Object.entries(PAGOS).map(([k, v]) => [v, k]));
  const limpio = (t) => String(t || "").toUpperCase().normalize("NFD")
    .replace(/[̀-ͯ]/g, "").replace(/[^A-Z0-9]/g, "");

  /** Texto que va dentro del QR del pedido. */
  function textoPedido(p) {
    const t = ["PED", limpio(p.numero), "TOT", p.total, "ENT", p.entrega.tipo === "domicilio" ? "D" : "R"];
    if (p.entrega.tipo === "domicilio") t.push("T", limpio(p.cliente.torre) || "0", "A", limpio(p.cliente.apto) || "0");
    t.push("PAG", PAGOS[p.pago.metodo] || "OT");
    if (p.pago.metodo === "efectivo") t.push("CON", p.pago.efectivoCon || 0);
    t.push("IT", p.items.reduce((s, i) => s + i.cantidad, 0));
    return t.join(" ");
  }

  /** Lee el texto escaneado de un QR de pedido. Devuelve null si no lo es. */
  function leerPedido(texto) {
    const tok = String(texto || "").toUpperCase().trim().split(/\s+/);
    if (tok[0] !== "PED") return null;
    // El número viene sin guiones; se reconstruye: prefijo + fecha (6) + código (4)
    const m = /^([A-Z]+)(\d{6})([A-Z0-9]{4})$/.exec(tok[1] || "");
    if (!m) return null;
    const pares = {};
    for (let i = 2; i < tok.length - 1; i += 2) pares[tok[i]] = tok[i + 1];
    const total = Number(pares.TOT);
    if (!Number.isFinite(total)) return null;
    const metodo = PAGOS_INV[pares.PAG] || "otro";
    const efectivoCon = Number(pares.CON) || 0;
    return {
      numero: `${m[1]}-${m[2]}-${m[3]}`,
      total,
      entrega: pares.ENT === "D" ? "domicilio" : "recogida",
      torre: pares.T || "",
      apto: pares.A || "",
      metodo,
      efectivoCon,
      cambio: metodo === "efectivo" ? Math.max(0, efectivoCon - total) : 0,
      unidades: Number(pares.IT) || 0
    };
  }

  /* ---------------- Códigos de barras EAN-13 ---------------- */

  /** Dígito de control de un EAN-13 a partir de sus 12 primeros dígitos. */
  function digitoEAN(doce) {
    const s = String(doce).split("").reduce((a, d, i) => a + Number(d) * (i % 2 ? 3 : 1), 0);
    return String((10 - (s % 10)) % 10);
  }

  function eanValido(codigo) {
    const c = String(codigo);
    return /^\d{13}$/.test(c) && digitoEAN(c.slice(0, 12)) === c[12];
  }

  const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
  const G = L.map((p) => p.split("").map((b) => (b === "0" ? "1" : "0")).reverse().join(""));
  const R = L.map((p) => p.split("").map((b) => (b === "0" ? "1" : "0")).join(""));
  const PARIDAD = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

  /** Dibuja un EAN-13 como SVG (para imprimir etiquetas o probar la pistola). */
  function svgEAN13(codigo) {
    const c = String(codigo);
    if (!eanValido(c)) return "";
    const par = PARIDAD[Number(c[0])];
    let bits = "101";
    for (let i = 1; i <= 6; i++) bits += (par[i - 1] === "L" ? L : G)[Number(c[i])];
    bits += "01010";
    for (let i = 7; i <= 12; i++) bits += R[Number(c[i])];
    bits += "101";
    const margen = 11, ancho = bits.length + margen * 2, alto = 70;
    const guias = new Set([0, 1, 2, 45, 46, 47, 48, 49, 92, 93, 94]);
    let rects = "";
    for (let i = 0; i < bits.length; i++) {
      if (bits[i] === "1") rects += `<rect x="${i + margen}" y="4" width="1" height="${guias.has(i) ? 58 : 52}"/>`;
    }
    const txt = (x, t) => `<text x="${x}" y="68" font-size="9" font-family="monospace" text-anchor="middle">${t}</text>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ancho} ${alto}" shape-rendering="crispEdges" role="img" aria-label="Código de barras ${c}">` +
      `<rect width="100%" height="100%" fill="#fff"/><g fill="#000">${rects}</g>` +
      txt(5, c[0]) + txt(margen + 24, c.slice(1, 7)) + txt(margen + 70, c.slice(7)) + `</svg>`;
  }

  window.Codigos = { textoPedido, leerPedido, digitoEAN, eanValido, svgEAN13, limpio };
})();
