"use client";

import { useState } from "react";
import { useServerForm } from "@/components/forms/use-server-form";
import { Button } from "@/components/ui/button";
import { SelectField, TextAreaField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { updateWarranty } from "@/modules/lab/actions";
import { warrantyUpdateSchema, type WarrantyUpdateInput } from "@/modules/lab/schemas";

export function WarrantyUpdate({ slug, id }: { slug: string; id: string }) {
  const [open, setOpen] = useState(false);
  const { form, onSubmit, pending, formError, fieldError } = useServerForm<WarrantyUpdateInput>({
    schema: warrantyUpdateSchema,
    defaultValues: { status: "en_proceso", note: "" },
    action: (values) => updateWarranty(slug, id, values),
    onSuccess: () => setOpen(false),
    resetOnSuccess: true,
  });
  if (!open) {
    return (
      <Button type="button" variant="texto" onClick={() => setOpen(true)}>
        Registrar gestión
      </Button>
    );
  }
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-3 rounded-[var(--radius-control)] border border-linea bg-fondo p-3">
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      <SelectField
        label="Estado"
        registration={form.register("status")}
        options={[
          { value: "en_proceso", label: "En gestión" },
          { value: "resuelta", label: "Resuelta (cierra el caso)" },
          { value: "rechazada", label: "No procede (cierra el caso)" },
        ]}
      />
      <TextAreaField label="Gestión o resolución" registration={form.register("note")} error={fieldError("note")} />
      <div className="flex gap-2">
        <Button type="submit" pending={pending}>Guardar</Button>
        <Button type="button" variant="texto" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </form>
  );
}
