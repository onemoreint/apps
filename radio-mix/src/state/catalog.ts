import { create } from 'zustand';
import published from '@/data/catalog.json';
import type { Catalog, Category, Station } from '@/lib/types';
import { parseCatalog, isPlayable } from '@/lib/validate';
import { readJSON, removeKey, writeJSON } from '@/lib/storage';

const PUBLISHED = parseCatalog(published);

interface CatalogState {
  /** Catálogo publicado (el que ve todo el mundo; viene de src/data/catalog.json). */
  published: Catalog;
  /** Borrador del panel de administración, guardado solo en este navegador. */
  draft: Catalog | null;
  /** Si este navegador muestra el borrador en lugar del catálogo publicado (vista previa del dueño). */
  previewDraft: boolean;
  saveDraft: (c: Catalog) => void;
  discardDraft: () => void;
  setPreviewDraft: (v: boolean) => void;
}

export const useCatalogStore = create<CatalogState>((set) => ({
  published: PUBLISHED,
  draft: (() => {
    const d = readJSON<unknown>('draft', null);
    if (!d) return null;
    try {
      return parseCatalog(d);
    } catch {
      return null;
    }
  })(),
  previewDraft: readJSON<boolean>('previewDraft', false),
  saveDraft: (c) => {
    const next = { ...c, updatedAt: new Date().toISOString().slice(0, 10) };
    writeJSON('draft', next);
    set({ draft: next });
  },
  discardDraft: () => {
    removeKey('draft');
    removeKey('previewDraft');
    set({ draft: null, previewDraft: false });
  },
  setPreviewDraft: (v) => {
    writeJSON('previewDraft', v);
    set({ previewDraft: v });
  },
}));

/** Catálogo que se muestra en la interfaz. */
export function useCatalog(): Catalog {
  return useCatalogStore((s) => (s.previewDraft && s.draft ? s.draft : s.published));
}

export function sortedCategories(c: Catalog): Category[] {
  return c.categories.filter((x) => x.active).sort((a, b) => a.order - b.order);
}

export function stationsOf(c: Catalog, categoryId: string): Station[] {
  return c.stations.filter((s) => s.categoryId === categoryId && s.active);
}

/** Una categoría está "en vivo" solo si tiene al menos una emisora reproducible. */
export function categoryIsLive(c: Catalog, categoryId: string): boolean {
  return stationsOf(c, categoryId).some(isPlayable);
}

export function playableStations(c: Catalog): Station[] {
  const activeCats = new Set(c.categories.filter((x) => x.active).map((x) => x.id));
  return c.stations.filter((s) => activeCats.has(s.categoryId) && isPlayable(s));
}
