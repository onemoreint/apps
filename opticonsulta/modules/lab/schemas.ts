import { z } from "zod";

const date = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige la fecha");

export const labOrderSchema = z.object({
  laboratoryId: z.uuid("Elige el laboratorio"),
  promisedDate: date,
  lensDescription: z.string().trim().min(3, "Describe los lentes pedidos").max(300),
  frameDescription: z.string().trim().max(300),
  instructions: z.string().trim().max(1000),
});
export type LabOrderInput = z.input<typeof labOrderSchema>;

export const statusChangeSchema = z.object({
  statusId: z.uuid("Elige el estado"),
  note: z.string().trim().max(300),
});
export type StatusChangeInput = z.input<typeof statusChangeSchema>;

/** Lista de verificación del control de calidad. Solo registra lo que la persona marcó. */
export const QC_ITEMS = [
  { key: "formula_coincide", label: "Potencias verificadas en el lensómetro coinciden con lo pedido" },
  { key: "centrado", label: "Centrado y altura según medidas" },
  { key: "tratamientos", label: "Tratamientos pedidos presentes" },
  { key: "montura", label: "Montura sin daños y bien ajustada" },
  { key: "limpieza", label: "Lentes limpios y sin rayas" },
] as const;

export const qualitySchema = z
  .object({
    result: z.enum(["aprobado", "rechazado"]),
    checks: z.record(z.string(), z.boolean()),
    notes: z.string().trim().max(1000),
  })
  .refine((v) => v.result !== "rechazado" || v.notes.length >= 5, {
    path: ["notes"],
    message: "Describe el motivo del rechazo",
  })
  .refine((v) => v.result !== "aprobado" || QC_ITEMS.every((i) => v.checks[i.key]), {
    path: ["result"],
    message: "Para aprobar, marca cada verificación realizada. Si alguna no se cumple, rechaza.",
  });
export type QualityInput = z.input<typeof qualitySchema>;

export const deliverySchema = z.object({
  orderId: z.string().trim().refine((v) => v === "" || z.uuid().safeParse(v).success, "Orden no válida"),
  receivedByName: z.string().trim().min(3, "Nombre de quien recibe").max(120),
  receivedByDoc: z.string().trim().refine((v) => v === "" || /^[A-Za-z0-9]{3,20}$/.test(v), "Documento sin puntos ni espacios"),
  notes: z.string().trim().max(500),
  allowBalance: z.boolean(),
});
export type DeliveryInput = z.input<typeof deliverySchema>;

export const warrantySchema = z.object({
  orderId: z.string().trim().refine((v) => v === "" || z.uuid().safeParse(v).success, "Orden no válida"),
  kind: z.enum(["garantia", "incidencia"]),
  description: z.string().trim().min(10, "Describe el caso (mínimo 10 caracteres)").max(2000),
});
export type WarrantyInput = z.input<typeof warrantySchema>;

export const warrantyUpdateSchema = z.object({
  status: z.enum(["en_proceso", "resuelta", "rechazada"]),
  note: z.string().trim().min(5, "Describe la gestión o la resolución").max(1000),
});
export type WarrantyUpdateInput = z.input<typeof warrantyUpdateSchema>;

export const statusNameSchema = z.object({
  name: z.string().trim().min(3, "Nombre del estado").max(60),
  position: z.string().trim().regex(/^\d{1,3}$/, "Número de orden (0–999)"),
});
export type StatusNameInput = z.input<typeof statusNameSchema>;

export const reasonOnly = z.object({
  reason: z.string().trim().min(5, "Explica el motivo (mínimo 5 caracteres)").max(300),
});
