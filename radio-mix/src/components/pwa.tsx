import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { Download, RefreshCw, Share, SquarePlus, X } from 'lucide-react';
import { registerSW } from 'virtual:pwa-register';
import { brand } from '@/config/brand';
import { Logo } from './Logo';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaState {
  promptEvent: BeforeInstallPromptEvent | null;
  installed: boolean;
  needRefresh: boolean;
  showIosHelp: boolean;
  update: (() => Promise<void>) | null;
}

export const usePwa = create<PwaState>(() => ({
  promptEvent: null,
  installed: false,
  needRefresh: false,
  showIosHelp: false,
  update: null,
}));

export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true);

export const isIOS = () => typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

let started = false;

/** Registra el service worker (actualización controlada) y escucha el evento de instalación. */
export function initPwa() {
  if (started || typeof window === 'undefined') return;
  started = true;
  usePwa.setState({ installed: isStandalone() });
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    usePwa.setState({ promptEvent: e as BeforeInstallPromptEvent });
  });
  window.addEventListener('appinstalled', () => usePwa.setState({ installed: true, promptEvent: null }));
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    const update = registerSW({
      immediate: true,
      onNeedRefresh: () => usePwa.setState({ needRefresh: true }),
      onRegisteredSW: (_url, reg) => {
        // Busca versiones nuevas cada hora mientras la app esté abierta.
        if (reg) setInterval(() => void reg.update(), 60 * 60 * 1000);
      },
    });
    usePwa.setState({ update: () => update(true) });
  }
}

export function canInstall(): boolean {
  const s = usePwa.getState();
  return !s.installed && (!!s.promptEvent || isIOS());
}

export async function install() {
  const { promptEvent } = usePwa.getState();
  if (promptEvent) {
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    usePwa.setState({ promptEvent: null, installed: outcome === 'accepted' });
  } else if (isIOS()) {
    usePwa.setState({ showIosHelp: true });
  }
}

export function InstallButton({ variant = 'pill' }: { variant?: 'pill' | 'card' }) {
  const promptEvent = usePwa((s) => s.promptEvent);
  const installed = usePwa((s) => s.installed);
  const available = !installed && (!!promptEvent || isIOS());
  if (!available) return null;
  if (variant === 'card') {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="flex w-full items-center gap-3 rounded-2xl border border-accent-2/40 bg-accent-2/10 p-4 text-left transition hover:bg-accent-2/15"
      >
        <Download className="shrink-0 text-accent-2" />
        <span>
          <span className="block font-display font-semibold">Instalar {brand.shortName}</span>
          <span className="block text-xs text-muted">Ábrela desde tu pantalla de inicio, como una app.</span>
        </span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => void install()}
      className="inline-flex items-center gap-1.5 rounded-full bg-accent-2 px-3 py-1.5 text-xs font-bold text-ink transition hover:brightness-110"
    >
      <Download size={14} /> Instalar
    </button>
  );
}

export function IosInstallHelp() {
  const open = usePwa((s) => s.showIosHelp);
  if (!open) return null;
  const close = () => usePwa.setState({ showIosHelp: false });
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60" onClick={close}>
      <section role="dialog" aria-modal="true" aria-label="Instalar en iPhone" onClick={(e) => e.stopPropagation()} className="sheet-in pb-safe w-full max-w-md rounded-t-3xl border border-line bg-surface p-5">
        <div className="flex items-start justify-between">
          <h2 className="font-display text-xl font-bold">Instalar en iPhone o iPad</h2>
          <button type="button" onClick={close} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <ol className="mt-4 space-y-3 text-sm text-soft">
          <li className="flex gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 font-bold">1</span>
            <span>
              Abre esta página en <b>Safari</b> (en otros navegadores de iPhone la opción puede no aparecer).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 font-bold">2</span>
            <span className="inline-flex flex-wrap items-center gap-1">
              Toca el botón <Share size={16} className="inline text-accent-3" /> <b>Compartir</b>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 font-bold">3</span>
            <span className="inline-flex flex-wrap items-center gap-1">
              Elige <SquarePlus size={16} className="inline text-accent-3" /> <b>Añadir a pantalla de inicio</b> y confirma con <b>Añadir</b>.
            </span>
          </li>
        </ol>
        <p className="mt-4 rounded-xl bg-white/5 p-3 text-xs text-muted">
          En iPhone el audio puede detenerse si bloqueas la pantalla o cambias de app durante mucho rato: es una limitación de iOS para las apps web.
        </p>
      </section>
    </div>
  );
}

export function UpdateToast() {
  const needRefresh = usePwa((s) => s.needRefresh);
  const update = usePwa((s) => s.update);
  if (!needRefresh) return null;
  return (
    <div className="fixed inset-x-0 top-3 z-[70] flex justify-center px-3">
      <div role="status" className="fade-in flex items-center gap-3 rounded-2xl border border-line bg-surface-2 p-3 shadow-2xl">
        <RefreshCw size={18} className="text-accent-3" />
        <p className="text-sm">Hay una versión nueva de la app.</p>
        <button type="button" onClick={() => void update?.()} className="rounded-full bg-accent-3 px-3 py-1.5 text-xs font-bold text-ink">
          Actualizar
        </button>
        <button type="button" onClick={() => usePwa.setState({ needRefresh: false })} className="text-muted" aria-label="Más tarde">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

/** Pantalla de bienvenida breve al abrir la app. */
export function Splash() {
  const [show, setShow] = useState(() => {
    try {
      return !sessionStorage.getItem('radiomix:splash');
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!show) return;
    try {
      sessionStorage.setItem('radiomix:splash', '1');
    } catch {
      /* ignorado */
    }
    const t = setTimeout(() => setShow(false), 1100);
    return () => clearTimeout(t);
  }, [show]);
  if (!show) return null;
  return (
    <div className="ambient fixed inset-0 z-[80] grid place-items-center bg-ink" aria-hidden>
      <div className="fade-in flex flex-col items-center gap-4">
        <Logo size={88} />
        <p className="font-display text-2xl font-bold">{brand.name}</p>
      </div>
    </div>
  );
}
