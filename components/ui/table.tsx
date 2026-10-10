import Link from "next/link";
import type { ReactNode } from "react";

/** Tabla accesible con desplazamiento horizontal en pantallas pequeñas. */
export function Table({ caption, headers, children, minWidth = 560 }: { caption: string; headers: ReactNode[]; children: ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-panel)] border border-linea bg-white">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-linea bg-fondo text-tinta">
          <tr>
            {headers.map((h, i) => (
              <th key={i} scope="col" className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-linea">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = "", numeric = false }: { children: ReactNode; className?: string; numeric?: boolean }) {
  return <td className={`px-4 py-3 align-top ${numeric ? "text-right tabular-nums" : ""} ${className}`}>{children}</td>;
}

const linkStyles = {
  primario: "bg-turquesa text-white hover:bg-turquesa-oscuro",
  secundario: "border border-linea bg-white text-tinta hover:border-tinta-suave",
} as const;

export function LinkButton({ href, children, variant = "primario" }: { href: string; children: ReactNode; variant?: keyof typeof linkStyles }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-10 items-center rounded-[var(--radius-control)] px-4 text-sm font-semibold ${linkStyles[variant]}`}
    >
      {children}
    </Link>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-[var(--radius-panel)] border border-dashed border-linea bg-white p-6 text-sm text-texto-suave">{children}</p>;
}

/** Par etiqueta–valor para fichas de detalle. */
export function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-[13px] text-texto-suave">{label}</dt>
      <dd className="text-tinta">{children}</dd>
    </div>
  );
}
