import { useMemo, useState } from 'react';
import { Sheet, Field, Seg, fullName } from './ui';
import { useData } from '../app/DataContext';
import { interactionsRepo, contactsRepo } from '../data/repositories';
import type { Direction, InteractionType, Stage, Temperature, Topic } from '../domain/models';
import { DIRECTIONS, INTERACTION_TYPES, STAGES, TEMPERATURES, TOPICS } from '../domain/labels';
import { addDays, daysBetween, toDateKey } from '../utils/dates';
import { Icon } from './Icon';

export interface LogPreset {
  contactId?: string;
  type?: InteractionType;
  direction?: Direction;
  note?: string;
  topics?: Topic[];
}

function localInput(d: Date) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export function LogInteractionSheet({ preset, onClose, onSaved }: { preset: LogPreset; onClose: () => void; onSaved: (msg: string) => void }) {
  const { contacts, now } = useData();
  const sorted = useMemo(() => [...contacts].sort((a, b) => fullName(a).localeCompare(fullName(b))), [contacts]);
  const [contactId, setContactId] = useState(preset.contactId ?? '');
  const contact = contacts.find((c) => c.id === contactId);
  const [type, setType] = useState<InteractionType>(preset.type ?? 'mensaje');
  const [direction, setDirection] = useState<Direction>(preset.direction ?? 'saliente');
  const [topics, setTopics] = useState<Topic[]>(preset.topics ?? []);
  const [note, setNote] = useState(preset.note ?? '');
  const [date, setDate] = useState(localInput(now));
  const [stage, setStage] = useState<Stage | ''>('');
  const [temp, setTemp] = useState<Temperature | ''>('');
  const dueNow = contact?.nextAction ? daysBetween(contact.nextAction.dueDate, now) >= 0 : false;
  const [naMode, setNaMode] = useState<'keep' | 'done' | 'new'>(dueNow ? 'done' : 'keep');
  const [naText, setNaText] = useState('');
  const [naDate, setNaDate] = useState(toDateKey(addDays(now, 2)));
  const [saving, setSaving] = useState(false);

  const toggleTopic = (t: Topic) => setTopics((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  async function save() {
    if (!contactId) return;
    setSaving(true);
    try {
      await interactionsRepo.add({
        contactId,
        type,
        direction: type === 'nota' ? 'interna' : direction,
        topics,
        note: note.trim(),
        date: new Date(date).toISOString(),
        newStage: stage || undefined,
        nextAction:
          naMode === 'done' ? 'clear' : naMode === 'new' && naText.trim() ? { text: naText.trim(), dueDate: new Date(`${naDate}T09:00`).toISOString() } : undefined,
      });
      if (temp && contact && temp !== contact.temperature) await contactsRepo.update(contactId, { temperature: temp });
      onSaved('Interacción registrada. Las prioridades se actualizaron.');
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      title="Registrar interacción"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={!contactId || saving}>
            <Icon name="check" size={18} /> Guardar
          </button>
        </>
      }
    >
      <div className="stack">
        {!preset.contactId && (
          <Field label="Contacto" htmlFor="log-contact">
            <select id="log-contact" className="select" value={contactId} onChange={(e) => setContactId(e.target.value)}>
              <option value="">Selecciona un contacto…</option>
              {sorted.map((c) => (
                <option key={c.id} value={c.id}>{fullName(c)}</option>
              ))}
            </select>
          </Field>
        )}
        {contact && preset.contactId && <div className="muted small">Con <b style={{ color: 'var(--text)' }}>{fullName(contact)}</b></div>}

        <div className="field">
          <span className="label">Tipo</span>
          <div className="row-wrap">
            {INTERACTION_TYPES.filter((t) => t.key !== 'cambio_estado').map((t) => (
              <button key={t.key} type="button" className={`chip ${type === t.key ? 'on' : ''}`} onClick={() => setType(t.key)} aria-pressed={type === t.key}>
                <Icon name={t.icon} size={15} /> {t.label}
              </button>
            ))}
          </div>
        </div>

        {type !== 'nota' && (
          <div className="field">
            <span className="label">¿Quién dio el paso?</span>
            <Seg label="Dirección" value={direction} onChange={setDirection} options={DIRECTIONS.filter((d) => d.key !== 'interna')} />
            <span className="tiny faint">Si te escribió y aún no le respondes, el Radar lo marcará como prioridad.</span>
          </div>
        )}

        <div className="field">
          <span className="label">Temas de la conversación</span>
          <div className="row-wrap">
            {TOPICS.map((t) => (
              <button key={t.key} type="button" className={`chip ${topics.includes(t.key) ? 'on' : ''}`} onClick={() => toggleTopic(t.key)} aria-pressed={topics.includes(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <Field label="Qué pasó" htmlFor="log-note">
          <textarea id="log-note" className="textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej.: Preguntó cuánto cuesta el paquete mensual" />
        </Field>

        <div className="form-grid">
          <Field label="Fecha y hora" htmlFor="log-date">
            <input id="log-date" type="datetime-local" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Cambiar estado" htmlFor="log-stage">
            <select id="log-stage" className="select" value={stage} onChange={(e) => setStage(e.target.value as Stage | '')}>
              <option value="">Sin cambio{contact ? ` (${STAGES.find((s) => s.key === contact.stage)?.label})` : ''}</option>
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Temperatura" htmlFor="log-temp">
            <select id="log-temp" className="select" value={temp} onChange={(e) => setTemp(e.target.value as Temperature | '')}>
              <option value="">Sin cambio</option>
              {TEMPERATURES.map((t) => (
                <option key={t.key} value={t.key}>{t.emoji} {t.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="field">
          <span className="label">Próxima acción</span>
          <Seg
            label="Próxima acción"
            value={naMode}
            onChange={setNaMode}
            options={[
              { key: 'keep', label: contact?.nextAction ? 'Mantener' : 'Sin definir' },
              ...(contact?.nextAction ? [{ key: 'done' as const, label: 'Marcar hecha' }] : []),
              { key: 'new', label: 'Definir nueva' },
            ]}
          />
          {contact?.nextAction && naMode !== 'new' && <span className="tiny faint">Actual: {contact.nextAction.text}</span>}
          {naMode === 'new' && (
            <div className="form-grid" style={{ marginTop: 6 }}>
              <input className="input" aria-label="Qué hacer" placeholder="Qué hacer (ej.: Llamarlo para agendar)" value={naText} onChange={(e) => setNaText(e.target.value)} />
              <input className="input" aria-label="Cuándo" type="date" value={naDate} onChange={(e) => setNaDate(e.target.value)} />
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}
