import { useMemo, useState } from 'react';
import { useData } from '../app/DataContext';
import { useUI } from '../app/UIContext';
import { navigate } from '../app/router';
import { Icon } from '../components/Icon';
import { Callout, copyText, fullName } from '../components/ui';
import { EXAMPLE_OBJECTIONS, GENERIC_OBJECTION, OBJECTION_LIBRARY, type ObjectionAnalysis, type ObjectionTemplate } from '../domain/content/objections';
import { aiService } from '../services/aiService';
import { contactsRepo, practiceRepo } from '../data/repositories';
import { objectionLabel } from '../domain/labels';

export default function Objections({ query }: { query: URLSearchParams }) {
  const { contactById } = useData();
  const { toast } = useUI();
  const contact = contactById.get(query.get('contacto') ?? '');
  const preset = contact?.objection ? OBJECTION_LIBRARY.find((o) => o.key === contact.objection) : undefined;
  const [input, setInput] = useState(preset ? preset.label : '');
  const [analysis, setAnalysis] = useState<ObjectionAnalysis | null>(preset ? { input: preset.label, detected: preset, secondary: [], matches: [], confidence: 'clara' } : null);
  const [selected, setSelected] = useState<ObjectionTemplate | null>(preset ?? null);

  async function analyze(text = input) {
    if (!text.trim()) return;
    const a = aiService.analyzeObjection(text);
    setAnalysis(a);
    setSelected(a.detected);
    await practiceRepo.add({ kind: 'objeciones', label: `Objeción: ${a.detected?.label ?? 'no identificada'}` });
  }

  const tpl = selected;
  const view = useMemo(
    () =>
      tpl
        ? { interpretations: tpl.interpretations, question: tpl.question, response: tpl.response, nextStep: tpl.nextStep, avoid: tpl.avoid }
        : { ...GENERIC_OBJECTION, avoid: 'Responder con argumentos antes de entender qué hay detrás.' },
    [tpl],
  );

  async function saveToContact() {
    if (!contact || !tpl) return;
    await contactsRepo.update(contact.id, { objection: tpl.key });
    toast(`Objeción guardada en ${contact.firstName}`);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Laboratorio</div>
          <h1 className="page-title">Objeciones</h1>
          <p className="page-sub">Una objeción no es un "no": suele ser una pregunta sin responder. Primero entiende, después responde.</p>
        </div>
      </div>

      {contact && (
        <div className="demo-banner">
          <Icon name="user" size={16} />
          <span style={{ flex: 1 }}>Trabajando la objeción de <b>{fullName(contact)}</b>{contact.objection ? ` (registrada: ${objectionLabel(contact.objection)})` : ''}</span>
          <button className="btn btn-sm" onClick={() => navigate(`/contactos/${contact.id}`)}>Ver contacto</button>
        </div>
      )}

      <section className="card">
        <label className="label" htmlFor="obj-input">¿Qué te dijo la persona?</label>
        <textarea
          id="obj-input"
          className="textarea"
          style={{ marginTop: 8, minHeight: 80 }}
          placeholder='Ej.: "Me interesa, pero ahora mismo no tengo tiempo"'
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) analyze(); }}
        />
        <div className="row-wrap" style={{ marginTop: 10 }}>
          {EXAMPLE_OBJECTIONS.map((ex) => (
            <button key={ex} className="chip" onClick={() => { setInput(ex); analyze(ex); }}>"{ex}"</button>
          ))}
        </div>
        <div className="row" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={() => analyze()} disabled={!input.trim()}>
            <Icon name="sparkle" size={17} /> Analizar objeción
          </button>
        </div>
      </section>

      {analysis && (
        <div className="stack section">
          <section className="card">
            <div className="eyebrow">Objeción detectada</div>
            <div className="row" style={{ marginTop: 6, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 22 }}>{tpl ? tpl.label : 'No identificada con claridad'}</h2>
              {analysis.confidence !== 'no_identificada' && tpl?.key === analysis.detected?.key && (
                <span className={`badge ${analysis.confidence === 'clara' ? 'badge-good' : 'badge-media'}`}>{analysis.confidence === 'clara' ? 'Coincidencia clara' : 'Posible'}</span>
              )}
            </div>
            {(analysis.secondary.length > 0 || (analysis.detected && tpl?.key !== analysis.detected.key)) && (
              <div style={{ marginTop: 10 }}>
                <div className="tiny faint" style={{ marginBottom: 6 }}>También podría ser:</div>
                <div className="row-wrap">
                  {[analysis.detected, ...analysis.secondary].filter((o): o is ObjectionTemplate => !!o && o.key !== tpl?.key).map((o) => (
                    <button key={o.key} className="chip" onClick={() => setSelected(o)}>{o.label}</button>
                  ))}
                </div>
              </div>
            )}
            {!tpl && <p className="muted small" style={{ marginTop: 8 }}>No reconocí una objeción conocida. Aquí tienes un enfoque general para descubrirla. También puedes elegirla de la biblioteca de abajo.</p>}
          </section>

          <div className="grid-2">
            <section className="card">
              <h3 className="section-title" style={{ marginBottom: 10 }}><Icon name="info" size={18} /> Posibles interpretaciones</h3>
              <p className="tiny faint" style={{ marginBottom: 8 }}>No asumas cuál es la verdadera: la pregunta de abajo sirve para descubrirlo.</p>
              <ul className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
                {view.interpretations.map((i) => <li key={i}>{i}</li>)}
              </ul>
            </section>
            <section className="card stack-sm">
              <h3 className="section-title"><Icon name="target" size={18} /> Siguiente paso</h3>
              <p>{view.nextStep}</p>
              <div className="divider" style={{ margin: '8px 0' }} />
              <span className="label">Evita</span>
              <p className="small muted">{view.avoid}</p>
            </section>
          </div>

          <section className="card">
            <div className="section-head">
              <h3 className="section-title"><Icon name="message" size={18} /> Pregunta recomendada</h3>
              <button className="btn btn-sm" onClick={async () => (await copyText(view.question)) && toast('Pregunta copiada')}><Icon name="copy" size={14} /> Copiar</button>
            </div>
            <div className="message-box">{view.question}</div>
          </section>

          <section className="card">
            <div className="section-head">
              <h3 className="section-title"><Icon name="sparkle" size={18} /> Respuesta sugerida</h3>
              <button className="btn btn-sm" onClick={async () => (await copyText(view.response)) && toast('Respuesta copiada')}><Icon name="copy" size={14} /> Copiar</button>
            </div>
            <div className="message-box">{view.response}</div>
            <div className="action-foot">
              {contact && tpl && <button className="btn btn-sm" onClick={saveToContact}><Icon name="check" size={14} /> Guardar objeción en {contact.firstName}</button>}
              <button className="btn btn-sm btn-blue" onClick={() => navigate('/simulador')}><Icon name="mic" size={14} /> Practicar en el simulador</button>
            </div>
          </section>

          <Callout tone="info">Estas sugerencias son un punto de partida. Adáptalas a la persona y a tu forma de hablar; nunca prometas ingresos ni resultados de salud.</Callout>
        </div>
      )}

      <section className="section">
        <h2 className="section-title" style={{ marginBottom: 12 }}><Icon name="grid" size={18} /> Biblioteca de objeciones</h2>
        <div className="grid-3">
          {OBJECTION_LIBRARY.map((o) => (
            <button
              key={o.key}
              className="card-flat card-link"
              style={{ textAlign: 'left' }}
              onClick={() => {
                setInput(o.label);
                setAnalysis({ input: o.label, detected: o, secondary: [], matches: [], confidence: 'clara' });
                setSelected(o);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <b>{o.label}</b>
              <p className="small muted" style={{ marginTop: 4 }}>{o.nextStep}</p>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
