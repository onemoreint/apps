import type { ReactNode } from "react";

type Tone = "neutro" | "activo" | "exito" | "aviso" | "error";

const tones: Record<Tone, string> = {
  neutro: "bg-fondo text-texto-suave border-linea",
  activo: "bg-agua text-turquesa-oscuro border-turquesa/30",
  exito: "bg-exito-fondo text-exito border-exito/30",
  aviso: "bg-aviso-fondo text-aviso border-aviso/30",
  error: "bg-error-fondo text-error border-error/30",
};

export function Badge({ tone = "neutro", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[12px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export const statusTone: Record<string, Tone> = {
  borrador: "aviso",
  finalizada: "exito",
  validada: "exito",
  anulada: "error",
  reemplazada: "neutro",
  programada: "neutro",
  confirmada: "activo",
  atendida: "exito",
  cancelada: "error",
  no_asistio: "aviso",
};
