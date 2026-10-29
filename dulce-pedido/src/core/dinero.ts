/** Formato de pesos colombianos: separador de miles con punto, sin decimales. "$45.000". */
export function cop(valor: number): string {
  const n = Math.round(Number.isFinite(valor) ? valor : 0);
  const signo = n < 0 ? '-' : '';
  const miles = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${signo}$${miles}`;
}

/** "$45.000 COP" — formato del mensaje de WhatsApp. */
export function copConMoneda(valor: number): string {
  return `${cop(valor)} COP`;
}

/** Convierte lo que escribe la vendedora ("45.000", "$ 45000", "45,000") a entero. */
export function leerPesos(texto: string): number | null {
  const limpio = texto.replace(/[^\d]/g, '');
  if (!limpio) return null;
  const n = Number(limpio);
  return Number.isSafeInteger(n) ? n : null;
}
