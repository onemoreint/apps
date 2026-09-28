import { useData } from '../app/DataContext';
import { useUI } from '../app/UIContext';
import { goBack, navigate } from '../app/router';
import { Icon } from '../components/Icon';
import { Avatar, Empty, PriorityBadge, TempBadge, fullName, waLink } from '../components/ui';
import { contactsRepo, interactionsRepo } from '../data/repositories';
import { evaluateAll } from '../domain/engine/nextBestAction';
import { INTERACTION_TYPES, interestLabel, objectionLabel, stageLabel, topicLabel, typeLabel } from '../domain/labels';
import { daysBetween, dueLabel, formatDate, formatDateTime, relativeDay } from '../utils/dates';
import type { Interaction } from '../domain/models';

function TimelineItem({ i, onDelete }: { i: Interaction; onDelete: () => void }) {
  const icon = INTERACTION_TYPES.find((t) => t.key === i.type)?.icon ?? 'note';
  const cls = i.direction === 'entrante' ? 'in' : i.direction === 'saliente' ? 'out' : 'int';
  const title =
    i.type === 'cambio_estado'
      ? i.meta?.from
        ? `Estado: ${stageLabel(i.meta.from)} → ${stageLabel(i.meta.to!)}`
        : i.note || `Estado inicial: ${stageLabel(i.meta?.to ?? 'nuevo')}`
      : typeLabel(i.type);
  return (
    <div className="tl-item">
      <div className={`tl-dot ${cls}`}><Icon name={icon} size={13} /></div>
      <div className="tl-head">
        <b>{title}</b>
        {i.direction === 'entrante' && <span className="badge badge-good">Recibido</span>}
        {i.direction === 'saliente' && <span className="badge">Enviado</span>}
        {i.topics.map((t) => <span key={t} className="badge badge-gold">{topicLabel(t)}</span>)}
        <span className="spacer" />
        <span className="tiny faint">{formatDateTime(i.date)}</span>
        {i.type !== 'cambio_estado' && (
          <button className="btn btn-sm btn-ghost" style={{ minHeight: 28, padding: '0 6px' }} onClick={onDelete} aria-label="Eliminar interacción">
            <Icon name="trash" size={14} />
          </button>
        )}
      </div>
      {i.note && i.type !== 'cambio_estado' && <p className="tl-note">{i.note}</p>}
    </div>
  );
}

