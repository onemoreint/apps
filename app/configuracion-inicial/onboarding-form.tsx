"use client";

import { useServerForm } from "@/components/forms/use-server-form";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { createOrganization } from "@/modules/organizations/actions";
import { onboardingSchema, suggestSlug, TIMEZONES, type OnboardingInput } from "@/modules/organizations/schemas";

export function OnboardingForm() {
  const { form, onSubmit, pending, formError, fieldError } = useServerForm<OnboardingInput>({
    schema: onboardingSchema,
    defaultValues: {
      tradeName: "",
      slug: "",
      legalName: "",
      nit: "",
      timezone: "America/Bogota",
      locationName: "Sede principal",
      locationCity: "",
    },
    action: createOrganization,
  });

  const tradeName = form.register("tradeName", {
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      // Propone la dirección mientras el usuario no la haya editado.
      if (!form.getFieldState("slug").isDirty) {
        form.setValue("slug", suggestSlug(event.target.value));
      }
    },
  });
  const slug = form.watch("slug");

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-8">
      {formError ? <Notice tone="error">{formError}</Notice> : null}

      <fieldset className="grid gap-4 rounded-[var(--radius-panel)] border border-linea bg-white p-5 md:p-6">
        <legend className="px-1 text-base font-semibold text-tinta">Datos de la óptica</legend>
        <TextField label="Nombre comercial" registration={tradeName} error={fieldError("tradeName")} autoComplete="organization" />
        <TextField
          label="Dirección web"
          registration={form.register("slug")}
          error={fieldError("slug")}
          hint={
            <>
              Tu equipo entrará por <span className="font-medium text-tinta">/{slug || "tu-optica"}</span>. No se puede
              cambiar después.
            </>
          }
          autoCapitalize="none"
          spellCheck={false}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Razón social" optional registration={form.register("legalName")} error={fieldError("legalName")} />
          <TextField
            label="NIT"
            optional
            inputMode="numeric"
            placeholder="900123456-7"
            registration={form.register("nit")}
            error={fieldError("nit")}
          />
        </div>
        <SelectField
          label="Zona horaria"
          registration={form.register("timezone")}
          error={fieldError("timezone")}
          options={TIMEZONES.map((t) => ({ value: t.value, label: t.label }))}
          hint="Las citas y los reportes se muestran en esta hora."
        />
      </fieldset>

      <fieldset className="grid gap-4 rounded-[var(--radius-panel)] border border-linea bg-white p-5 md:p-6">
        <legend className="px-1 text-base font-semibold text-tinta">Primera sede</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Nombre de la sede" registration={form.register("locationName")} error={fieldError("locationName")} />
          <TextField label="Ciudad" optional registration={form.register("locationCity")} error={fieldError("locationCity")} />
        </div>
      </fieldset>

      <div className="flex justify-end">
        <Button type="submit" pending={pending}>
          {pending ? "Creando óptica…" : "Crear óptica"}
        </Button>
      </div>
    </form>
  );
}
