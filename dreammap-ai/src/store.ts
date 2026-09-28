import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BoardContent, DocumentFormat, Dream, ImageAsset, ImageReference } from './core/types';
import { FORMAT_CATALOG, formatFromCatalog } from './core/formats';
import { builtInAssets } from './providers/local';
import { blobStore, uid } from './providers/assets';

/* ───────────── Persistencia (IndexedDB, tolerante a fallos) ───────────── */

const DB = 'dreammap-ai';
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore('kv');
      r.result.createObjectStore('blobs');
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function idb<T>(store: 'kv' | 'blobs', mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest | void): Promise<T | undefined> {
  try {
    const db = await openDb();
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const req = fn(tx.objectStore(store));
      tx.oncomplete = () => resolve(req ? (req.result as T) : undefined);
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    return undefined;
  }
}

/* ───────────── Estado ───────────── */

export type Project = {
  content: BoardContent;
  templateId: string;
  format: DocumentFormat;
  /** Metadatos de imágenes del usuario (dispositivo, web, IA). Los blobs van aparte. */
  userAssets: Omit<ImageAsset, 'src'>[];
  aiEndpoint: string;
  preferences: string;
};

function dream(title: string, description: string, category: string, imageId?: string, location?: string): Dream {
  return { id: uid('dream'), title, description, category, imageId, location, focusX: 0.5, focusY: 0.5, references: [] };
}

export function sampleProject(): Project {
  const wallpaper = FORMAT_CATALOG.find((f) => f.id === 'dig-wallpaper')!;
  return {
    content: {
      projectName: 'Mi mapa de sueños 2027',
      title: 'Mi mapa de sueños',
      subtitle: '2027 · Lo que visualizo, lo construyo',
      words: ['Gratitud', 'Abundancia', 'Disciplina', 'Libertad'],
      dreams: [
        dream('Casa frente al mar', 'Quiero tener una casa moderna con piscina frente al mar', 'hogar', 'lib-hogar-0'),
        dream('Toyota Fortuner 2027', 'Quiero un Toyota Fortuner negro 2027', 'auto', 'lib-auto-0'),
        dream('Viajar a Japón', 'Viajar a Japón en primavera', 'viajes', 'lib-viajes-0', 'Japón'),
        dream('Correr una maratón', 'Correr mi primera maratón', 'salud', 'lib-salud-0'),
        dream('Libertad financiera', 'Lograr libertad financiera', 'dinero', 'lib-dinero-0'),
        dream('Mi empresa en 5 países', 'Expandir mi empresa a 5 países', 'negocio', 'lib-negocio-0'),
      ],
    },
    templateId: 'scrapbook',
    format: formatFromCatalog(wallpaper),
    userAssets: [],
    aiEndpoint: '',
    preferences: '',
  };
}

const LIBRARY = builtInAssets();

export function useProject() {
  const [project, setProject] = useState<Project>(sampleProject);
  const [userAssets, setUserAssets] = useState<ImageAsset[]>([]);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<number | undefined>(undefined);

  // Carga inicial
  useEffect(() => {
    (async () => {
      const saved = await idb<Project>('kv', 'readonly', (s) => s.get('project'));
      if (saved?.content) {
        const assets: ImageAsset[] = [];
        for (const meta of saved.userAssets ?? []) {
          const blob = await idb<Blob>('blobs', 'readonly', (s) => s.get(meta.id));
          if (blob) {
            blobStore.set(meta.id, blob);
            assets.push({ ...meta, src: URL.createObjectURL(blob) });
          }
        }
        setUserAssets(assets);
        setProject({ ...sampleProject(), ...saved });
      }
      setLoaded(true);
    })();
  }, []);

  // Guardado automático
  useEffect(() => {
    if (!loaded) return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const meta = userAssets.map(({ src: _src, ...m }) => m);
      idb('kv', 'readwrite', (s) => s.put({ ...project, userAssets: meta }, 'project'));
    }, 400);
  }, [project, userAssets, loaded]);

  const assets = useMemo(() => [...userAssets, ...LIBRARY], [userAssets]);
  const assetMap = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets]);

  const updateContent = useCallback((fn: (c: BoardContent) => BoardContent) => setProject((p) => ({ ...p, content: fn(p.content) })), []);
  const updateDream = useCallback((id: string, patch: Partial<Dream>) => updateContent((c) => ({ ...c, dreams: c.dreams.map((d) => (d.id === id ? { ...d, ...patch } : d)) })), [updateContent]);

  const actions = {
    setProject,
    updateContent,
    updateDream,
    setFormat: (f: DocumentFormat) => setProject((p) => ({ ...p, format: f })),
    setTemplate: (id: string) => setProject((p) => ({ ...p, templateId: id })),
    setAiEndpoint: (e: string) => setProject((p) => ({ ...p, aiEndpoint: e })),
    setPreferences: (e: string) => setProject((p) => ({ ...p, preferences: e })),
    addDream: () => {
      const d = dream('Nuevo sueño', '', 'otro');
      updateContent((c) => ({ ...c, dreams: [...c.dreams, d] }));
      return d.id;
    },
    removeDream: (id: string) => updateContent((c) => ({ ...c, dreams: c.dreams.filter((d) => d.id !== id) })),
    moveDream: (id: string, dir: -1 | 1) =>
      updateContent((c) => {
        const i = c.dreams.findIndex((d) => d.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= c.dreams.length) return c;
        const ds = [...c.dreams];
        [ds[i], ds[j]] = [ds[j], ds[i]];
        return { ...c, dreams: ds };
      }),
    addAsset: async (a: ImageAsset) => {
      setUserAssets((xs) => [a, ...xs.filter((x) => x.id !== a.id)]);
      const blob = blobStore.get(a.id);
      if (blob) await idb('blobs', 'readwrite', (s) => s.put(blob, a.id));
    },
    removeAsset: (id: string) => {
      setUserAssets((xs) => xs.filter((x) => x.id !== id));
      updateContent((c) => ({ ...c, dreams: c.dreams.map((d) => (d.imageId === id ? { ...d, imageId: undefined } : d)) }));
      idb('blobs', 'readwrite', (s) => s.delete(id));
    },
    addReference: (dreamId: string, ref: Omit<ImageReference, 'id' | 'createdAt'>) =>
      updateContent((c) => ({ ...c, dreams: c.dreams.map((d) => (d.id === dreamId ? { ...d, references: [...d.references, { ...ref, id: uid('ref'), createdAt: Date.now() }] } : d)) })),
    removeReference: (dreamId: string, refId: string) =>
      updateContent((c) => ({ ...c, dreams: c.dreams.map((d) => (d.id === dreamId ? { ...d, references: d.references.filter((r) => r.id !== refId) } : d)) })),
    reset: () => { setProject(sampleProject()); },
  };

  return { project, assets, assetMap, userAssets, loaded, actions };
}

export type ProjectApi = ReturnType<typeof useProject>;
