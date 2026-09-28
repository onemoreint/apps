import { useState } from 'react';
import { Icon } from '../components/Icon';
import { Callout } from '../components/ui';
import { DIMENSION_LABELS, SCENARIOS, evaluateResponse, type DimensionKey, type SimScenario, type TurnEvaluation } from '../domain/content/simulator';
import { practiceRepo } from '../data/repositories';
import { useUI } from '../app/UIContext';

interface Msg {
  from: 'them' | 'me';
  text: string;
}

const LEVEL_LABEL = ['A trabajar', 'En desarrollo', 'Fuerte'];

function Feedback({ ev }: { ev: TurnEvaluation }) {
  return (
    <div className="card stack">
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <h3 className="section-title"><Icon name="sparkle" size={18} /> Análisis de tu respuesta</h3>
        <span className={`badge ${ev.quality === 'buena' ? 'badge-good' : ev.quality === 'regular' ? 'badge-media' : 'badge-bad'}`}>
          {ev.quality === 'buena' ? 'Buena conversación' : ev.quality === 'regular' ? 'Va por buen camino' : 'Puede mejorar'}
        </span>
      </div>
      {ev.good.length > 0 && (
        <Callout tone="good">
          <b>Lo que hiciste bien</b>
          <ul className="small" style={{ margin: '4px 0 0', paddingLeft: 18 }}>{ev.good.map((g) => <li key={g}>{g}</li>)}</ul>
        </Callout>
      )}
      {ev.improve.length > 0 && (
        <Callout tone="warn">
          <b>Lo que podrías mejorar</b>
          <ul className="small" style={{ margin: '4px 0 0', paddingLeft: 18 }}>{ev.improve.map((g) => <li key={g}>{g}</li>)}</ul>
        </Callout>
      )}
      <Callout tone="info" icon="message">
        <b>Qué pregunta podrías haber hecho</b>
        <div className="small" style={{ marginTop: 4 }}>"{ev.suggestedQuestion}"</div>
      </Callout>
      <details>
        <summary className="small muted" style={{ cursor: 'pointer' }}>Ver detalle por dimensión</summary>
        <div style={{ marginTop: 8 }}>
          {ev.dimensions.map((d) => (
            <div key={d.key} className="dim-row">
              <b className="small">{DIMENSION_LABELS[d.key]}</b>
              <span className={`level level-${d.level}`}>{LEVEL_LABEL[d.level]}</span>
              <span className="small muted" style={{ gridColumn: '1 / -1' }}>{d.note}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

export default function Simulator() {
  const { toast } = useUI();
  const [scenario, setScenario] = useState<SimScenario | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [turn, setTurn] = useState(0);
  const [phase, setPhase] = useState<'answer' | 'feedback' | 'done'>('answer');
  const [input, setInput] = useState('');
  const [evals, setEvals] = useState<TurnEvaluation[]>([]);

  function start(s: SimScenario) {
    setScenario(s);
    setMsgs([{ from: 'them', text: s.turns[0].line }]);
    setTurn(0);
    setPhase('answer');
    setInput('');
    setEvals([]);
  }

  function submit() {
    if (!scenario || !input.trim()) return;
    const ev = evaluateResponse(scenario.turns[turn], input.trim());
    setMsgs((m) => [...m, { from: 'me', text: input.trim() }]);
    setEvals((e) => {
      const copy = [...e];
      copy[turn] = ev;
      return copy;
    });
    setPhase('feedback');
  }

  function retry() {
    const last = msgs[msgs.length - 1];
    setMsgs((m) => m.slice(0, -1));
    setInput(last?.from === 'me' ? last.text : '');
    setPhase('answer');
  }

  async function next() {
    if (!scenario) return;
    const ev = evals[turn];
    if (turn < scenario.turns.length - 1) {
      const nt = scenario.turns[turn + 1];
      const line = ev.quality === 'debil' && nt.guardedLine ? nt.guardedLine : nt.line;
      setMsgs((m) => [...m, { from: 'them', text: line }]);
      setTurn(turn + 1);
      setInput('');
      setPhase('answer');
    } else {
      const okTurns = evals.filter((e) => e.quality !== 'debil').length;
      const good = okTurns >= Math.ceil(scenario.turns.length * 0.66) && ev.quality !== 'debil';
      setMsgs((m) => [...m, { from: 'them', text: good ? scenario.goodEnding : scenario.badEnding }]);
      setPhase('done');
      await practiceRepo.add({ kind: 'simulador', label: `Simulación: ${scenario.title}`, summary: good ? 'Conversación abierta' : 'Conversación cerrada' });
      toast('Práctica registrada en tu entrenamiento');
    }
  }

  if (!scenario) {
    return (
      <>
        <div className="page-head">
          <div>
            <div className="eyebrow">Simulador</div>
            <h1 className="page-title">Practica con prospectos</h1>
            <p className="page-sub">Elige una situación. El prospecto responde según cómo conduces la conversación y recibes retroalimentación en cada paso.</p>
          </div>
        </div>
        <div className="grid-2">
          {SCENARIOS.map((s) => (
            <button key={s.id} className="card card-link" style={{ textAlign: 'left' }} onClick={() => start(s)}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className={`badge ${s.difficulty === 'Básico' ? 'badge-good' : s.difficulty === 'Intermedio' ? 'badge-media' : 'badge-alta'}`}>{s.difficulty}</span>
                <Icon name="chevron" size={16} className="faint" />
              </div>
              <h2 style={{ fontSize: 17, marginTop: 10 }}>"{s.title}"</h2>
              <p className="small muted" style={{ marginTop: 6 }}>{s.persona}</p>
              <p className="small faint" style={{ marginTop: 2 }}>{s.context}</p>
            </button>
          ))}
        </div>
        <p className="tiny faint section">La evaluación es orientativa y se basa en reglas (escucha, empatía, preguntas, presión, claridad y siguiente paso). No reemplaza el criterio de un mentor.</p>
      </>
    );
  }

  const summary: Record<DimensionKey, number> | null =
    phase === 'done'
      ? (Object.keys(DIMENSION_LABELS) as DimensionKey[]).reduce(
          (acc, k) => {
            const vals = evals.map((e) => e.dimensions.find((d) => d.key === k)!.level);
            acc[k] = vals.reduce<number>((a, b) => a + b, 0) / Math.max(vals.length, 1);
            return acc;
          },
          {} as Record<DimensionKey, number>,
        )
      : null;

  return (
    <>
      <button className="back-link" onClick={() => setScenario(null)}>
        <Icon name="back" size={16} /> Escenarios
      </button>
      <div className="page-head">
        <div>
          <div className="eyebrow">Simulación · paso {Math.min(turn + 1, scenario.turns.length)} de {scenario.turns.length}</div>
          <h1 className="page-title" style={{ fontSize: 22 }}>"{scenario.title}"</h1>
          <p className="page-sub">{scenario.persona}. {scenario.context}</p>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <section className="card">
          <div className="chat" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={`bubble ${m.from}`}>
                {m.from === 'them' && <div className="tiny faint" style={{ marginBottom: 2 }}>{scenario.persona.split(',')[0]}</div>}
                {m.text}
              </div>
            ))}
          </div>
          {phase === 'answer' && (
            <div style={{ marginTop: 16 }}>
              <label className="label" htmlFor="sim-input">Tu respuesta</label>
              <textarea
                id="sim-input"
                className="textarea"
                style={{ marginTop: 6 }}
                placeholder="Escribe como le responderías por WhatsApp…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
                autoFocus
              />
              <div className="row" style={{ marginTop: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={submit} disabled={!input.trim()}><Icon name="send" size={16} /> Responder</button>
              </div>
            </div>
          )}
          {phase === 'feedback' && (
            <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button className="btn" onClick={retry}><Icon name="refresh" size={16} /> Intentar de nuevo</button>
              <button className="btn btn-primary" onClick={next}>
                {turn < scenario.turns.length - 1 ? 'Continuar conversación' : 'Ver cómo termina'} <Icon name="arrow" size={16} />
              </button>
            </div>
          )}
          {phase === 'done' && (
            <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button className="btn" onClick={() => setScenario(null)}>Otro escenario</button>
              <button className="btn btn-primary" onClick={() => start(scenario)}><Icon name="refresh" size={16} /> Intentar de nuevo</button>
            </div>
          )}
        </section>

        <div className="stack">
          {phase === 'feedback' && evals[turn] && <Feedback ev={evals[turn]} />}
          {phase === 'answer' && (
            <Callout tone="info">
              <b>Antes de responder</b>
              <div className="small muted">Valida lo que siente, haz una pregunta para entender y evita cualquier presión. No hace falta convencer en un solo mensaje.</div>
            </Callout>
          )}
          {phase === 'done' && summary && (
            <div className="card">
              <h3 className="section-title" style={{ marginBottom: 10 }}><Icon name="trophy" size={18} /> Resumen de la práctica</h3>
              {(Object.keys(summary) as DimensionKey[]).map((k) => {
                const lvl = summary[k] >= 1.5 ? 2 : summary[k] >= 0.75 ? 1 : 0;
                return (
                  <div key={k} className="dim-row">
                    <b className="small">{DIMENSION_LABELS[k]}</b>
                    <span className={`level level-${lvl}`}>{LEVEL_LABEL[lvl]}</span>
                  </div>
                );
              })}
              <p className="small muted" style={{ marginTop: 10 }}>
                Consejo: practica de nuevo el mismo escenario enfocándote en tu dimensión más débil.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
