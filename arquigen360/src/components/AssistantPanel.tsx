import { useState } from 'react';
import { useStore } from '../store';
import { aiProvider } from '../ai/provider';
import { CommandEditor } from './CommandEditor';
import type { Interpretation } from '../ai/localParser';
import { CATALOG } from '../layout-engine/catalog';
import { Icon, Section } from './ui';

const EXAMPLES = [
  'Quiero una casa de 8 x 16 metros con 3 habitaciones, 2 baños, cocina abierta, sala, comedor, lavandería y garaje para un vehículo.',
  'Casa de 10 x 20 con 4 dormitorios, 3 baños, estudio, patio y jardín, garaje doble, retiro frontal de 3 y retiro posterior de 2.',
  'Vivienda de 6 x 18, dos habitaciones, un baño, cocina cerrada, zona social al fondo y acceso por la derecha.',
];

export function AssistantPanel({ onApplied }: { onApplied: () => void }) {
  const [text, setText] = useState(EXAMPLES[0]);
  const [result, setResult] = useState<Interpretation | null>(null);
  const [busy, setBusy] = useState(false);
  const setSite = useStore((s) => s.setSite);
  const setProgram = useStore((s) => s.setProgram);
  const generate = useStore((s) => s.generate);
  const site = useStore((s) => s.project.site);
  const notify = useStore((s) => s.notify);

  const run = async () => {
    setBusy(true);
    try {
      setResult(await aiProvider.interpretRequest(text));
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    if (!result) return;
    if (result.site) setSite({ ...result.site, setbacks: { ...site.setbacks, ...(result.site.setbacks ?? {}) } });
    setProgram(result.program);
    generate();
    notify('Programa aplicado y distribución generada');
    onApplied();
  };

  return (
    <>
      <Section title="Describe la vivienda">
        <textarea id="ai-text" className="textarea" value={text} onChange={(e) => setText(e.target.value)} rows={6} />
        <div className="chips">
          {EXAMPLES.map((ex, i) => (
            <button key={i} type="button" className="chip" onClick={() => { setText(ex); setResult(null); }}>Ejemplo {i + 1}</button>
          ))}
        </div>
        <button className="btn" type="button" onClick={run} disabled={busy || !text.trim()}>
          <Icon name="wand" /> Interpretar instrucción
        </button>
      </Section>

      {result && (
        <Section title="Interpretación">
          <div className="chips">
            {result.summary.map((s) => <span key={s} className="chip static">{s}</span>)}
          </div>
          <dl className="summary-box">
            {result.program.rooms.map((r) => (
              <FragmentRow key={r.id} name={r.name} value={`${r.minWidth.toFixed(2)} × ${r.minLength.toFixed(2)}`} zone={CATALOG[r.type].zone} />
            ))}
          </dl>
          <button className="btn primary" type="button" onClick={apply}>Aplicar y generar distribución</button>
        </Section>
      )}

      <CommandEditor />

      <p className="hint">
        El asistente solo traduce el texto a terreno, programa y preferencias. La geometría la calcula el motor de
        distribución y, una vez generada, la IA no cambia medidas: cualquier ajuste se hace en el editor.
        Esta versión usa un intérprete local sin conexión; la arquitectura admite conectar un modelo de lenguaje en un servidor propio.
      </p>
    </>
  );
}

function FragmentRow({ name, value }: { name: string; value: string; zone: string }) {
  return (
    <>
      <dt>{name}</dt>
      <dd>{value}</dd>
    </>
  );
}
