import type { ReactNode } from "react";

/** Sección plegable sin JavaScript para formularios secundarios. */
export function Disclosure({ summary, open = false, children }: { summary: string; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="group rounded-[var(--radius-control)] border border-linea">
      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-sm font-semibold text-turquesa">
        {summary}
        <span aria-hidden="true" className="text-texto-suave group-open:rotate-180">▾</span>
      </summary>
      <div className="border-t border-linea p-3">{children}</div>
    </details>
  );
}
