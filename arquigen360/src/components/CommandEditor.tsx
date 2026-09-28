import { useState } from 'react';
import { useStore } from '../store';
import { aiProvider, AI_INPUT_MAX } from '../ai/provider';
import type { Explanation } from '../ai/explain';
import { runCommands, STAGE_LABEL, type CommandResult } from '../commands/commands';
import type { EditorCommand } from '../commands/commands';
import { Icon, Section } from './ui';

const EXAMPLES = [
  'Haz el dormitorio 2 de 3.10 x 2.60. Renombra la sala como Sala familiar.',
  'Mueve la lavandería 20 cm a la derecha y luego agrega una ventana en la cocina muro derecho',
  'Elimina el baño. Cambia al estilo moderno.',
];

/** Edición por texto: la IA propone comandos, el pipeline los valida, el usuario decide aplicar. */
export function CommandEditor() {
  const [text, setText] = useState(EXAMPLES[0]);
  const [proposal, setProposal] = useState<{ commands: EditorCommand[]; preview: CommandResult[]; unrecognized: string[] } | null>(null);
  const [applied, setApplied] = useState<CommandResult[] | null>(null);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [showJson, setShowJson] = useState(false);
  const applyCommands = useStore((s) => s.applyCommands);
  const notify = useStore((s) => s.notify);

  const propose = async () => {
    setApplied(null);
    try {
      const project = useStore.getState().project;
      const r = await aiProvider.createEditorCommands(text, project);
      // simulación en seco: mismo pipeline, sin tocar el proyecto
      const preview = runCommands(project, r.commands, 'ai').results;
      setProposal({ commands: r.commands, preview, unrecognized: r.unrecognized });
    } catch (e) {
      notify((e as Error).message);
    }
  };

  const apply = () => {
    if (!proposal) return;
    const results = applyCommands(proposal.commands, 'ai');
    setApplied(results);
    setProposal(null);
    const ok = results.filter((r) => r.ok).length;
    notify(ok ? `${ok} cambio(s) aplicados. Puedes deshacer con Ctrl+Z.` : 'No se aplicó ningún cambio.');
  };

  const explain = async () => setExplanation(await aiProvider.explainProposal(useStore.getState().project));

  const valid = proposal?.preview.filter((r) => r.ok).length ?? 0;
  const list = applied ?? proposal?.preview ?? [];

  return (
    <>
      <Section title="Editar el plano con texto">
        <textarea id="ai-edit" className="textarea" rows={4} maxLength={AI_INPUT_MAX} value={text} onChange={(e) => { setText(e.target.value); setProposal(null); }} />
        <div className="chips">
          {EXAMPLES.map((ex, i) => (
            <button key={i} type="button" className="chip" onClick={() => { setText(ex); setProposal(null); setApplied(null); }}>Ejemplo {i + 1}</button>
          ))}
        </div>
        <button className="btn" type="button" onClick={propose} disabled={!text.trim()}><Icon name="wand" /> Proponer cambios</button>

        {list.length > 0 && (
          <div className="cmd-list" aria-live="polite">
            {list.map((r, i) => (
              <div key={i} className={`cmd ${r.ok ? 'ok' : 'bad'}`}>
                <div className="cmd-head">
                  <span className={`status-badge ${r.ok ? 'PASS' : 'FAIL'}`}>{r.ok ? (applied ? 'APLICADO' : 'VÁLIDO') : 'RECHAZADO'}</span>
                  <b>{r.summary}</b>
                </div>
                {!r.ok && <p className="cmd-reason">Etapa «{STAGE_LABEL[r.stage]}»: {r.reason}</p>}
              </div>
            ))}
          </div>
        )}
        {proposal?.unrecognized.length ? (
          <p className="hint">No entendí: {proposal.unrecognized.map((u) => `«${u}»`).join(', ')}. Prueba con frases como «haz la cocina de 3 x 3.5» o «mueve la sala 50 cm al fondo».</p>
        ) : null}
        {proposal && (
          <>
            <label className="check"><input type="checkbox" checked={showJson} onChange={(e) => setShowJson(e.target.checked)} /> Ver comandos JSON</label>
            {showJson && <pre className="json-view">{JSON.stringify(proposal.commands, null, 2)}</pre>}
            <button className="btn primary" type="button" onClick={apply} disabled={!valid}>
              Aplicar {valid} cambio(s) válido(s)
            </button>
          </>
        )}
        <p className="hint">
          Cada cambio pasa por: JSON → esquema → permiso → objeto existe → límites → geometría → colisiones → ocupación. Si falla una etapa, no se aplica.
          La IA no puede eliminar ambientes ni cambiar reglas.
        </p>
      </Section>

      <Section title="Explicar la propuesta">
        <button className="btn" type="button" onClick={explain}>Explicar el plano actual</button>
        {explanation && (
          <div className="explain">
            <p><b>{explanation.summary}</b></p>
            <ul>{explanation.points.map((pt) => <li key={pt}>{pt}</li>)}</ul>
            <p className="hint">{explanation.disclaimer}</p>
          </div>
        )}
      </Section>
    </>
  );
}
