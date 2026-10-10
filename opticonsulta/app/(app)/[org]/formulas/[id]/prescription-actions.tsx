"use client";

import Link from "next/link";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { annulPrescription, newPrescriptionVersion } from "@/modules/clinical/actions";

export function PrescriptionActions({
  slug,
  id,
  canPrint,
  canVersion,
  canAnnul,
}: {
  slug: string;
  id: string;
  canPrint: boolean;
  canVersion: boolean;
  canAnnul: boolean;
}) {
  if (!canPrint && !canVersion && !canAnnul) return null;
  return (
    <div className="flex flex-wrap items-start gap-3">
      {canPrint ? (
        <Link
          href={`/${slug}/formulas/${id}/imprimir`}
          className="inline-flex min-h-10 items-center rounded-[var(--radius-control)] bg-turquesa px-4 text-sm font-semibold text-white hover:bg-turquesa-oscuro"
        >
          Ver para imprimir
        </Link>
      ) : null}
      {canVersion ? (
        <ConfirmAction
          label="Corregir con versión nueva"
          question="Se creará un borrador con estos valores. Al validarlo, esta versión quedará como reemplazada (no se borra)."
          reasonLabel="Motivo de la corrección"
          confirmLabel="Crear versión nueva"
          onConfirm={(reason) => newPrescriptionVersion(slug, id, reason)}
        />
      ) : null}
      {canAnnul ? (
        <ConfirmAction
          label="Anular fórmula"
          variant="peligro"
          question="La fórmula dejará de estar vigente. Queda registrada con su motivo."
          reasonLabel="Motivo de la anulación"
          confirmLabel="Anular"
          onConfirm={(reason) => annulPrescription(slug, id, reason)}
        />
      ) : null}
    </div>
  );
}