export default function ContactProfile({ id }: { id: string }) {
  const { contactById, interactions, members, now } = useData();
  const { openLog, confirm, toast } = useUI();
  const c = contactById.get(id);
  if (!c) return <Empty title="Contacto no encontrado" action={<button className="btn" onClick={() => navigate('/contactos')}>Ir a contactos</button>} />;

  const own = interactions.filter((i) => i.contactId === id).sort((a, b) => b.date.localeCompare(a.date));
  const actions = evaluateAll(c, own, now);
  const best = actions[0];
  const owner = members.find((m) => m.id === c.ownerId);

  async function remove() {
    const ok = await confirm({ title: 'Eliminar contacto', message: `Se eliminará a ${fullName(c!)} y todo su historial. Esta acción no se puede deshacer.`, confirmLabel: 'Eliminar', danger: true });
    if (!ok) return;
    await contactsRepo.remove(id);
    toast('Contacto eliminado');
    navigate('/contactos', { replace: true });
  }

  async function removeInteraction(iid: string) {
    const ok = await confirm({ title: 'Eliminar interacción', message: '¿Eliminar este registro del historial?', confirmLabel: 'Eliminar', danger: true });
    if (ok) await interactionsRepo.remove(iid);
  }

  async function completeNextAction() {
    await contactsRepo.update(id, { nextAction: null });
    openLog({ contactId: id, note: c!.nextAction?.text });
  }

  return (
    <>
      <button className="back-link" onClick={() => goBack('/contactos')}>
        <Icon name="back" size={16} /> Volver
      </button>

      <section className="card-hero">
        <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
          <Avatar name={fullName(c)} size="lg" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="page-title" style={{ fontSize: 24 }}>{fullName(c)}</h1>
            <div className="row-wrap" style={{ marginTop: 8 }}>
              <span className="badge badge-gold">{stageLabel(c.stage)}</span>
              <TempBadge t={c.temperature} />
              <span className="badge">Interés: {interestLabel(c.interest)}</span>
              {c.objection && <span className="badge badge-bad">Objeción: {objectionLabel(c.objection)}</span>}
            </div>
            <p className="small muted" style={{ marginTop: 8 }}>
              {[c.city, c.country].filter(Boolean).join(', ') || 'Sin ubicación'} · Última interacción {relativeDay(c.lastInteractionAt, now)}
            </p>
          </div>
        </div>
        <div className="row-wrap" style={{ marginTop: 16 }}>
          {c.whatsapp && (
            <a className="btn btn-wa" href={waLink(c.whatsapp)} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" size={17} /> WhatsApp</a>
          )}
          {c.phone && <a className="btn" href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}><Icon name="phone" size={17} /> Llamar</a>}
          <button className="btn btn-primary" onClick={() => openLog({ contactId: id })}><Icon name="plus" size={17} /> Registrar interacción</button>
          <button className="btn" onClick={() => navigate(`/contactos/${id}/editar`)}><Icon name="edit" size={16} /> Editar</button>
        </div>
      </section>

      <section className="section" aria-labelledby="proxima">
        <h2 className="section-title" id="proxima" style={{ marginBottom: 12 }}><Icon name="bolt" size={19} /> Próxima acción</h2>
        {best ? (
          <div className={`action-card ${best.priority}`}>
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <span className="eyebrow">Sugerida por el motor</span>
              <PriorityBadge p={best.priority} />
            </div>
            <dl className="kv" style={{ marginTop: 12 }}>
              <dt>Qué hacer</dt>
              <dd><b>{best.action}</b></dd>
              <dt>Por qué</dt>
              <dd className="muted">{best.situation} {best.reason}</dd>
              <dt>Cuándo</dt>
              <dd>{dueLabel(best.dueDate, now)}</dd>
            </dl>
            <div className="action-foot">
              <button className="btn btn-sm btn-blue" onClick={() => navigate(`/conversaciones?situacion=${best.conversation}&contacto=${id}`)}>
                <Icon name="sparkle" size={15} /> Sugerir mensaje
              </button>
              <button className="btn btn-sm" onClick={() => openLog({ contactId: id })}><Icon name="check" size={15} /> Ya lo hice: registrar</button>
              {c.objection && (
                <button className="btn btn-sm" onClick={() => navigate(`/objeciones?contacto=${id}`)}><Icon name="shield" size={15} /> Trabajar objeción</button>
              )}
            </div>
            {actions.length > 1 && (
              <details style={{ marginTop: 12 }}>
                <summary className="small muted" style={{ cursor: 'pointer' }}>Otras señales detectadas ({actions.length - 1})</summary>
                <ul className="small muted" style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                  {actions.slice(1).map((a) => <li key={a.ruleId}>{a.situation} → {a.action}</li>)}
                </ul>
              </details>
            )}
          </div>
        ) : c.nextAction ? (
          <div className="action-card baja">
            <span className="eyebrow">Programada por ti</span>
            <dl className="kv" style={{ marginTop: 12 }}>
              <dt>Qué hacer</dt>
              <dd><b>{c.nextAction.text}</b></dd>
              <dt>Por qué</dt>
              <dd className="muted">Lo acordaste como siguiente paso. Mientras esté programado, el motor no insiste.</dd>
              <dt>Cuándo</dt>
              <dd>{dueLabel(c.nextAction.dueDate, now)} · {formatDate(c.nextAction.dueDate)}</dd>
            </dl>
            <div className="action-foot">
              <button className="btn btn-sm" onClick={completeNextAction}><Icon name="check" size={15} /> Marcar hecha</button>
              <button className="btn btn-sm btn-blue" onClick={() => navigate(`/conversaciones?situacion=seguimiento&contacto=${id}`)}><Icon name="sparkle" size={15} /> Sugerir mensaje</button>
            </div>
          </div>
        ) : (
          <div className="callout good">
            <Icon name="check" size={18} />
            <div>
              <b>Sin acción urgente.</b>
              <div className="small muted">
                {c.stage === 'no_interesado'
                  ? 'Marcado como no interesado: el sistema respeta su decisión y no sugiere contactarlo.'
                  : `No hay señales que requieran atención ahora. ${daysBetween(c.lastInteractionAt, now) < 7 ? 'La última interacción es reciente.' : 'Puedes definir una próxima acción al registrar una interacción.'}`}
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="grid-2 section" style={{ alignItems: 'start' }}>
        <section className="card" aria-labelledby="info">
          <h2 className="section-title" id="info" style={{ marginBottom: 12 }}><Icon name="user" size={18} /> Información</h2>
          <dl className="kv">
            <dt>WhatsApp</dt><dd>{c.whatsapp || '—'}</dd>
            <dt>Teléfono</dt><dd>{c.phone || '—'}</dd>
            <dt>País</dt><dd>{c.country || '—'}</dd>
            <dt>Ciudad</dt><dd>{c.city || '—'}</dd>
            <dt>Estado</dt><dd>{stageLabel(c.stage)}</dd>
            <dt>Interés</dt><dd>{interestLabel(c.interest)}</dd>
            <dt>Origen</dt><dd>{c.source || '—'}</dd>
            <dt>Responsable</dt><dd>{owner ? (owner.id === 'me' ? `${owner.name} (yo)` : owner.name) : 'Yo'}</dd>
            <dt>Creado</dt><dd>{formatDate(c.createdAt)}</dd>
            <dt>Etiquetas</dt><dd>{c.tags.length ? c.tags.join(', ') : '—'}</dd>
          </dl>
          {c.notes && (
            <>
              <div className="divider" />
              <div className="label" style={{ marginBottom: 6 }}>Notas</div>
              <p className="small" style={{ whiteSpace: 'pre-wrap' }}>{c.notes}</p>
            </>
          )}
          <div className="divider" />
          <button className="btn btn-sm btn-danger" onClick={remove}><Icon name="trash" size={15} /> Eliminar contacto</button>
        </section>

        <section className="card" aria-labelledby="hist">
          <div className="section-head">
            <h2 className="section-title" id="hist"><Icon name="clock" size={18} /> Historial</h2>
            <button className="btn btn-sm" onClick={() => openLog({ contactId: id })}><Icon name="plus" size={15} /> Añadir</button>
          </div>
          {own.length ? (
            <div className="timeline">
              {own.map((i) => <TimelineItem key={i.id} i={i} onDelete={() => removeInteraction(i.id)} />)}
            </div>
          ) : (
            <p className="muted small">Sin historial todavía.</p>
          )}
        </section>
      </div>
    </>
  );
}
