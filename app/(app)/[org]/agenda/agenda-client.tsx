"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useServerForm } from "@/components/forms/use-server-form";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { changeAppointmentStatus, createAppointment } from "@/modules/agenda/actions";
import { searchPatients, type PatientHit } from "@/modules/patients/actions";
import { appointmentSchema, DURATIONS, type AppointmentInput } from "@/modules/agenda/schemas";

type Option = { value: string; label: string };

function PatientPicker({
  slug,
  value,
  onChange,
  error,
}: {
  slug: string;
  value: PatientHit | null;
  onChange: (p: PatientHit | null) => void;
  error?: string | undefined;
}) {
  const id = useId();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PatientHit[] | null>(null);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (value) {
    return (
      <div className="grid gap-1.5">
        <span className="text-sm font-medium text-tinta">Paciente</span>
        <div className="flex items-center justify-between gap-2 rounded-[var(--radius-control)] border border-linea bg-agua/40 px-3 py-2 text-sm">
          <span>
            {value.name} <span className="text-texto-suave">· {value.doc}</span>
          </span>
          <button type="button" onClick={() => onChange(null)} className="text-turquesa underline-offset-4 hover:underline">
            Cambiar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-tinta">
        Paciente
      </label>
      <input
        id={id}
        value={q}
        autoComplete="off"
        placeholder="Nombre o documento"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : `${id}-results`}
        onChange={(e) => {
          const v = e.target.value;
          setQ(v);
          if (timer.current) clearTimeout(timer.current);
          if (v.trim().length < 2) return setHits(null);
          timer.current = setTimeout(() => startTransition(async () => setHits(await searchPatients(slug, v))), 250);
        }}
        className="min-h-10 rounded-[var(--radius-control)] border border-linea bg-white px-3 text-[15px] aria-[invalid=true]:border-error"
      />
      {error ? (
        <p id={`${id}-error`} className="text-[13px] font-medium text-error">
          {error}
        </p>
      ) : null}
      <div id={`${id}-results`} aria-live="polite">
        {pending ? <p className="text-[13px] text-texto-suave">Buscando…</p> : null}
        {hits && !pending ? (
          hits.length ? (
            <ul className="grid gap-1">
              {hits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => onChange(h)}
                    className="w-full rounded-[var(--radius-control)] border border-linea bg-white px-3 py-2 text-left text-sm hover:border-turquesa"
                  >
                    {h.name} <span className="text-texto-suave">· {h.doc}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-texto-suave">Sin resultados. Registra primero al paciente en «Pacientes».</p>
          )
        ) : null}
      </div>
    </div>
  );
}

export function AppointmentForm({
  slug,
  defaultDate,
  professionals,
  locations,
  prefill,
  defaultProfessional,
  open,
}: {
  slug: string;
  defaultDate: string;
  professionals: Option[];
  locations: Option[];
  prefill: PatientHit | null;
  defaultProfessional: string;
  open: boolean;
}) {
  const [patient, setPatient] = useState<PatientHit | null>(prefill);
  const { form, onSubmit, pending, formError, message, fieldError } = useServerForm<AppointmentInput>({
    schema: appointmentSchema,
    defaultValues: {
      patientId: prefill?.id ?? "",
      professionalId: defaultProfessional || professionals[0]?.value || "",
      locationId: locations[0]?.value ?? "",
      date: defaultDate,
      time: "",
      duration: "30",
      reason: "",
    },
    action: (values) => createAppointment(slug, values),
    onSuccess: () => {
      setPatient(null);
      form.setValue("patientId", "");
      form.setValue("time", "");
      form.setValue("reason", "");
    },
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4" aria-label="Agendar cita">
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      {message ? <Notice tone="exito">{message}</Notice> : null}
      <PatientPicker
        slug={slug}
        value={patient}
        error={fieldError("patientId")}
        onChange={(p) => {
          setPatient(p);
          form.setValue("patientId", p?.id ?? "", { shouldValidate: Boolean(p) });
        }}
      />
      <SelectField label="Profesional" registration={form.register("professionalId")} error={fieldError("professionalId")} options={professionals} />
      {locations.length > 1 ? (
        <SelectField label="Sede" registration={form.register("locationId")} error={fieldError("locationId")} options={locations} />
      ) : null}
      <div className="grid grid-cols-2 gap-4">
        <TextField label="Fecha" type="date" registration={form.register("date")} error={fieldError("date")} />
        <TextField label="Hora" type="time" step={300} registration={form.register("time")} error={fieldError("time")} autoFocus={open && Boolean(prefill)} />
      </div>
      <SelectField
        label="Duración"
        registration={form.register("duration")}
        error={fieldError("duration")}
        options={DURATIONS.map((d) => ({ value: String(d), label: `${d} minutos` }))}
      />
      <TextField label="Motivo de la cita" optional placeholder="Por ejemplo, control anual" registration={form.register("reason")} error={fieldError("reason")} />
      <div>
        <Button type="submit" pending={pending}>
          {pending ? "Agendando…" : "Agendar cita"}
        </Button>
      </div>
    </form>
  );
}

export function AppointmentActions({ slug, id, status }: { slug: string; id: string; status: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="grid gap-2">
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex flex-wrap gap-2">
        {status === "programada" ? (
          <Button
            type="button"
            variant="secundario"
            pending={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await changeAppointmentStatus(slug, id, { status: "confirmada" });
                setError(r.ok ? null : r.error);
              })
            }
          >
            Confirmar
          </Button>
        ) : null}
        <ConfirmAction
          label="No asistió"
          variant="texto"
          question="¿Registrar que el paciente no asistió?"
          confirmLabel="Sí, registrar"
          onConfirm={() => changeAppointmentStatus(slug, id, { status: "no_asistio" })}
        />
        <ConfirmAction
          label="Cancelar cita"
          variant="texto"
          question="¿Cancelar esta cita? El horario quedará libre."
          reasonLabel="Motivo de la cancelación"
          confirmLabel="Cancelar cita"
          onConfirm={(reason) => changeAppointmentStatus(slug, id, { status: "cancelada", reason })}
        />
      </div>
    </div>
  );
}
