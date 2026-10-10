import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="grid max-w-prose gap-1">
        <h1 className="text-2xl font-semibold md:text-[28px]">{title}</h1>
        {description ? <p className="text-texto-suave">{description}</p> : null}
      </div>
      {actions}
    </header>
  );
}

export function Panel({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-[var(--radius-panel)] border border-linea bg-white">
      <div className="border-b border-linea px-5 py-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-texto-suave">{description}</p> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
