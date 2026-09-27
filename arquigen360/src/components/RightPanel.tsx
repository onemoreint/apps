import { useStore } from '../store';
import type { AreaReport, Issue } from '../layout-engine/validate';
import { Inspector } from './Inspector';
import { Section } from './ui';

export function RightPanel({ issues, areas }: { issues: Issue[]; areas: AreaReport }) {
  const select = useStore((s) => s.select);
  const selection = useStore((s) => s.selection);
  const site = useStore((s) => s.project.site);
  const errors = issues.filter((i) => i.level === 'error').length;
  const warns = issues.filter((i) => i.level === 'warn').length;
  const hasOverlap = issues.some((i) => i.level === 'error' && i.roomIds.length === 2);
  const occBad = areas.occupancy > site.maxOccupancy + 0.01;

  return (
    <aside className="side right" aria-label="Inspector y validaciones">
      <div className="scroll">
        <Inspector hasOverlap={hasOverlap} />

        <Section
          title="Validación"
          aside={
            <span className="counts">
              {errors > 0 && <span className="pill error">{errors} errores</span>}
              {warns > 0 && <span className="pill warn">{warns} avisos</span>}
              {!errors && !warns && <span className="pill ok">Sin problemas</span>}
            </span>
          }
        >
          {issues.length === 0 && <p className="empty">La distribución cumple todas las reglas.</p>}
          {issues.map((i, k) => (
            <button key={k} type="button" className={`issue ${i.level}`} onClick={() => i.roomIds[0] && select({ kind: 'room', id: i.roomIds[0] })}>
              <span className="sev" aria-label={i.level === 'error' ? 'Error' : i.level === 'warn' ? 'Aviso' : 'Nota'} />
              <span>{i.msg}</span>
            </button>
          ))}
        </Section>

        <Section title="Cuadro de áreas">
          <div className="kpis">
            <div className="kpi"><span>Terreno</span><b>{areas.lot.toFixed(2)} m²</b></div>
            <div className="kpi"><span>Construida</span><b>{areas.built.toFixed(2)} m²</b></div>
            <div className="kpi"><span>Libre</span><b>{areas.free.toFixed(2)} m²</b></div>
            <div className="kpi"><span>Circulación</span><b>{areas.circulation.toFixed(2)} m²</b></div>
            <div className={`kpi ${occBad ? 'bad' : ''}`} style={{ gridColumn: '1 / -1' }}>
              <span>Ocupación · máximo {site.maxOccupancy} %</span>
              <b>{areas.occupancy.toFixed(1)} %</b>
              <div className={`meter ${occBad ? 'bad' : ''}`}><i style={{ width: `${Math.min(100, areas.occupancy)}%` }} /></div>
            </div>
          </div>
          <table className="area-table">
            <thead>
              <tr><th>Ambiente</th><th style={{ textAlign: 'right' }}>Medidas</th><th style={{ textAlign: 'right' }}>m²</th></tr>
            </thead>
            <tbody>
              {areas.rooms.map((r) => (
                <tr key={r.id} className={selection?.kind === 'room' && selection.id === r.id ? 'sel' : ''} onClick={() => select({ kind: 'room', id: r.id })}>
                  <td>{r.name}</td>
                  <td className="n">{r.width.toFixed(2)} × {r.length.toFixed(2)}</td>
                  <td className="n">{r.area.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>
    </aside>
  );
}
