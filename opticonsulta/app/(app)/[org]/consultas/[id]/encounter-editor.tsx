"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { CodeSearch } from "@/components/clinical/code-search";
import { annulEncounterDraft, finalizeEncounter, saveEncounter } from "@/modules/clinical/actions";
import { encounterFormSchema, METHODS, VA_ROWS, type EncounterFormValues } from "@/modules/clinical/schemas";
import { AV_NOTATIONS, PRISM_BASES, REFRACTION_METHODS } from "@/lib/clinical-labels";
import type { CodeOption } from "@/modules/catalogs/queries";
import type { AvNotation } from "@/lib/supabase/database.types";
import type { TemplateSection } from "./form-values";

type Props = {
  slug: string;
  encounterId: string;
  version: number;
  template: TemplateSection[];
  avNotation: AvNotation | null;
  catalogs: Record<string, CodeOption[]>;
  defaults: EncounterFormValues;
};

const opts = (list: CodeOption[] | undefined, empty = "Elige…") => [
  { value: "", label: empty },
  ...(list ?? []).map((o) => ({ value: o.code, label: `${o.code} · ${o.label}${o.provisional ? " (provisional)" : ""}` })),
];

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-[var(--radius-panel)] border border-linea bg-white">
      <div className="border-b border-linea px-5 py-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? <p className="text-sm text-texto-suave">{description}</p> : null}
      </div>
      <div className="grid gap-4 p-5">{children}</div>
    </section>
  );
}

const cellInput =
  "w-full min-w-0 rounded-[var(--radius-control)] border border-linea bg-white px-2 py-1.5 text-sm aria-[invalid=true]:border-error aria-[invalid=true]:bg-error-fondo";

