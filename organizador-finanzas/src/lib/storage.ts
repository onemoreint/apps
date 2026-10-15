// Guardado en el dispositivo (cifrado por perfil) y descarga de archivos.
import type { Estado } from './finance';
import { cargarDatos, guardarDatos, type KV, type Sesion } from './seguridad';

export type Destino = 'dispositivo' | 'memoria';

export interface Almacen {
  destino: Destino;
  cargar(): Promise<Estado | null>;
  guardar(e: Estado): Promise<void>;
}

export function almacenDeSesion(kv: KV, sesion: () => Sesion, destino: Destino): Almacen {
  let cola: Promise<void> = Promise.resolve();
  return {
    destino,
    cargar: () => cargarDatos(kv, sesion()),
    guardar(e) {
      // un guardado a la vez, en orden
      cola = cola.catch(() => undefined).then(() => guardarDatos(kv, sesion(), e));
      return cola;
    },
  };
}

/** Datos sin cifrar de la versión anterior (sin perfiles), si existen en este navegador. */
const LEGADO = 'finanzas-mensual:v1';
export function leerLegado(): Estado | null {
  try {
    const t = localStorage.getItem(LEGADO);
    return t ? (JSON.parse(t) as Estado) : null;
  } catch {
    return null;
  }
}
export function borrarLegado() {
  try {
    localStorage.removeItem(LEGADO);
  } catch {
    /* nada */
  }
}

type ClaudeRT = { use(name: string): Promise<unknown> };
function rt(): ClaudeRT | null {
  const c = (window as unknown as { claude?: ClaudeRT }).claude;
  return c && typeof c.use === 'function' ? c : null;
}

/** Descarga un archivo. Dentro de claude.ai usa la capacidad `downloads`; fuera, un enlace normal. */
export async function descargar(nombre: string, contenido: string): Promise<'ok' | 'cancelado' | 'no-disponible'> {
  const c = rt();
  if (c) {
    const dl = (await c.use('downloads')) as { save(r: { filename: string; data: string }): Promise<unknown> } | null;
    if (dl) {
      try {
        await dl.save({ filename: nombre, data: contenido });
        return 'ok';
      } catch (err) {
        return (err as { code?: string }).code === 'declined' ? 'cancelado' : 'no-disponible';
      }
    }
    return 'no-disponible';
  }
  const tipo = nombre.endsWith('.csv') ? 'text/csv' : nombre.endsWith('.txt') ? 'text/plain' : 'application/json';
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo + ';charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'ok';
}
