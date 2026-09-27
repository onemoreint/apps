import { useStore } from '../store';
import { CATALOG, SELECTABLE } from '../layout-engine/catalog';
import { makeSpec, numberNames } from '../projects/defaults';
import type { RoomSpec, RoomType, Zone } from '../geometry/types';
import { Icon, NumberField, Section, Seg } from './ui';

export const ZONE_COLOR: Record<Zone, string> = {
  social: '#d08a3c', private: '#5b7fa6', service: '#8f8a4f', exterior: '#5f9a5a', garage: '#7d7f86', circulation: '#9aa3ab',
};
export const ZONE_LABEL: Record<Zone, string> = {
  social: 'Social', private: 'Privada', service: 'Servicio', exterior: 'Exterior', garage: 'Garaje', circulation: 'Circulación',
};

export function ProgramPanel() {
  const program = useStore((s) => s.project.program);
  const setProgram = useStore((s) => s.setProgram);
  const specs = program.rooms;
  const prefs = program.preferences;

  const setSpecs = (rooms: RoomSpec[]) => setProgram({ ...program, rooms: numberNames(rooms) });
  const patchSpec = (id: string, patch: Partial<RoomSpec>) =>
    setProgram({ ...program, rooms: specs.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

  const countOf = (types: RoomType[]) => specs.filter((s) => types.includes(s.type)).length;
  const beds = countOf(['master_bedroom', 'bedroom']);
  const baths = countOf(['bathroom', 'ensuite']);

  const changeBeds = (d: number) => {
    if (d > 0) setSpecs([...specs, makeSpec(specs.some((s) => s.type === 'master_bedroom') ? 'bedroom' : 'master_bedroom')]);
    else {
      const idx = specs.map((s) => s.type).lastIndexOf('bedroom');
      const i = idx >= 0 ? idx : specs.findIndex((s) => s.type === 'master_bedroom');
      if (i >= 0) setSpecs(specs.filter((_, k) => k !== i));
    }
  };
  const changeBaths = (d: number) => {
    if (d > 0) {
      const wantsEnsuite = specs.some((s) => s.type === 'master_bedroom') && !specs.some((s) => s.type === 'ensuite') && baths >= 1;
      setSpecs([...specs, makeSpec(wantsEnsuite ? 'ensuite' : 'bathroom')]);
    } else {
      const idx = specs.map((s) => s.type).lastIndexOf('bathroom');
      const i = idx >= 0 ? idx : specs.findIndex((s) => s.type === 'ensuite');
      if (i >= 0) setSpecs(specs.filter((_, k) => k !== i));
    }
  };
  const setCars = (n: 0 | 1 | 2) => {
    let rooms = specs.filter((s) => s.type !== 'garage' || n > 0);
    const g = rooms.find((s) => s.type === 'garage');
    if (n > 0 && !g) rooms = [...rooms, makeSpec('garage')];
    rooms = rooms.map((s) => (s.type === 'garage' ? { ...s, minWidth: n === 2 ? 5.6 : Math.min(s.minWidth, 3.5), minArea: +((n === 2 ? 5.6 : Math.min(s.minWidth, 3.5)) * s.minLength).toFixed(2) } : s));
    setProgram({ rooms: numberNames(rooms), preferences: { ...prefs, garageCars: n } });
  };

  const presentTypes = [...new Set(specs.map((s) => s.type))];

  return (
    <>
      <Section title="Preferencias">
        <div className="field">
          <span>Zona social</span>
          <Seg label="Zona social" value={prefs.socialZone} onChange={(v) => setProgram({ ...program, preferences: { ...prefs, socialZone: v } })}
            options={[{ value: 'front', label: 'Al frente' }, { value: 'back', label: 'Al fondo' }]} />
        </div>
        <div className="field">
          <span>Garaje</span>
          <Seg label="Garaje" value={prefs.garageCars} onChange={setCars}
            options={[{ value: 0, label: 'Sin garaje' }, { value: 1, label: '1 vehículo' }, { value: 2, label: '2 vehículos' }]} />
        </div>
        <label className="check">
          <input type="checkbox" checked={prefs.openKitchen} onChange={(e) => setProgram({ ...program, preferences: { ...prefs, openKitchen: e.target.checked } })} />
          Cocina abierta al comedor
        </label>
      </Section>

      <Section title="Cantidades rápidas">
        <div className="grid2">
          <Stepper label="Dormitorios" value={beds} onChange={changeBeds} />
          <Stepper label="Baños" value={baths} onChange={changeBaths} />
        </div>
      </Section>

      <Section
        title={`Ambientes (${specs.length})`}
        aside={
          <select
            className="select"
            style={{ width: 'auto', fontSize: 12, padding: '3px 6px', textTransform: 'none', letterSpacing: 0 }}
            value=""
            aria-label="Agregar ambiente"
            onChange={(e) => e.target.value && setSpecs([...specs, makeSpec(e.target.value as RoomType)])}
          >
            <option value="">+ Agregar ambiente</option>
            {SELECTABLE.map((t) => <option key={t} value={t}>{CATALOG[t].label}</option>)}
          </select>
        }
      >
        {specs.map((s) => {
          const zone = CATALOG[s.type].zone;
          return (
            <div className="spec" key={s.id}>
              <div className="spec-head">
                <span className="zone-dot" style={{ background: ZONE_COLOR[zone] }} title={`Zona ${ZONE_LABEL[zone]}`} />
                <input className="input" id={`spec-name-${s.id}`} aria-label="Nombre" value={s.name} onChange={(e) => patchSpec(s.id, { name: e.target.value })} />
                <button className="btn ghost icon" type="button" aria-label={`Quitar ${s.name}`} onClick={() => setSpecs(specs.filter((x) => x.id !== s.id))}>
                  <Icon name="trash" />
                </button>
              </div>
              <div className="spec-meta">
                <NumberField id={`spec-w-${s.id}`} label="Ancho mín." value={s.minWidth} min={0.8} max={20} onCommit={(v) => patchSpec(s.id, { minWidth: v, minArea: +(v * s.minLength).toFixed(2) })} />
                <NumberField id={`spec-l-${s.id}`} label="Largo mín." value={s.minLength} min={0.8} max={20} onCommit={(v) => patchSpec(s.id, { minLength: v, minArea: +(s.minWidth * v).toFixed(2) })} />
                <NumberField id={`spec-a-${s.id}`} label="Área mín." value={s.minArea} unit="m²" min={0.5} max={200} step={0.5} onCommit={(v) => patchSpec(s.id, { minArea: v })} />
                <label className="field" htmlFor={`spec-p-${s.id}`}>
                  <span>Prioridad</span>
                  <select id={`spec-p-${s.id}`} className="select" value={s.priority} onChange={(e) => patchSpec(s.id, { priority: +e.target.value })}>
                    {[1, 2, 3, 4, 5].map((p) => <option key={p} value={p}>{p === 1 ? '1 alta' : p === 5 ? '5 baja' : p}</option>)}
                  </select>
                </label>
              </div>
              <details className="near">
                <summary>Relación con otros ambientes {s.nearTo.length ? `(${s.nearTo.length})` : ''}</summary>
                <div className="chips">
                  {presentTypes.filter((t) => t !== s.type).map((t) => {
                    const on = s.nearTo.includes(t);
                    return (
                      <button key={t} type="button" className="chip" aria-pressed={on}
                        onClick={() => patchSpec(s.id, { nearTo: on ? s.nearTo.filter((x) => x !== t) : [...s.nearTo, t] })}>
                        {CATALOG[t].label}
                      </button>
                    );
                  })}
                </div>
              </details>
            </div>
          );
        })}
      </Section>
    </>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (d: number) => void }) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="seg" role="group" aria-label={label}>
        <button type="button" onClick={() => onChange(-1)} disabled={value === 0} aria-label={`Menos ${label}`}>−</button>
        <button type="button" disabled style={{ minWidth: 42, fontFamily: 'var(--mono)', color: 'var(--ink)' }}>{value}</button>
        <button type="button" onClick={() => onChange(1)} aria-label={`Más ${label}`}>+</button>
      </div>
    </div>
  );
}
