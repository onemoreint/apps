"use client";

import { useServerForm } from "@/components/forms/use-server-form";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { createLabStatus, setLaboratoryActive, updateLabStatus } from "@/modules/lab/actions";
import { statusNameSchema, type StatusNameInput } from "@/modules/lab/schemas";

export function StatusRow({ slug, id, name, position, isProcess, active }: { slug: string; id: string; name: string; position: number; isProcess: boolean; active: boolean }) {
  const { form, onSubmit, pending, formError, message, fieldError } = useServerForm<StatusNameInput>({
    schema: statusNameSchema,
    defaultValues: { name, position: String(position) },
    action: (values) => updateLabStatus(slug, id, values),
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-2 sm:grid-cols-[1fr_100px_auto] sm:items-end">
      <TextField label="Nombre" registration={form.register("name")} error={fieldError("name")} />
      <TextField label="Orden" inputMode="numeric" registration={form.register("position")} error={fieldError("position")} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="secundario" pending={pending}>Guardar</Button>
        {isProcess ? (
          <ConfirmAction
            label={active ? "Desactivar" : "Activar"}
            variant="texto"
            question={active ? "¿Desactivar este estado? Las órdenes que lo tengan lo conservan en su historial." : "¿Activar este estado?"}
            confirmLabel="Confirmar"
            onConfirm={() => updateLabStatus(slug, id, { name: form.getValues("name"), position: form.getValues("position") }, !active)}
          />
        ) : null}
      </div>
      {formError ? <div className="sm:col-span-3"><Notice tone="error">{formError}</Notice></div> : null}
      {message ? <p className="text-[13px] text-exito sm:col-span-3">{message}</p> : null}
    </form>
  );
}

export function NewStatusForm({ slug }: { slug: string }) {
  const { form, onSubmit, pending, formError, message, fieldError } = useServerForm<StatusNameInput>({
    schema: statusNameSchema,
    defaultValues: { name: "", position: "40" },
    action: (values) => createLabStatus(slug, values),
    resetOnSuccess: true,
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-3 sm:grid-cols-[1fr_100px_auto] sm:items-end">
      <TextField label="Nuevo estado intermedio" hint="Por ejemplo: En biselado, En tratamiento." registration={form.register("name")} error={fieldError("name")} />
      <TextField label="Orden" inputMode="numeric" registration={form.register("position")} error={fieldError("position")} />
      <Button type="submit" pending={pending}>Agregar</Button>
      {formError ? <div className="sm:col-span-3"><Notice tone="error">{formError}</Notice></div> : null}
      {message ? <p className="text-[13px] text-exito sm:col-span-3">{message}</p> : null}
    </form>
  );
}

export function LabActiveToggle({ slug, id, active }: { slug: string; id: string; active: boolean }) {
  return (
    <ConfirmAction
      label={active ? "Desactivar" : "Activar"}
      variant="texto"
      question={active ? "¿Desactivar? No aparecerá para órdenes nuevas." : "¿Activar de nuevo?"}
      confirmLabel="Confirmar"
      onConfirm={() => setLaboratoryActive(slug, id, !active)}
    />
  );
}
