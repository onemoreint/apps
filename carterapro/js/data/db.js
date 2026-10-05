// Acceso a IndexedDB. Única capa que conoce la base de datos.
const NOMBRE = 'carterapro';
const VERSION = 1;

export const STORES = ['clientes', 'creditos', 'cuotas', 'pagos', 'config', 'contadores', 'meta'];

/** Cambios de esquema por versión. Para evolucionar: añade un bloque `if (anterior < 2) {...}` y sube VERSION. */
function migrar(db, anterior) {
  if (anterior < 1) {
    const clientes = db.createObjectStore('clientes', { keyPath: 'id' });
    clientes.createIndex('documento', 'documento');
    clientes.createIndex('telefono', 'telefono');

    const creditos = db.createObjectStore('creditos', { keyPath: 'id' });
    creditos.createIndex('clienteId', 'clienteId');
    creditos.createIndex('numero', 'numero', { unique: true });

    const cuotas = db.createObjectStore('cuotas', { keyPath: 'id' });
    cuotas.createIndex('creditoId', 'creditoId');
    cuotas.createIndex('fechaVencimiento', 'fechaVencimiento');

    const pagos = db.createObjectStore('pagos', { keyPath: 'id' });
    pagos.createIndex('creditoId', 'creditoId');
    pagos.createIndex('clienteId', 'clienteId');
    pagos.createIndex('fecha', 'fecha');
    pagos.createIndex('numeroRecibo', 'numeroRecibo', { unique: true });

    db.createObjectStore('config', { keyPath: 'clave' });
    db.createObjectStore('contadores', { keyPath: 'clave' });
    db.createObjectStore('meta', { keyPath: 'clave' });
  }
}

let conexion;

export function abrir() {
  conexion ??= new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) {
      reject(new Error('Este navegador no permite guardar datos localmente.'));
      return;
    }
    const r = indexedDB.open(NOMBRE, VERSION);
    r.onupgradeneeded = e => migrar(r.result, e.oldVersion);
    r.onsuccess = () => {
      const db = r.result;
      db.onversionchange = () => { db.close(); location.reload(); };
      resolve(db);
    };
    r.onerror = () => { conexion = null; reject(r.error); };
    r.onblocked = () => reject(new Error('Cierra otras pestañas de CarteraPro y vuelve a intentarlo.'));
  });
  return conexion;
}

const pedir = r => new Promise((resolve, reject) => {
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => reject(r.error);
});

export async function todos(store) {
  const db = await abrir();
  return pedir(db.transaction(store).objectStore(store).getAll());
}

export async function uno(store, clave) {
  const db = await abrir();
  return pedir(db.transaction(store).objectStore(store).get(clave));
}

export async function porIndice(store, indice, valor) {
  const db = await abrir();
  return pedir(db.transaction(store).objectStore(store).index(indice).getAll(valor));
}

/**
 * Ejecuta varias operaciones de forma atómica: o se guardan todas o ninguna.
 * Dentro de fn solo se debe esperar (await) operaciones de `api`, no otras promesas.
 */
export async function transaccion(stores, fn) {
  const db = await abrir();
  const tx = db.transaction(stores, 'readwrite');
  const terminada = new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Operación cancelada'));
  });
  const api = {
    get: (s, k) => pedir(tx.objectStore(s).get(k)),
    put: (s, v) => pedir(tx.objectStore(s).put(v)),
    delete: (s, k) => pedir(tx.objectStore(s).delete(k)),
    clear: s => pedir(tx.objectStore(s).clear()),
    porIndice: (s, i, v) => pedir(tx.objectStore(s).index(i).getAll(v)),
    todos: s => pedir(tx.objectStore(s).getAll()),
    /** Consecutivo atómico: créditos #0001, recibos R-000001. */
    async siguiente(clave) {
      const actual = (await pedir(tx.objectStore('contadores').get(clave)))?.valor || 0;
      await pedir(tx.objectStore('contadores').put({ clave, valor: actual + 1 }));
      return actual + 1;
    },
  };
  let resultado;
  try {
    resultado = await fn(api);
  } catch (e) {
    try { tx.abort(); } catch { /* ya terminada */ }
    terminada.catch(() => {});
    throw e;
  }
  await terminada;
  return resultado;
}

export function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/** Pide al navegador que no borre los datos por falta de espacio (importante en iPhone). */
export async function solicitarPersistencia() {
  try {
    if (navigator.storage?.persisted && !(await navigator.storage.persisted())) {
      return await navigator.storage.persist();
    }
    return true;
  } catch {
    return false;
  }
}
