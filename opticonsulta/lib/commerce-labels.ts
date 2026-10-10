// Etiquetas en español de los estados comerciales, de laboratorio y posventa.

export const PRODUCT_KINDS = [
  { value: "montura", label: "Montura" },
  { value: "lente_oftalmico", label: "Lente oftálmico" },
  { value: "lente_contacto", label: "Lente de contacto" },
  { value: "accesorio", label: "Accesorio" },
  { value: "servicio", label: "Servicio" },
  { value: "otro", label: "Otro" },
] as const;

export const productKindLabel = (k: string) => PRODUCT_KINDS.find((x) => x.value === k)?.label ?? k;

export const MOVEMENT_LABELS: Record<string, string> = {
  entrada: "Entrada",
  salida_venta: "Salida por venta",
  devolucion_venta: "Devolución por anulación",
  ajuste_positivo: "Ajuste positivo",
  ajuste_negativo: "Ajuste negativo",
};

export const QUOTE_STATUS: Record<string, string> = { abierta: "Abierta", convertida: "Convertida en venta", anulada: "Anulada" };
export const DISCOUNT_STATUS: Record<string, string> = {
  no_requiere: "Sin aprobación requerida",
  pendiente: "Descuento pendiente de aprobación",
  aprobado: "Descuento aprobado",
  rechazado: "Descuento rechazado",
};
export const SALE_STATUS: Record<string, string> = { confirmada: "Confirmada", anulada: "Anulada" };

export const LAB_KIND_LABEL: Record<string, string> = {
  inicial: "Por enviar",
  proceso: "En proceso",
  recibido: "Recibida en la óptica",
  calidad_aprobada: "Lista para entregar",
  calidad_rechazada: "Rechazada en calidad",
  entregado: "Entregada",
  cancelado: "Cancelada",
};

export const WARRANTY_STATUS: Record<string, string> = {
  abierta: "Abierta",
  en_proceso: "En gestión",
  resuelta: "Resuelta",
  rechazada: "No procede",
};
export const WARRANTY_KIND: Record<string, string> = { garantia: "Garantía", incidencia: "Incidencia" };

export const PRIVACY_KIND: Record<string, string> = {
  consulta: "Consulta",
  rectificacion: "Rectificación o actualización",
  supresion: "Supresión",
  revocatoria: "Revocatoria de la autorización",
  otro_reclamo: "Otro reclamo",
};
export const PRIVACY_STATUS: Record<string, string> = { recibida: "Recibida", en_tramite: "En trámite", respondida: "Respondida" };

/** Número de documento interno con prefijo y ceros: V-000123. */
export const docNumber = (prefix: string, n: number) => `${prefix}-${String(n).padStart(6, "0")}`;

/** Pesos enteros desde texto del formulario ("1.200.000", "1200000"). null si no es válido. */
export function parsePesos(raw: string): number | null {
  const clean = raw.replace(/[\s$.]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Number(clean);
}
