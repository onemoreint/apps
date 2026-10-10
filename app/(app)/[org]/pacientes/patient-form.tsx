"use client";

import { useState } from "react";
import { useServerForm } from "@/components/forms/use-server-form";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { CodeSearch } from "@/components/clinical/code-search";
import { createPatient, updatePatient } from "@/modules/patients/actions";
import { patientSchema, type PatientInput } from "@/modules/patients/schemas";
import type { CodeOption } from "@/modules/catalogs/queries";

type Props = {
  slug: string;
  catalogs: Record<string, CodeOption[]>;
  defaults: PatientInput;
  existing?: { id: string; version: number };
  initialLabels: { municipality: string | null; occupation: string | null };
};

const opts = (list: CodeOption[] | undefined, emptyLabel: string) => [
  { value: "", label: emptyLabel },
  ...(list ?? []).map((o) => ({ value: o.code, label: `${o.label}${o.provisional ? " (provisional)" : ""}` })),
];

export function PatientForm({ slug, catalogs, defaults, existing, initialLabels }: Props) {
  const { form, onSubmit, pending, formError, fieldError } = useServerForm<PatientInput>({
    schema: patientSchema,
    defaultValues: defaults,
    action: (values) => (existing ? updatePatient(slug, existing.id, existing.version, values) : createPatient(slug, values)),
  });
  const [labels, setLabels] = useState(initialLabels);
  const r = form.register;
  const municipality = form.watch("residenceMunicipalityCode");
  const occupation = form.watch("occupationCode");

  return (
    <form onSubmit={onSubmit} noValidate className="grid max-w-4xl gap-8">
      {formError ? <Notice tone="error">{formError}</Notice> : null}

      <fieldset className="grid gap-4 rounded-[var(--radius-panel)] border border-linea bg-white p-5 md:p-6">
        <legend className="px-1 text-base font-semibold text-tinta">Identificación</legend>
        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <SelectField label="Tipo de documento" registration={r("docType")} error={fieldError("docType")} options={opts(catalogs.tipo_documento, "Elige…")} />
          <TextField label="Número de documento" autoComplete="off" registration={r("docNumber")} error={fieldError("docNumber")} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Primer nombre" registration={r("firstName")} error={fieldError("firstName")} />
          <TextField label="Segundo nombre" optional registration={r("secondName")} error={fieldError("secondName")} />
          <TextField label="Primer apellido" registration={r("firstSurname")} error={fieldError("firstSurname")} />
          <TextField label="Segundo apellido" optional registration={r("secondSurname")} error={fieldError("secondSurname")} />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <TextField label="Fecha de nacimiento" type="date" registration={r("birthDate")} error={fieldError("birthDate")} />
          <SelectField label="Sexo biológico" registration={r("sexCode")} error={fieldError("sexCode")} options={opts(catalogs.sexo_biologico, "Sin registrar")} />
          <SelectField label="Nacionalidad" registration={r("nationalityCode")} error={fieldError("nationalityCode")} options={opts(catalogs.pais, "Sin registrar")} />
        </div>
      </fieldset>

      <fieldset className="grid gap-4 rounded-[var(--radius-panel)] border border-linea bg-white p-5 md:p-6">
        <legend className="px-1 text-base font-semibold text-tinta">Contacto y residencia</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Teléfono" optional inputMode="tel" registration={r("phone")} error={fieldError("phone")} />
          <TextField label="Correo" optional type="email" registration={r("email")} error={fieldError("email")} />
        </div>
        <TextField label="Dirección" optional registration={r("address")} error={fieldError("address")} />
        <div className="grid gap-4 md:grid-cols-3">
          <SelectField label="País de residencia" registration={r("residenceCountryCode")} error={fieldError("residenceCountryCode")} options={opts(catalogs.pais, "Sin registrar")} />
          <CodeSearch
            catalog="municipio"
            label="Municipio de residencia"
            value={municipality ? { code: municipality, label: labels.municipality ?? "" } : null}
            onChange={(v) => {
              setLabels((l) => ({ ...l, municipality: v?.label ?? null }));
              form.setValue("residenceMunicipalityCode", v?.code ?? "", { shouldDirty: true, shouldValidate: true });
            }}
            error={fieldError("residenceMunicipalityCode")}
            placeholder="Busca por nombre o código DIVIPOLA"
          />
          <SelectField label="Zona" registration={r("residenceZoneCode")} error={fieldError("residenceZoneCode")} options={opts(catalogs.zona_territorial, "Sin registrar")} />
        </div>
      </fieldset>

      <fieldset className="grid gap-4 rounded-[var(--radius-panel)] border border-linea bg-white p-5 md:p-6">
        <legend className="px-1 text-base font-semibold text-tinta">Afiliación y datos complementarios</legend>
        <p className="text-sm text-texto-suave">Se piden en el Resumen Digital de Atención. Regístralos solo si el paciente los suministra.</p>
        <div className="grid gap-4 md:grid-cols-[200px_1fr]">
          <TextField label="Código EAPB" optional registration={r("payerCode")} error={fieldError("payerCode")} />
          <TextField label="Nombre de la EPS o entidad" optional registration={r("payerName")} error={fieldError("payerName")} />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <SelectField label="Etnia" registration={r("ethnicityCode")} error={fieldError("ethnicityCode")} options={opts(catalogs.etnia, "Sin registrar")} />
          <TextField label="Comunidad étnica" optional registration={r("ethnicCommunity")} error={fieldError("ethnicCommunity")} />
          <SelectField
            label="Categoría de discapacidad"
            registration={r("disabilityCode")}
            error={fieldError("disabilityCode")}
            options={opts(catalogs.categoria_discapacidad, "Sin registrar")}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <CodeSearch
            catalog="ocupacion"
            label="Ocupación"
            value={occupation ? { code: occupation, label: labels.occupation ?? "" } : null}
            onChange={(v) => {
              setLabels((l) => ({ ...l, occupation: v?.label ?? null }));
              form.setValue("occupationCode", v?.code ?? "", { shouldDirty: true });
            }}
          />
          <SelectField
            label="Identidad de género"
            hint="Opcional; se registra a criterio del profesional."
            registration={r("genderIdentityCode")}
            error={fieldError("genderIdentityCode")}
            options={opts(catalogs.identidad_genero, "Sin registrar")}
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-4 rounded-[var(--radius-panel)] border border-linea bg-white p-5 md:p-6">
        <legend className="px-1 text-base font-semibold text-tinta">Acudiente</legend>
        <p className="text-sm text-texto-suave">Para menores de edad o pacientes que no pueden firmar.</p>
        <div className="grid gap-4 md:grid-cols-3">
          <TextField label="Nombre" optional registration={r("guardianName")} error={fieldError("guardianName")} />
          <TextField label="Documento" optional registration={r("guardianDoc")} error={fieldError("guardianDoc")} />
          <TextField label="Parentesco" optional registration={r("guardianRelationship")} error={fieldError("guardianRelationship")} />
        </div>
      </fieldset>

      <div className="flex justify-end">
        <Button type="submit" pending={pending}>
          {pending ? "Guardando…" : existing ? "Guardar cambios" : "Registrar paciente"}
        </Button>
      </div>
    </form>
  );
}
