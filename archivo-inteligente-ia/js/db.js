/* Archivo Inteligente IA — persistencia local con IndexedDB.
 * Solo para el prototipo con datos ficticios. Si IndexedDB no está disponible
 * (p. ej. algunos modos privados), se usa memoria y se avisa al usuario. */
(function () {
  'use strict';
  const AI = (window.AI = window.AI || {});
  const DB_NAME = 'archivo-inteligente-ia';
  const DB_VERSION = 1;
  const STORES = ['expedientes', 'transferencias', 'auditoria', 'acciones', 'config'];
  let db = null;
  let memory = null; // respaldo en memoria

  function open() {
    return new Promise((resolve) => {
      if (!('indexedDB' in window)) { memory = {}; return resolve('memory'); }
      let req;
      try { req = indexedDB.open(DB_NAME, DB_VERSION); } catch (e) { memory = {}; return resolve('memory'); }
      req.onupgradeneeded = () => {
        const d = req.result;
        STORES.forEach((s) => { if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: s === 'config' ? 'key' : 'id' }); });
      };
      req.onsuccess = () => { db = req.result; resolve('indexeddb'); };
      req.onerror = () => { memory = {}; resolve('memory'); };
      req.onblocked = () => { memory = {}; resolve('memory'); };
    });
  }
  const mem = (s) => (memory[s] = memory[s] || new Map());
  const keyOf = (s, v) => (s === 'config' ? v.key : v.id);

  function tx(store, mode, fn) {
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const os = t.objectStore(store);
      let result;
      Promise.resolve(fn(os)).then((r) => { result = r; });
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  }
  function getAll(store) {
    if (memory) return Promise.resolve(Array.from(mem(store).values()).map((v) => structuredClone(v)));
    return new Promise((resolve, reject) => {
      const r = db.transaction(store).objectStore(store).getAll();
      r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
    });
  }
  function putMany(store, values) {
    if (memory) { values.forEach((v) => mem(store).set(keyOf(store, v), structuredClone(v))); return Promise.resolve(); }
    return tx(store, 'readwrite', (os) => { values.forEach((v) => os.put(v)); });
  }
  const put = (store, value) => putMany(store, [value]);
  function del(store, key) {
    if (memory) { mem(store).delete(key); return Promise.resolve(); }
    return tx(store, 'readwrite', (os) => { os.delete(key); });
  }
  function clear(store) {
    if (memory) { mem(store).clear(); return Promise.resolve(); }
    return tx(store, 'readwrite', (os) => { os.clear(); });
  }
  const clearAll = () => Promise.all(STORES.map(clear));

  AI.db = { open, getAll, put, putMany, del, clear, clearAll, STORES, isMemory: () => !!memory };
})();
