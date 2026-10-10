import type { ReactNode } from "react";

type Tone = "error" | "exito" | "aviso" | "info";

const tones: Record<Tone, string> = {
  error: "bg-error-fondo text-error border-error/30",
  exito: "bg-exito-fondo text-exito border-exito/30",
  aviso: "bg-aviso-fondo text-aviso border-aviso/30",
  info: "bg-agua text-tinta border-turquesa/25",
};

/** Mensaje de estado. Los errores se anuncian de inmediato a lectores de pantalla. */
export function Notice({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-[var(--radius-control)] border px-3 py-2.5 text-sm ${tones[tone]}`}
    >
      {children}
    </div>
  );
}
