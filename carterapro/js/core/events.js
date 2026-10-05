// Bus de eventos mínimo para desacoplar servicios y vistas.
const oyentes = new Map();

export function on(evento, fn) {
  if (!oyentes.has(evento)) oyentes.set(evento, new Set());
  oyentes.get(evento).add(fn);
  return () => oyentes.get(evento)?.delete(fn);
}

export function emit(evento, datos) {
  for (const fn of oyentes.get(evento) || []) {
    try { fn(datos); } catch (e) { console.error(e); }
  }
  if (evento !== '*') for (const fn of oyentes.get('*') || []) {
    try { fn(evento, datos); } catch (e) { console.error(e); }
  }
}
