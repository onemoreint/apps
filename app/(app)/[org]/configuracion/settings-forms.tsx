"use client";

import { useServerForm } from "@/components/forms/use-server-form";
import { Button } from "@/components/ui/button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { updateOrganization, updateSettings } from "@/modules/organizations/actions";
import {
  organizationUpdateSchema,
  settingsSchema,
  TIMEZONES,
  type OrganizationUpdateInput,
  type SettingsInput,
} from "@/modules/organizations/schemas";

function Feedback({ error, message }: { error: string | null; message: string | null }) {
  if (error) return <Notice tone="error">{error}</Notice>;
  if (message) return <Notice tone="exito">{message}</Notice>;
  return null;
}

export function OrganizationForm({ slug, defaults }: { slug: string; defaults: OrganizationUpdateInput }) {
  const { form, onSubmit, pending, formError, message, fieldError } = useServerForm<OrganizationUpdateInput>({
    schema: organizationUpdateSchema,
    defaultValues: defaults,
    action: (values) => updateOrganization(slug, values),
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <Feedback error={formError} message={message} />
      <TextField label="Nombre comercial" registration={form.register("tradeName")} error={fieldError("tradeName")} />
      <TextField label="Razón social" optional registration={form.register("legalName")} error={fieldError("legalName")} />
      <TextField
        label="NIT"
        optional
        inputMode="numeric"
        placeholder="900123456-7"
        registration={form.register("nit")}
        error={fieldError("nit")}
      />
      <SelectField
        label="Zona horaria"
        registration={form.register("timezone")}
        error={fieldError("timezone")}
        options={TIMEZONES.map((t) => ({ value: t.value, label: t.label }))}
      />
      <div>
        <Button type="submit" pending={pending}>
          {pending ? "Guardando…" : "Guardar datos"}
        </Button>
      </div>
    </form>
  );
}

export function SettingsForm({ slug, defaults }: { slug: string; defaults: SettingsInput }) {
  const { form, onSubmit, pending, formError, message, fieldError } = useServerForm<SettingsInput>({
    schema: settingsSchema,
    defaultValues: defaults,
    action: (values) => updateSettings(slug, values),
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <Feedback error={formError} message={message} />
      <TextField
        label="Descuento que requiere aprobación (%)"
        inputMode="decimal"
        hint="Un descuento mayor a este porcentaje necesitará aprobación de un propietario o administrador."
        registration={form.register("discountThresholdPct")}
        error={fieldError("discountThresholdPct")}
      />
      <TextAreaField
        label="Pie del recibo interno"
        optional
        hint="Por ejemplo, horario de atención o condiciones de garantía. Máximo 300 caracteres."
        registration={form.register("receiptFooter")}
        error={fieldError("receiptFooter")}
      />
      <div>
        <Button type="submit" pending={pending}>
          {pending ? "Guardando…" : "Guardar parámetros"}
        </Button>
      </div>
    </form>
  );
}
