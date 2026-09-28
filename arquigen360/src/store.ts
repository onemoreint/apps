import { create } from 'zustand';
import type { AuditEvent, DocStatus, FurnitureItem, Jurisdiction, Opening, Program, Project, ProjectSnapshot, Room, Site, StyleId } from './geometry/types';
import { runCommands, type Actor, type CommandResult } from './commands/commands';
import { LIMITS } from './schema/projectSchema';
import { sanitizeText } from './schema/migrations';
import { generateLayout } from './layout-engine/engine';
import { newProject } from './projects/defaults';
import type { Selection } from './render/PlanSvg';
import { uid } from './utils/id';
import { furnishRoom } from './furniture/autoFurnish';

type Geometry = Pick<Project, 'rooms' | 'openings' | 'furniture'>;
export type View = 'plan' | 'axo' | 'sheet' | 'compliance' | 'history';

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

  /** registro de auditoría dentro del proyecto (modo local) */
  log: (e: Omit<AuditEvent, 'id' | 'timestamp' | 'projectId'>) => void;
  /** única vía para cambios propuestos por IA u orígenes externos */
  applyCommands: (commands: unknown[], actor: Actor) => CommandResult[];
  setJurisdiction: (patch: Partial<Jurisdiction>) => void;
  setStatus: (status: DocStatus) => void;
  setAuthor: (author: string) => void;
  saveVersion: (name: string) => boolean;
  restoreVersion: (id: string) => void;
  deleteVersion: (id: string) => void;
}

export const snapshotOf = (p: Project): ProjectSnapshot => structuredClone({
  site: p.site, program: p.program, rooms: p.rooms, openings: p.openings, furniture: p.furniture, style: p.style,
});

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
      get().log({ actor: 'user', action: opts?.keepSizes ? 'regenerate_keep_sizes' : 'generate', result: 'ok', detail: `${res.rooms.length} ambientes` });
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

    checkpoint: () => {
      set((s) => ({ past: [...s.past, geom(s.project)].slice(-60), future: [] }));
      const sel = get().selection;
      get().log({ actor: 'user', action: 'edit', entityId: sel?.id, result: 'ok' });
    },
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
      get().log({ actor: 'user', action: 'add_space', entityId: id, result: 'ok', detail: room.name });
      set({ selection: { kind: 'room', id } });
      return id;
    },
    deleteRoom: (id) => {
      const name = get().project.rooms.find((r) => r.id === id)?.name;
      get().checkpoint();
      get().log({ actor: 'user', action: 'delete_space', entityId: id, result: 'ok', detail: name });
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

    log: (e) =>
      set((s) => {
        const ev: AuditEvent = { ...e, id: uid(), timestamp: new Date().toISOString(), projectId: s.project.id, detail: e.detail ? sanitizeText(e.detail, 400) : undefined };
        return { project: { ...s.project, audit: [...(s.project.audit ?? []), ev].slice(-LIMITS.audit) } };
      }),
    applyCommands: (commands, actor) => {
      const s = get();
      const { project, results } = runCommands(s.project, commands, actor);
      const okCount = results.filter((r) => r.ok).length;
      if (okCount) {
        set({ past: [...s.past, geom(s.project)].slice(-60), future: [], project, dirty: true, selection: null });
      }
      for (const r of results) {
        const c = r.command as { command?: string; targetId?: string };
        get().log({ actor, action: `command:${String(c?.command ?? 'desconocido').slice(0, 40)}`, entityId: typeof c?.targetId === 'string' ? c.targetId.slice(0, 64) : undefined, result: r.ok ? 'ok' : 'rejected', detail: r.ok ? r.summary : `${r.stage}: ${r.reason}` });
      }
      return results;
    },
    setJurisdiction: (patch) => edit((p) => ({ jurisdiction: { ...p.jurisdiction, ...patch } })),
    setStatus: (status) => {
      const before = get().project.metadata.status;
      if (before === status) return;
      edit((p) => ({ metadata: { ...p.metadata, status } }));
      get().log({ actor: 'user', action: 'status_change', result: 'ok', before, after: status });
    },
    setAuthor: (author) => edit((p) => ({ metadata: { ...p.metadata, author } })),
    saveVersion: (name) => {
      const p = get().project;
      if (p.versions.length >= LIMITS.versions) return false;
      const v = { id: uid(), name: sanitizeText(name) || `Versión ${p.versions.length + 1}`, createdAt: new Date().toISOString(), snapshot: snapshotOf(p) };
      edit((q) => ({ versions: [...q.versions, v] }));
      get().log({ actor: 'user', action: 'version_save', entityId: v.id, result: 'ok', detail: v.name });
      return true;
    },
    restoreVersion: (id) => {
      const s = get();
      const v = s.project.versions.find((x) => x.id === id);
      if (!v) return;
      set({ past: [...s.past, geom(s.project)].slice(-60), future: [], selection: null });
      edit(() => structuredClone(v.snapshot));
      get().log({ actor: 'user', action: 'version_restore', entityId: id, result: 'ok', detail: v.name });
    },
    deleteVersion: (id) => {
      const v = get().project.versions.find((x) => x.id === id);
      edit((p) => ({ versions: p.versions.filter((x) => x.id !== id) }));
      get().log({ actor: 'user', action: 'version_delete', entityId: id, result: 'ok', detail: v?.name });
    },
  };
});
