"use client";

import { useServerForm } from "@/components/forms/use-server-form";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { recordConsent, revokeConsent } from "@/modules/patients/actions";
import { CONSENT_CHANNELS, consentSchema, type ConsentInput } from "@/modules/patients/schemas";

export function ConsentForm({ slug, patientId, texts }: { slug: string; patientId: string; texts: { id: string; label: string }[] }) {
  const { form, onSubmit, pending, formError, message, fieldError } = useServerForm<ConsentInput>({
    schema: consentSchema,
    defaultValues: { consentTextId: texts[0]?.id ?? "", decision: "otorgado", channel: "firma_presencial", signedByGuardian: false },
    action: (values) => recordConsent(slug, patientId, values),
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-3 border-t border-linea pt-4">
      <h3 className="text-base font-semibold">Registrar autorización</h3>
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      {message ? <Notice tone="exito">{message}</Notice> : null}
      <SelectField label="Texto" registration={form.register("consentTextId")} error={fieldError("consentTextId")} options={texts.map((t) => ({ value: t.id, label: t.label }))} />
      <SelectField
        label="Decisión del titular"
        registration={form.register("decision")}
        error={fieldError("decision")}
        options={[
          { value: "otorgado", label: "Autoriza" },
          { value: "negado", label: "No autoriza" },
        ]}
      />
      <SelectField
        label="Constancia"
        registration={form.register("channel")}
        error={fieldError("channel")}
        options={CONSENT_CHANNELS.map((c) => ({ value: c.value, label: c.label }))}
        hint="Conserva el documento firmado según la política de la óptica."
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...form.register("signedByGuardian")} className="size-4 accent-turquesa" />
        Firmó el acudiente
      </label>
      <div>
        <Button type="submit" variant="secundario" pending={pending}>
          {pending ? "Registrando…" : "Registrar"}
        </Button>
      </div>
    </form>
  );
}

export function RevokeConsentButton({ slug, patientId, consentId }: { slug: string; patientId: string; consentId: string }) {
  return (
    <div>
      <ConfirmAction
        label="Revocar"
        variant="texto"
        question="¿Registrar la revocación de esta autorización?"
        reasonLabel="Motivo (por ejemplo, solicitud del titular y fecha)"
        confirmLabel="Revocar autorización"
        onConfirm={(reason) => revokeConsent(slug, patientId, consentId, reason)}
      />
    </div>
  );
}
