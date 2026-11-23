/* ==========================================================================
   Generador de códigos QR propio (sin librerías externas).
   Uso: QR.svg("texto", { margen: 4, color: "#0E3B2E" }) → texto SVG
   Soporta texto de hasta ~210 bytes (versiones 1 a 10, corrección nivel M).
   ========================================================================== */
(function () {
  "use strict";

  // Estructura de bloques para nivel M, versiones 1..10:
  // [códigos de corrección por bloque, [cantidad de bloques, datos por bloque], ...]
  const BLOQUES_M = [
    null,
    [10, [1, 16]],
    [16, [1, 28]],
    [26, [1, 44]],
    [18, [2, 32]],
    [24, [2, 43]],
    [16, [4, 27]],
    [18, [4, 31]],
    [22, [2, 38], [2, 39]],
    [22, [3, 36], [2, 37]],
    [26, [4, 43], [1, 44]]
  ];
  const ALINEACION = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
    [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

  /* ---- Aritmética en GF(256) para Reed-Solomon ---- */
  const EXP = new Array(512), LOG = new Array(256);
  (function () {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      EXP[i] = x; LOG[x] = i;
      x <<= 1; if (x & 0x100) x ^= 0x11D;
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();
  const mult = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];

  function polinomioGenerador(grado) {
    let g = [1];
    for (let i = 0; i < grado; i++) {
      const n = new Array(g.length + 1).fill(0);
      for (let j = 0; j < g.length; j++) {
        n[j] ^= g[j];
        n[j + 1] ^= mult(g[j], EXP[i]);
      }
      g = n;
    }
    return g;
  }

  function correccion(datos, grado) {
    const gen = polinomioGenerador(grado);
    const res = new Array(grado).fill(0);
    for (const d of datos) {
      const factor = d ^ res.shift();
      res.push(0);
      for (let i = 0; i < grado; i++) res[i] ^= mult(gen[i + 1], factor);
    }
    return res;
  }

  /* ---- Codificación de datos (modo byte, UTF-8) ---- */
  function bytesUTF8(texto) {
    return Array.from(new TextEncoder().encode(texto));
  }

  function capacidadDatos(v) {
    const b = BLOQUES_M[v];
    return b.slice(1).reduce((s, [n, k]) => s + n * k, 0);
  }

  function codificar(bytes, v) {
    const bits = [];
    const poner = (valor, largo) => { for (let i = largo - 1; i >= 0; i--) bits.push((valor >>> i) & 1); };
    poner(0b0100, 4);
    poner(bytes.length, v < 10 ? 8 : 16);
    bytes.forEach((b) => poner(b, 8));
    const total = capacidadDatos(v) * 8;
    poner(0, Math.min(4, total - bits.length));
    while (bits.length % 8) bits.push(0);
    const palabras = [];
    for (let i = 0; i < bits.length; i += 8) palabras.push(parseInt(bits.slice(i, i + 8).join(""), 2));
    for (let p = 0xEC; palabras.length < capacidadDatos(v); p ^= 0xEC ^ 0x11) palabras.push(p);

    // Dividir en bloques, calcular corrección e intercalar
    const [ecc, ...grupos] = BLOQUES_M[v];
    const bloques = [];
    let k = 0;
    grupos.forEach(([n, largo]) => {
      for (let i = 0; i < n; i++) { bloques.push(palabras.slice(k, k + largo)); k += largo; }
    });
    const correcciones = bloques.map((b) => correccion(b, ecc));
    const salida = [];
    const maxLargo = Math.max(...bloques.map((b) => b.length));
    for (let i = 0; i < maxLargo; i++) bloques.forEach((b) => { if (i < b.length) salida.push(b[i]); });
    for (let i = 0; i < ecc; i++) correcciones.forEach((c) => salida.push(c[i]));
    return salida;
  }

  /* ---- Construcción de la matriz ---- */
  function generar(texto) {
    const bytes = bytesUTF8(texto);
    let v = 1;
    while (v <= 10 && bytes.length + (v < 10 ? 2 : 3) > capacidadDatos(v)) v++;
    if (v > 10) throw new Error("Texto demasiado largo para el QR");

    const tam = v * 4 + 17;
    const m = Array.from({ length: tam }, () => new Array(tam).fill(false));
    const fija = Array.from({ length: tam }, () => new Array(tam).fill(false));
    const poner = (x, y, oscuro) => { m[y][x] = oscuro; fija[y][x] = true; };

    // Patrones de temporización
    for (let i = 0; i < tam; i++) { poner(6, i, i % 2 === 0); poner(i, 6, i % 2 === 0); }
    // Patrones de búsqueda (esquinas) con separador
    const buscador = (cx, cy) => {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= tam || y >= tam) continue;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        poner(x, y, d !== 2 && d !== 4);
      }
    };
    buscador(3, 3); buscador(tam - 4, 3); buscador(3, tam - 4);
    // Patrones de alineación
    const pos = ALINEACION[v];
    pos.forEach((ay, i) => pos.forEach((ax, j) => {
      const esquina = (i === 0 && j === 0) || (i === 0 && j === pos.length - 1) || (i === pos.length - 1 && j === 0);
      if (esquina) return;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        poner(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }));
    // Reservar zonas de formato y versión
    dibujarFormato(m, poner, tam, 0);
    if (v >= 7) dibujarVersion(poner, tam, v);

    // Colocar los datos en zigzag
    const datos = codificar(bytes, v);
    let i = 0;
    for (let der = tam - 1; der >= 1; der -= 2) {
      if (der === 6) der = 5;
      for (let vert = 0; vert < tam; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = der - j;
          const subiendo = ((der + 1) & 2) === 0;
          const y = subiendo ? tam - 1 - vert : vert;
          if (fija[y][x]) continue;
          m[y][x] = i < datos.length * 8 ? ((datos[i >>> 3] >>> (7 - (i & 7))) & 1) === 1 : false;
          i++;
        }
      }
    }

    // Elegir la máscara con menor penalización
    let mejor = null, mejorPuntaje = Infinity;
    for (let mascara = 0; mascara < 8; mascara++) {
      const copia = m.map((f) => f.slice());
      aplicarMascara(copia, fija, mascara, tam);
      dibujarFormato(copia, (x, y, o) => { copia[y][x] = o; }, tam, mascara);
      const p = penalizacion(copia, tam);
      if (p < mejorPuntaje) { mejorPuntaje = p; mejor = copia; }
    }
    return mejor;
  }

  function aplicarMascara(m, fija, mascara, tam) {
    const f = [
      (x, y) => (x + y) % 2 === 0,
      (x, y) => y % 2 === 0,
      (x, y) => x % 3 === 0,
      (x, y) => (x + y) % 3 === 0,
      (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
      (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
      (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0,
      (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0
    ][mascara];
    for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) {
      if (!fija[y][x] && f(x, y)) m[y][x] = !m[y][x];
    }
  }

  function dibujarFormato(m, poner, tam, mascara) {
    const datos = (0 << 3) | mascara; // nivel M = 00
    let r = datos;
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const bits = ((datos << 10) | r) ^ 0x5412;
    const bit = (i) => ((bits >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) poner(8, i, bit(i));
    poner(8, 7, bit(6)); poner(8, 8, bit(7)); poner(7, 8, bit(8));
    for (let i = 9; i < 15; i++) poner(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) poner(tam - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) poner(8, tam - 15 + i, bit(i));
    poner(8, tam - 8, true);
  }

  function dibujarVersion(poner, tam, v) {
    let r = v;
    for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
    const bits = (v << 12) | r;
    for (let i = 0; i < 18; i++) {
      const b = ((bits >>> i) & 1) === 1;
      const a = tam - 11 + (i % 3), c = Math.floor(i / 3);
      poner(a, c, b); poner(c, a, b);
    }
  }

  function penalizacion(m, tam) {
    let p = 0, oscuros = 0;
    for (let y = 0; y < tam; y++) {
      for (let x = 0; x < tam; x++) {
        if (m[y][x]) oscuros++;
        if (x < tam - 1 && y < tam - 1) {
          const c = m[y][x];
          if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3;
        }
      }
    }
    for (let k = 0; k < 2; k++) for (let a = 0; a < tam; a++) {
      let racha = 1;
      for (let b = 1; b < tam; b++) {
        const actual = k ? m[b][a] : m[a][b];
        const previo = k ? m[b - 1][a] : m[a][b - 1];
        if (actual === previo) { racha++; if (racha === 5) p += 3; else if (racha > 5) p++; }
        else racha = 1;
      }
    }
    p += Math.floor(Math.abs(oscuros * 20 - tam * tam * 10) / (tam * tam)) * 10;
    return p;
  }

  function svg(texto, opciones = {}) {
    const margen = opciones.margen ?? 4;
    const color = opciones.color || "#000";
    const m = generar(texto);
    const tam = m.length, total = tam + margen * 2;
    let ruta = "";
    for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) {
      if (m[y][x]) ruta += `M${x + margen},${y + margen}h1v1h-1z`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img" aria-label="Código QR">` +
      `<rect width="100%" height="100%" fill="#fff"/><path d="${ruta}" fill="${color}"/></svg>`;
  }

  window.QR = { svg, matriz: generar };
})();
