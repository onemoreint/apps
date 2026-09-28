import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { getRepository, duplicateProject, exportBackup, importBackup, checkImportFile, type ProjectMeta } from '../projects/storage';
import { loadProject, checkProject } from '../schema/migrations';
import { LIMITS } from '../schema/projectSchema';
import { newProject } from '../projects/defaults';
import { generateLayout } from '../layout-engine/engine';
import { STATUS_TEXT } from '../projects/legal';
import { saveFile } from '../export/export';
import { Icon, Logo } from './ui';

export type ExportTarget = 'sheet-png' | 'sheet-jpg' | 'sheet-pdf' | 'sheet-svg' | 'plan-png' | 'plan-svg' | 'json';

export async function saveCurrent(): Promise<boolean> {
  const { project, markSaved, notify } = useStore.getState();
  const errs = checkProject(project);
  if (errs.length) {
    notify(`No se guardó: ${errs[0]}`);
    return false;
  }
  try {
    await (await getRepository()).save(project);
    markSaved();
    notify('Proyecto guardado en este navegador');
    return true;
  } catch {
    notify('Este navegador no permite guardar aquí. Usa Exportar → Proyecto .json');
    return false;
  }
}

export function TopBar({ onExport }: { onExport: (t: ExportTarget) => Promise<void> }) {
  const project = useStore((s) => s.project);
  const dirty = useStore((s) => s.dirty);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const { setName, loadProject: load, notify, undo, redo, setView } = useStore.getState();
  const [menu, setMenu] = useState(false);
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);

  const createNew = async () => {
    const cur = useStore.getState();
    if (cur.dirty && cur.project.rooms.length) await saveCurrent();
    const p = newProject('Proyecto nuevo');
    const res = generateLayout(p.site, p.program);
    load({ ...p, rooms: res.rooms, openings: res.openings, furniture: res.furniture });
    notify(cur.dirty ? 'Se guardó el proyecto anterior y se creó uno nuevo' : 'Proyecto nuevo creado');
  };
  const duplicate = async () => {
    try {
      const copy = await duplicateProject(useStore.getState().project);
      load(copy);
      notify('Copia creada y abierta');
    } catch {
      notify('No se pudo duplicar en este navegador.');
    }
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
      <input id="project-name" className="project-name" aria-label="Nombre del proyecto" maxLength={LIMITS.nameMax} value={project.name} onChange={(e) => setName(e.target.value)} />
      <button type="button" className="status-pill-top" onClick={() => setView('history')} title="Estado del documento">
        {STATUS_TEXT[project.metadata.status]} · v{project.versions.length + 1}
      </button>
      <span className="dirty">{dirty ? <b>● Cambios sin guardar</b> : 'Guardado'}</span>
      <span className="spacer" />
      <div className="toolbar-group">
        <button className="btn ghost icon" type="button" onClick={undo} disabled={!canUndo} aria-label="Deshacer" title="Deshacer (Ctrl+Z)"><Icon name="undo" /></button>
        <button className="btn ghost icon" type="button" onClick={redo} disabled={!canRedo} aria-label="Rehacer" title="Rehacer (Ctrl+Y)"><Icon name="redo" /></button>
        <button className="btn" type="button" onClick={createNew}><Icon name="plus" /> Nuevo</button>
        <button className="btn" type="button" onClick={() => setModal(true)}><Icon name="folder" /> Proyectos</button>
        <button className="btn" type="button" onClick={duplicate}><Icon name="copy" /> Duplicar</button>
        <button className="btn" type="button" onClick={() => void saveCurrent()}><Icon name="save" /> Guardar</button>
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
              <button type="button" role="menuitem" onClick={() => doExport('json')}>Proyecto .json <small>esquema 2.0.0</small></button>
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
  const { loadProject: load, notify, log } = useStore.getState();
  const [list, setList] = useState<ProjectMeta[] | null>(null);
  const [backend, setBackend] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; lines: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const backupRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    const repo = await getRepository();
    setBackend(repo.id === 'indexeddb' ? 'IndexedDB' : 'localStorage');
    setList(await repo.list());
  };
  useEffect(() => {
    refresh().catch(() => setList([]));
  }, []);

  const open = async (id: string) => {
    const r = await (await getRepository()).get(id);
    if (r?.ok && r.project) {
      load(r.project);
      notify(`Abierto: ${r.project.name}`);
      onClose();
    } else setMessage({ kind: 'err', lines: r?.errors ?? ['No se encontró el proyecto.'] });
  };

  const importFile = async (file: File) => {
    const err = checkImportFile(file, LIMITS.importBytes);
    if (err) return setMessage({ kind: 'err', lines: [err] });
    const r = loadProject(await file.text());
    if (!r.ok || !r.project) return setMessage({ kind: 'err', lines: r.errors });
    load(r.project);
    log({ actor: 'user', action: 'import', result: 'ok', detail: r.migratedFrom ? `esquema ${r.migratedFrom}` : undefined });
    await (await getRepository()).save(useStore.getState().project);
    notify(`Importado: ${r.project.name}`);
    await refresh();
    if (r.warnings.length) setMessage({ kind: 'ok', lines: r.warnings });
    else onClose();
  };

  const backup = async () => {
    const text = await exportBackup();
    await saveFile(`arquigen360-respaldo-${new Date().toISOString().slice(0, 10)}.json`, new Blob([text], { type: 'application/json' }));
  };
  const restore = async (file: File) => {
    const err = checkImportFile(file, 50 * 1024 * 1024);
    if (err) return setMessage({ kind: 'err', lines: [err] });
    try {
      const r = await importBackup(await file.text());
      setMessage({ kind: r.rejected.length ? 'err' : 'ok', lines: [`${r.restored} proyecto(s) restaurados.`, ...r.rejected.map((x) => `Rechazado: ${x}`)] });
      await refresh();
    } catch (e) {
      setMessage({ kind: 'err', lines: [(e as Error).message] });
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
          {message && (
            <div className={`note`} style={message.kind === 'err' ? { borderLeftColor: 'var(--err)', background: 'var(--err-soft)' } : undefined}>
              {message.lines.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}
          {list === null && <p className="hint">Cargando…</p>}
          {list?.length === 0 && <p className="empty">Aún no hay proyectos guardados en este navegador. Usa Guardar en la barra superior.</p>}
          {list?.map((m) => (
            <div key={m.id} className={`proj-row ${m.id === current.id ? 'current' : ''}`}>
              <div>
                <b>{m.name}</b>
                <small>{m.site} · {m.rooms} ambientes · {STATUS_TEXT[m.status]} · {new Date(m.updatedAt).toLocaleString('es-CO')}</small>
              </div>
              <div className="inspector-actions">
                {confirmId === m.id ? (
                  <>
                    <button className="btn small danger" type="button" onClick={async () => { await (await getRepository()).remove(m.id); setConfirmId(null); await refresh(); }}>Confirmar eliminación</button>
                    <button className="btn small" type="button" onClick={() => setConfirmId(null)}>Cancelar</button>
                  </>
                ) : (
                  <>
                    <button className="btn small" type="button" onClick={() => void open(m.id)}>Abrir</button>
                    <button className="btn small ghost" type="button" onClick={async () => { const r = await (await getRepository()).get(m.id); if (r?.project) { await duplicateProject(r.project); await refresh(); } }}>Duplicar</button>
                    <button className="btn small ghost danger" type="button" onClick={() => setConfirmId(m.id)} aria-label={`Eliminar ${m.name}`}><Icon name="trash" /></button>
                  </>
                )}
              </div>
            </div>
          ))}
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void importFile(f); }} />
          <input ref={backupRef} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void restore(f); }} />
          <div className="inspector-actions">
            <button className="btn" type="button" onClick={() => fileRef.current?.click()}>Importar proyecto .json</button>
            <button className="btn" type="button" onClick={() => void backup()}>Descargar respaldo completo</button>
            <button className="btn" type="button" onClick={() => backupRef.current?.click()}>Restaurar respaldo</button>
          </div>
          <p className="hint">
            Almacenamiento: {backend || '…'} de este navegador. Cada archivo importado se valida (tamaño máximo {LIMITS.importBytes / 1024 / 1024} MB, esquema y
            reglas de dominio) y los proyectos antiguos se actualizan al esquema 2.0.0 sin perder datos.
          </p>
        </div>
      </div>
    </div>
  );
}
