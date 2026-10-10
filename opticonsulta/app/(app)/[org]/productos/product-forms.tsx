"use client";

import { useState } from "react";
import { useServerForm } from "@/components/forms/use-server-form";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { PRODUCT_KINDS } from "@/lib/commerce-labels";
import { createProduct, createSupplier, setProductActive, updateProduct } from "@/modules/commerce/actions";
import {
  contactSchema,
  productSchema,
  productUpdateSchema,
  type ContactInput,
  type ProductInput,
  type ProductUpdateInput,
} from "@/modules/commerce/schemas";

type Option = { value: string; label: string };

export function ProductForm({ slug, suppliers }: { slug: string; suppliers: Option[] }) {
  const { form, onSubmit, pending, formError, message, fieldError } = useServerForm<ProductInput>({
    schema: productSchema,
    defaultValues: { sku: "", name: "", kind: "montura", brand: "", unitPrice: "", cost: "", tracksStock: true, stockMin: "0", supplierId: "" },
    action: (values) => createProduct(slug, values),
    resetOnSuccess: true,
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      {message ? <Notice tone="exito">{message}</Notice> : null}
      <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
        <TextField label="Código" registration={form.register("sku")} error={fieldError("sku")} autoComplete="off" />
        <TextField label="Nombre" registration={form.register("name")} error={fieldError("name")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Tipo" registration={form.register("kind")} error={fieldError("kind")} options={PRODUCT_KINDS.map((k) => ({ ...k }))} />
        <TextField label="Marca" optional registration={form.register("brand")} error={fieldError("brand")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Precio de venta (COP)"
          inputMode="numeric"
          hint="Usa 0 para precio variable (por ejemplo, lentes según fórmula): se indica en cada venta."
          registration={form.register("unitPrice")}
          error={fieldError("unitPrice")}
        />
        <TextField label="Costo (COP)" optional inputMode="numeric" registration={form.register("cost")} error={fieldError("cost")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Existencia mínima" inputMode="numeric" registration={form.register("stockMin")} error={fieldError("stockMin")} />
        <SelectField
          label="Proveedor"
          optional
          registration={form.register("supplierId")}
          error={fieldError("supplierId")}
          options={[{ value: "", label: "Sin proveedor" }, ...suppliers]}
        />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1 size-4" {...form.register("tracksStock")} />
        <span>
          Controlar existencias
          <span className="block text-[13px] text-texto-suave">Desmárcalo para servicios o lentes que se piden al laboratorio. No se puede cambiar después.</span>
        </span>
      </label>
      <div>
        <Button type="submit" pending={pending}>
          Agregar al catálogo
        </Button>
      </div>
    </form>
  );
}

export function SupplierForm({ slug, onSubmitAction = createSupplier, submitLabel = "Registrar proveedor" }: {
  slug: string;
  onSubmitAction?: (slug: string, input: unknown) => ReturnType<typeof createSupplier>;
  submitLabel?: string;
}) {
  const { form, onSubmit, pending, formError, message, fieldError } = useServerForm<ContactInput>({
    schema: contactSchema,
    defaultValues: { name: "", nit: "", contactName: "", phone: "", email: "" },
    action: (values) => onSubmitAction(slug, values),
    resetOnSuccess: true,
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      {message ? <Notice tone="exito">{message}</Notice> : null}
      <TextField label="Nombre" registration={form.register("name")} error={fieldError("name")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="NIT" optional registration={form.register("nit")} error={fieldError("nit")} />
        <TextField label="Contacto" optional registration={form.register("contactName")} error={fieldError("contactName")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Teléfono" optional type="tel" registration={form.register("phone")} error={fieldError("phone")} />
        <TextField label="Correo" optional type="email" registration={form.register("email")} error={fieldError("email")} />
      </div>
      <div>
        <Button type="submit" variant="secundario" pending={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function EditProduct({ slug, id, initial, suppliers, onDone }: { slug: string; id: string; initial: ProductUpdateInput; suppliers: Option[]; onDone: () => void }) {
  const { form, onSubmit, pending, formError, fieldError } = useServerForm<ProductUpdateInput>({
    schema: productUpdateSchema,
    defaultValues: initial,
    action: (values) => updateProduct(slug, id, values),
    onSuccess: onDone,
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-3 rounded-[var(--radius-control)] border border-linea bg-fondo p-3">
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      <TextField label="Nombre" registration={form.register("name")} error={fieldError("name")} />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Marca" optional registration={form.register("brand")} error={fieldError("brand")} />
        <SelectField label="Proveedor" optional registration={form.register("supplierId")} options={[{ value: "", label: "Sin proveedor" }, ...suppliers]} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <TextField label="Precio (COP)" inputMode="numeric" registration={form.register("unitPrice")} error={fieldError("unitPrice")} />
        <TextField label="Costo (COP)" optional inputMode="numeric" registration={form.register("cost")} error={fieldError("cost")} />
        <TextField label="Mínimo" inputMode="numeric" registration={form.register("stockMin")} error={fieldError("stockMin")} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" pending={pending}>
          Guardar
        </Button>
        <Button type="button" variant="texto" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function ProductRowActions({
  slug,
  id,
  active,
  initial,
  suppliers,
}: {
  slug: string;
  id: string;
  active: boolean;
  initial: ProductUpdateInput;
  suppliers: Option[];
}) {
  const [editing, setEditing] = useState(false);
  if (editing) return <EditProduct slug={slug} id={id} initial={initial} suppliers={suppliers} onDone={() => setEditing(false)} />;
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="texto" onClick={() => setEditing(true)}>
        Editar
      </Button>
      <ConfirmAction
        label={active ? "Retirar" : "Activar"}
        variant="texto"
        question={active ? "¿Retirar de la venta? Su historial y existencias se conservan." : "¿Volver a ofrecerlo?"}
        confirmLabel={active ? "Sí, retirar" : "Sí, activar"}
        onConfirm={() => setProductActive(slug, id, !active)}
      />
    </div>
  );
}
