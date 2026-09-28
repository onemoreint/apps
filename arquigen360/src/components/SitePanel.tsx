import { useStore } from '../store';
import { NumberField, Section } from './ui';
import { buildableRect } from '../geometry/site';
import type { AccessSide, PlanningInstrument } from '../geometry/types';
import { COLOMBIA, PLANNING_INSTRUMENTS } from '../normative-engine';

export function SitePanel() {
  const site = useStore((s) => s.project.site);
  const setSite = useStore((s) => s.setSite);
  const j = useStore((s) => s.project.jurisdiction);
  const setJurisdiction = useStore((s) => s.setJurisdiction);
  const dept = COLOMBIA.departments.find((d) => d.name === j.department);
  const knownMunicipality = !!dept?.municipalities.some((m) => m.name === j.municipality);
  const br = buildableRect(site);
  const lot = site.width * site.length;
  const maxBuilt = (lot * site.maxOccupancy) / 100;

  return (
    <>
      <Section title="Dimensiones del terreno">
        <div className="grid2">
          <NumberField id="site-w" label="Ancho (frente)" value={site.width} min={4} max={60} step={0.5} onCommit={(v) => setSite({ width: v })} />
          <NumberField id="site-l" label="Largo (fondo)" value={site.length} min={6} max={80} step={0.5} onCommit={(v) => setSite({ length: v })} />
          <label className="field" htmlFor="site-units">
            <span>Unidad de medida</span>
            <select id="site-units" className="select" value={site.units} disabled>
              <option value="m">Metros</option>
            </select>
          </label>
          <NumberField id="site-floors" label="Número de pisos" value={site.floors} unit="" digits={0} step={1} min={1} max={4} onCommit={(v) => setSite({ floors: Math.round(v) })} />
        </div>
      </Section>

      <Section title="Acceso y orientación">
        <div className="grid2">
          <label className="field" htmlFor="site-access">
            <span>Ubicación del acceso</span>
            <select id="site-access" className="select" value={site.access} onChange={(e) => setSite({ access: e.target.value as AccessSide })}>
              <option value="front">Frontal</option>
              <option value="back">Posterior</option>
              <option value="left">Lateral izquierdo</option>
              <option value="right">Lateral derecho</option>
            </select>
          </label>
          <NumberField id="site-north" label="Norte (grados)" value={site.northAngle} unit="°" digits={0} step={15} min={-180} max={180} onCommit={(v) => setSite({ northAngle: v })} />
        </div>
        <p className="hint">0° apunta al fondo del lote (arriba del plano). Gira en sentido horario.</p>
      </Section>

      <Section title="Normativa">
        <div className="grid2">
          <NumberField id="sb-front" label="Retiro frontal" value={site.setbacks.front} min={0} max={10} step={0.25} onCommit={(v) => setSite({ setbacks: { ...site.setbacks, front: v } })} />
          <NumberField id="sb-back" label="Retiro posterior" value={site.setbacks.back} min={0} max={10} step={0.25} onCommit={(v) => setSite({ setbacks: { ...site.setbacks, back: v } })} />
          <NumberField id="sb-side" label="Retiros laterales" value={site.setbacks.side} min={0} max={5} step={0.25} onCommit={(v) => setSite({ setbacks: { ...site.setbacks, side: v } })} />
          <NumberField id="site-occ" label="Ocupación máxima" value={site.maxOccupancy} unit="%" digits={0} step={5} min={20} max={100} onCommit={(v) => setSite({ maxOccupancy: v })} />
        </div>
        <p className="hint">Los retiros frontal y posterior se miden desde el lado del acceso. Retiro lateral 0 = muro medianero, sin ventanas.</p>
      </Section>

      <Section title="Jurisdicción">
        <div className="grid2">
          <label className="field" htmlFor="j-country">
            <span>País</span>
            <select id="j-country" className="select" value="CO" disabled><option value="CO">Colombia</option></select>
          </label>
          <label className="field" htmlFor="j-dept">
            <span>Departamento</span>
            <select id="j-dept" className="select" value={dept ? j.department : '__other'} onChange={(e) => setJurisdiction({ department: e.target.value === '__other' ? '' : e.target.value, municipality: '' })}>
              {COLOMBIA.departments.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
              <option value="__other">Otro departamento</option>
            </select>
          </label>
          {!dept && (
            <label className="field" htmlFor="j-dept-free">
              <span>Nombre del departamento</span>
              <input id="j-dept-free" className="input" maxLength={80} value={j.department} onChange={(e) => setJurisdiction({ department: e.target.value })} />
            </label>
          )}
          <label className="field" htmlFor="j-mun">
            <span>Municipio</span>
            {dept ? (
              <select id="j-mun" className="select" value={knownMunicipality ? j.municipality : j.municipality ? '__other' : ''} onChange={(e) => setJurisdiction({ municipality: e.target.value === '__other' ? ' ' : e.target.value })}>
                <option value="">Sin definir</option>
                {dept.municipalities.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
                <option value="__other">Otro municipio</option>
              </select>
            ) : (
              <input id="j-mun" className="input" maxLength={80} value={j.municipality} onChange={(e) => setJurisdiction({ municipality: e.target.value })} />
            )}
          </label>
          {dept && j.municipality && !knownMunicipality && (
            <label className="field" htmlFor="j-mun-free">
              <span>Nombre del municipio</span>
              <input id="j-mun-free" className="input" maxLength={80} value={j.municipality.trim()} onChange={(e) => setJurisdiction({ municipality: e.target.value || ' ' })} />
            </label>
          )}
          <label className="field" htmlFor="j-inst">
            <span>Instrumento de planificación</span>
            <select id="j-inst" className="select" value={j.planningInstrument} onChange={(e) => setJurisdiction({ planningInstrument: e.target.value as PlanningInstrument })}>
              {PLANNING_INSTRUMENTS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
            </select>
          </label>
          <label className="field" htmlFor="j-zone">
            <span>Zona o tratamiento</span>
            <input id="j-zone" className="input" maxLength={80} placeholder="Ej.: consolidación nivel 1" value={j.zone} onChange={(e) => setJurisdiction({ zone: e.target.value })} />
          </label>
        </div>
        <p className="hint">Aún no hay reglas urbanísticas municipales verificadas cargadas. Los retiros y la ocupación se evalúan con los valores de arriba: confírmalos con la norma de tu municipio.</p>
      </Section>

      <dl className="summary-box">
        <dt>Área del terreno</dt><dd>{lot.toFixed(2)} m²</dd>
        <dt>Área construible</dt><dd>{(br.w * br.h).toFixed(2)} m²</dd>
        <dt>Máximo por ocupación</dt><dd>{maxBuilt.toFixed(2)} m²</dd>
        <dt>Rectángulo construible</dt><dd>{br.w.toFixed(2)} × {br.h.toFixed(2)}</dd>
      </dl>
    </>
  );
}
