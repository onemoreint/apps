import { useState } from 'react';
import { Icon } from '../components/Icon';
import { verifyPin } from '../services/pinService';
import { Globe } from '../components/Globe';

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function press(k: string) {
    if (busy) return;
    setError(false);
    if (k === 'del') return setPin((p) => p.slice(0, -1));
    const next = (pin + k).slice(0, 6);
    setPin(next);
    if (next.length >= 4) {
      setBusy(true);
      const ok = await verifyPin(next);
      setBusy(false);
      if (ok) onUnlock();
      else if (next.length === 6) {
        setError(true);
        setPin('');
      }
    }
  }

  return (
    <div className="lock">
      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <div style={{ width: 200, margin: '0 auto' }}><Globe hub="Colombia" active={['Colombia', 'Venezuela', 'México', 'Perú', 'Chile']} size={200} /></div>
        <h1 style={{ fontSize: 22, marginTop: 8 }}>NETWORKER OS</h1>
        <p className="muted small" style={{ marginTop: 4 }}>Ingresa tu PIN</p>
        <div className="pin-dots" aria-label={`${pin.length} dígitos ingresados`}>
          {Array.from({ length: 6 }).map((_, i) => <i key={i} className={i < pin.length ? 'on' : ''} />)}
        </div>
        {error && <p className="small" style={{ color: 'var(--bad)', marginBottom: 10 }} role="alert">PIN incorrecto</p>}
        <div className="keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k, i) =>
            k ? (
              <button key={i} onClick={() => press(k)} aria-label={k === 'del' ? 'Borrar' : k}>
                {k === 'del' ? <Icon name="back" size={20} /> : k}
              </button>
            ) : (
              <span key={i} />
            ),
          )}
        </div>
      </div>
    </div>
  );
}
