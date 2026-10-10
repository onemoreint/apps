"use client";

import { useFieldArray } from "react-hook-form";
import { useServerForm } from "@/components/forms/use-server-form";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { updateClinicalSettings } from "@/modules/clinical/actions";
import { clinicalSettingsSchema, RANGE_FIELDS, RANGE_LABELS, type ClinicalSettingsInput } from "@/modules/clinical/schemas";
import { AV_NOTATIONS } from "@/lib/clinical-labels";
import { suggestSlug } from "@/modules/organizations/schemas";

const cellInput = "w-full min-w-0 rounded-[var(--radius-control)] border border-linea bg-white px-2 py-1.5 text-sm aria-[invalid=true]:border-error";

export function ClinicalSettingsForm({ slug, defaults }: { slug: string; defaults: ClinicalSettingsInput }) {
  const { form, onSubmit, pending, formError, message, fieldError } = useServerForm<ClinicalSettingsInput>({
    schema: clinicalSettingsSchema,
    defaultValues: defaults,
    action: (values) => updateClinicalSettings(slug, values),
  });
  const sections = useFieldArray({ control: form.control, name: "template" });

  return (
    <form onSubmit={onSubmit} noValidate className="grid max-w-4xl gap-6">
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      {message ? <Notice tone="exito">{message}</Notice> : null}

      <section className="grid gap-4 rounded-[var(--radius-panel)] border border-linea bg-white p-5">
        <h2 className="text-lg font-semibold">Notación y reglas</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Notación de agudeza visual"
            registration={form.register("avNotation")}
            options={[{ value: "", label: "Sin definir (texto libre)" }, ...AV_NOTATIONS.map((n) => ({ value: n.value, label: `${n.label} (${n.example})` }))]}
          />
          <SelectField
            label="Convención de cilindro"
            hint="Se imprime en cada fórmula interna."
            registration={form.register("cylinderConvention")}
            options={[
              { value: "", label: "Sin definir" },
              { value: "negativo", label: "Cilindro negativo" },
              { value: "positivo", label: "Cilindro positivo" },
            ]}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...form.register("requirePrincipal")} className="size-4 accent-turquesa" />
          Exigir diagnóstico principal para finalizar una consulta (lo pide el RDA)
        </label>
      </section>

      <section className="grid gap-4 rounded-[var(--radius-panel)] border border-linea bg-white p-5">
        <div>
          <h2 className="text-lg font-semibold">Rangos permitidos</h2>
          <p className="text-sm text-texto-suave">Deja vacío lo que no quieras validar. El paso se cuenta desde el mínimo (o desde 0 si no hay mínimo).</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-separate border-spacing-1 text-sm">
            <caption className="sr-only">Rangos por campo</caption>
            <thead className="text-left text-texto-suave">
              <tr>
                <th scope="col" className="font-medium">Campo</th>
                <th scope="col" className="font-medium">Mínimo</th>
                <th scope="col" className="font-medium">Máximo</th>
                <th scope="col" className="font-medium">Paso</th>
              </tr>
            </thead>
            <tbody>
              {RANGE_FIELDS.map((f) => (
                <tr key={f}>
                  <th scope="row" className="text-left font-semibold">{RANGE_LABELS[f]}</th>
                  {(["min", "max", "step"] as const).map((k) => (
                    <td key={k}>
                      <input
                        aria-label={`${RANGE_LABELS[f]} ${k === "min" ? "mínimo" : k === "max" ? "máximo" : "paso"}`}
                        inputMode="decimal"
                        {...form.register(`ranges.${f}.${k}`)}
                        aria-invalid={fieldError(`ranges.${f}.${k}`) ? true : undefined}
                        className={cellInput}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 rounded-[var(--radius-panel)] border border-linea bg-white p-5">
        <div>
          <h2 className="text-lg font-semibold">Secciones del examen</h2>
          <p className="text-sm text-texto-suave">
            Aparecen como campos de texto en cada consulta nueva. Las obligatorias deben diligenciarse para finalizar. Las consultas ya
            iniciadas conservan las secciones con que se abrieron.
          </p>
        </div>
        {sections.fields.map((s, i) => (
          <div key={s.id} className="grid items-end gap-3 md:grid-cols-[1fr_200px_auto_auto]">
            <TextField
              label="Nombre"
              registration={form.register(`template.${i}.label`, {
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                  if (!form.getFieldState(`template.${i}.key`).isDirty && !defaults.template[i]) {
                    form.setValue(`template.${i}.key`, suggestSlug(e.target.value).replace(/-/g, "_").slice(0, 40));
                  }
                },
              })}
              error={fieldError(`template.${i}.label`)}
            />
            <TextField label="Clave interna" registration={form.register(`template.${i}.key`)} error={fieldError(`template.${i}.key`)} readOnly={Boolean(defaults.template[i])} />
            <label className="flex min-h-10 items-center gap-2 text-sm">
              <input type="checkbox" {...form.register(`template.${i}.required`)} className="size-4 accent-turquesa" />
              Obligatoria
            </label>
            <div className="flex gap-1">
              {i > 0 ? (
                <Button type="button" variant="texto" onClick={() => sections.move(i, i - 1)}>
                  Subir
                </Button>
              ) : null}
              <Button type="button" variant="texto" onClick={() => sections.remove(i)}>
                Quitar
              </Button>
            </div>
          </div>
        ))}
        <div>
          <Button type="button" variant="secundario" onClick={() => sections.append({ key: "", label: "", required: false })}>
            Agregar sección
          </Button>
        </div>
      </section>

      <div>
        <Button type="submit" pending={pending}>
          {pending ? "Guardando…" : "Guardar ajustes clínicos"}
        </Button>
      </div>
    </form>
  );
}
