"use client";

import { useState, useTransition } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { annulPrescription, savePrescription, validatePrescription } from "@/modules/clinical/actions";
import { prescriptionFormSchema, type PrescriptionFormValues } from "@/modules/clinical/schemas";
import { LENS_TYPES, PRISM_BASES } from "@/lib/clinical-labels";

type EyeValues = PrescriptionFormValues["od"];

type Props = {
  slug: string;
  origin: "interna" | "externa";
  target: { id: string; draftVersion: number } | { patientId: string; encounterId: string | null };
  defaults: PrescriptionFormValues;
  /** Valores del subjetivo de la consulta, para copiarlos solo si el profesional lo pide. */
  subjective?: { od: Partial<EyeValues>; oi: Partial<EyeValues> } | null;
  cylinderConventionLabel: string | null;
};

const cellInput =
  "w-full min-w-0 rounded-[var(--radius-control)] border border-linea bg-white px-2 py-1.5 text-sm aria-[invalid=true]:border-error aria-[invalid=true]:bg-error-fondo";

export function PrescriptionEditor({ slug, origin, target, defaults, subjective, cylinderConventionLabel }: Props) {
  const form = useForm<PrescriptionFormValues>({
    resolver: zodResolver(prescriptionFormSchema as never) as unknown as Resolver<PrescriptionFormValues>,
    defaultValues: defaults,
    mode: "onBlur",
  });
  const { register, formState } = form;
  const [status, setStatus] = useState<{ tone: "error" | "exito"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const existing = "id" in target ? target : null;
  const [draftVersion, setDraftVersion] = useState(existing?.draftVersion ?? 0);

  const err = (path: string): string | undefined => {
    const v = path.split(".").reduce<unknown>((acc, k) => (acc as Record<string, unknown> | undefined)?.[k], formState.errors);
    return (v as { message?: string } | undefined)?.message;
  };

  const save = form.handleSubmit(
    (values) =>
      startTransition(async () => {
        setStatus(null);
        const r = await savePrescription(
          slug,
          existing ? { id: existing.id, draftVersion } : { patientId: (target as { patientId: string }).patientId, origin, encounterId: (target as { encounterId: string | null }).encounterId },
          values,
        );
        if (r.ok) {
          if (existing) setDraftVersion((v) => v + 1);
          form.reset(values);
          setStatus({ tone: "exito", text: r.message ?? "Guardado." });
        } else {
          setStatus({ tone: "error", text: r.error });
          for (const [field, msg] of Object.entries(r.fieldErrors ?? {})) form.setError(field as never, { message: msg });
        }
      }),
    () => setStatus({ tone: "error", text: "Revisa los campos marcados en rojo." }),
  );

  const copySubjective = () => {
    if (!subjective) return;
    for (const eye of ["od", "oi"] as const) {
      for (const [k, v] of Object.entries(subjective[eye])) {
        form.setValue(`${eye}.${k as keyof EyeValues}`, (v ?? "") as never, { shouldDirty: true, shouldValidate: true });
      }
    }
    setStatus({ tone: "exito", text: "Se copiaron los valores del subjetivo. Revísalos antes de guardar." });
  };

  const eyeRow = (eye: "od" | "oi", label: string) => {
    const cell = (field: keyof EyeValues, name: string, mode: "decimal" | "text" = "decimal") => (
      <td>
        <input
          aria-label={`${label} ${name}`}
          inputMode={mode}
          {...register(`${eye}.${field}`)}
          aria-invalid={err(`${eye}.${field}`) ? true : undefined}
          title={err(`${eye}.${field}`)}
          className={cellInput}
        />
      </td>
    );
    return (
      <tr>
        <th scope="row" className="text-left font-semibold">{label}</th>
        {cell("sphere", "esfera")}
        {cell("cylinder", "cilindro")}
        {cell("axis", "eje")}
        {cell("addition", "adición")}
        {cell("prism", "prisma")}
        <td>
          <select aria-label={`${label} base del prisma`} {...register(`${eye}.prismBase`)} aria-invalid={err(`${eye}.prismBase`) ? true : undefined} className={cellInput}>
            <option value="">—</option>
            {PRISM_BASES.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </td>
        {cell("dnp", "DNP")}
        {cell("height", "altura")}
        {cell("visualAcuity", "agudeza visual", "text")}
      </tr>
    );
  };

  const eyeErrors = ["od", "oi"].flatMap((eye) =>
    ["sphere", "cylinder", "axis", "addition", "prism", "prismBase", "dnp", "height"].map((f) => err(`${eye}.${f}`)).filter(Boolean),
  );

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="grid min-w-0 gap-6"
    >
      {origin === "externa" ? (
        <section className="grid gap-4 rounded-[var(--radius-panel)] border border-linea bg-white p-5">
          <h2 className="text-lg font-semibold">Procedencia</h2>
          <p className="text-sm text-texto-suave">
            Transcribe la fórmula tal como la trae el paciente. Quedará a nombre de quien la emitió y como transcrita por ti; no se
            atribuye a ningún profesional de la óptica.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <TextField label="Emitida por" placeholder="Nombre del profesional o institución" registration={register("externalIssuerName")} error={err("externalIssuerName")} />
            <TextField label="Tarjeta profesional o registro" optional registration={register("externalIssuerCard")} error={err("externalIssuerCard")} />
            <TextField label="Fecha de emisión" type="date" optional registration={register("externalIssuedOn")} error={err("externalIssuedOn")} />
          </div>
          <SelectField
            label="Convención de cilindro del documento"
            registration={register("cylinderConvention")}
            options={[
              { value: "", label: "No se indica" },
              { value: "negativo", label: "Cilindro negativo" },
              { value: "positivo", label: "Cilindro positivo" },
            ]}
          />
        </section>
      ) : null}

      <section className="grid gap-4 rounded-[var(--radius-panel)] border border-linea bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Valores</h2>
            <p className="text-sm text-texto-suave">
              Dioptrías con signo (por ejemplo -1.25). Deja vacío lo que no aplica: nada se completa automáticamente.
              {cylinderConventionLabel ? ` Convención: ${cylinderConventionLabel}.` : ""}
            </p>
          </div>
          {subjective ? (
            <Button type="button" variant="secundario" onClick={copySubjective}>
              Copiar del subjetivo de la consulta
            </Button>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-separate border-spacing-1 text-sm">
            <caption className="sr-only">Valores de la fórmula por ojo</caption>
            <thead className="text-left text-texto-suave">
              <tr>
                <th scope="col" className="w-10 font-medium">Ojo</th>
                <th scope="col" className="font-medium">Esfera</th>
                <th scope="col" className="font-medium">Cilindro</th>
                <th scope="col" className="font-medium">Eje</th>
                <th scope="col" className="font-medium">Adición</th>
                <th scope="col" className="font-medium">Prisma</th>
                <th scope="col" className="font-medium">Base</th>
                <th scope="col" className="font-medium">DNP mm</th>
                <th scope="col" className="font-medium">Altura mm</th>
                <th scope="col" className="font-medium">AV</th>
              </tr>
            </thead>
            <tbody>
              {eyeRow("od", "OD")}
              {eyeRow("oi", "OI")}
            </tbody>
          </table>
        </div>
        {eyeErrors.length ? (
          <ul className="grid gap-1 text-[13px] font-medium text-error">
            {[...new Set(eyeErrors)].map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        ) : null}
        <div className="grid gap-4 md:grid-cols-4">
          <SelectField
            label="Tipo de lente"
            registration={register("lensType")}
            error={err("lensType")}
            options={[{ value: "", label: "Elige…" }, ...LENS_TYPES.map((l) => ({ value: l.value, label: l.label }))]}
          />
          <TextField label="DP lejos (mm)" optional inputMode="decimal" registration={register("pdFar")} error={err("pdFar")} />
          <TextField label="DP cerca (mm)" optional inputMode="decimal" registration={register("pdNear")} error={err("pdNear")} />
          <TextField label="Uso" optional placeholder="Por ejemplo, permanente" registration={register("usage")} error={err("usage")} />
        </div>
        <TextAreaField label="Observaciones" optional registration={register("observations")} error={err("observations")} />
      </section>

      <div className="sticky bottom-0 z-10 grid gap-3 rounded-[var(--radius-panel)] border border-linea bg-white/95 p-4 backdrop-blur">
        {status ? <Notice tone={status.tone}>{status.text}</Notice> : null}
        <div className="flex flex-wrap items-start gap-3">
          <Button type="submit" variant={existing ? "secundario" : "primario"} pending={pending}>
            {pending ? "Guardando…" : existing ? "Guardar borrador" : "Crear borrador"}
          </Button>
          {existing ? (
            <>
              <ConfirmAction
                label={origin === "externa" ? "Confirmar transcripción" : "Validar fórmula"}
                variant="primario"
                question={
                  origin === "externa"
                    ? "¿Confirmas que los valores coinciden con el documento original? Después solo podrá corregirse con una versión nueva."
                    : "Al validarla, la fórmula queda firmada a tu nombre y no se modifica; las correcciones serán versiones nuevas. ¿Validar?"
                }
                confirmLabel={origin === "externa" ? "Sí, confirmar" : "Sí, validar"}
                onConfirm={async () => {
                  const valid = await form.trigger();
                  if (!valid) return { ok: false, error: "Revisa los campos marcados en rojo." };
                  return validatePrescription(slug, existing.id, draftVersion, form.getValues());
                }}
              />
              <ConfirmAction
                label="Anular borrador"
                variant="texto"
                question="El borrador quedará anulado con su motivo; no se borra."
                reasonLabel="Motivo"
                confirmLabel="Anular"
                onConfirm={(reason) => annulPrescription(slug, existing.id, reason)}
              />
            </>
          ) : null}
        </div>
      </div>
    </form>
  );
}
