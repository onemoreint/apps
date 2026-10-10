"use client";

import { useServerForm } from "@/components/forms/use-server-form";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { formatCOP } from "@/lib/format";
import { addCashMovement, closeCash, openCash } from "@/modules/commerce/actions";
import {
  cashMovementSchema,
  closeCashSchema,
  openCashSchema,
  type CashMovementInput,
  type CloseCashInput,
  type OpenCashInput,
} from "@/modules/commerce/schemas";

type Option = { value: string; label: string };

export function OpenCashForm({ slug, locations }: { slug: string; locations: Option[] }) {
  const { form, onSubmit, pending, formError, fieldError } = useServerForm<OpenCashInput>({
    schema: openCashSchema,
    defaultValues: { locationId: locations[0]?.value ?? "", opening: "0" },
    action: (values) => openCash(slug, values),
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid max-w-md gap-4">
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      <SelectField label="Sede" registration={form.register("locationId")} error={fieldError("locationId")} options={locations} />
      <TextField label="Base en efectivo (COP)" inputMode="numeric" hint="Dinero con el que empiezas el turno." registration={form.register("opening")} error={fieldError("opening")} />
      <div>
        <Button type="submit" pending={pending}>
          Abrir caja
        </Button>
      </div>
    </form>
  );
}

export function CashMovementForm({ slug, sessionId }: { slug: string; sessionId: string }) {
  const { form, onSubmit, pending, formError, message, fieldError } = useServerForm<CashMovementInput>({
    schema: cashMovementSchema,
    defaultValues: { kind: "egreso", amount: "", reason: "" },
    action: (values) => addCashMovement(slug, sessionId, values),
    resetOnSuccess: true,
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      {message ? <Notice tone="exito">{message}</Notice> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Tipo"
          registration={form.register("kind")}
          options={[
            { value: "egreso", label: "Salida de efectivo" },
            { value: "ingreso", label: "Entrada de efectivo" },
          ]}
        />
        <TextField label="Valor (COP)" inputMode="numeric" registration={form.register("amount")} error={fieldError("amount")} />
      </div>
      <TextField label="Motivo" hint="Por ejemplo: pago de mensajería, consignación." registration={form.register("reason")} error={fieldError("reason")} />
      <div>
        <Button type="submit" variant="secundario" pending={pending}>
          Registrar movimiento
        </Button>
      </div>
    </form>
  );
}

/** Cierre: quien cuenta registra lo que hay; la diferencia la calcula la base. */
export function CloseCashForm({
  slug,
  sessionId,
  methods,
}: {
  slug: string;
  sessionId: string;
  methods: { id: string; name: string; expected: number | null }[];
}) {
  const { form, onSubmit, pending, formError, message, fieldError } = useServerForm<CloseCashInput>({
    schema: closeCashSchema,
    defaultValues: { counts: methods.map((m) => ({ methodId: m.id, counted: "" })), notes: "" },
    action: (values) => closeCash(slug, sessionId, values),
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      {message ? <Notice tone="exito">{message}</Notice> : null}
      {methods.map((m, i) => (
        <div key={m.id}>
          <input type="hidden" {...form.register(`counts.${i}.methodId`)} />
          <TextField
            label={`Contado en ${m.name} (COP)`}
            inputMode="numeric"
            hint={m.expected !== null ? `Esperado según el sistema: ${formatCOP(m.expected)}` : undefined}
            registration={form.register(`counts.${i}.counted`)}
            error={fieldError(`counts.${i}.counted`)}
          />
        </div>
      ))}
      <TextField label="Observaciones" optional registration={form.register("notes")} error={fieldError("notes")} />
      <div>
        <Button type="submit" pending={pending}>
          Cerrar caja
        </Button>
      </div>
    </form>
  );
}
