import { useEffect, useMemo, useState } from 'react';
import { useData } from '../app/DataContext';
import { useUI } from '../app/UIContext';
import { Icon } from '../components/Icon';
import { Callout, Field, Seg, copyText, fullName, waLink } from '../components/ui';
import { CHANNELS, SITUATIONS, STYLES, type Channel, type Style } from '../domain/content/conversations';
import { aiService } from '../services/aiService';
import { checkCompliance } from '../domain/compliance';
import { interactionsRepo } from '../data/repositories';
import type { SituationKey } from '../domain/models';

const GROUPS = ['Inicio', 'Seguimiento', 'Interés', 'Objeción'] as const;

export default function Conversations({ query }: { query: URLSearchParams }) {
  const { contacts, company, now } = useData();
  const { toast } = useUI();
  const initialSituation = (query.get('situacion') as SituationKey) || 'primer_contacto';
  const [situation, setSituation] = useState<SituationKey>(SITUATIONS.some((s) => s.key === initialSituation) ? initialSituation : 'primer_contacto');
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [style, setStyle] = useState<Style>('natural');
  const [contactId, setContactId] = useState(query.get('contacto') ?? '');
  const [variant, setVariant] = useState(0);
  const contact = contacts.find((c) => c.id === contactId);

  const result = useMemo(
    () =>
      aiService.generateConversation({
        situation,
        channel,
        style,
        name: contact?.firstName,
        company: company.name,
        productCategory: company.productCategory,
        variant,
        now,
      }),
    [situation, channel, style, contact?.firstName, company.name, company.productCategory, variant, now],
  );
  const [text, setText] = useState(result.text);
  useEffect(() => setText(result.text), [result.text]);
  const issues = checkCompliance(text);
  const sorted = useMemo(() => [...contacts].filter((c) => c.stage !== 'no_interesado').sort((a, b) => fullName(a).localeCompare(fullName(b))), [contacts]);

  async function copy() {
    if (await copyText(text)) toast('Copiado al portapapeles');
    else toast('No se pudo copiar', 'err');
  }

  async function markSent() {
    if (!contact) return;
    await interactionsRepo.add({
      contactId: contact.id,
      type: channel === 'llamada' ? 'llamada' : situation === 'seguimiento' || situation === 'vio_presentacion' ? 'seguimiento' : 'mensaje',
      direction: 'saliente',
      topics: [],
      note: channel === 'llamada' ? `Llamada: ${SITUATIONS.find((s) => s.key === situation)?.label}` : text.slice(0, 280),
      date: new Date().toISOString(),
    });
    toast(`Registrado en el historial de ${contact.firstName}`);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Conversaciones</div>
          <h1 className="page-title">Generador de conversaciones</h1>
          <p className="page-sub">Sugerencias para iniciar y continuar conversaciones reales, sin presión. Personalízalas antes de enviar.</p>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <section className="card stack" aria-label="Configuración del mensaje">
          <div className="field">
            <span className="label">Situación</span>
            {GROUPS.map((g) => (
              <div key={g} style={{ marginBottom: 6 }}>
                <div className="tiny faint" style={{ margin: '4px 0' }}>{g}</div>
                <div className="row-wrap">
                  {SITUATIONS.filter((s) => s.group === g).map((s) => (
                    <button key={s.key} className={`chip ${situation === s.key ? 'on' : ''}`} onClick={() => { setSituation(s.key); setVariant(0); }} aria-pressed={situation === s.key}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="field">
            <span className="label">Canal</span>
            <Seg label="Canal" value={channel} onChange={(v) => { setChannel(v); setVariant(0); }} options={CHANNELS} />
          </div>
          <div className="field">
            <span className="label">Estilo</span>
            <Seg label="Estilo" value={style} onChange={setStyle} options={STYLES} />
            <span className="tiny faint">{STYLES.find((s) => s.key === style)?.hint}</span>
          </div>
          <Field label="Para (opcional)" htmlFor="conv-contact">
            <select id="conv-contact" className="select" value={contactId} onChange={(e) => setContactId(e.target.value)}>
              <option value="">Mensaje genérico</option>
              {sorted.map((c) => <option key={c.id} value={c.id}>{fullName(c)}</option>)}
            </select>
          </Field>
        </section>

        <section className="stack" aria-label="Sugerencia">
          <div className="card">
            <div className="section-head">
              <h2 className="section-title"><Icon name="sparkle" size={18} /> {result.kind === 'guion' ? 'Guion de llamada' : 'Mensaje sugerido'}</h2>
              {result.variants > 1 && (
                <button className="btn btn-sm" onClick={() => setVariant((v) => v + 1)}><Icon name="refresh" size={15} /> Otra versión</button>
              )}
            </div>
            <textarea className="textarea message-box" style={{ minHeight: result.kind === 'guion' ? 260 : 170 }} value={text} onChange={(e) => setText(e.target.value)} aria-label="Texto del mensaje (editable)" />
            <p className="tiny faint" style={{ marginTop: 6 }}>Puedes editarlo. Un mensaje con algo personal (un recuerdo, algo que publicó) funciona mejor que cualquier plantilla.</p>
            {issues.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <Callout tone="bad">
                  <b>Revisa antes de enviar:</b>
                  <ul className="small" style={{ margin: '4px 0 0', paddingLeft: 18 }}>{issues.map((i) => <li key={i.match}>{i.message}</li>)}</ul>
                </Callout>
              </div>
            )}
            <div className="action-foot">
              <button className="btn btn-primary" onClick={copy}><Icon name="copy" size={16} /> Copiar</button>
              {channel === 'whatsapp' && contact?.whatsapp && (
                <a className="btn btn-wa" href={waLink(contact.whatsapp, text)} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" size={16} /> Abrir en WhatsApp</a>
              )}
              {contact && (
                <button className="btn" onClick={markSent}><Icon name="check" size={16} /> {channel === 'llamada' ? 'Registrar llamada' : 'Registrar como enviado'}</button>
              )}
            </div>
          </div>

          <div className="card stack-sm">
            <div><span className="label">Objetivo</span><p style={{ marginTop: 4 }}>{result.goal}</p></div>
            <div><span className="label">Por qué funciona</span><p className="muted small" style={{ marginTop: 4 }}>{result.tip}</p></div>
            <div><span className="label">Evita</span><p className="muted small" style={{ marginTop: 4 }}>{result.avoid}</p></div>
            <div><span className="label">Sobre el canal</span><p className="muted small" style={{ marginTop: 4 }}>{result.channelNote}</p></div>
          </div>
        </section>
      </div>
    </>
  );
}
