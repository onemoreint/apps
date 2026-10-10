"use client";

import { useState } from "react";
import { useServerForm } from "@/components/forms/use-server-form";
import { Button } from "@/components/ui/button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { PRIVACY_KIND } from "@/lib/commerce-labels";
import { registerPrivacyRequest, updatePrivacyRequest } from "@/modules/privacy/actions";
import { privacyRequestSchema, privacyUpdateSchema, type PrivacyRequestInput, type PrivacyUpdateInput } from "@/modules/privacy/schemas";

export function RequestForm({ slug }: { slug: string }) {
  const { form, onSubmit, pending, formError, message, fieldError } = useServerForm<PrivacyRequestInput>({
    schema: privacyRequestSchema,
    defaultValues: { requesterName: "", requesterDoc: "", requesterContact: "", kind: "consulta", description: "", patientId: "" },
    action: (values) => registerPrivacyRequest(slug, values),
    resetOnSuccess: true,
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      {message ? <Notice tone="exito">{message}</Notice> : null}
      <TextField label="Nombre del titular o de quien lo representa" registration={form.register("requesterName")} error={fieldError("requesterName")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Documento" optional registration={form.register("requesterDoc")} error={fieldError("requesterDoc")} />
        <TextField label="Contacto para responder" optional hint="Correo, teléfono o dirección" registration={form.register("requesterContact")} error={fieldError("requesterContact")} />
      </div>
      <SelectField
        label="Tipo"
        registration={form.register("kind")}
        error={fieldError("kind")}
        options={Object.entries(PRIVACY_KIND).map(([value, label]) => ({ value, label }))}
      />
      <TextAreaField label="Qué solicita" registration={form.register("description")} error={fieldError("description")} />
      <div>
        <Button type="submit" pending={pending}>Registrar solicitud</Button>
      </div>
    </form>
  );
}

export function RequestUpdate({ slug, id }: { slug: string; id: string }) {
  const [open, setOpen] = useState(false);
  const { form, onSubmit, pending, formError, fieldError } = useServerForm<PrivacyUpdateInput>({
    schema: privacyUpdateSchema,
    defaultValues: { status: "en_tramite", response: "" },
    action: (values) => updatePrivacyRequest(slug, id, values),
    onSuccess: () => setOpen(false),
  });
  if (!open) {
    return (
      <Button type="button" variant="texto" onClick={() => setOpen(true)}>
        Gestionar
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
          { value: "en_tramite", label: "En trámite" },
          { value: "respondida", label: "Respondida (cierra la solicitud)" },
        ]}
      />
      <TextAreaField label="Respuesta dada al titular" optional hint="Obligatoria para cerrar. Resume qué se respondió y por qué medio." registration={form.register("response")} error={fieldError("response")} />
      <div className="flex gap-2">
        <Button type="submit" pending={pending}>Guardar</Button>
        <Button type="button" variant="texto" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </form>
  );
}
