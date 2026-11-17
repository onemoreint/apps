// Normalización de teléfonos colombianos para evitar clientas duplicadas.
// Resultado: E.164 sin '+', ej. '573017298948'. Devuelve null si no es válido.
export function normalizePhone(input: string): string | null {
  const digits = (input || '').replace(/\D/g, '')
  if (!digits) return null
  let d = digits
  if (d.startsWith('00')) d = d.slice(2)
  // Celular colombiano: 10 dígitos que empiezan por 3
  if (d.length === 10 && d.startsWith('3')) return '57' + d
  if (d.length === 12 && d.startsWith('573')) return d
  // Fijo nacional con indicativo 60X (10 dígitos)
  if (d.length === 10 && d.startsWith('60')) return '57' + d
  if (d.length === 12 && d.startsWith('5760')) return d
  // Otros países: aceptar E.164 razonable (8–15 dígitos) si no parece colombiano
  if (input.trim().startsWith('+') && !d.startsWith('57') && d.length >= 8 && d.length <= 15) return d
  return null
}

/** '573017298948' → '+57 301 729 8948' */
export function formatPhone(e164: string): string {
  if (e164.startsWith('57') && e164.length === 12) {
    const n = e164.slice(2)
    return `+57 ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`
  }
  return '+' + e164
}
