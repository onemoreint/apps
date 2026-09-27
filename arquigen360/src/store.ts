import { create } from 'zustand';
import type { FurnitureItem, Opening, Program, Project, Room, Site, StyleId } from './geometry/types';
import { generateLayout } from './layout-engine/engine';
import { newProject } from './projects/defaults';
import type { Selection } from './render/PlanSvg';
import { uid } from './utils/id';
import { furnishRoom } from './furniture/autoFurnish';

type Geometry = Pick<Project, 'rooms' | 'openings' | 'furniture'>;
export type View = 'plan' | 'axo' | 'sheet';

interface State {
  project: Project;
  selection: Selection;
  view: View;
  showFurniture: boolean;
  showDims: boolean;
  notes: string[];
  past: Geometry[];
  future: Geometry[];
  dirty: boolean;
  toast: string | null;

  setSite: (patch: Partial<Site>) => void;
  setProgram: (program: Program) => void;
  generate: (opts?: { keepSizes?: boolean }) => void;
  loadProject: (p: Project) => void;
  setName: (name: string) => void;
  setStyle: (s: StyleId) => void;
  setView: (v: View) => void;
  select: (s: Selection) => void;
  toggle: (k: 'showFurniture' | 'showDims') => void;
  markSaved: () => void;
  notify: (msg: string) => void;

  /** guarda un punto de deshacer antes de una edición */
  checkpoint: () => void;
  patch: (partial: Partial<Project>) => void;
  updateRoom: (id: string, patch: Partial<Room>) => void;
  updateRooms: (patches: { id: string; patch: Partial<Room> }[]) => void;
  addRoom: (room: Omit<Room, 'id'>) => string;
  deleteRoom: (id: string) => void;
  duplicateRoom: (id: string, at: { x: number; y: number }) => void;
  refurnishRoom: (id: string) => void;
  addOpening: (o: Omit<Opening, 'id'>) => void;
  updateOpening: (id: string, patch: Partial<Opening>) => void;
  deleteOpening: (id: string) => void;
  addFurniture: (f: Omit<FurnitureItem, 'id'>) => void;
  updateFurniture: (id: string, patch: Partial<FurnitureItem>) => void;
  deleteFurniture: (id: string) => void;
  undo: () => void;
  redo: () => void;
}

const geom = (p: Project): Geometry => ({ rooms: p.rooms, openings: p.openings, furniture: p.furniture });

function initialProject() {
  const p = newProject();
  const res = generateLayout(p.site, p.program);
  return { project: { ...p, rooms: res.rooms, openings: res.openings, furniture: res.furniture }, notes: res.notes };
}

const init = initialProject();

