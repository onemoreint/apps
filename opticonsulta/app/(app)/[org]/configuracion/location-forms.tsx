"use client";

import { useState, useTransition } from "react";
import { useServerForm } from "@/components/forms/use-server-form";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { addLocation, setLocationActive, setLocationReps } from "@/modules/organizations/actions";
import { locationSchema, type LocationInput } from "@/modules/organizations/schemas";

export function LocationForm({ slug }: { slug: string }) {
  const { form, onSubmit, pending, formError, message, fieldError } = useServerForm<LocationInput>({
    schema: locationSchema,
    defaultValues: { name: "", repsCode: "", address: "", city: "", phone: "" },
    action: (values) => addLocation(slug, values),
    resetOnSuccess: true,
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      {message ? <Notice tone="exito">{message}</Notice> : null}
      <TextField label="Nombre de la sede" registration={form.register("name")} error={fieldError("name")} />
      <TextField
        label="Código de habilitación REPS"
        optional
        hint="Lo exige el RDA. Es el código con que la sede figura en el Registro Especial de Prestadores."
        inputMode="numeric"
        registration={form.register("repsCode")}
        error={fieldError("repsCode")}
      />
      <TextField label="Dirección" optional registration={form.register("address")} error={fieldError("address")} />
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Ciudad" optional registration={form.register("city")} error={fieldError("city")} />
        <TextField label="Teléfono" optional inputMode="tel" registration={form.register("phone")} error={fieldError("phone")} />
      </div>
      <div>
        <Button type="submit" variant="secundario" pending={pending}>
          {pending ? "Agregando…" : "Agregar sede"}
        </Button>
      </div>
    </form>
  );
}

export function LocationToggle({ slug, locationId, active, name }: { slug: string; locationId: string; active: boolean; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const apply = () =>
    startTransition(async () => {
      setError(null);
      const result = await setLocationActive(slug, { locationId, active: !active });
      if (!result.ok) setError(result.error);
      setConfirming(false);
    });

  if (error) return <p className="text-[13px] text-error">{error}</p>;

  if (!active) {
    return (
      <Button type="button" variant="secundario" pending={pending} onClick={apply}>
        Activar
      </Button>
    );
  }

  return confirming ? (
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-sm">¿Desactivar {name}?</span>
      <Button type="button" variant="peligro" pending={pending} onClick={apply}>
        Sí, desactivar
      </Button>
      <Button type="button" variant="texto" onClick={() => setConfirming(false)}>
        Cancelar
      </Button>
    </span>
  ) : (
    <Button type="button" variant="texto" onClick={() => setConfirming(true)}>
      Desactivar
    </Button>
  );
}

export function LocationRepsForm({ slug, locationId, repsCode }: { slug: string; locationId: string; repsCode: string | null }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(repsCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!editing) {
    return (
      <p className="text-[13px] text-texto-suave">
        REPS: {repsCode ?? "sin registrar"}{" "}
        <button type="button" onClick={() => setEditing(true)} className="text-turquesa underline-offset-4 hover:underline">
          {repsCode ? "Cambiar" : "Registrar"}
        </button>
      </p>
    );
  }
  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`reps-${locationId}`}>
        Código REPS
      </label>
      <input
        id={`reps-${locationId}`}
        value={value}
        inputMode="numeric"
        onChange={(e) => setValue(e.target.value)}
        aria-invalid={error ? true : undefined}
        className="min-h-9 w-40 rounded-[var(--radius-control)] border border-linea px-2 text-sm aria-[invalid=true]:border-error"
      />
      <Button
        type="button"
        variant="secundario"
        pending={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await setLocationReps(slug, { locationId, repsCode: value });
            if (r.ok) {
              setError(null);
              setEditing(false);
            } else setError(r.fieldErrors?.repsCode ?? r.error);
          })
        }
      >
        Guardar
      </Button>
      <Button type="button" variant="texto" onClick={() => setEditing(false)}>
        Cancelar
      </Button>
      {error ? <p className="w-full text-[13px] text-error">{error}</p> : null}
    </div>
  );
}
