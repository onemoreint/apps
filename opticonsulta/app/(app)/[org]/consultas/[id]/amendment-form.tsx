"use client";

import { useServerForm } from "@/components/forms/use-server-form";
import { Button } from "@/components/ui/button";
import { TextAreaField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { addAmendment } from "@/modules/clinical/actions";
import { amendmentSchema, type AmendmentInput } from "@/modules/clinical/schemas";

export function AmendmentForm({ slug, encounterId }: { slug: string; encounterId: string }) {
  const { form, onSubmit, pending, formError, message, fieldError } = useServerForm<AmendmentInput>({
    schema: amendmentSchema,
    defaultValues: { reason: "", content: "" },
    action: (values) => addAmendment(slug, encounterId, values),
    resetOnSuccess: true,
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-3 border-t border-linea pt-4">
      <h3 className="text-base font-semibold">Agregar adenda</h3>
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      {message ? <Notice tone="exito">{message}</Notice> : null}
      <TextField label="Motivo" placeholder="Por ejemplo, dato aportado después de la consulta" registration={form.register("reason")} error={fieldError("reason")} />
      <TextAreaField label="Contenido" rows={4} registration={form.register("content")} error={fieldError("content")} />
      <p className="text-[13px] text-texto-suave">Quedará firmada con tu nombre, fecha y hora, y no se podrá editar.</p>
      <div>
        <Button type="submit" variant="secundario" pending={pending}>
          {pending ? "Registrando…" : "Registrar adenda"}
        </Button>
      </div>
    </form>
  );
}
