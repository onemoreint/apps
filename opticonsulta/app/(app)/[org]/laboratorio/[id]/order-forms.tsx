"use client";

import { useServerForm } from "@/components/forms/use-server-form";
import { Button } from "@/components/ui/button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { cancelLabOrder, changeLabStatus, recordQualityCheck } from "@/modules/lab/actions";
import { QC_ITEMS, qualitySchema, statusChangeSchema, type QualityInput, type StatusChangeInput } from "@/modules/lab/schemas";

export function StatusForm({ slug, orderId, options }: { slug: string; orderId: string; options: { value: string; label: string }[] }) {
  const { form, onSubmit, pending, formError, message, fieldError } = useServerForm<StatusChangeInput>({
    schema: statusChangeSchema,
    defaultValues: { statusId: options[0]?.value ?? "", note: "" },
    action: (values) => changeLabStatus(slug, orderId, values),
    resetOnSuccess: true,
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      {message ? <Notice tone="exito">{message}</Notice> : null}
      <SelectField label="Nuevo estado" registration={form.register("statusId")} error={fieldError("statusId")} options={options} />
      <TextField label="Nota" optional hint="Por ejemplo: número de guía o persona que confirmó." registration={form.register("note")} error={fieldError("note")} />
      <div>
        <Button type="submit" pending={pending}>Cambiar estado</Button>
      </div>
    </form>
  );
}

export function QualityForm({ slug, orderId }: { slug: string; orderId: string }) {
  const { form, onSubmit, pending, formError, fieldError } = useServerForm<QualityInput>({
    schema: qualitySchema,
    defaultValues: { result: "aprobado", checks: Object.fromEntries(QC_ITEMS.map((i) => [i.key, false])), notes: "" },
    action: (values) => recordQualityCheck(slug, orderId, values),
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium text-tinta">Verificaciones realizadas</legend>
        {QC_ITEMS.map((i) => (
          <label key={i.key} className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1 size-4" {...form.register(`checks.${i.key}`)} />
            <span>{i.label}</span>
          </label>
        ))}
      </fieldset>
      <SelectField
        label="Resultado"
        registration={form.register("result")}
        error={fieldError("result")}
        options={[
          { value: "aprobado", label: "Aprobado: listo para entregar" },
          { value: "rechazado", label: "Rechazado: vuelve al laboratorio" },
        ]}
      />
      <TextAreaField label="Observaciones" optional hint="Obligatorio si se rechaza." registration={form.register("notes")} error={fieldError("notes")} />
      <div>
        <Button type="submit" pending={pending}>Registrar control de calidad</Button>
      </div>
    </form>
  );
}

export function CancelOrder({ slug, orderId }: { slug: string; orderId: string }) {
  return (
    <ConfirmAction
      label="Cancelar orden"
      variant="peligro"
      question="¿Cancelar la orden? Su historial se conserva; para pedir de nuevo crea otra orden desde la venta."
      reasonLabel="Motivo"
      confirmLabel="Sí, cancelar"
      onConfirm={(reason) => cancelLabOrder(slug, orderId, reason)}
    />
  );
}
