"use client";

import { useServerForm } from "@/components/forms/use-server-form";
import { Button } from "@/components/ui/button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { publishConsentText } from "@/modules/privacy/actions";
import { CONSENT_KINDS, consentTextSchema, type ConsentTextInput } from "@/modules/privacy/schemas";

export function ConsentTextForm({ slug }: { slug: string }) {
  const { form, onSubmit, pending, formError, message, fieldError } = useServerForm<ConsentTextInput>({
    schema: consentTextSchema,
    defaultValues: { kind: "tratamiento_datos", title: "", body: "" },
    action: (values) => publishConsentText(slug, values),
    resetOnSuccess: true,
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      {message ? <Notice tone="exito">{message}</Notice> : null}
      <SelectField label="Tipo" registration={form.register("kind")} error={fieldError("kind")} options={CONSENT_KINDS.map((k) => ({ value: k.value, label: k.label }))} />
      <TextField label="Título" registration={form.register("title")} error={fieldError("title")} />
      <TextAreaField label="Texto completo" rows={10} registration={form.register("body")} error={fieldError("body")} />
      <p className="text-[13px] text-texto-suave">Una vez publicado no se puede editar: para cambiarlo, publica una versión nueva.</p>
      <div>
        <Button type="submit" pending={pending}>
          {pending ? "Publicando…" : "Publicar"}
        </Button>
      </div>
    </form>
  );
}
