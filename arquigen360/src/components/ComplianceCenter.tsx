import { useMemo } from 'react';
import { useStore } from '../store';
import { evaluateCompliance, FRAMEWORKS, groupStatus, RULESET_VERSION, STATUS_GROUPS, STATUS_LABEL, type ValidationStatus } from '../normative-engine';
import { LEGAL_NOTICE, STATUS_TEXT } from '../projects/legal';

const ICON: Record<ValidationStatus, string> = { PASS: '✓', WARNING: '⚠', FAIL: '✕', NOT_EVALUATED: '○', NOT_APPLICABLE: '–', UNVERIFIED: '?' };

export function StatusStrip() {
  const project = useStore((s) => s.project);
  const report = useMemo(() => evaluateCompliance(project), [project]);
  return (
    <div className="status-strip" aria-label="Estado del proyecto">
      {STATUS_GROUPS.map((g) => {
        const st = groupStatus(report, g.key);
        return (
          <span key={g.label} className={`status-chip ${st}`} title={STATUS_LABEL[st]}>
            <i aria-hidden="true">{ICON[st]}</i>{g.label}
          </span>
        );
      })}
    </div>
  );
}

export function ComplianceCenter() {
  const project = useStore((s) => s.project);
  const { select, setView } = useStore.getState();
  const report = useMemo(() => evaluateCompliance(project), [project]);
  const j = project.jurisdiction;
  const evaluated = report.items.filter((i) => ['PASS', 'WARNING', 'FAIL'].includes(i.result.status));
  const pending = report.items.filter((i) => !['PASS', 'WARNING', 'FAIL'].includes(i.result.status));
  const nameOf = (id: string) => project.rooms.find((r) => r.id === id)?.name ?? id;

  const RuleItem = ({ item }: { item: (typeof report.items)[number] }) => {
    const { rule, result } = item;
    return (
      <details className="rule">
        <summary>
          <span className={`status-badge ${result.status}`}>{result.status}</span>
          <span><b>{rule.title}</b> — {result.message}</span>
          <small>{rule.id}</small>
        </summary>
        <div className="rule-body">
          <div>
            <h3>Regla</h3>
            <p>{rule.requirement}</p>
          </div>
          <div>
            <h3>Fuente</h3>
            <dl className="rule-meta">
              <dt>Documento</dt><dd>{rule.sourceDocument}</dd>
              <dt>Autoridad</dt><dd>{rule.authority}</dd>
              <dt>Jurisdicción</dt><dd>{rule.jurisdiction}</dd>
              <dt>Versión</dt><dd>{rule.version}</dd>
              <dt>Estado</dt><dd>{rule.status === 'active' ? 'Activa' : rule.status === 'unverified' ? 'NO VERIFICADA' : rule.status}</dd>
              <dt>Tipo</dt><dd>{rule.sourceKind === 'official' ? 'Norma oficial' : rule.sourceKind === 'user_input' ? 'Parámetro del usuario' : 'Criterio interno (no normativo)'}</dd>
              <dt>Actualizada</dt><dd>{rule.updatedAt}</dd>
              {rule.sourceUrl && (<><dt>Enlace</dt><dd><a href={rule.sourceUrl} target="_blank" rel="noreferrer">{rule.sourceUrl}</a></dd></>)}
            </dl>
          </div>
          <div className="full">
            <h3>Explicación</h3>
            <p>{result.explanation || STATUS_LABEL[result.status]}</p>
            {result.findings.length > 0 && <ul>{result.findings.map((f, i) => <li key={i}>{f}</li>)}</ul>}
          </div>
          {result.affectedIds.length > 0 && (
            <div className="full">
              <h3>Elementos afectados</h3>
              <div className="chips">
                {result.affectedIds.map((id) => (
                  <button key={id} type="button" className="chip" onClick={() => { select({ kind: 'room', id }); setView('plan'); }}>{nameOf(id)}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </details>
    );
  };

  return (
    <div className="doc-page">
      <header>
        <h2>Normativa y cumplimiento</h2>
        <p className="doc-lead">
          {project.name} · Estado: {STATUS_TEXT[project.metadata.status]} · Reglas {RULESET_VERSION} · Evaluado {new Date(report.evaluatedAt).toLocaleString('es-CO')}
        </p>
      </header>

      <StatusStrip />

      <section className="section">
        <h3>Jurisdicción</h3>
        <dl className="juris">
          <div><dt>País</dt><dd>Colombia</dd></div>
          <div><dt>Departamento</dt><dd>{j.department || 'Sin definir'}</dd></div>
          <div><dt>Municipio</dt><dd>{j.municipality || 'Sin definir'}</dd></div>
          <div><dt>Instrumento</dt><dd>{j.planningInstrument || 'Sin definir'}</dd></div>
          <div><dt>Zona / tratamiento</dt><dd>{j.zone || 'Sin definir'}</dd></div>
        </dl>
        <p className="hint">Se edita en «Terreno → Jurisdicción».</p>
      </section>

      <section className="section">
        <h3>Reglas evaluadas ({evaluated.length}) · {report.counts.FAIL} incumplimientos · {report.counts.WARNING} advertencias</h3>
        <div className="rule-list">{evaluated.map((it) => <RuleItem key={it.rule.id} item={it} />)}</div>
      </section>

      <section className="section">
        <h3>No evaluadas, no verificadas o no aplicables ({pending.length})</h3>
        <div className="rule-list">{pending.map((it) => <RuleItem key={it.rule.id} item={it} />)}</div>
      </section>

      <section className="section">
        <h3>Matriz de referencia</h3>
        <p className="hint">Marcos de diseño y gestión del producto. No implican certificación de ARQUIGEN 360 ni cumplimiento legal del proyecto.</p>
        <div className="table-scroll">
          <table className="matrix">
            <thead><tr><th>Marco</th><th>Ámbito</th><th>Uso en ARQUIGEN</th><th>Versión</th></tr></thead>
            <tbody>
              {FRAMEWORKS.map((f) => (
                <tr key={f.name}><td><b>{f.name}</b></td><td>{f.area}</td><td>{f.use}</td><td>{f.versionNote}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="legal">{LEGAL_NOTICE}</p>
    </div>
  );
}
