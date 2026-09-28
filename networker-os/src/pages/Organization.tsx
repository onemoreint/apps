import { useMemo, useState } from 'react';
import { useData } from '../app/DataContext';
import { useUI } from '../app/UIContext';
import { Icon } from '../components/Icon';
import { Avatar, Callout, Field, Seg, Sheet } from '../components/ui';
import { METRIC_LABELS, computeDuplication, empty, type MemberSummary, type ProcessMetrics } from '../domain/engine/duplication';
import { ROLE_LABEL } from '../domain/labels';
import type { Member, MemberRole } from '../domain/models';
import { membersRepo, challengesRepo } from '../data/repositories';
import { addDays, formatDate, mondayOf, relativeDay, toDateKey } from '../utils/dates';

const METRIC_KEYS = Object.keys(METRIC_LABELS) as (keyof ProcessMetrics)[];
const TONE_COLOR = { bad: 'var(--bad)', warn: 'var(--warn)', good: 'var(--good)', great: 'var(--accent)' };

function Gauge({ value, color }: { value: number; color: string }) {
  const r = 64;
  const c = 2 * Math.PI * r;
  return (
    <div className="gauge" role="img" aria-label={`Índice de duplicación ${value} de 100`}>
      <svg width="150" height="150" viewBox="0 0 150 150">
        <circle cx="75" cy="75" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="12" />
        <circle cx="75" cy="75" r={r} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(value / 100) * c} ${c}`} />
      </svg>
      <div className="gauge-center">
        <div>
          <div className="gauge-value num">{value}</div>
          <div className="tiny faint">de 100</div>
        </div>
      </div>
    </div>
  );
}

function MemberSheet({ member, summary, onClose }: { member: Member | null; summary?: MemberSummary; onClose: () => void }) {
  const { members, logs, now } = useData();
  const { toast, confirm } = useUI();
  const isNew = !member;
  const [name, setName] = useState(member?.name ?? '');
  const [parentId, setParentId] = useState(member?.parentId ?? 'me');
  const [role, setRole] = useState<MemberRole>(member?.role ?? 'distribuidor');
  const [country, setCountry] = useState(member?.country ?? '');
  const weeks = [0, 1, 2, 3].map((w) => toDateKey(addDays(mondayOf(now), -7 * w)));
  const [week, setWeek] = useState(weeks[0]);
  const existingLog = member ? logs.find((l) => l.memberId === member.id && l.weekStart === week) : undefined;
  const [m, setM] = useState<ProcessMetrics>(() => (existingLog ? { ...existingLog } : empty()));
  const memberLogs = member ? logs.filter((l) => l.memberId === member.id).sort((a, b) => b.weekStart.localeCompare(a.weekStart)) : [];
  const isLeader = member?.role === 'lider';

  const possibleParents = members.filter((x) => x.id !== member?.id && x.role !== 'cliente');

  function changeWeek(w: string) {
    setWeek(w);
    const l = member ? logs.find((x) => x.memberId === member.id && x.weekStart === w) : undefined;
    setM(l ? { newContacts: l.newContacts, presentations: l.presentations, followUps: l.followUps, newClients: l.newClients, newDistributors: l.newDistributors } : empty());
  }

  async function saveMember() {
    if (!name.trim()) return;
    await membersRepo.save({
      id: member?.id,
      name: name.trim(),
      parentId: isLeader ? null : parentId,
      role: isLeader ? 'lider' : role,
      country,
      joinedAt: member?.joinedAt ?? new Date().toISOString(),
      lastActivityAt: member?.lastActivityAt ?? null,
      isDemo: member?.isDemo,
    });
    toast(isNew ? 'Miembro agregado' : 'Miembro actualizado');
    if (isNew) onClose();
  }

  async function saveLog() {
    if (!member) return;
    await membersRepo.logWeek({ memberId: member.id, weekStart: week, ...m });
    await challengesRepo.mark('ayudar_equipo');
    toast('Actividad semanal guardada');
  }

  async function remove() {
    if (!member) return;
    const ok = await confirm({ title: 'Eliminar miembro', message: `¿Eliminar a ${member.name}? Las personas de su equipo pasarán a su patrocinador.`, confirmLabel: 'Eliminar', danger: true });
    if (ok) {
      await membersRepo.remove(member.id);
      toast('Miembro eliminado');
      onClose();
    }
  }

  return (
    <Sheet title={isNew ? 'Agregar miembro' : member!.name} onClose={onClose}>
      <div className="stack">
        {summary && (
          <div className="row-wrap">
            <span className="badge"><span className={`status-dot status-${summary.status}`} /> {summary.status === 'activo' ? 'Activo' : summary.status === 'en_riesgo' ? 'En riesgo' : 'Inactivo'}</span>
            <span className="badge">Última actividad {relativeDay(member!.lastActivityAt, now)}</span>
            <span className="badge">Nivel {summary.depth}</span>
          </div>
        )}
        <div className="form-grid">
          <Field label="Nombre" htmlFor="m-name">
            <input id="m-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="País" htmlFor="m-country">
            <input id="m-country" className="input" value={country} onChange={(e) => setCountry(e.target.value)} />
          </Field>
          {!isLeader && (
            <>
              <Field label="Rol" htmlFor="m-role">
                <select id="m-role" className="select" value={role} onChange={(e) => setRole(e.target.value as MemberRole)}>
                  <option value="distribuidor">Distribuidor</option>
                  <option value="cliente">Cliente</option>
                </select>
              </Field>
              <Field label="Patrocinador" htmlFor="m-parent">
                <select id="m-parent" className="select" value={parentId ?? 'me'} onChange={(e) => setParentId(e.target.value)}>
                  {possibleParents.map((p) => <option key={p.id} value={p.id}>{p.id === 'me' ? `${p.name} (yo)` : p.name}</option>)}
                </select>
              </Field>
            </>
          )}
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          {!isNew && !isLeader && <button className="btn btn-sm btn-danger" onClick={remove}><Icon name="trash" size={14} /> Eliminar</button>}
          <span className="spacer" />
          <button className="btn btn-primary btn-sm" onClick={saveMember} disabled={!name.trim()}><Icon name="check" size={15} /> {isNew ? 'Agregar' : 'Guardar datos'}</button>
        </div>

        {member && !isLeader && member.role === 'distribuidor' && (
          <>
            <div className="divider" />
            <h3 className="section-title">Registrar actividad semanal</h3>
            <p className="small muted">Pídele a {member.name.split(' ')[0]} su reporte semanal (o regístralo después de su llamada de seguimiento).</p>
            <Seg label="Semana" value={week} onChange={changeWeek} options={weeks.map((w, i) => ({ key: w, label: i === 0 ? 'Esta semana' : i === 1 ? 'Anterior' : `Hace ${i} sem.` }))} />
            <div className="form-grid">
              {METRIC_KEYS.map((k) => (
                <Field key={k} label={METRIC_LABELS[k]} htmlFor={`m-${k}`}>
                  <input id={`m-${k}`} className="input" type="number" min={0} inputMode="numeric" value={m[k]} onChange={(e) => setM({ ...m, [k]: Math.max(0, Number(e.target.value) || 0) })} />
                </Field>
              ))}
            </div>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-primary btn-sm" onClick={saveLog}><Icon name="check" size={15} /> Guardar semana</button>
            </div>
            {memberLogs.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table className="small" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
                  <thead>
                    <tr className="faint" style={{ textAlign: 'left' }}>
                      <th style={{ padding: 6 }}>Semana</th><th>Cont.</th><th>Pres.</th><th>Seg.</th><th>Cli.</th><th>Dist.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberLogs.map((l) => (
                      <tr key={l.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: 6 }}>{formatDate(`${l.weekStart}T12:00:00`)}</td>
                        <td className="num">{l.newContacts}</td><td className="num">{l.presentations}</td><td className="num">{l.followUps}</td><td className="num">{l.newClients}</td><td className="num">{l.newDistributors}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        {isLeader && <Callout tone="info">Tu actividad como líder se calcula automáticamente con lo que registras en la app (contactos, interacciones y cambios de estado).</Callout>}
      </div>
    </Sheet>
  );
}

export default function Organization() {
  const { members, logs, contacts, interactions, now } = useData();
  const [weeks, setWeeks] = useState<'1' | '4' | '8'>('4');
  const [open, setOpen] = useState<Member | null | 'new'>(null);
  const dup = useMemo(() => computeDuplication(members, logs, contacts, interactions, now, Number(weeks)), [members, logs, contacts, interactions, now, weeks]);
  const byId = new Map(dup.members.map((s) => [s.member.id, s]));
  const leader = members.find((m) => m.id === 'me');
  const distributors = members.filter((m) => m.role === 'distribuidor');
  const clients = members.filter((m) => m.role === 'cliente');
  const maxDepth = dup.members.reduce((a, m) => Math.max(a, m.depth), 0);
  const active = dup.members.filter((m) => m.member.role === 'distribuidor' && m.status === 'activo').length;

  function renderTree(parentId: string | null, depth: number): React.ReactNode {
    const kids = members.filter((m) => m.parentId === parentId).sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === 'distribuidor' ? -1 : 1));
    return kids.map((m) => {
      const s = byId.get(m.id);
      return (
        <div key={m.id} style={{ paddingLeft: Math.min(depth, 4) * 14 }}>
          <button className="tree-node" onClick={() => setOpen(m)}>
            {depth > 0 && <span className="faint" aria-hidden="true">└</span>}
            <Avatar name={m.name} />
            <div className="li-main">
              <div className="li-title">
                <span className="ellipsis">{m.name}</span>
                <span className={`badge ${m.role === 'distribuidor' ? 'badge-gold' : ''}`}>{ROLE_LABEL[m.role]}</span>
              </div>
              <div className="li-sub">
                {s && m.role === 'distribuidor'
                  ? `${s.metrics.newContacts} contactos · ${s.metrics.presentations} presentaciones · ${s.metrics.followUps} seguimientos`
                  : `Última actividad ${relativeDay(m.lastActivityAt, now)}`}
              </div>
            </div>
            {s && <span className={`status-dot status-${s.status}`} title={s.status} />}
          </button>
          {members.some((x) => x.parentId === m.id) && <div style={{ marginTop: 8 }} className="tree">{renderTree(m.id, 1)}</div>}
        </div>
      );
    });
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Liderazgo</div>
          <h1 className="page-title">Mi organización</h1>
          <p className="page-sub">¿Estás duplicando o haciéndolo todo personalmente?</p>
        </div>
        <div className="row">
          <Seg label="Periodo" value={weeks} onChange={setWeeks} options={[{ key: '1', label: '1 sem.' }, { key: '4', label: '4 sem.' }, { key: '8', label: '8 sem.' }]} />
        </div>
      </div>

      <section className="card-hero">
        <div className="row" style={{ gap: 20, flexWrap: 'wrap' }}>
          <Gauge value={dup.index} color={TONE_COLOR[dup.band.tone]} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="eyebrow">Índice de duplicación</div>
            <h2 style={{ fontSize: 22, marginTop: 6, color: TONE_COLOR[dup.band.tone] }}>{dup.band.label}</h2>
            <p className="muted" style={{ marginTop: 6 }}>{dup.band.description}</p>
            <p className="tiny faint" style={{ marginTop: 8 }}>
              Mide qué parte del proceso (contactos, presentaciones, seguimientos, altas y autonomía) ejecuta tu equipo sin ti, en las últimas {dup.weeks} semana{dup.weeks > 1 ? 's' : ''}. No mide ventas.
            </p>
          </div>
        </div>
      </section>

      <div className="kpis section">
        <div className="kpi"><div className="kpi-value">{distributors.length}</div><div className="kpi-label">Distribuidores</div></div>
        <div className="kpi"><div className="kpi-value">{clients.length}</div><div className="kpi-label">Clientes en red</div></div>
        <div className="kpi"><div className="kpi-value">{maxDepth}</div><div className="kpi-label">Niveles de profundidad</div></div>
        <div className="kpi"><div className="kpi-value">{active}/{distributors.length}</div><div className="kpi-label">Distribuidores activos (7 días)</div></div>
      </div>

      <div className="grid-2 section" style={{ alignItems: 'start' }}>
        <section className="card">
          <h3 className="section-title" style={{ marginBottom: 4 }}><Icon name="users" size={18} /> ¿Quién ejecuta el proceso?</h3>
          <div className="row tiny faint" style={{ gap: 14, marginBottom: 8 }}>
            <span className="row" style={{ gap: 5 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--accent-2)', display: 'inline-block' }} /> Equipo</span>
            <span className="row" style={{ gap: 5 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--accent)', display: 'inline-block' }} /> Tú</span>
          </div>
          <div className="stack">
            {METRIC_KEYS.map((k) => {
              const t = dup.team[k];
              const l = dup.leader[k];
              const tot = t + l;
              return (
                <div key={k}>
                  <div className="row small" style={{ justifyContent: 'space-between' }}>
                    <span>{METRIC_LABELS[k]}</span>
                    <span className="muted num">{tot ? `Equipo ${t} · Tú ${l} · ${dup.shares[k]}% equipo` : 'Sin datos'}</span>
                  </div>
                  <div className="share-bar" style={{ marginTop: 6 }}>
                    {tot > 0 && <><div className="team" style={{ width: `${(t / tot) * 100}%` }} /><div className="lead" style={{ width: `${(l / tot) * 100}%` }} /></>}
                  </div>
                </div>
              );
            })}
            <div>
              <div className="row small" style={{ justifyContent: 'space-between' }}>
                <span>Autonomía (distribuidores con actividad propia)</span>
                <span className="muted num">{dup.autonomy}%</span>
              </div>
              <div className="share-bar" style={{ marginTop: 6 }}><div className="team" style={{ width: `${dup.autonomy}%` }} /></div>
            </div>
          </div>
        </section>

        <section className="card">
          <h3 className="section-title" style={{ marginBottom: 12 }}><Icon name="target" size={18} /> Qué hacer para duplicar</h3>
          {dup.recommendations.length ? (
            <div className="stack-sm">
              {dup.recommendations.map((r) => <Callout key={r} tone="info" icon="arrow">{r}</Callout>)}
            </div>
          ) : (
            <p className="muted small">Agrega a tu equipo y registra su actividad semanal para recibir recomendaciones.</p>
          )}
        </section>
      </div>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title"><Icon name="tree" size={18} /> Estructura</h2>
          <button className="btn btn-sm btn-primary" onClick={() => setOpen('new')}><Icon name="plus" size={15} /> Agregar miembro</button>
        </div>
        <div className="row tiny faint" style={{ gap: 14, marginBottom: 10, flexWrap: 'wrap' }}>
          <span className="row" style={{ gap: 5 }}><span className="status-dot status-activo" /> Activo (≤7 días)</span>
          <span className="row" style={{ gap: 5 }}><span className="status-dot status-en_riesgo" /> En riesgo (8-21)</span>
          <span className="row" style={{ gap: 5 }}><span className="status-dot status-inactivo" /> Inactivo (&gt;21)</span>
        </div>
        <div className="tree">
          {leader && (
            <button className="tree-node" onClick={() => setOpen(leader)} style={{ borderColor: 'color-mix(in srgb, var(--accent) 45%, transparent)' }}>
              <Avatar name={leader.name} />
              <div className="li-main">
                <div className="li-title">{leader.name} <span className="badge badge-gold">Líder (tú)</span></div>
                <div className="li-sub">{dup.leader.newContacts} contactos · {dup.leader.presentations} presentaciones · {dup.leader.followUps} seguimientos</div>
              </div>
            </button>
          )}
          {renderTree('me', 1)}
        </div>
      </section>

      {open && (
        <MemberSheet
          member={open === 'new' ? null : open}
          summary={open !== 'new' ? byId.get(open.id) : undefined}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
