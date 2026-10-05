// Exportación a archivos. CSV con BOM UTF-8 y separador ";" para que Excel en español
// lo abra con tildes y columnas correctas.

function celda(v) {
  if (v == null) return '';
  const s = String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function aCsv(columnas, filas) {
  const lineas = [columnas.map(c => celda(c.titulo)).join(';')];
  for (const f of filas) lineas.push(columnas.map(c => celda(c.valor(f))).join(';'));
  return '﻿' + lineas.join('\r\n');
}

/** Número sin separadores de miles y con coma decimal (formato de Excel en español). */
export const numeroCsv = (minimo, decimales) => (minimo / 10 ** decimales).toFixed(decimales).replace('.', ',');

export function descargar(nombre, contenido, tipo = 'text/csv;charset=utf-8') {
  const blob = contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
