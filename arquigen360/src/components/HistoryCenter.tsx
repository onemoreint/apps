import { useState } from 'react';
import { snapshotOf, useStore } from '../store';
import { diffSnapshots } from '../projects/versions';
import { duplicateProject } from '../projects/storage';
import { STATUS_HELP, STATUS_TEXT, LEGAL_NOTICE } from '../projects/legal';
import { LIMITS } from '../schema/projectSchema';
import type { DocStatus } from '../geometry/types';
import { StatusStrip } from './ComplianceCenter';

const STATUSES: DocStatus[] = ['BORRADOR', 'PREVALIDACION', 'REVISION_PROFESIONAL', 'APROBADO_POR_USUARIO'];

export function HistoryCenter() {
  const project = useStore((s) => s.project);
  const { saveVersion, restoreVersion, deleteVersion, setStatus, setAuthor, notify, loadProject } = useStore.getState();
  const [name, setName] = useState('');
  const [compareId, setCompareId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; action: 'restore' | 'delete' } | null>(null);
  const cmp = project.versions.find((v) => v.id === compareId);
  const diff = cmp ? diffSnapshots(cmp.snapshot, snapshotOf(project)) : null;

  const save = () => {
    if (saveVersion(name)) {
      notify('Versión guardada en el proyecto');
      setName('');
    } else notify(`Máximo ${LIMITS.versions} versiones por proyecto. Elimina alguna.`);
  };

  return (
    <div className="doc-page">
      <header>
        <h2>Historial y estado del proyecto</h2>
        <p className="doc-lead">{project.name} · Versión {project.versions.length + 1} (actual) · Esquema {project.schemaVersion}</p>
      </header>
      <StatusStrip />

      <section className="section">
        <h3>Estado del documento</h3>
        <div className="row-inline">
          <label className="field" htmlFor="doc-status">
            <span>Estado</span>
            <select id="doc-status" className="select" value={project.metadata.status} onChange={(e) => setStatus(e.target.value as DocStatus)}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_TEXT[s]}</option>)}
            </select>
          </label>
          <label className="field" htmlFor="doc-author">
            <span>Autor o responsable</span>
            <input id="doc-author" className="input" maxLength={LIMITS.nameMax} value={project.metadata.author} placeholder="Nombre del profesional o empresa" onChange={(e) => setAuthor(e.target.value)} />
          </label>
        </div>
        <p className="hint">{STATUS_HELP[project.metadata.status]} «Aprobado para construcción» no es un estado disponible: requiere un proceso profesional fuera de ARQUIGEN.</p>
      </section>

      <section className="section">
        <h3>Versiones ({project.versions.length}/{LIMITS.versions})</h3>
        <div className="row-inline">
          <label className="field" htmlFor="ver-name">
            <span>Nombre de la versión</span>
            <input id="ver-name" className="input" maxLength={LIMITS.nameMax} value={name} placeholder={`Versión ${project.versions.length + 1} · propuesta al cliente`} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
          </label>
          <button className="btn primary" type="button" onClick={save}>Guardar versión</button>
        </div>
        {project.versions.length === 0 && <p className="empty">Aún no hay versiones. Guarda una antes de hacer cambios grandes para poder volver a ella.</p>}
        {[...project.versions].reverse().map((v, i) => (
          <div key={v.id} className="ver-row">
            <div>
              <b>v{project.versions.length - i} · {v.name}</b>
              <small>{new Date(v.createdAt).toLocaleString('es-CO')} · {v.snapshot.rooms.length} ambientes · terreno {v.snapshot.site.width} × {v.snapshot.site.length} m</small>
            </div>
            <div className="inspector-actions">
              {confirm?.id === v.id ? (
                <>
                  <button className="btn small danger" type="button" onClick={() => {
                    if (confirm.action === 'restore') { restoreVersion(v.id); notify(`Restaurada: ${v.name} (puedes deshacer)`); } else deleteVersion(v.id);
                    setConfirm(null);
                    if (compareId === v.id) setCompareId(null);
                  }}>{confirm.action === 'restore' ? 'Confirmar restaurar' : 'Confirmar eliminar'}</button>
                  <button className="btn small" type="button" onClick={() => setConfirm(null)}>Cancelar</button>
                </>
              ) : (
                <>
                  <button className="btn small" type="button" onClick={() => setCompareId(compareId === v.id ? null : v.id)} aria-pressed={compareId === v.id}>Comparar</button>
                  <button className="btn small" type="button" onClick={() => setConfirm({ id: v.id, action: 'restore' })}>Restaurar</button>
                  <button className="btn small ghost" type="button" onClick={async () => {
                    const p = { ...structuredClone(project), ...structuredClone(v.snapshot), name: `${project.name} · ${v.name}`, versions: [], audit: [] };
                    try { const c = await duplicateProject(p); loadProject(c); notify('Versión duplicada como proyecto nuevo'); } catch { notify('No se pudo duplicar.'); }
                  }}>Duplicar</button>
                  <button className="btn small ghost danger" type="button" onClick={() => setConfirm({ id: v.id, action: 'delete' })}>Eliminar</button>
                </>
              )}
            </div>
          </div>
        ))}
        {diff && cmp && (
          <div className="table-scroll">
            <table className="diff">
              <thead><tr><th colSpan={3}>Comparación: «{cmp.name}» → actual</th></tr></thead>
              <tbody>
                <tr><td>Área construida</td><td className="n">{diff.builtBefore.toFixed(2)} m²</td><td className="n">{diff.builtAfter.toFixed(2)} m²</td></tr>
                <tr><td>Terreno</td><td colSpan={2}>{diff.siteChanged ? 'Cambió' : 'Sin cambios'}</td></tr>
                <tr><td>Estilo</td><td colSpan={2}>{diff.styleChanged ? 'Cambió' : 'Sin cambios'}</td></tr>
                <tr><td>Aberturas / muebles</td><td colSpan={2}>{diff.openingsDelta >= 0 ? '+' : ''}{diff.openingsDelta} / {diff.furnitureDelta >= 0 ? '+' : ''}{diff.furnitureDelta}</td></tr>
                {diff.added.map((n) => <tr key={`a${n}`}><td className="add">+ {n}</td><td colSpan={2}>Agregado</td></tr>)}
                {diff.removed.map((n) => <tr key={`r${n}`}><td className="del">− {n}</td><td colSpan={2}>Eliminado</td></tr>)}
                {diff.changed.map((c) => <tr key={`c${c.name}`}><td className="chg">~ {c.name}</td><td className="n">{c.before}</td><td className="n">{c.after}</td></tr>)}
                {!diff.added.length && !diff.removed.length && !diff.changed.length && <tr><td colSpan={3}>Los ambientes no cambiaron.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="section">
        <h3>Auditoría (últimos {Math.min(project.audit.length, 200)} de {project.audit.length} eventos)</h3>
        {project.audit.length === 0 ? <p className="empty">Sin eventos todavía.</p> : (
          <div className="audit" role="log">
            {[...project.audit].reverse().slice(0, 200).map((e) => (
              <div key={e.id} className={e.result !== 'ok' ? 'rej' : undefined}>
                {new Date(e.timestamp).toLocaleString('es-CO')} · {e.actor === 'ai' ? 'IA' : e.actor === 'system' ? 'Sistema' : 'Usuario'} · {e.action}{e.result !== 'ok' ? ` · ${e.result.toUpperCase()}` : ''}{e.detail ? ` · ${e.detail}` : ''}
              </div>
            ))}
          </div>
        )}
        <p className="hint">En modo local el registro se guarda dentro del proyecto. Un registro de auditoría confiable requiere un servidor (fase D).</p>
      </section>

      <p className="legal">{LEGAL_NOTICE}</p>
    </div>
  );
}
