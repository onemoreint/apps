import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useMe, useOrgData } from '../store/store';
import { MODE_LABELS } from '../lib/capabilities';
import { can } from '../lib/rbac';
import { ago, CompliancePill, Empty, PageHeader, Panel, StatePill } from '../components/ui';
import type { Device } from '../lib/types';

type GroupBy = 'none' | 'manufacturer' | 'mode' | 'tag' | 'state';

function Battery({ pct, state }: { pct: number; state: Device['state'] }) {
  if (state === 'PENDING' || state === 'RETIRED') return <span className="text-muted">—</span>;
  const color = pct < 20 ? 'bg-denied' : pct < 40 ? 'bg-caution' : 'bg-managed';
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-2 w-10 overflow-hidden rounded-full bg-line">
        <span className={`block h-full ${color}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="tabular-nums">{pct} %</span>
    </span>
  );
}

export function Devices() {
  const { devices, policies } = useOrgData();
  const me = useMe()!;
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [state, setState] = useState('');
  const [compliance, setCompliance] = useState('');
  const [maker, setMaker] = useState('');
  const [mode, setMode] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');

  const makers = [...new Set(devices.map((d) => d.manufacturer))].sort();
  const modes = [...new Set(devices.map((d) => d.mode))];

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return devices.filter(
      (d) =>
        (!needle ||
          [d.name, d.model, d.manufacturer, d.serial ?? '', ...d.tags].some((v) => v.toLowerCase().includes(needle))) &&
        (!state || d.state === state) &&
        (!compliance || d.compliance === compliance) &&
        (!maker || d.manufacturer === maker) &&
        (!mode || d.mode === mode),
    );
  }, [devices, q, state, compliance, maker, mode]);

  const groups = useMemo(() => {
    if (groupBy === 'none') return [['Todos los dispositivos', filtered] as const];
    const m = new Map<string, Device[]>();
    filtered.forEach((d) => {
      const keys =
        groupBy === 'manufacturer' ? [d.manufacturer] : groupBy === 'mode' ? [MODE_LABELS[d.mode]] : groupBy === 'state' ? [d.state] : d.tags.length ? d.tags : ['sin etiqueta'];
      keys.forEach((k) => m.set(k, [...(m.get(k) ?? []), d]));
    });
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered, groupBy]);

  const anyFilter = q || state || compliance || maker || mode;

  return (
    <>
      <PageHeader
        title="Dispositivos"
        intro={`${devices.length} equipos en el inventario de tu organización.`}
        actions={
          can(me.role, 'enrollment.create') && (
            <Link to="/enrollment" className="btn btn-primary">
              <Plus size={16} /> Inscribir dispositivo
            </Link>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-60 flex-1">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input className="input !pl-9" placeholder="Buscar por nombre, modelo, serie o etiqueta" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar dispositivos" />
        </div>
        <select className="input !w-auto" value={state} onChange={(e) => setState(e.target.value)} aria-label="Estado">
          <option value="">Cualquier estado</option>
          <option value="ONLINE">En línea</option>
          <option value="OFFLINE">Sin conexión</option>
          <option value="PENDING">Pendiente</option>
          <option value="RETIRED">Retirado</option>
        </select>
        <select className="input !w-auto" value={compliance} onChange={(e) => setCompliance(e.target.value)} aria-label="Cumplimiento">
          <option value="">Cualquier cumplimiento</option>
          <option value="COMPLIANT">Conforme</option>
          <option value="NON_COMPLIANT">No conforme</option>
          <option value="UNKNOWN">Sin evaluar</option>
        </select>
        <select className="input !w-auto" value={maker} onChange={(e) => setMaker(e.target.value)} aria-label="Fabricante">
          <option value="">Todos los fabricantes</option>
          {makers.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <select className="input !w-auto" value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Modo">
          <option value="">Todos los modos</option>
          {modes.map((m) => (
            <option key={m} value={m}>
              {MODE_LABELS[m]}
            </option>
          ))}
        </select>
        <select className="input !w-auto" value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} aria-label="Agrupar por">
          <option value="none">Sin agrupar</option>
          <option value="manufacturer">Agrupar por fabricante</option>
          <option value="mode">Agrupar por modo</option>
          <option value="state">Agrupar por estado</option>
          <option value="tag">Agrupar por etiqueta</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <Panel>
          <Empty title={anyFilter ? 'Ningún equipo coincide con los filtros' : 'Aún no hay equipos inscritos'}>
            {anyFilter ? 'Quita algún filtro o cambia la búsqueda.' : 'Genera un código de inscripción para añadir el primero.'}
          </Empty>
        </Panel>
      ) : (
        groups.map(([title, list]) => (
          <Panel key={title} title={groupBy === 'none' ? undefined : `${title} (${list.length})`} className="mb-4 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="grid-table">
                <thead>
                  <tr>
                    <th>Equipo</th>
                    <th>Android</th>
                    <th>Modo</th>
                    <th>Estado</th>
                    <th>Cumplimiento</th>
                    <th>Batería</th>
                    <th>Última conexión</th>
                    <th>Política</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((d) => (
                    <tr key={d.id} className="cursor-pointer" onClick={() => nav(`/devices/${d.id}`)}>
                      <td>
                        <Link to={`/devices/${d.id}`} className="font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>
                          {d.name}
                        </Link>
                        <div className="text-xs text-muted">
                          {d.manufacturer} {d.model}
                        </div>
                      </td>
                      <td className="tabular-nums">
                        {d.androidVersion} <span className="text-xs text-muted">SDK {d.sdkInt}</span>
                      </td>
                      <td className="whitespace-nowrap">{MODE_LABELS[d.mode]}</td>
                      <td>
                        <StatePill state={d.state} />
                      </td>
                      <td>
                        <CompliancePill value={d.compliance} />
                      </td>
                      <td>
                        <Battery pct={d.batteryPct} state={d.state} />
                      </td>
                      <td className="whitespace-nowrap text-muted">{d.state === 'PENDING' ? 'nunca' : ago(d.lastSeenAt)}</td>
                      <td className="whitespace-nowrap">{policies.find((p) => p.id === d.policyId)?.name ?? <span className="text-muted">ninguna</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        ))
      )}
    </>
  );
}
