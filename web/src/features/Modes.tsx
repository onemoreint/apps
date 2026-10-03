import { useState } from 'react';
import { capabilitiesFor, CAPABILITY_LABELS, MODE_DESCRIPTIONS, MODE_LABELS, type CapabilityCode } from '../lib/capabilities';
import { CapabilityMark, PageHeader, Panel } from '../components/ui';
import type { ManagementMode } from '../lib/types';

const MODES: ManagementMode[] = ['NORMAL_APP', 'DEVICE_ADMIN', 'WORK_PROFILE', 'FULLY_MANAGED', 'DEDICATED', 'LAB_DEVICE_OWNER'];
const SDKS = [
  [36, 'Android 16'],
  [35, 'Android 15'],
  [34, 'Android 14'],
  [33, 'Android 13'],
  [31, 'Android 12'],
  [29, 'Android 10'],
  [28, 'Android 9'],
] as const;

export function Modes() {
  const [sdk, setSdk] = useState(34);
  const [focus, setFocus] = useState<{ mode: ManagementMode; code: CapabilityCode } | null>(null);
  const table = MODES.map((m) => ({ mode: m, caps: capabilitiesFor(m, sdk) }));
  const codes = Object.keys(CAPABILITY_LABELS) as CapabilityCode[];
  const sel = focus ? table.find((t) => t.mode === focus.mode)!.caps.find((c) => c.code === focus.code)! : null;

  return (
    <>
      <PageHeader
        title="Modos y capacidades"
        intro="Lo que Android permite administrar en cada modo. La plataforma calcula esta tabla para cada equipo según su modo y su versión; nunca intenta saltarse estos límites."
        actions={
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted">Versión</span>
            <select className="input !w-auto" value={sdk} onChange={(e) => setSdk(Number(e.target.value))}>
              {SDKS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        }
      />
      <div className="mb-4 flex flex-wrap gap-5 text-sm">
        <span className="flex items-center gap-2"><CapabilityMark status="SUPPORTED" /> Disponible</span>
        <span className="flex items-center gap-2"><CapabilityMark status="PARTIAL" /> Parcial o con condiciones</span>
        <span className="flex items-center gap-2"><CapabilityMark status="UNSUPPORTED" /> Android no lo permite en este modo</span>
      </div>
      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="grid-table">
            <thead>
              <tr>
                <th className="sticky left-0 bg-panel">Capacidad</th>
                {MODES.map((m) => <th key={m} className="text-center" title={MODE_DESCRIPTIONS[m]}>{MODE_LABELS[m]}</th>)}
              </tr>
            </thead>
            <tbody>
              {codes.map((code) => (
                <tr key={code}>
                  <td className="sticky left-0 bg-panel font-semibold whitespace-nowrap">{CAPABILITY_LABELS[code]}</td>
                  {table.map(({ mode, caps }) => {
                    const c = caps.find((x) => x.code === code)!;
                    const active = focus?.mode === mode && focus.code === code;
                    return (
                      <td key={mode} className={`text-center ${active ? 'bg-managed-soft' : ''}`}>
                        <button className="inline-flex rounded p-1" onClick={() => setFocus({ mode, code })} aria-label={`${CAPABILITY_LABELS[code]} en ${MODE_LABELS[mode]}: ${c.reason}`}>
                          <CapabilityMark status={c.status} size={18} />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line bg-paper/60 px-4 py-3 text-sm" aria-live="polite">
          {sel && focus ? (
            <>
              <span className="font-semibold">{CAPABILITY_LABELS[focus.code]} en {MODE_LABELS[focus.mode]}:</span> {sel.reason}
              <span className="block text-xs text-muted">API: {sel.api}</span>
            </>
          ) : (
            <span className="text-muted">Toca una celda para ver el motivo y la API que se usa.</span>
          )}
        </div>
      </Panel>
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {MODES.map((m) => (
          <Panel key={m}>
            <div className="p-4">
              <h2 className="font-bold">{MODE_LABELS[m]}</h2>
              <p className="mt-1 text-sm text-muted">{MODE_DESCRIPTIONS[m]}</p>
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
