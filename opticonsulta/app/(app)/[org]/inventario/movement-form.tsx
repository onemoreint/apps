"use client";

import { useServerForm } from "@/components/forms/use-server-form";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { registerMovement } from "@/modules/commerce/actions";
import { movementSchema, type MovementInput } from "@/modules/commerce/schemas";

type Option = { value: string; label: string };

export function MovementForm({ slug, products, locations, types }: { slug: string; products: Option[]; locations: Option[]; types: Option[] }) {
  const { form, onSubmit, pending, formError, message, fieldError } = useServerForm<MovementInput>({
    schema: movementSchema,
    defaultValues: {
      productId: products[0]?.value ?? "",
      locationId: locations[0]?.value ?? "",
      type: (types[0]?.value ?? "entrada") as MovementInput["type"],
      quantity: "",
      unitCost: "",
      reason: "",
    },
    action: (values) => registerMovement(slug, values),
    resetOnSuccess: true,
  });
  const type = form.watch("type");
  if (!products.length) return <p className="text-sm text-texto-suave">No hay productos con control de existencias.</p>;
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      {message ? <Notice tone="exito">{message}</Notice> : null}
      <SelectField label="Producto" registration={form.register("productId")} error={fieldError("productId")} options={products} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Sede" registration={form.register("locationId")} error={fieldError("locationId")} options={locations} />
        <SelectField label="Movimiento" registration={form.register("type")} error={fieldError("type")} options={types} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Cantidad" inputMode="numeric" registration={form.register("quantity")} error={fieldError("quantity")} />
        {type === "entrada" ? (
          <TextField label="Costo unitario (COP)" optional inputMode="numeric" registration={form.register("unitCost")} error={fieldError("unitCost")} />
        ) : null}
      </div>
      <TextField
        label={type === "entrada" ? "Referencia (factura del proveedor, remisión)" : "Motivo del ajuste"}
        optional={type === "entrada"}
        registration={form.register("reason")}
        error={fieldError("reason")}
      />
      <div>
        <Button type="submit" pending={pending}>
          Registrar movimiento
        </Button>
      </div>
    </form>
  );
}
