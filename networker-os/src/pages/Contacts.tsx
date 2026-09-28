import { useMemo, useState } from 'react';
import { useData } from '../app/DataContext';
import { navigate } from '../app/router';
import { Icon } from '../components/Icon';
import { Avatar, Empty, fullName } from '../components/ui';
import { STAGES, TEMPERATURES, stageLabel, tempInfo } from '../domain/labels';
import type { Stage, Temperature } from '../domain/models';
import { daysBetween, dueLabel, relativeDay } from '../utils/dates';
import { isActive, isCold } from '../domain/engine/stats';
import { normalize } from '../domain/compliance';

type Sort = 'prioridad' | 'reciente' | 'nombre' | 'creacion';
const FILTERS: Record<string, string> = { nuevos: 'Nuevos (7 días)', activos: 'Activos', frios: 'Fríos' };

export default function Contacts({ query }: { query: URLSearchParams }) {
  const { contacts, actionByContact, now } = useData();
  const [q, setQ] = useState(query.get('q') ?? '');
  const [stage, setStage] = useState<Stage | ''>((query.get('estado') as Stage) ?? '');
  const [temp, setTemp] = useState<Temperature | ''>((query.get('temp') as Temperature) ?? '');
  const [filtro, setFiltro] = useState(query.get('filtro') ?? '');
  const [sort, setSort] = useState<Sort>('prioridad');

  const stageCounts = useMemo(() => {
    const m = new Map<Stage, number>();
    for (const c of contacts) m.set(c.stage, (m.get(c.stage) ?? 0) + 1);
    return m;
  }, [contacts]);

  const list = useMemo(() => {
    const nq = normalize(q.trim());
    let r = contacts.filter((c) => {
      if (stage && c.stage !== stage) return false;
      if (temp && c.temperature !== temp) return false;
      if (filtro === 'nuevos' && daysBetween(c.createdAt, now) > 7) return false;
      if (filtro === 'activos' && !isActive(now)(c)) return false;
      if (filtro === 'frios' && !isCold(now)(c)) return false;
      if (nq) {
        const hay = normalize(`${c.firstName} ${c.lastName} ${c.city} ${c.country} ${c.tags.join(' ')} ${c.phone} ${c.notes}`);
        if (!hay.includes(nq)) return false;
      }
      return true;
    });
    r = [...r].sort((a, b) => {
      if (sort === 'nombre') return fullName(a).localeCompare(fullName(b));
      if (sort === 'creacion') return b.createdAt.localeCompare(a.createdAt);
      if (sort === 'reciente') return (b.lastInteractionAt ?? '').localeCompare(a.lastInteractionAt ?? '');
      return (actionByContact.get(b.id)?.score ?? -1) - (actionByContact.get(a.id)?.score ?? -1);
    });
    return r;
  }, [contacts, q, stage, temp, filtro, sort, actionByContact, now]);

  const hasFilters = !!(stage || temp || filtro || q);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Contactos</div>
          <h1 className="page-title">Tu lista</h1>
          <p className="page-sub">{contacts.length} contactos · ordenados por lo que requiere tu atención</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/contactos/nuevo')}>
          <Icon name="plus" size={18} /> Nuevo contacto
        </button>
      </div>

      <div className="stack">
        <div className="row" style={{ gap: 8 }}>
          <div className="search" style={{ flex: 1 }}>
            <Icon name="search" size={18} />
            <input className="input" type="search" placeholder="Buscar por nombre, ciudad, etiqueta…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar contactos" />
          </div>
          <select className="select" style={{ width: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Ordenar">
            <option value="prioridad">Prioridad</option>
            <option value="reciente">Última interacción</option>
            <option value="creacion">Más nuevos</option>
            <option value="nombre">Nombre</option>
          </select>
        </div>

        <div className="chips-scroll" aria-label="Filtrar por estado">
          <button className={`chip ${!stage ? 'on' : ''}`} onClick={() => setStage('')}>Todos <span className="n">{contacts.length}</span></button>
          {STAGES.filter((s) => stageCounts.get(s.key)).map((s) => (
            <button key={s.key} className={`chip ${stage === s.key ? 'on' : ''}`} onClick={() => setStage(stage === s.key ? '' : s.key)}>
              {s.short} <span className="n">{stageCounts.get(s.key)}</span>
            </button>
          ))}
        </div>
        <div className="chips-scroll" aria-label="Filtrar por temperatura">
          {TEMPERATURES.map((t) => (
            <button key={t.key} className={`chip ${temp === t.key ? 'on' : ''}`} onClick={() => setTemp(temp === t.key ? '' : t.key)}>
              {t.emoji} {t.label}
            </button>
          ))}
          {Object.entries(FILTERS).map(([k, label]) => (
            <button key={k} className={`chip ${filtro === k ? 'on' : ''}`} onClick={() => setFiltro(filtro === k ? '' : k)}>{label}</button>
          ))}
          {hasFilters && (
            <button className="chip" onClick={() => { setStage(''); setTemp(''); setFiltro(''); setQ(''); }}>
              <Icon name="close" size={14} /> Limpiar
            </button>
          )}
        </div>

        {list.length ? (
          <div className="list">
            {list.map((c) => {
              const a = actionByContact.get(c.id);
              return (
                <button key={c.id} className="list-item" onClick={() => navigate(`/contactos/${c.id}`)}>
                  <Avatar name={fullName(c)} />
                  <div className="li-main">
                    <div className="li-title">
                      <span className="ellipsis">{fullName(c)}</span>
                      <span title={`Temperatura ${tempInfo(c.temperature).label}`}>{tempInfo(c.temperature).emoji}</span>
                    </div>
                    <div className="li-sub">
                      {a ? <span style={{ color: 'var(--text)' }}>{a.action}</span> : c.nextAction ? `Próxima: ${c.nextAction.text}` : `${stageLabel(c.stage)}${c.city ? ` · ${c.city}` : ''}`}
                    </div>
                  </div>
                  <div className="li-meta">
                    {a ? (
                      <span className={`badge badge-${a.priority}`}>{a.priority === 'alta' ? 'Hoy' : a.priority === 'media' ? 'Pronto' : 'Cuando puedas'}</span>
                    ) : c.nextAction ? (
                      <span className="badge">{dueLabel(c.nextAction.dueDate, now)}</span>
                    ) : (
                      <span className="badge">{stageLabel(c.stage)}</span>
                    )}
                    <span className="tiny faint">{relativeDay(c.lastInteractionAt, now)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : contacts.length ? (
          <Empty icon="search" title="Sin resultados">Prueba con otros filtros o búsqueda.</Empty>
        ) : (
          <Empty icon="users" title="Aún no tienes contactos" action={<button className="btn btn-primary" onClick={() => navigate('/contactos/nuevo')}><Icon name="plus" size={17} /> Agregar el primero</button>}>
            Empieza con 5 personas que conozcas. El sistema te dirá qué hacer con cada una.
          </Empty>
        )}
      </div>
    </>
  );
}