export const useStore = create<State>((set, get) => {
  const edit = (fn: (p: Project) => Partial<Project>) =>
    set((s) => ({ project: { ...s.project, ...fn(s.project), updatedAt: Date.now() }, dirty: true }));

  return {
    project: init.project,
    selection: null,
    view: 'plan',
    showFurniture: true,
    showDims: true,
    notes: init.notes,
    past: [],
    future: [],
    dirty: false,
    toast: null,

    setSite: (patch) => edit((p) => ({ site: { ...p.site, ...patch, setbacks: { ...p.site.setbacks, ...(patch.setbacks ?? {}) } } })),
    setProgram: (program) => edit(() => ({ program })),
    generate: (opts) => {
      const s = get();
      let program = s.project.program;
      if (opts?.keepSizes) {
        // las medidas actuales pasan a ser los mínimos del programa
        program = {
          ...program,
          rooms: program.rooms.map((spec) => {
            const r = s.project.rooms.find((x) => x.specId === spec.id);
            return r ? { ...spec, name: r.name, minWidth: r.width, minLength: r.length, minArea: +(r.width * r.length).toFixed(2) } : spec;
          }),
        };
      }
      const res = generateLayout(s.project.site, program);
      set({
        past: [...s.past, geom(s.project)].slice(-60),
        future: [],
        project: { ...s.project, program, rooms: res.rooms, openings: res.openings, furniture: res.furniture, updatedAt: Date.now() },
        notes: res.notes,
        selection: null,
        dirty: true,
      });
    },
    loadProject: (p) => set({ project: p, past: [], future: [], selection: null, notes: [], dirty: false }),
    setName: (name) => edit(() => ({ name })),
    setStyle: (style) => edit(() => ({ style })),
    setView: (view) => set({ view }),
    select: (selection) => set({ selection }),
    toggle: (k) => set((s) => ({ [k]: !s[k] }) as Partial<State>),
    markSaved: () => set({ dirty: false }),
    notify: (toast) => {
      set({ toast });
      window.setTimeout(() => get().toast === toast && set({ toast: null }), 2600);
    },

    checkpoint: () => set((s) => ({ past: [...s.past, geom(s.project)].slice(-60), future: [] })),
    patch: (partial) => edit(() => partial),
    updateRoom: (id, patch) => edit((p) => ({ rooms: p.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
    updateRooms: (patches) =>
      edit((p) => ({
        rooms: p.rooms.map((r) => {
          const m = patches.find((x) => x.id === r.id);
          return m ? { ...r, ...m.patch } : r;
        }),
      })),
    addRoom: (room) => {
      const id = uid();
      get().checkpoint();
      edit((p) => ({ rooms: [...p.rooms, { ...room, id }] }));
      set({ selection: { kind: 'room', id } });
      return id;
    },
    deleteRoom: (id) => {
      get().checkpoint();
      edit((p) => ({
        rooms: p.rooms.filter((r) => r.id !== id),
        openings: p.openings.filter((o) => o.roomId !== id),
        furniture: p.furniture.filter((f) => f.roomId !== id),
      }));
      set({ selection: null });
    },
    duplicateRoom: (id, at) => {
      const s = get();
      const src = s.project.rooms.find((r) => r.id === id);
      if (!src) return;
      s.checkpoint();
      const nid = uid();
      const copy: Room = { ...src, id: nid, specId: undefined, name: `${src.name} (copia)`, x: at.x, y: at.y };
      edit((p) => ({
        rooms: [...p.rooms, copy],
        openings: [...p.openings, ...p.openings.filter((o) => o.roomId === id).map((o) => ({ ...o, id: uid(), roomId: nid }))],
        furniture: [...p.furniture, ...p.furniture.filter((f) => f.roomId === id).map((f) => ({ ...f, id: uid(), roomId: nid }))],
      }));
      set({ selection: { kind: 'room', id: nid } });
    },
    refurnishRoom: (id) => {
      const s = get();
      const room = s.project.rooms.find((r) => r.id === id);
      if (!room) return;
      s.checkpoint();
      const items = furnishRoom(room, s.project.rooms, s.project.openings);
      edit((p) => ({ furniture: [...p.furniture.filter((f) => f.roomId !== id), ...items] }));
    },
    addOpening: (o) => {
      get().checkpoint();
      const id = uid();
      edit((p) => ({ openings: [...p.openings, { ...o, id }] }));
      set({ selection: { kind: 'opening', id } });
    },
    updateOpening: (id, patch) => edit((p) => ({ openings: p.openings.map((o) => (o.id === id ? { ...o, ...patch } : o)) })),
    deleteOpening: (id) => {
      get().checkpoint();
      edit((p) => ({ openings: p.openings.filter((o) => o.id !== id) }));
      set({ selection: null });
    },
    addFurniture: (f) => {
      get().checkpoint();
      const id = uid();
      edit((p) => ({ furniture: [...p.furniture, { ...f, id }] }));
      set({ selection: { kind: 'furniture', id } });
    },
    updateFurniture: (id, patch) => edit((p) => ({ furniture: p.furniture.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),
    deleteFurniture: (id) => {
      get().checkpoint();
      edit((p) => ({ furniture: p.furniture.filter((f) => f.id !== id) }));
      set({ selection: null });
    },
    undo: () => {
      const s = get();
      const prev = s.past[s.past.length - 1];
      if (!prev) return;
      set({ past: s.past.slice(0, -1), future: [geom(s.project), ...s.future], project: { ...s.project, ...prev }, selection: null, dirty: true });
    },
    redo: () => {
      const s = get();
      const next = s.future[0];
      if (!next) return;
      set({ future: s.future.slice(1), past: [...s.past, geom(s.project)], project: { ...s.project, ...next }, selection: null, dirty: true });
    },
  };
});
