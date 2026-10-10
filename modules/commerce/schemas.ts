import { z } from "zod";
import { parsePesos } from "@/lib/commerce-labels";

const pesos = (label: string, { allowZero = true } = {}) =>
  z
    .string()
    .trim()
    .refine((v) => parsePesos(v) !== null, `${label}: escribe un valor en pesos, sin centavos ni símbolos raros`)
    .refine((v) => allowZero || (parsePesos(v) ?? 0) > 0, `${label} debe ser mayor que cero`);

const optionalPesos = (label: string) =>
  z.string().trim().refine((v) => v === "" || parsePesos(v) !== null, `${label}: valor en pesos no válido`);

const uuidOrEmpty = z.string().trim().refine((v) => v === "" || z.uuid().safeParse(v).success, "Selección no válida");

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre").max(120),
  nit: z.string().trim().refine((v) => v === "" || /^[0-9]{5,12}(-[0-9])?$/.test(v), "NIT: números y, si aplica, guion con dígito de verificación"),
  contactName: z.string().trim().max(120),
  phone: z.string().trim().refine((v) => v === "" || /^[0-9+ ()-]{7,20}$/.test(v), "Teléfono no válido"),
  email: z.string().trim().refine((v) => v === "" || z.email().safeParse(v).success, "Correo no válido"),
});
export type ContactInput = z.input<typeof contactSchema>;

export const productSchema = z.object({
  sku: z.string().trim().regex(/^[A-Za-z0-9._-]{1,40}$/, "Código: letras, números, punto, guion (máx. 40)"),
  name: z.string().trim().min(2, "Escribe el nombre").max(160),
  kind: z.enum(["montura", "lente_oftalmico", "lente_contacto", "accesorio", "servicio", "otro"]),
  brand: z.string().trim().max(80),
  unitPrice: pesos("Precio"),
  cost: optionalPesos("Costo"),
  tracksStock: z.boolean(),
  stockMin: z.string().trim().regex(/^\d{1,6}$/, "Número entero"),
  supplierId: uuidOrEmpty,
});
export type ProductInput = z.input<typeof productSchema>;

export const productUpdateSchema = productSchema.omit({ sku: true, kind: true, tracksStock: true });
export type ProductUpdateInput = z.input<typeof productUpdateSchema>;

export const movementSchema = z.object({
  productId: z.uuid("Elige un producto"),
  locationId: z.uuid("Elige la sede"),
  type: z.enum(["entrada", "ajuste_positivo", "ajuste_negativo"]),
  quantity: z.string().trim().regex(/^[1-9]\d{0,5}$/, "Cantidad entera mayor que cero"),
  unitCost: optionalPesos("Costo unitario"),
  reason: z.string().trim().max(300),
}).refine((v) => v.type === "entrada" || v.reason.length >= 5, {
  path: ["reason"],
  message: "Los ajustes exigen un motivo (mínimo 5 caracteres)",
});
export type MovementInput = z.input<typeof movementSchema>;

export const lineSchema = z.object({
  productId: z.uuid("Elige un producto"),
  quantity: z.string().trim().regex(/^[1-9]\d{0,3}$/, "Cantidad no válida"),
  unitPrice: optionalPesos("Precio"),
  discount: optionalPesos("Descuento"),
});

export const documentSchema = z.object({
  locationId: z.uuid("Elige la sede"),
  patientId: uuidOrEmpty,
  prescriptionId: uuidOrEmpty,
  notes: z.string().trim().max(500),
  validUntil: z.string().trim().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Fecha no válida"),
  lines: z.array(lineSchema).min(1, "Agrega al menos un producto").max(40),
});
export type DocumentInput = z.input<typeof documentSchema>;

/** Convierte el formulario en el JSON que esperan save_quote y create_sale. */
export function toItemsPayload(v: z.output<typeof documentSchema>) {
  return {
    location_id: v.locationId,
    patient_id: v.patientId || null,
    prescription_id: v.prescriptionId || null,
    notes: v.notes || null,
    valid_until: v.validUntil || null,
    items: v.lines.map((l) => ({
      product_id: l.productId,
      quantity: Number(l.quantity),
      // El servidor usa el precio del catálogo; este solo cuenta si el catálogo tiene precio variable (0).
      unit_price: l.unitPrice === "" ? null : parsePesos(l.unitPrice),
      discount_amount: l.discount === "" ? 0 : parsePesos(l.discount),
    })),
  };
}

export const paymentSchema = z.object({
  methodId: z.uuid("Elige el medio de pago"),
  amount: pesos("Valor", { allowZero: false }),
  reference: z.string().trim().max(80),
});
export type PaymentInput = z.input<typeof paymentSchema>;

export const reasonSchema = z.object({
  reason: z.string().trim().min(5, "Explica el motivo (mínimo 5 caracteres)").max(300),
});

export const openCashSchema = z.object({
  locationId: z.uuid("Elige la sede"),
  opening: pesos("Base inicial"),
});
export type OpenCashInput = z.input<typeof openCashSchema>;

export const cashMovementSchema = z.object({
  kind: z.enum(["ingreso", "egreso"]),
  amount: pesos("Valor", { allowZero: false }),
  reason: z.string().trim().min(5, "Explica el movimiento (mínimo 5 caracteres)").max(300),
});
export type CashMovementInput = z.input<typeof cashMovementSchema>;

export const closeCashSchema = z.object({
  counts: z.array(z.object({ methodId: z.uuid(), counted: pesos("Conteo") })).min(1),
  notes: z.string().trim().max(500),
});
export type CloseCashInput = z.input<typeof closeCashSchema>;
