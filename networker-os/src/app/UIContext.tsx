import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/ui';
import { LogInteractionSheet, type LogPreset } from '../components/LogInteractionSheet';
import { navigate } from './router';

interface Toast {
  id: number;
  msg: string;
  tone: 'ok' | 'err';
}

interface ConfirmOpts {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

interface UI {
  toast: (msg: string, tone?: 'ok' | 'err') => void;
  openQuick: () => void;
  openLog: (preset?: LogPreset) => void;
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
}

const Ctx = createContext<UI | null>(null);
export const useUI = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useUI fuera de UIProvider');
  return v;
};

const QUICK = [
  { icon: 'user-plus', title: 'Nuevo contacto', desc: 'Registrar a una persona', to: '/contactos/nuevo' },
  { icon: 'note', title: 'Registrar interacción', desc: 'Mensaje, llamada, presentación…', log: true },
  { icon: 'message', title: 'Generar mensaje', desc: 'Conversación sin presión', to: '/conversaciones' },
  { icon: 'shield', title: 'Analizar objeción', desc: 'Entender antes de responder', to: '/objeciones' },
  { icon: 'mic', title: 'Practicar', desc: 'Simulador de prospectos', to: '/simulador' },
  { icon: 'radar', title: 'Ver Radar', desc: 'Oportunidades de hoy', to: '/radar' },
];

export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [quick, setQuick] = useState(false);
  const [log, setLog] = useState<LogPreset | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmOpts | null>(null);
  const resolver = useRef<(v: boolean) => void>(undefined);
  const idRef = useRef(0);

  const toast = useCallback((msg: string, tone: 'ok' | 'err' = 'ok') => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const confirm = useCallback((opts: ConfirmOpts) => {
    setConfirmState(opts);
    return new Promise<boolean>((res) => (resolver.current = res));
  }, []);
  const closeConfirm = (v: boolean) => {
    resolver.current?.(v);
    setConfirmState(null);
  };

  const ui: UI = {
    toast,
    openQuick: () => setQuick(true),
    openLog: (preset = {}) => setLog(preset),
    confirm,
  };

  return (
    <Ctx.Provider value={ui}>
      {children}
      {quick && (
        <Sheet title="¿Qué quieres hacer?" onClose={() => setQuick(false)}>
          <div className="quick-grid">
            {QUICK.map((q) => (
              <button
                key={q.title}
                className="quick-item"
                onClick={() => {
                  setQuick(false);
                  if (q.log) setLog({});
                  else if (q.to) navigate(q.to);
                }}
              >
                <span className="qi-icon"><Icon name={q.icon} size={18} /></span>
                <b>{q.title}</b>
                <span>{q.desc}</span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
      {log && <LogInteractionSheet preset={log} onClose={() => setLog(null)} onSaved={(m) => toast(m)} />}
      {confirmState && (
        <Sheet
          title={confirmState.title}
          onClose={() => closeConfirm(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => closeConfirm(false)}>Cancelar</button>
              <button className={`btn ${confirmState.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => closeConfirm(true)}>
                {confirmState.confirmLabel ?? 'Confirmar'}
              </button>
            </>
          }
        >
          <p className="muted">{confirmState.message}</p>
        </Sheet>
      )}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone}`}>
            <Icon name={t.tone === 'ok' ? 'check' : 'alert'} size={18} />
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
