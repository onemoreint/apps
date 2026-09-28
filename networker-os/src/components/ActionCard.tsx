import { Icon } from './Icon';
import { Avatar, PriorityBadge, TempBadge, fullName, waLink } from './ui';
import type { Contact, NextBestAction } from '../domain/models';
import { navigate } from '../app/router';
import { useUI } from '../app/UIContext';
import { dueLabel } from '../utils/dates';

export function ActionCard({ action, contact, rank, now }: { action: NextBestAction; contact: Contact; rank?: number; now: Date }) {
  const { openLog } = useUI();
  return (
    <article className={`action-card ${action.priority}`}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        {rank !== undefined && <div className="action-rank">{rank}</div>}
        <Avatar name={fullName(contact)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
            <button className="action-name" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }} onClick={() => navigate(`/contactos/${contact.id}`)}>
              {fullName(contact)}
            </button>
            <div className="row" style={{ gap: 6 }}>
              <TempBadge t={contact.temperature} compact />
              <PriorityBadge p={action.priority} />
            </div>
          </div>
          <p className="action-situation">{action.situation}</p>
        </div>
      </div>
      <p className="action-reason">
        <Icon name="info" size={15} />
        <span><b style={{ color: 'var(--text)', fontWeight: 600 }}>Por qué: </b>{action.reason}</span>
      </p>
      <div className="action-next">
        <Icon name="arrow" size={17} />
        <span style={{ flex: 1 }}>{action.action}</span>
        <span className="tiny faint" style={{ fontWeight: 500 }}>{dueLabel(action.dueDate, now)}</span>
      </div>
      <div className="action-foot">
        <button className="btn btn-sm btn-blue" onClick={() => navigate(`/conversaciones?situacion=${action.conversation}&contacto=${contact.id}`)}>
          <Icon name="sparkle" size={15} /> Sugerir mensaje
        </button>
        <button className="btn btn-sm" onClick={() => openLog({ contactId: contact.id })}>
          <Icon name="check" size={15} /> Registrar
        </button>
        {contact.whatsapp && (
          <a className="btn btn-sm btn-wa" href={waLink(contact.whatsapp)} target="_blank" rel="noopener noreferrer" aria-label={`Abrir WhatsApp con ${contact.firstName}`}>
            <Icon name="whatsapp" size={15} /> WhatsApp
          </a>
        )}
        <button className="btn btn-sm btn-ghost" onClick={() => navigate(`/contactos/${contact.id}`)}>
          Abrir contacto <Icon name="chevron" size={15} />
        </button>
      </div>
    </article>
  );
}
