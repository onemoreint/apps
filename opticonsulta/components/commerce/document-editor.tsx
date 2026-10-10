"use client";

import { useFieldArray } from "react-hook-form";
import { useServerForm } from "@/components/forms/use-server-form";
import { Button } from "@/components/ui/button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { formatCOP } from "@/lib/format";
import { parsePesos } from "@/lib/commerce-labels";
import { createSale, saveQuote } from "@/modules/commerce/actions";
import { documentSchema, type DocumentInput } from "@/modules/commerce/schemas";

export type EditorProduct = {
  id: string;
  label: string;
  unitPrice: number;
  tracksStock: boolean;
  stock: Record<string, number>;
};

type Props = {
  slug: string;
  mode: "venta" | "cotizacion";
  products: EditorProduct[];
  locations: { value: string; label: string }[];
  patient: { id: string; name: string } | null;
  prescriptions: { value: string; label: string }[];
  discountThreshold: number;
  canApproveDiscount: boolean;
  initial?: DocumentInput;
  quote?: { id: string; version: number };
};

const emptyLine = { productId: "", quantity: "1", unitPrice: "", discount: "" };

/**
 * Editor de ítems de cotización o venta. Los totales que muestra son una vista
 * previa: el servidor toma el precio del catálogo y recalcula todo.
 */
export function DocumentEditor({ slug, mode, products, locations, patient, prescriptions, discountThreshold, canApproveDiscount, initial, quote }: Props) {
  const { form, onSubmit, pending, formError, fieldError } = useServerForm<DocumentInput>({
    schema: documentSchema,
    defaultValues: initial ?? {
      locationId: locations[0]?.value ?? "",
      patientId: patient?.id ?? "",
      prescriptionId: prescriptions[0]?.value ?? "",
      notes: "",
      validUntil: "",
      lines: [emptyLine],
    },
    action: (values) => (mode === "venta" ? createSale(slug, values) : saveQuote(slug, quote?.id ?? null, quote?.version ?? null, values)),
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
  const lines = form.watch("lines");
  const locationId = form.watch("locationId");
  const byId = new Map(products.map((p) => [p.id, p]));

  let subtotal = 0;
  let discounts = 0;
  const previews = lines.map((l) => {
    const p = byId.get(l.productId);
    const qty = Number(l.quantity) || 0;
    const price = p ? (p.unitPrice > 0 ? p.unitPrice : parsePesos(l.unitPrice ?? "") ?? 0) : 0;
    const disc = parsePesos(l.discount ?? "") ?? 0;
    subtotal += qty * price;
    discounts += disc;
    return { p, qty, price, total: qty * price - disc };
  });
  const pct = subtotal > 0 ? (discounts * 100) / subtotal : 0;
  const needsApproval = pct > discountThreshold && !canApproveDiscount;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6">
      {formError ? <Notice tone="error">{formError}</Notice> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Sede" registration={form.register("locationId")} error={fieldError("locationId")} options={locations} />
        {patient ? (
          <div className="grid gap-1.5">
            <span className="text-sm font-medium text-tinta">Paciente</span>
            <p className="min-h-10 rounded-[var(--radius-control)] border border-linea bg-fondo px-3 py-2 text-[15px]">{patient.name}</p>
          </div>
        ) : null}
      </div>
      {patient ? (
        <SelectField
          label="Fórmula para los lentes"
          optional
          hint="Solo fórmulas vigentes de este paciente. La orden de laboratorio la copia tal cual."
          registration={form.register("prescriptionId")}
          error={fieldError("prescriptionId")}
          options={[...prescriptions, { value: "", label: "Sin fórmula" }]}
        />
      ) : null}

      <fieldset className="grid gap-3">
        <legend className="mb-2 text-sm font-semibold text-tinta">Productos</legend>
        {fields.map((field, i) => {
          const pv = previews[i];
          const variable = pv?.p && pv.p.unitPrice === 0;
          const stock = pv?.p?.tracksStock ? pv.p.stock[locationId] ?? 0 : null;
          return (
            <div key={field.id} className="grid gap-3 rounded-[var(--radius-control)] border border-linea bg-white p-3 md:grid-cols-[1fr_90px_150px_150px_auto] md:items-end">
              <SelectField
                label={`Producto ${i + 1}`}
                registration={form.register(`lines.${i}.productId`)}
                error={fieldError(`lines.${i}.productId`)}
                options={[{ value: "", label: "Elige…" }, ...products.map((p) => ({ value: p.id, label: p.label }))]}
                hint={stock !== null ? `Existencias en la sede: ${stock}` : undefined}
              />
              <TextField label="Cant." inputMode="numeric" registration={form.register(`lines.${i}.quantity`)} error={fieldError(`lines.${i}.quantity`)} />
              {variable ? (
                <TextField label="Precio (COP)" inputMode="numeric" registration={form.register(`lines.${i}.unitPrice`)} error={fieldError(`lines.${i}.unitPrice`)} />
              ) : (
                <div className="grid gap-1.5">
                  <span className="text-sm font-medium text-tinta">Precio</span>
                  <p className="min-h-10 py-2 tabular-nums">{pv?.p ? formatCOP(pv.price) : "—"}</p>
                </div>
              )}
              <TextField label="Descuento (COP)" optional inputMode="numeric" registration={form.register(`lines.${i}.discount`)} error={fieldError(`lines.${i}.discount`)} />
              <div className="flex items-center justify-between gap-3 md:block md:text-right">
                <p className="tabular-nums font-medium">{pv?.p ? formatCOP(pv.total) : ""}</p>
                {fields.length > 1 ? (
                  <Button type="button" variant="texto" onClick={() => remove(i)}>
                    Quitar
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
        {fieldError("lines") ? <p className="text-[13px] font-medium text-error">{fieldError("lines")}</p> : null}
        <div>
          <Button type="button" variant="secundario" onClick={() => append(emptyLine)} disabled={fields.length >= 40}>
            Agregar producto
          </Button>
        </div>
      </fieldset>

      <dl className="ml-auto grid w-full max-w-xs gap-1 text-sm">
        <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatCOP(subtotal)}</dd></div>
        <div className="flex justify-between"><dt>Descuentos</dt><dd className="tabular-nums">− {formatCOP(discounts)}</dd></div>
        <div className="flex justify-between border-t border-linea pt-1 text-base font-semibold text-tinta"><dt>Total</dt><dd className="tabular-nums">{formatCOP(subtotal - discounts)}</dd></div>
      </dl>
      {needsApproval ? (
        <Notice tone="aviso">
          El descuento ({pct.toFixed(1)} %) supera el {discountThreshold} % permitido sin aprobación.{" "}
          {mode === "venta" ? "Guárdalo como cotización para que un administrador lo apruebe." : "La cotización quedará pendiente de aprobación."}
        </Notice>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {mode === "cotizacion" ? (
          <TextField label="Válida hasta" optional type="date" hint="Por defecto, 15 días." registration={form.register("validUntil")} error={fieldError("validUntil")} />
        ) : null}
        <TextAreaField label="Notas" optional registration={form.register("notes")} error={fieldError("notes")} />
      </div>

      <div>
        <Button type="submit" pending={pending} disabled={mode === "venta" && needsApproval}>
          {mode === "venta" ? "Confirmar venta" : quote ? "Guardar cambios" : "Guardar cotización"}
        </Button>
        {mode === "venta" ? (
          <p className="mt-2 text-[13px] text-texto-suave">Al confirmar se descuentan las existencias. Los pagos se registran en la venta.</p>
        ) : null}
      </div>
    </form>
  );
}
