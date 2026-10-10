"use client";

import { useServerForm } from "@/components/forms/use-server-form";
import { Button } from "@/components/ui/button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { annulSale, registerPayment, rejectReversal, requestReversal, reversePayment } from "@/modules/commerce/actions";
import { paymentSchema, type PaymentInput } from "@/modules/commerce/schemas";
import { createLabOrder, openWarranty, registerDelivery } from "@/modules/lab/actions";
import {
  deliverySchema,
  labOrderSchema,
  warrantySchema,
  type DeliveryInput,
  type LabOrderInput,
  type WarrantyInput,
} from "@/modules/lab/schemas";

type Option = { value: string; label: string };

export function PaymentForm({ slug, saleId, methods, balance }: { slug: string; saleId: string; methods: Option[]; balance: number }) {
  const { form, onSubmit, pending, formError, message, fieldError } = useServerForm<PaymentInput>({
    schema: paymentSchema,
    defaultValues: { methodId: methods[0]?.value ?? "", amount: String(Math.round(balance)), reference: "" },
    action: (values) => registerPayment(slug, saleId, values),
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      {message ? <Notice tone="exito">{message}</Notice> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField label="Medio de pago" registration={form.register("methodId")} error={fieldError("methodId")} options={methods} />
        <TextField label="Valor (COP)" inputMode="numeric" registration={form.register("amount")} error={fieldError("amount")} />
        <TextField label="Referencia" optional hint="Número de aprobación o de transferencia" registration={form.register("reference")} error={fieldError("reference")} />
      </div>
      <div>
        <Button type="submit" pending={pending}>
          Registrar pago
        </Button>
      </div>
    </form>
  );
}

export function PaymentActions({
  slug,
  saleId,
  paymentId,
  canReverse,
  canRequest,
  pendingRequestId,
}: {
  slug: string;
  saleId: string;
  paymentId: string;
  canReverse: boolean;
  canRequest: boolean;
  pendingRequestId: string | null;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {canReverse ? (
        <ConfirmAction
          label="Revertir"
          variant="texto"
          question="¿Revertir este pago? El pago y su reversión quedan registrados; si fue en efectivo, sale de tu caja."
          reasonLabel="Motivo de la reversión"
          confirmLabel="Sí, revertir"
          onConfirm={(reason) => reversePayment(slug, saleId, paymentId, reason)}
        />
      ) : null}
      {canReverse && pendingRequestId ? (
        <ConfirmAction
          label="Rechazar solicitud"
          variant="texto"
          question="¿Rechazar la solicitud de reversión?"
          reasonLabel="Explica por qué"
          confirmLabel="Rechazar"
          onConfirm={(note) => rejectReversal(slug, saleId, pendingRequestId, note)}
        />
      ) : null}
      {!canReverse && canRequest && !pendingRequestId ? (
        <ConfirmAction
          label="Solicitar reversión"
          variant="texto"
          question="Un administrador revisará la solicitud."
          reasonLabel="¿Qué pasó?"
          confirmLabel="Enviar solicitud"
          onConfirm={(reason) => requestReversal(slug, saleId, paymentId, reason)}
        />
      ) : null}
    </div>
  );
}

export function AnnulSale({ slug, saleId }: { slug: string; saleId: string }) {
  return (
    <ConfirmAction
      label="Anular venta"
      variant="peligro"
      question="¿Anular la venta? Debe no tener pagos vigentes, órdenes activas ni entregas. Las existencias vuelven al inventario."
      reasonLabel="Motivo de la anulación"
      confirmLabel="Sí, anular"
      onConfirm={(reason) => annulSale(slug, saleId, reason)}
    />
  );
}

export function LabOrderForm({ slug, saleId, laboratories, minDate, defaults }: { slug: string; saleId: string; laboratories: Option[]; minDate: string; defaults: { lens: string; frame: string } }) {
  const { form, onSubmit, pending, formError, fieldError } = useServerForm<LabOrderInput>({
    schema: labOrderSchema,
    defaultValues: { laboratoryId: laboratories[0]?.value ?? "", promisedDate: "", lensDescription: defaults.lens, frameDescription: defaults.frame, instructions: "" },
    action: (values) => createLabOrder(slug, saleId, values),
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Laboratorio" registration={form.register("laboratoryId")} error={fieldError("laboratoryId")} options={laboratories} />
        <TextField label="Fecha prometida al paciente" type="date" min={minDate} registration={form.register("promisedDate")} error={fieldError("promisedDate")} />
      </div>
      <TextField label="Lentes pedidos" hint="Material, diseño y tratamientos." registration={form.register("lensDescription")} error={fieldError("lensDescription")} />
      <TextField label="Montura" optional registration={form.register("frameDescription")} error={fieldError("frameDescription")} />
      <TextAreaField label="Instrucciones al laboratorio" optional registration={form.register("instructions")} error={fieldError("instructions")} />
      <p className="text-[13px] text-texto-suave">La orden copia la fórmula vigente tal como está hoy. Si la fórmula cambia después, la orden no se altera.</p>
      <div>
        <Button type="submit" pending={pending}>
          Crear orden de laboratorio
        </Button>
      </div>
    </form>
  );
}

export function DeliveryForm({ slug, saleId, orders, balance, canAuthorizeBalance }: { slug: string; saleId: string; orders: Option[]; balance: number; canAuthorizeBalance: boolean }) {
  const { form, onSubmit, pending, formError, message, fieldError } = useServerForm<DeliveryInput>({
    schema: deliverySchema,
    defaultValues: { orderId: orders[0]?.value ?? "", receivedByName: "", receivedByDoc: "", notes: "", allowBalance: false },
    action: (values) => registerDelivery(slug, saleId, values),
    resetOnSuccess: true,
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      {message ? <Notice tone="exito">{message}</Notice> : null}
      <SelectField
        label="Qué se entrega"
        registration={form.register("orderId")}
        error={fieldError("orderId")}
        options={[...orders, { value: "", label: "Productos de la venta sin orden de laboratorio" }]}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Recibe" registration={form.register("receivedByName")} error={fieldError("receivedByName")} />
        <TextField label="Documento de quien recibe" optional registration={form.register("receivedByDoc")} error={fieldError("receivedByDoc")} />
      </div>
      <TextField label="Observaciones" optional registration={form.register("notes")} error={fieldError("notes")} />
      {balance > 0 ? (
        canAuthorizeBalance ? (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1 size-4" {...form.register("allowBalance")} />
            <span>Autorizo entregar con saldo pendiente. Quedará registrado a mi nombre.</span>
          </label>
        ) : (
          <Notice tone="aviso">La venta tiene saldo pendiente. Cóbralo antes de entregar o pide a un administrador que autorice.</Notice>
        )
      ) : null}
      <div>
        <Button type="submit" pending={pending}>
          Registrar entrega
        </Button>
      </div>
    </form>
  );
}

export function WarrantyForm({ slug, saleId, orders }: { slug: string; saleId: string; orders: Option[] }) {
  const { form, onSubmit, pending, formError, message, fieldError } = useServerForm<WarrantyInput>({
    schema: warrantySchema,
    defaultValues: { orderId: "", kind: "garantia", description: "" },
    action: (values) => openWarranty(slug, saleId, values),
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
            { value: "garantia", label: "Garantía" },
            { value: "incidencia", label: "Incidencia" },
          ]}
        />
        <SelectField label="Orden relacionada" optional registration={form.register("orderId")} error={fieldError("orderId")} options={[{ value: "", label: "Ninguna" }, ...orders]} />
      </div>
      <TextAreaField label="Descripción del caso" registration={form.register("description")} error={fieldError("description")} />
      <div>
        <Button type="submit" variant="secundario" pending={pending}>
          Abrir caso
        </Button>
      </div>
    </form>
  );
}
