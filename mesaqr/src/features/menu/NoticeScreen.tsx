import type { ReactNode } from 'react';

interface Props {
  icon: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

/** Pantalla de aviso a pantalla completa (mesa no válida, sin conexión, etc.). */
export function NoticeScreen({ icon, title, children, action }: Props) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <span className="text-5xl" aria-hidden>
        {icon}
      </span>
      <h1 className="mt-4 font-display text-3xl leading-tight font-extrabold">{title}</h1>
      {children && <div className="mt-3 text-lg text-ink-2">{children}</div>}
      {action && <div className="mt-8">{action}</div>}
    </main>
  );
}
