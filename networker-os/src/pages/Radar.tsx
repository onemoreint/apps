import { useState } from 'react';
import { useData } from '../app/DataContext';
import { navigate } from '../app/router';
import { Icon } from '../components/Icon';
import { Avatar, Empty, TempBadge, fullName } from '../components/ui';
import type { NextBestAction } from '../domain/models';
import type { PotentialResult } from '../domain/engine/radar';
import { stageLabel } from '../domain/labels';

type Tab = 'todo' | 'inmediata' | 'seguimiento' | 'recuperacion' | 'distribuidor' | 'cliente';

const BUCKETS = [
  { key: 'inmediata' as const, emoji: '🔥', title: 'Atención inmediata', desc: 'Interacción reciente o pendiente de tu respuesta, con interés alto.' },
  { key: 'seguimiento' as const, emoji: '🟡', title: 'Seguimiento', desc: 'Personas que necesitan una nueva interacción.' },
  { key: 'recuperacion' as const, emoji: '💤', title: 'Recuperación', desc: 'Dejaron de interactuar pero antes mostraron interés.' },
];

function ActionRow({ a }: { a: NextBestAction }) {
  const { contactById } = useData();
  const c = contactById.get(a.contactId)!;
  return (
    <button className="list-item" onClick={() => navigate(`/contactos/${c.id}`)} style={{ alignItems: 'flex-start' }}>
      <Avatar name={fullName(c)} />
      <div className="li-main">
        <div className="li-title">
          {fullName(c)} <span className={`badge badge-${a.priority}`}>{a.priority}</span>
        </div>
        <div className="small" style={{ marginTop: 2 }}>{a.situation}</div>
        <div className="small faint" style={{ marginTop: 2 }}>{a.reason}</div>
        <div className="small" style={{ marginTop: 6, color: 'var(--accent)', fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center' }}>
          <Icon name="arrow" size={14} /> {a.action}
        </div>
      </div>
      <Icon name="chevron" size={16} className="faint" />
    </button>
  );
}

function PotentialRow({ p }: { p: PotentialResult }) {
  const c = p.contact;
  return (
    <button className="list-item" onClick={() => navigate(`/contactos/${c.id}`)} style={{ alignItems: 'flex-start' }}>
      <Avatar name={fullName(c)} />
      <div className="li-main">
        <div className="li-title">
          {fullName(c)} <TempBadge t={c.temperature} compact />
        </div>
        <div className="small faint">{stageLabel(c.stage)}</div>
        <ul className="small muted" style={{ margin: '6px 0 0', paddingLeft: 18 }}>
          {p.signals.map((s) => <li key={s}>{s}</li>)}
        </ul>
      </div>
      <span className="badge badge-gold" title="Número de señales ponderadas">{p.score} pts</span>
    </button>
  );
}

export default function Radar() {
  const { radar } = useData();
  const [tab, setTab] = useState<Tab>('todo');
  const counts: Record<Tab, number> = {
    todo: radar.all.length,
    inmediata: radar.inmediata.length,
    seguimiento: radar.seguimiento.length,
    recuperacion: radar.recuperacion.length,
    distribuidor: radar.potencialDistribuidor.length,
    cliente: radar.potencialCliente.length,
  };
  const tabs: { key: Tab; label: string }[] = [
    { key: 'todo', label: 'Todo' },
    { key: 'inmediata', label: '🔥 Inmediata' },
    { key: 'seguimiento', label: '🟡 Seguimiento' },
    { key: 'recuperacion', label: '💤 Recuperación' },
    { key: 'distribuidor', label: '⭐ Potencial distribuidor' },
    { key: 'cliente', label: '👤 Potencial cliente' },
  ];
  const show = (k: Tab) => tab === 'todo' || tab === k;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Radar</div>
          <h1 className="page-title">Oportunidades de acción</h1>
          <p className="page-sub">El sistema analiza tu lista y te muestra a quién atender, por qué y qué hacer.</p>
        </div>
      </div>

      <div className="chips-scroll" role="tablist" aria-label="Categorías del radar">
        {tabs.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={`chip ${tab === t.key ? 'on' : ''}`} onClick={() => setTab(t.key)}>
            {t.label} <span className="n">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      {BUCKETS.filter((b) => show(b.key)).map((b) => (
        <section className="section" key={b.key}>
          <div className="section-head">
            <div className="bucket-head">
              <div className="bucket-icon" aria-hidden="true">{b.emoji}</div>
              <div>
                <h2 className="section-title">{b.title} <span className="badge">{radar[b.key].length}</span></h2>
                <div className="small faint">{b.desc}</div>
              </div>
            </div>
          </div>
          {radar[b.key].length ? (
            <div className="list">{radar[b.key].map((a) => <ActionRow key={a.contactId} a={a} />)}</div>
          ) : (
            <Empty icon="check" title="Nada por aquí">No hay contactos en esta categoría ahora mismo.</Empty>
          )}
        </section>
      ))}

      {show('distribuidor') && (
        <section className="section">
          <div className="section-head">
            <div className="bucket-head">
              <div className="bucket-icon" aria-hidden="true">⭐</div>
              <div>
                <h2 className="section-title">Potencial distribuidor <span className="badge">{radar.potencialDistribuidor.length}</span></h2>
                <div className="small faint">Personas que muestran señales de interés por el negocio.</div>
              </div>
            </div>
          </div>
          {radar.potencialDistribuidor.length ? (
            <div className="list">{radar.potencialDistribuidor.map((p) => <PotentialRow key={p.contact.id} p={p} />)}</div>
          ) : (
            <Empty title="Sin señales todavía">Registra los temas de cada conversación (ej. "negocio") para detectar potencial.</Empty>
          )}
        </section>
      )}

      {show('cliente') && (
        <section className="section">
          <div className="section-head">
            <div className="bucket-head">
              <div className="bucket-icon" aria-hidden="true">👤</div>
              <div>
                <h2 className="section-title">Potencial cliente <span className="badge">{radar.potencialCliente.length}</span></h2>
                <div className="small faint">Personas interesadas principalmente en productos.</div>
              </div>
            </div>
          </div>
          {radar.potencialCliente.length ? (
            <div className="list">{radar.potencialCliente.map((p) => <PotentialRow key={p.contact.id} p={p} />)}</div>
          ) : (
            <Empty title="Sin señales todavía">Registra cuando alguien pregunte por precio o producto.</Empty>
          )}
        </section>
      )}

      <p className="tiny faint section">
        El Radar es un sistema de reglas de productividad basado en lo que registras (fechas, temas, estado y temperatura). No es una predicción: tu criterio siempre manda.
      </p>
    </>
  );
}
