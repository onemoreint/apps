import { useState } from 'react';
import { useData } from '../app/DataContext';
import { useUI } from '../app/UIContext';
import { goBack, navigate } from '../app/router';
import { Icon } from '../components/Icon';
import { Field, Empty } from '../components/ui';
import { contactsRepo } from '../data/repositories';
import type { Contact, Interest, ObjectionKey, Stage, Temperature } from '../domain/models';
import { INTERESTS, OBJECTIONS, SOURCES, STAGES, TEMPERATURES } from '../domain/labels';
import { toDateKey } from '../utils/dates';

type FormState = {
  firstName: string;
  lastName: string;
  phone: string;
  whatsapp: string;
  sameWa: boolean;
  country: string;
  city: string;
  source: string;
  ownerId: string;
  stage: Stage;
  temperature: Temperature;
  interest: Interest;
  objection: ObjectionKey | '';
  tags: string;
  notes: string;
  naText: string;
  naDate: string;
};

export default function ContactForm({ id }: { id?: string }) {
  const { contactById, members, company } = useData();
  const { toast } = useUI();
  const existing = id ? contactById.get(id) : undefined;
  const [f, setF] = useState<FormState>(() => ({
    firstName: existing?.firstName ?? '',
    lastName: existing?.lastName ?? '',
    phone: existing?.phone ?? '',
    whatsapp: existing?.whatsapp ?? '',
    sameWa: existing ? existing.whatsapp === existing.phone : true,
    country: existing?.country ?? company.country,
    city: existing?.city ?? '',
    source: existing?.source ?? 'Referido',
    ownerId: existing?.ownerId ?? 'me',
    stage: existing?.stage ?? 'nuevo',
    temperature: existing?.temperature ?? 'media',
    interest: existing?.interest ?? 'desconocido',
    objection: existing?.objection ?? '',
    tags: existing?.tags.join(', ') ?? '',
    notes: existing?.notes ?? '',
    naText: existing?.nextAction?.text ?? '',
    naDate: existing?.nextAction ? toDateKey(new Date(existing.nextAction.dueDate)) : '',
  }));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (id && !existing) return <Empty title="Contacto no encontrado" action={<button className="btn" onClick={() => navigate('/contactos')}>Ir a contactos</button>} />;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));
  const owners = members.filter((m) => m.role !== 'cliente');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.firstName.trim()) return setError('El nombre es obligatorio.');
    const phoneDigits = f.phone.replace(/\D/g, '');
    if (f.phone && phoneDigits.length < 7) return setError('El teléfono parece incompleto. Incluye el indicativo del país (ej. +57).');
    if (f.naText.trim() && !f.naDate) return setError('Indica cuándo harás la próxima acción.');
    setError('');
    setSaving(true);
    const data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'lastInteractionAt'> = {
      firstName: f.firstName.trim(),
      lastName: f.lastName.trim(),
      phone: f.phone.trim(),
      whatsapp: (f.sameWa ? f.phone : f.whatsapp).trim(),
      country: f.country.trim(),
      city: f.city.trim(),
      source: f.source,
      ownerId: f.ownerId,
      stage: f.stage,
      temperature: f.temperature,
      interest: f.interest,
      objection: f.objection || null,
      tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean),
      notes: f.notes.trim(),
      nextAction: f.naText.trim() && f.naDate ? { text: f.naText.trim(), dueDate: new Date(`${f.naDate}T09:00`).toISOString() } : null,
    };
    try {
      if (existing) {
        await contactsRepo.update(existing.id, data);
        toast('Contacto actualizado');
        navigate(`/contactos/${existing.id}`, { replace: true });
      } else {
        const newId = await contactsRepo.create(data);
        toast('Contacto creado');
        navigate(`/contactos/${newId}`, { replace: true });
      }
    } catch {
      setError('No se pudo guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <button type="button" className="back-link" onClick={() => goBack('/contactos')}>
        <Icon name="back" size={16} /> Volver
      </button>
      <div className="page-head">
        <div>
          <div className="eyebrow">{existing ? 'Editar contacto' : 'Nuevo contacto'}</div>
          <h1 className="page-title">{existing ? `${existing.firstName} ${existing.lastName}` : 'Registrar persona'}</h1>
        </div>
      </div>

      <div className="stack">
        <section className="card">
          <h2 className="section-title" style={{ marginBottom: 14 }}>Datos básicos</h2>
          <div className="form-grid">
            <Field label="Nombre *" htmlFor="f-first">
              <input id="f-first" className="input" value={f.firstName} onChange={(e) => set('firstName', e.target.value)} autoComplete="given-name" required />
            </Field>
            <Field label="Apellido" htmlFor="f-last">
              <input id="f-last" className="input" value={f.lastName} onChange={(e) => set('lastName', e.target.value)} autoComplete="family-name" />
            </Field>
            <Field label="Teléfono" htmlFor="f-phone">
              <input id="f-phone" className="input" type="tel" inputMode="tel" placeholder="+57 300 000 0000" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <div className="field">
              <label htmlFor="f-wa">WhatsApp</label>
              {f.sameWa ? (
                <button type="button" className="input" style={{ textAlign: 'left', cursor: 'pointer', color: 'var(--muted)' }} onClick={() => set('sameWa', false)} id="f-wa">
                  Igual al teléfono · cambiar
                </button>
              ) : (
                <input id="f-wa" className="input" type="tel" inputMode="tel" value={f.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} />
              )}
            </div>
            <Field label="País" htmlFor="f-country">
              <input id="f-country" className="input" value={f.country} onChange={(e) => set('country', e.target.value)} autoComplete="country-name" />
            </Field>
            <Field label="Ciudad" htmlFor="f-city">
              <input id="f-city" className="input" value={f.city} onChange={(e) => set('city', e.target.value)} />
            </Field>
            <Field label="Origen" htmlFor="f-source">
              <select id="f-source" className="select" value={f.source} onChange={(e) => set('source', e.target.value)}>
                {SOURCES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Responsable" htmlFor="f-owner">
              <select id="f-owner" className="select" value={f.ownerId} onChange={(e) => set('ownerId', e.target.value)}>
                {owners.map((m) => <option key={m.id} value={m.id}>{m.id === 'me' ? `${m.name} (yo)` : m.name}</option>)}
                {!owners.some((m) => m.id === 'me') && <option value="me">Yo</option>}
              </select>
            </Field>
          </div>
        </section>

        <section className="card">
          <h2 className="section-title" style={{ marginBottom: 14 }}>Situación</h2>
          <div className="form-grid">
            <Field label="Estado" htmlFor="f-stage">
              <select id="f-stage" className="select" value={f.stage} onChange={(e) => set('stage', e.target.value as Stage)}>
                {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Interés" htmlFor="f-interest">
              <select id="f-interest" className="select" value={f.interest} onChange={(e) => set('interest', e.target.value as Interest)}>
                {INTERESTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </Field>
            <div className="field full">
              <span className="label">Temperatura</span>
              <div className="row-wrap">
                {TEMPERATURES.map((t) => (
                  <button type="button" key={t.key} className={`chip ${f.temperature === t.key ? 'on' : ''}`} onClick={() => set('temperature', t.key)} aria-pressed={f.temperature === t.key}>
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Objeción" htmlFor="f-obj">
              <select id="f-obj" className="select" value={f.objection} onChange={(e) => set('objection', e.target.value as ObjectionKey | '')}>
                <option value="">Ninguna registrada</option>
                {OBJECTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Etiquetas (separadas por coma)" htmlFor="f-tags">
              <input id="f-tags" className="input" placeholder="emprendedor, mamá, deportista" value={f.tags} onChange={(e) => set('tags', e.target.value)} />
            </Field>
            <Field label="Notas" full htmlFor="f-notes">
              <textarea id="f-notes" className="textarea" placeholder="¿Qué sabes de esta persona? ¿Qué le importa?" value={f.notes} onChange={(e) => set('notes', e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="card">
          <h2 className="section-title" style={{ marginBottom: 6 }}>Próxima acción</h2>
          <p className="small muted" style={{ marginBottom: 14 }}>Opcional. Si no la defines, el motor te sugerirá una según el historial.</p>
          <div className="form-grid">
            <Field label="Qué hacer" htmlFor="f-na">
              <input id="f-na" className="input" placeholder="Ej.: Enviarle la ficha del producto" value={f.naText} onChange={(e) => set('naText', e.target.value)} />
            </Field>
            <Field label="Cuándo" htmlFor="f-nad">
              <input id="f-nad" className="input" type="date" value={f.naDate} onChange={(e) => set('naDate', e.target.value)} />
            </Field>
          </div>
        </section>

        {error && <div className="callout bad" role="alert"><Icon name="alert" size={18} />{error}</div>}

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={() => goBack('/contactos')}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Icon name="check" size={18} /> {existing ? 'Guardar cambios' : 'Crear contacto'}
          </button>
        </div>
      </div>
    </form>
  );
}
