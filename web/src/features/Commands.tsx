import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrgData } from '../store/store';
import { COMMAND_LABELS } from '../lib/capabilities';
import { ago, dateTime, Empty, PageHeader, Panel, Pill } from '../components/ui';
import type { CommandStatus } from '../lib/types';

const STATUS: Record<CommandStatus, ['managed' | 'caution' | 'denied' | 'neutral', string]> = {
  QUEUED: ['neutral', 'En cola'],
  SENT: ['caution', 'Enviado'],
  SUCCEEDED: ['managed', 'Completado'],
  FAILED: ['denied', 'Falló'],
  CANCELLED: ['neutral', 'Cancelado'],
  EXPIRED: ['denied', 'Caducado'],
};

export function CommandStatusPill({ status }: { status: CommandStatus }) {
  const [tone, label] = STATUS[status];
  return <Pill tone={tone}>{label}</Pill>;
}

export function Commands() {
  const { commands, devices } = useOrgData();
  const [status, setStatus] = useState('');
  const list = commands.filter((c) => !status || c.status === status);
  return (
    <>
      <PageHeader
        title="Comandos"
        intro="Cada orden enviada a un dispositivo queda registrada con su estado, quién la pidió y la respuesta."
        actions={
          <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            {Object.entries(STATUS).map(([k, [, l]]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        }
      />
      <Panel className="overflow-hidden">
        {list.length === 0 ? (
          <Empty title="No hay comandos con ese estado">Envía uno desde la ficha de un dispositivo.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Comando</th>
                  <th>Dispositivo</th>
                  <th>Estado</th>
                  <th>Pedido por</th>
                  <th>Fecha</th>
                  <th>Respuesta o error</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => {
                  const d = devices.find((x) => x.id === c.deviceId);
                  return (
                    <tr key={c.id}>
                      <td className="text-xs text-muted">{c.id}</td>
                      <td className="font-semibold whitespace-nowrap">{COMMAND_LABELS[c.type]}</td>
                      <td>
                        {d ? (
                          <Link className="text-managed hover:underline" to={`/devices/${d.id}`}>
                            {d.name}
                          </Link>
                        ) : (
                          <span className="text-muted">eliminado</span>
                        )}
                      </td>
                      <td>
                        <CommandStatusPill status={c.status} />
                      </td>
                      <td className="whitespace-nowrap">{c.requestedBy}</td>
                      <td className="whitespace-nowrap" title={dateTime(c.createdAt)}>
                        {ago(c.createdAt)}
                      </td>
                      <td className="max-w-xs text-xs">{c.error ? <span className="text-denied">{c.error}</span> : (c.response ?? '—')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
