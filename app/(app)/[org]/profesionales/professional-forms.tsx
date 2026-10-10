"use client";

import { useState } from "react";
import { useServerForm } from "@/components/forms/use-server-form";
import { Button } from "@/components/ui/button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { createProfessional, setProfessionalActive, verifyProfessional } from "@/modules/professionals/actions";
import { PROFESSIONS, professionalSchema, verifySchema, type ProfessionalInput } from "@/modules/professionals/schemas";

export function ProfessionalForm({
  slug,
  docTypes,
  members,
}: {
  slug: string;
  docTypes: { value: string; label: string }[];
  members: { value: string; label: string }[];
}) {
  const { form, onSubmit, pending, formError, message, fieldError } = useServerForm<ProfessionalInput>({
    schema: professionalSchema,
    defaultValues: {
      fullName: "",
      docType: docTypes[0]?.value ?? "",
      docNumber: "",
      profession: "optometra",
      professionalCard: "",
      membershipId: members[0]?.value ?? "",
    },
    action: (values) => createProfessional(slug, values),
    resetOnSuccess: true,
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      {message ? <Notice tone="exito">{message}</Notice> : null}
      <TextField label="Nombre completo" registration={form.register("fullName")} error={fieldError("fullName")} />
      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        <SelectField label="Documento" registration={form.register("docType")} error={fieldError("docType")} options={docTypes} />
        <TextField label="Número" registration={form.register("docNumber")} error={fieldError("docNumber")} />
      </div>
      <SelectField
        label="Profesión"
        registration={form.register("profession")}
        error={fieldError("profession")}
        options={PROFESSIONS.map((p) => ({ value: p.value, label: p.label }))}
      />
      <TextField
        label="Tarjeta profesional"
        optional
        hint="Se guarda como declarada. Verifícala después para que aparezca en documentos."
        registration={form.register("professionalCard")}
        error={fieldError("professionalCard")}
      />
      <SelectField
        label="Usuario que atiende"
        registration={form.register("membershipId")}
        error={fieldError("membershipId")}
        options={[...members, { value: "", label: "Sin usuario por ahora" }]}
      />
      <div>
        <Button type="submit" pending={pending}>
          {pending ? "Registrando…" : "Registrar profesional"}
        </Button>
      </div>
    </form>
  );
}

function VerifyForm({ slug, id, onDone }: { slug: string; id: string; onDone: () => void }) {
  const { form, onSubmit, pending, formError, fieldError } = useServerForm<{ note: string }>({
    schema: verifySchema,
    defaultValues: { note: "" },
    action: (values) => verifyProfessional(slug, id, values),
    onSuccess: onDone,
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-3 rounded-[var(--radius-control)] border border-linea p-3">
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      <TextAreaField
        label="¿Cómo verificaste la tarjeta?"
        hint="Fuente, fecha y resultado. Por ejemplo: «Consulta en ReTHUS el 9/10/2026, registro activo»."
        registration={form.register("note")}
        error={fieldError("note")}
      />
      <div className="flex gap-2">
        <Button type="submit" pending={pending}>
          Registrar verificación
        </Button>
        <Button type="button" variant="texto" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function ProfessionalActions({ slug, id, active, canVerify }: { slug: string; id: string; active: boolean; canVerify: boolean }) {
  const [verifying, setVerifying] = useState(false);
  if (verifying) return <VerifyForm slug={slug} id={id} onDone={() => setVerifying(false)} />;
  return (
    <div className="flex flex-wrap gap-2">
      {canVerify ? (
        <Button type="button" variant="secundario" onClick={() => setVerifying(true)}>
          Verificar credencial
        </Button>
      ) : null}
      <ConfirmAction
        label={active ? "Desactivar" : "Activar"}
        variant={active ? "texto" : "secundario"}
        question={active ? "¿Desactivar? No podrá iniciar consultas nuevas; su historial se conserva." : "¿Activar de nuevo?"}
        confirmLabel={active ? "Sí, desactivar" : "Sí, activar"}
        onConfirm={() => setProfessionalActive(slug, id, !active)}
      />
    </div>
  );
}
