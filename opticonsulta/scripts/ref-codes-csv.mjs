// Lectura de archivos CSV de tablas de referencia (SISPRO, CIE-10, CUPS).
// Sin dependencias: maneja comillas, separador configurable y BOM.

/** Divide el texto CSV en filas de celdas. */
export function parseCsv(text, delimiter = ";") {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"' && cell === "") {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

const CODE_PATTERN = /^[A-Za-z0-9.\-]{1,12}$/;

/**
 * Convierte filas en códigos válidos. Devuelve también las filas rechazadas
 * con su motivo, para revisarlas antes de importar.
 */
export function toRefCodes(rows, { codeColumn = 0, labelColumn = 1, header = true } = {}) {
  const codes = [];
  const rejected = [];
  const seen = new Set();
  rows.slice(header ? 1 : 0).forEach((cells, index) => {
    const line = index + (header ? 2 : 1);
    const code = (cells[codeColumn] ?? "").trim();
    const label = (cells[labelColumn] ?? "").trim().replace(/\s+/g, " ");
    if (!CODE_PATTERN.test(code)) return rejected.push({ line, reason: `código no válido: "${code}"` });
    if (!label || label.length > 300) return rejected.push({ line, reason: "nombre vacío o de más de 300 caracteres" });
    if (seen.has(code)) return rejected.push({ line, reason: `código repetido: ${code}` });
    seen.add(code);
    codes.push({ code, label });
  });
  return { codes, rejected };
}
