import { useRef, useState } from 'react';
import { useStore } from '../store';
import { storage, parseProject } from '../projects/storage';
import { newProject } from '../projects/defaults';
import { generateLayout } from '../layout-engine/engine';
import { Icon, Logo } from './ui';

export type ExportTarget = 'sheet-png' | 'sheet-jpg' | 'sheet-pdf' | 'sheet-svg' | 'plan-png' | 'plan-svg' | 'json';

export function TopBar({ onExport }: { onExport: (t: ExportTarget) => Promise<void> }) {
  const project = useStore((s) => s.project);
  const dirty = useStore((s) => s.dirty);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const { setName, loadProject, markSaved, notify, undo, redo } = useStore.getState();
  const [menu, setMenu] = useState(false);
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = () => {
    if (storage.save(useStore.getState().project)) {
      markSaved();
      notify('Proyecto guardado en este navegador');
    } else notify('Este navegador no permite guardar aquí. Usa Exportar → Proyecto .json');
  };
  const createNew = () => {
    const cur = useStore.getState();
    if (cur.dirty && cur.project.rooms.length) storage.save(cur.project);
    const p = newProject('Proyecto nuevo');
    const res = generateLayout(p.site, p.program);
    loadProject({ ...p, rooms: res.rooms, openings: res.openings, furniture: res.furniture });
    notify(cur.dirty ? 'Se guardó el proyecto anterior y se creó uno nuevo' : 'Proyecto nuevo creado');
  };
  const duplicate = () => {
    const copy = storage.duplicate(useStore.getState().project);
    loadProject(copy);
    notify('Copia creada y abierta');
  };
  const doExport = async (t: ExportTarget) => {
    setMenu(false);
    setBusy(true);
    try {
      await onExport(t);
    } catch (e) {
      notify((e as Error).message || 'No se pudo exportar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark"><Logo /></div>
        <div>
          <div className="brand-name">ARQUIGEN 360</div>
          <div className="brand-sub">Planos paramétricos</div>
        </div>
      </div>
      <input id="project-name" className="project-name" aria-label="Nombre del proyecto" value={project.name} onChange={(e) => setName(e.target.value)} />
      <span className="dirty">{dirty ? <b>● Cambios sin guardar</b> : 'Guardado'}</span>
      <span className="spacer" />
      <div className="toolbar-group">
        <button className="btn ghost icon" type="button" onClick={undo} disabled={!canUndo} aria-label="Deshacer" title="Deshacer (Ctrl+Z)"><Icon name="undo" /></button>
        <button className="btn ghost icon" type="button" onClick={redo} disabled={!canRedo} aria-label="Rehacer" title="Rehacer (Ctrl+Y)"><Icon name="redo" /></button>
        <button className="btn" type="button" onClick={createNew}><Icon name="plus" /> Nuevo</button>
        <button className="btn" type="button" onClick={() => setModal(true)}><Icon name="folder" /> Proyectos</button>
        <button className="btn" type="button" onClick={duplicate}><Icon name="copy" /> Duplicar</button>
        <button className="btn" type="button" onClick={save}><Icon name="save" /> Guardar</button>
        <div className="menu-wrap">
          <button className="btn primary" type="button" aria-expanded={menu} onClick={() => setMenu((m) => !m)} disabled={busy}>
            <Icon name="download" /> {busy ? 'Exportando…' : 'Exportar'}
          </button>
          {menu && (
            <div className="menu" role="menu" onMouseLeave={() => setMenu(false)}>
              <div className="menu-label">Lámina A3</div>
              <button type="button" role="menuitem" onClick={() => doExport('sheet-pdf')}>PDF <small>A3 horizontal</small></button>
              <button type="button" role="menuitem" onClick={() => doExport('sheet-png')}>PNG <small>4200 px</small></button>
              <button type="button" role="menuitem" onClick={() => doExport('sheet-jpg')}>JPG <small>4200 px</small></button>
              <button type="button" role="menuitem" onClick={() => doExport('sheet-svg')}>SVG <small>vectorial</small></button>
              <hr />
              <div className="menu-label">Solo el plano</div>
              <button type="button" role="menuitem" onClick={() => doExport('plan-png')}>PNG <small>3000 px</small></button>
              <button type="button" role="menuitem" onClick={() => doExport('plan-svg')}>SVG <small>en metros</small></button>
              <hr />
              <button type="button" role="menuitem" onClick={() => doExport('json')}>Proyecto .json <small>para abrir luego</small></button>
            </div>
          )}
        </div>
      </div>
      {modal && <ProjectsModal onClose={() => setModal(false)} />}
    </header>
  );
}

function ProjectsModal({ onClose }: { onClose: () => void }) {
  const current = useStore((s) => s.project);
  const { loadProject, notify } = useStore.getState();
  const [list, setList] = useState(() => storage.list());
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const open = (id: string) => {
    const p = storage.get(id);
    if (p) {
      loadProject(p);
      notify(`Abierto: ${p.name}`);
      onClose();
    }
  };
  const importFile = async (file: File) => {
    try {
      const p = parseProject(await file.text());
      loadProject(p);
      storage.save(p);
      notify(`Importado: ${p.name}`);
      onClose();
    } catch (e) {
      notify((e as Error).message);
    }
  };

  return (
    <div className="backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="proj-title">
        <div className="modal-head">
          <h2 id="proj-title">Proyectos guardados</h2>
          <button className="btn ghost icon" type="button" onClick={onClose} aria-label="Cerrar"><Icon name="x" /></button>
        </div>
        <div className="modal-body">
          {list.length === 0 && <p className="empty">Aún no hay proyectos guardados en este navegador. Usa Guardar en la barra superior.</p>}
          {list.map((m) => (
            <div key={m.id} className={`proj-row ${m.id === current.id ? 'current' : ''}`}>
              <div>
                <b>{m.name}</b>
                <small>{m.site} · {m.rooms} ambientes · {new Date(m.updatedAt).toLocaleString('es-CO')}</small>
              </div>
              <div className="inspector-actions">
                {confirmId === m.id ? (
                  <>
                    <button className="btn small danger" type="button" onClick={() => { storage.remove(m.id); setList(storage.list()); setConfirmId(null); }}>Confirmar eliminación</button>
                    <button className="btn small" type="button" onClick={() => setConfirmId(null)}>Cancelar</button>
                  </>
                ) : (
                  <>
                    <button className="btn small" type="button" onClick={() => open(m.id)}>Abrir</button>
                    <button className="btn small ghost" type="button" onClick={() => { const p = storage.get(m.id); if (p) { storage.duplicate(p); setList(storage.list()); } }}>Duplicar</button>
                    <button className="btn small ghost danger" type="button" onClick={() => setConfirmId(m.id)} aria-label={`Eliminar ${m.name}`}><Icon name="trash" /></button>
                  </>
                )}
              </div>
            </div>
          ))}
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
          <button className="btn" type="button" onClick={() => fileRef.current?.click()}>Importar proyecto .json</button>
          <p className="hint">Los proyectos se guardan en este navegador. Para llevarlos a otro equipo, exporta el archivo .json.</p>
        </div>
      </div>
    </div>
  );
}