export function EncounterEditor({ slug, encounterId, version: initialVersion, template, avNotation, catalogs, defaults }: Props) {
  const form = useForm<EncounterFormValues>({
    resolver: zodResolver(encounterFormSchema as never) as unknown as Resolver<EncounterFormValues>,
    defaultValues: defaults,
    mode: "onBlur",
  });
  const { register, control, formState } = form;
  const [version, setVersion] = useState(initialVersion);
  const [status, setStatus] = useState<{ tone: "error" | "exito"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const allergies = useFieldArray({ control, name: "allergies" });
  const family = useFieldArray({ control, name: "familyHistory" });
  const risks = useFieldArray({ control, name: "riskFactors" });
  const diagnoses = useFieldArray({ control, name: "diagnoses" });
  const procedures = useFieldArray({ control, name: "procedures" });

  // Avisa antes de salir con cambios sin guardar.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (formState.isDirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [formState.isDirty]);

  const err = (path: string): string | undefined => {
    const v = path.split(".").reduce<unknown>((acc, k) => (acc as Record<string, unknown> | undefined)?.[k], formState.errors);
    return (v as { message?: string } | undefined)?.message;
  };

  const save = () =>
    form.handleSubmit(
      (values) =>
        startTransition(async () => {
          setStatus(null);
          const r = await saveEncounter(slug, encounterId, version, values);
          if (r.ok && r.data) {
            setVersion(r.data.version);
            form.reset(values);
            setStatus({ tone: "exito", text: "Borrador guardado." });
          } else if (!r.ok) {
            setStatus({ tone: "error", text: r.error });
          }
        }),
      () => setStatus({ tone: "error", text: "Revisa los campos marcados en rojo." }),
    )();

  const finalize = async () => {
    const valid = await form.trigger();
    if (!valid) return { ok: false as const, error: "Revisa los campos marcados en rojo." };
    const r = await finalizeEncounter(slug, encounterId, version, form.getValues());
    if (r && !r.ok) setStatus({ tone: "error", text: r.error });
    return r;
  };

  const vaIndex = (eye: string, distance: string, correction: string) =>
    VA_ROWS.findIndex((r) => r.eye === eye && r.distance === distance && r.correction === correction);
  const rxIndex = (method: string, eye: string) => METHODS.indexOf(method as (typeof METHODS)[number]) * 2 + (eye === "OD" ? 0 : 1);
  const notation = AV_NOTATIONS.find((n) => n.value === avNotation);
  const hasRx = (method: string) =>
    defaults.refractions.some((r) => r.method === method && [r.sphere, r.cylinder, r.axis, r.addition, r.visualAcuity].some(Boolean));

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="grid min-w-0 gap-6"
    >
      <Section title="Atención" description="Datos del contexto que pide el RDA.">
        <div className="grid gap-4 md:grid-cols-3">
          <SelectField label="Modalidad" registration={register("modalityCode")} error={err("modalityCode")} options={opts(catalogs.modalidad)} />
          <SelectField label="Grupo de servicio" registration={register("serviceGroupCode")} error={err("serviceGroupCode")} options={opts(catalogs.grupo_servicio)} />
          <SelectField label="Entorno" registration={register("environmentCode")} error={err("environmentCode")} options={opts(catalogs.entorno_atencion)} />
          <SelectField
            label="Vía de ingreso"
            registration={register("admissionRouteCode")}
            options={opts(catalogs.via_ingreso, catalogs.via_ingreso?.length ? "Elige…" : "Catálogo SISPRO sin importar")}
          />
          <SelectField
            label="Causa de la atención"
            registration={register("careCauseCode")}
            options={opts(catalogs.causa_atencion, catalogs.causa_atencion?.length ? "Elige…" : "Catálogo SISPRO sin importar")}
          />
          <SelectField
            label="Condición y destino"
            registration={register("dischargeConditionCode")}
            options={opts(catalogs.condicion_destino, catalogs.condicion_destino?.length ? "Elige…" : "Catálogo SISPRO sin importar")}
          />
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <Button
            type="button"
            variant="texto"
            onClick={() => {
              form.setValue("modalityCode", "01", { shouldDirty: true });
              form.setValue("serviceGroupCode", "01", { shouldDirty: true });
              form.setValue("environmentCode", "05", { shouldDirty: true });
            }}
          >
            Usar intramural · consulta externa · institucional
          </Button>
          <div className="min-w-[260px]">
            <TextField
              label="Código REPS del prestador al que se remite"
              optional
              registration={register("referralProviderCode")}
              error={err("referralProviderCode")}
            />
          </div>
        </div>
      </Section>

      <Section title="Anamnesis">
        <TextAreaField label="Motivo de consulta" registration={register("reasonForVisit")} error={err("reasonForVisit")} />
        <TextAreaField label="Enfermedad actual" optional registration={register("currentIllness")} error={err("currentIllness")} />
        <div className="grid gap-4 md:grid-cols-2">
          <TextAreaField label="Antecedentes personales" optional registration={register("personalHistory")} error={err("personalHistory")} />
          <TextAreaField label="Antecedentes oculares" optional registration={register("ocularHistory")} error={err("ocularHistory")} />
        </div>
        <TextAreaField label="Medicamentos que usa" optional registration={register("medications")} error={err("medications")} />

        <fieldset className="grid gap-3">
          <legend className="text-sm font-semibold text-tinta">Alergias</legend>
          {allergies.fields.map((f, i) => (
            <div key={f.id} className="grid items-end gap-3 sm:grid-cols-[220px_1fr_auto]">
              <SelectField label="Tipo" registration={register(`allergies.${i}.typeCode`)} error={err(`allergies.${i}.typeCode`)} options={opts(catalogs.tipo_alergia)} />
              <TextField label="Alérgeno" registration={register(`allergies.${i}.allergen`)} error={err(`allergies.${i}.allergen`)} />
              <Button type="button" variant="texto" onClick={() => allergies.remove(i)}>
                Quitar
              </Button>
            </div>
          ))}
          <div>
            <Button type="button" variant="secundario" onClick={() => allergies.append({ typeCode: "", allergen: "" })}>
              Agregar alergia
            </Button>
          </div>
        </fieldset>

        <fieldset className="grid gap-3">
          <legend className="text-sm font-semibold text-tinta">Antecedentes familiares</legend>
          {family.fields.map((f, i) => (
            <div key={f.id} className="grid items-end gap-3 sm:grid-cols-[1fr_200px_auto]">
              <CodeSearch
                catalog="cie10"
                label="Diagnóstico CIE-10"
                value={form.watch(`familyHistory.${i}.cie10Code`) ? { code: form.watch(`familyHistory.${i}.cie10Code`), label: form.watch(`familyHistory.${i}.cie10Label`) } : null}
                onChange={(v) => {
                  form.setValue(`familyHistory.${i}.cie10Code`, v?.code ?? "", { shouldDirty: true });
                  form.setValue(`familyHistory.${i}.cie10Label`, v?.label ?? "");
                }}
                error={err(`familyHistory.${i}.cie10Code`)}
              />
              <SelectField
                label="Parentesco"
                registration={register(`familyHistory.${i}.relationshipCode`)}
                error={err(`familyHistory.${i}.relationshipCode`)}
                options={opts(catalogs.parentesco)}
              />
              <Button type="button" variant="texto" onClick={() => family.remove(i)}>
                Quitar
              </Button>
            </div>
          ))}
          <div>
            <Button type="button" variant="secundario" onClick={() => family.append({ cie10Code: "", cie10Label: "", relationshipCode: "" })}>
              Agregar antecedente familiar
            </Button>
          </div>
        </fieldset>

        <fieldset className="grid gap-3">
          <legend className="text-sm font-semibold text-tinta">Factores de riesgo</legend>
          {risks.fields.map((f, i) => (
            <div key={f.id} className="grid items-end gap-3 sm:grid-cols-[220px_1fr_auto]">
              <SelectField label="Tipo" registration={register(`riskFactors.${i}.typeCode`)} error={err(`riskFactors.${i}.typeCode`)} options={opts(catalogs.tipo_factor_riesgo)} />
              <TextField label="Factor" registration={register(`riskFactors.${i}.name`)} error={err(`riskFactors.${i}.name`)} />
              <Button type="button" variant="texto" onClick={() => risks.remove(i)}>
                Quitar
              </Button>
            </div>
          ))}
          <div>
            <Button type="button" variant="secundario" onClick={() => risks.append({ typeCode: "", name: "" })}>
              Agregar factor de riesgo
            </Button>
          </div>
        </fieldset>
      </Section>

      <Section
        title="Agudeza visual"
        description={notation ? `Notación configurada: ${notation.label} (ej. ${notation.example}). También se aceptan CD, MM, PL y NPL.` : "Sin notación configurada: se acepta texto libre de hasta 20 caracteres."}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-separate border-spacing-1 text-sm">
            <caption className="sr-only">Agudeza visual por ojo, distancia y corrección</caption>
            <thead className="text-left text-tinta">
              <tr>
                <th scope="col" className="w-12 font-semibold">Ojo</th>
                <th scope="col" className="font-semibold">Lejos sin</th>
                <th scope="col" className="font-semibold">Lejos con</th>
                <th scope="col" className="font-semibold">Cerca sin</th>
                <th scope="col" className="font-semibold">Cerca con</th>
                <th scope="col" className="font-semibold">Estenopeico</th>
              </tr>
            </thead>
            <tbody>
              {(["OD", "OI", "AO"] as const).map((eye) => (
                <tr key={eye}>
                  <th scope="row" className="text-left font-semibold">{eye}</th>
                  {(
                    [
                      ["lejos", "sin"],
                      ["lejos", "con"],
                      ["cerca", "sin"],
                      ["cerca", "con"],
                      ["lejos", "estenopeico"],
                    ] as const
                  ).map(([distance, correction]) => {
                    const idx = vaIndex(eye, distance, correction);
                    return (
                      <td key={`${distance}-${correction}`}>
                        {idx >= 0 ? (
                          <input
                            aria-label={`${eye} ${distance} ${correction === "estenopeico" ? "con estenopeico" : `${correction} corrección`}`}
                            {...register(`visualAcuity.${idx}.value`)}
                            aria-invalid={err(`visualAcuity.${idx}.value`) ? true : undefined}
                            className={cellInput}
                          />
                        ) : (
                          <span className="block text-center text-texto-suave">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Refracción" description="Registra solo los métodos que realizaste. Los valores vacíos no se guardan ni se completan.">
        {REFRACTION_METHODS.map((m) => (
          <details key={m.value} open={hasRx(m.value) || m.value === "subjetivo"} className="rounded-[var(--radius-control)] border border-linea">
            <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-tinta">{m.label}</summary>
            <div className="overflow-x-auto px-3 pb-3">
              <table className="w-full min-w-[720px] border-separate border-spacing-1 text-sm">
                <caption className="sr-only">{m.label}</caption>
                <thead className="text-left text-texto-suave">
                  <tr>
                    <th scope="col" className="w-10 font-medium">Ojo</th>
                    <th scope="col" className="font-medium">Esfera</th>
                    <th scope="col" className="font-medium">Cilindro</th>
                    <th scope="col" className="font-medium">Eje</th>
                    <th scope="col" className="font-medium">Adición</th>
                    <th scope="col" className="font-medium">Prisma</th>
                    <th scope="col" className="font-medium">Base</th>
                    <th scope="col" className="font-medium">AV</th>
                  </tr>
                </thead>
                <tbody>
                  {(["OD", "OI"] as const).map((eye) => {
                    const i = rxIndex(m.value, eye);
                    const cell = (field: "sphere" | "cylinder" | "axis" | "addition" | "prism" | "visualAcuity", label: string) => (
                      <td>
                        <input
                          aria-label={`${m.label} ${eye} ${label}`}
                          inputMode={field === "visualAcuity" ? "text" : "decimal"}
                          {...register(`refractions.${i}.${field}`)}
                          aria-invalid={err(`refractions.${i}.${field}`) ? true : undefined}
                          title={err(`refractions.${i}.${field}`)}
                          className={cellInput}
                        />
                      </td>
                    );
                    return (
                      <tr key={eye}>
                        <th scope="row" className="text-left font-semibold">{eye}</th>
                        {cell("sphere", "esfera")}
                        {cell("cylinder", "cilindro")}
                        {cell("axis", "eje")}
                        {cell("addition", "adición")}
                        {cell("prism", "prisma")}
                        <td>
                          <select aria-label={`${m.label} ${eye} base del prisma`} {...register(`refractions.${i}.prismBase`)} className={cellInput}>
                            <option value="">—</option>
                            {PRISM_BASES.map((b) => (
                              <option key={b.value} value={b.value}>
                                {b.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        {cell("visualAcuity", "agudeza visual")}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
        ))}
        {formState.errors.refractions ? (
          <p className="text-[13px] font-medium text-error">Hay valores de refracción con formato no válido (marcados en rojo). Usa números como -1.25.</p>
        ) : null}
      </Section>

      {template.length ? (
        <Section title="Examen" description="Secciones definidas en los ajustes clínicos de la óptica.">
          {template.map((s) => (
            <TextAreaField
              key={s.key}
              label={s.required ? `${s.label} (obligatoria para finalizar)` : s.label}
              registration={register(`findings.${s.key}`)}
              error={err(`findings.${s.key}`)}
            />
          ))}
        </Section>
      ) : null}

      <Section title="Diagnóstico" description="El primero es el diagnóstico principal; los demás quedan como relacionados.">
        {diagnoses.fields.map((f, i) => (
          <div key={f.id} className="grid items-end gap-3 md:grid-cols-[1fr_240px_auto]">
            <CodeSearch
              catalog="cie10"
              label={i === 0 ? "Diagnóstico principal (CIE-10)" : `Diagnóstico relacionado ${i}`}
              value={form.watch(`diagnoses.${i}.cie10Code`) ? { code: form.watch(`diagnoses.${i}.cie10Code`), label: form.watch(`diagnoses.${i}.cie10Label`) } : null}
              onChange={(v) => {
                form.setValue(`diagnoses.${i}.cie10Code`, v?.code ?? "", { shouldDirty: true });
                form.setValue(`diagnoses.${i}.cie10Label`, v?.label ?? "");
              }}
              error={err(`diagnoses.${i}.cie10Code`)}
            />
            <SelectField label="Tipo" registration={register(`diagnoses.${i}.typeCode`)} error={err(`diagnoses.${i}.typeCode`)} options={opts(catalogs.tipo_diagnostico)} />
            <div className="flex gap-1">
              {i > 0 ? (
                <Button type="button" variant="texto" onClick={() => diagnoses.move(i, i - 1)} aria-label={`Subir diagnóstico ${i + 1}`}>
                  Subir
                </Button>
              ) : null}
              <Button type="button" variant="texto" onClick={() => diagnoses.remove(i)}>
                Quitar
              </Button>
            </div>
          </div>
        ))}
        <div>
          <Button type="button" variant="secundario" onClick={() => diagnoses.append({ cie10Code: "", cie10Label: "", typeCode: "" })}>
            Agregar diagnóstico
          </Button>
        </div>

        <fieldset className="grid gap-3 border-t border-linea pt-4">
          <legend className="text-sm font-semibold text-tinta">Procedimientos (CUPS)</legend>
          {procedures.fields.map((f, i) => (
            <div key={f.id} className="grid items-end gap-3 md:grid-cols-[1fr_160px_1fr_auto]">
              <CodeSearch
                catalog="cups"
                label="Procedimiento"
                value={form.watch(`procedures.${i}.cupsCode`) ? { code: form.watch(`procedures.${i}.cupsCode`), label: form.watch(`procedures.${i}.cupsLabel`) } : null}
                onChange={(v) => {
                  form.setValue(`procedures.${i}.cupsCode`, v?.code ?? "", { shouldDirty: true });
                  form.setValue(`procedures.${i}.cupsLabel`, v?.label ?? "");
                }}
                error={err(`procedures.${i}.cupsCode`)}
              />
              <SelectField
                label="Estado"
                registration={register(`procedures.${i}.mode`)}
                options={[
                  { value: "realizado", label: "Realizado" },
                  { value: "ordenado", label: "Ordenado" },
                ]}
              />
              <TextField label="Nota" optional registration={register(`procedures.${i}.notes`)} error={err(`procedures.${i}.notes`)} />
              <Button type="button" variant="texto" onClick={() => procedures.remove(i)}>
                Quitar
              </Button>
            </div>
          ))}
          <div>
            <Button type="button" variant="secundario" onClick={() => procedures.append({ cupsCode: "", cupsLabel: "", mode: "realizado", notes: "" })}>
              Agregar procedimiento
            </Button>
          </div>
        </fieldset>

        <TextAreaField label="Análisis" optional registration={register("assessment")} error={err("assessment")} />
        <TextAreaField label="Conducta y plan" optional registration={register("plan")} error={err("plan")} />
      </Section>

      <div className="sticky bottom-0 z-10 grid gap-3 rounded-[var(--radius-panel)] border border-linea bg-white/95 p-4 backdrop-blur print:hidden">
        {status ? <Notice tone={status.tone}>{status.text}</Notice> : null}
        <div className="flex flex-wrap items-start gap-3">
          <Button type="submit" variant="secundario" pending={pending}>
            {pending ? "Guardando…" : "Guardar borrador"}
          </Button>
          <ConfirmAction
            label="Finalizar consulta"
            variant="primario"
            question="Al finalizar, la consulta queda sellada y solo podrá corregirse con adendas. ¿Finalizar?"
            confirmLabel="Sí, finalizar"
            onConfirm={finalize}
          />
          <ConfirmAction
            label="Anular borrador"
            variant="texto"
            question="El borrador quedará anulado con su motivo; no se borra."
            reasonLabel="Motivo de la anulación"
            confirmLabel="Anular borrador"
            onConfirm={(reason) => annulEncounterDraft(slug, encounterId, version, reason)}
          />
          {formState.isDirty ? <span className="self-center text-[13px] text-aviso">Hay cambios sin guardar.</span> : null}
        </div>
      </div>
    </form>
  );
}
