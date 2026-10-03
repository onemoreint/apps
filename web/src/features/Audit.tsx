import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useOrgData } from '../store/store';
import { dateTime, Empty, PageHeader, Panel, Pill } from '../components/ui';
import type { AuditEvent } from '../lib/types';

function toCsv(rows: AuditEvent[]): string {
  const esc = (v: string | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['fecha', 'usuario', 'accion', 'objetivo', 'dispositivo', 'ip', 'resultado', 'detalle'];
  return [head.join(','), ...rows.map((r) => [r.at, r.actor, r.action, r.target, r.deviceId, r.ip, r.result, r.details].map(esc).join(','))].join('\n');
}

export function Audit() {
  const { audit } = useOrgData();
  const [q, setQ] = useState('');
  const [result, setResult] = useState('');
  const [area, setArea] = useState('');
  const areas = [...new Set(audit.map((a) => a.action.split('.')[0]))].sort();

  const rows = useMemo(
    () =>
      audit.filter(
        (a) =>
          (!result || a.result === result) &&
          (!area || a.action.startsWith(area + '.')) &&
          (!q || `${a.actor} ${a.action} ${a.target}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [audit, q, result, area],
  );

  const exportCsv = () => {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <PageHeader
        title="Auditoría"
        intro="Registro de solo inserción: cada inicio de sesión, cambio y comando, incluidos los intentos denegados."
        actions={<button className="btn" onClick={exportCsv}><Download size={16} /> Exportar CSV</button>}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <input className="input max-w-sm" placeholder="Buscar usuario, acción u objetivo" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar en auditoría" />
        <select className="input !w-auto" value={area} onChange={(e) => setArea(e.target.value)} aria-label="Área">
          <option value="">Todas las áreas</option>
          {areas.map((a) => <option key={a}>{a}</option>)}
        </select>
        <select className="input !w-auto" value={result} onChange={(e) => setResult(e.target.value)} aria-label="Resultado">
          <option value="">Cualquier resultado</option>
          <option value="SUCCESS">Correcto</option>
          <option value="DENIED">Denegado</option>
          <option value="ERROR">Error</option>
        </select>
      </div>
      <Panel className="overflow-hidden">
        {rows.length === 0 ? (
          <Empty title="Ningún evento coincide">Cambia la búsqueda o los filtros.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="grid-table">
              <thead>
                <tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Objetivo</th><th>IP</th><th>Resultado</th></tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap text-muted">{dateTime(a.at)}</td>
                    <td className="whitespace-nowrap font-semibold">{a.actor}</td>
                    <td><code className="rounded bg-paper px-1.5 py-0.5 text-xs">{a.action}</code></td>
                    <td>
                      {a.target}
                      {a.details && <div className="text-xs text-muted">{a.details}</div>}
                    </td>
                    <td className="whitespace-nowrap text-xs text-muted">{a.ip ?? '—'}</td>
                    <td>
                      <Pill tone={a.result === 'SUCCESS' ? 'managed' : a.result === 'DENIED' ? 'denied' : 'caution'}>
                        {a.result === 'SUCCESS' ? 'Correcto' : a.result === 'DENIED' ? 'Denegado' : 'Error'}
                      </Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
