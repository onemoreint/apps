import { useState } from 'react';
import { Sheet } from '@/shared/ui/Sheet';
import { buildHelpMessage, waLink, type HelpKind } from '@/shared/lib/whatsapp';

interface Props {
  whatsapp: string;
  tableNumber: number;
  tableLabel: string | null;
  onClose: () => void;
}

const OPTIONS: { kind: HelpKind; label: string; emoji: string }[] = [
  { kind: 'waiter', label: 'Llamar al mesero', emoji: '🔔' },
  { kind: 'bill', label: 'Solicitar la cuenta', emoji: '💳' },
  { kind: 'more', label: 'Necesito algo más', emoji: '🥤' },
  { kind: 'other', label: 'Otra cosa', emoji: '❓' },
];

/** Avisos rápidos al personal por el mismo canal de WhatsApp (no crean pedido). */
export function HelpSheet({ whatsapp, tableNumber, tableLabel, onClose }: Props) {
  const [other, setOther] = useState<HelpKind | null>(null);
  const [text, setText] = useState('');

  const send = (kind: HelpKind, detail?: string) => {
    window.location.href = waLink(whatsapp, buildHelpMessage(kind, tableNumber, tableLabel, new Date(), detail));
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title="¿En qué te ayudamos?">
      {other ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(other, text);
          }}
          className="pb-2"
        >
          <label htmlFor="help-text" className="font-medium">
            Cuéntanos qué necesitas
          </label>
          <textarea
            id="help-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={200}
            rows={3}
            autoFocus
            className="mt-2 w-full resize-none rounded-2xl border border-line bg-shelf px-4 py-3 outline-none focus:border-ink"
          />
          <button type="submit" disabled={!text.trim()} className="mt-3 h-12 w-full rounded-full bg-send font-display font-bold text-white disabled:opacity-45">
            Enviar por WhatsApp
          </button>
        </form>
      ) : (
        <ul className="grid grid-cols-2 gap-3 pb-3">
          {OPTIONS.map((o) => (
            <li key={o.kind}>
              <button
                type="button"
                onClick={() => (o.kind === 'other' ? setOther('other') : send(o.kind))}
                className="flex h-28 w-full flex-col items-start justify-between rounded-2xl bg-shelf p-4 text-left"
              >
                <span className="text-3xl" aria-hidden>
                  {o.emoji}
                </span>
                <span className="font-display leading-tight font-bold">{o.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="pb-2 text-sm text-ink-3">Se abrirá WhatsApp con el aviso de tu mesa listo para enviar.</p>
    </Sheet>
  );
}
