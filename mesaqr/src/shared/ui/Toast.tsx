import { create } from 'zustand';
import { useEffect } from 'react';

interface ToastState {
  message: string | null;
  tone: 'ok' | 'warn';
  id: number;
  show: (message: string, tone?: 'ok' | 'warn') => void;
  hide: () => void;
}

export const useToast = create<ToastState>((set) => ({
  message: null,
  tone: 'ok',
  id: 0,
  show: (message, tone = 'ok') => set((s) => ({ message, tone, id: s.id + 1 })),
  hide: () => set({ message: null }),
}));

export const toast = (message: string, tone: 'ok' | 'warn' = 'ok') => useToast.getState().show(message, tone);

export function Toaster() {
  const { message, tone, id, hide } = useToast();
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(hide, tone === 'warn' ? 6000 : 2400);
    return () => clearTimeout(t);
  }, [id, message, tone, hide]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center px-4" role="status" aria-live="polite">
      {message && (
        <div
          key={id}
          className={`pointer-events-auto max-w-md rounded-2xl px-4 py-3 text-sm font-medium shadow-lg ${
            tone === 'warn' ? 'bg-danger text-white' : 'bg-ink text-white'
          }`}
          onClick={hide}
        >
          {message}
        </div>
      )}
    </div>
  );
}
