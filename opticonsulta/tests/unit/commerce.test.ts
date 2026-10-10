import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/csv";
import { docNumber, parsePesos } from "@/lib/commerce-labels";
import { documentSchema, movementSchema, paymentSchema, toItemsPayload } from "@/modules/commerce/schemas";
import { QC_ITEMS, qualitySchema } from "@/modules/lab/schemas";
import { privacyUpdateSchema } from "@/modules/privacy/schemas";
import { exportSchema, periodSchema } from "@/modules/reports/schemas";

describe("CSV", () => {
  it("neutraliza fórmulas y escapa separadores", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell("+57 300")).toBe("'+57 300");
    expect(csvCell("-1.25")).toBe("'-1.25");
    expect(csvCell(-1.25)).toBe("-1.25"); // los números no se alteran
    expect(csvCell("a;b")).toBe('"a;b"');
    expect(csvCell(null)).toBe("");
  });
  it("incluye BOM, encabezados y fin de línea CRLF", () => {
    expect(toCsv(["A", "B"], [[1, "x"]])).toBe("﻿A;B\r\n1;x\r\n");
  });
});

describe("dinero y numeración", () => {
  it("interpreta pesos escritos con puntos de miles", () => {
    expect(parsePesos("1.200.000")).toBe(1200000);
    expect(parsePesos("$ 95000")).toBe(95000);
    expect(parsePesos("12,5")).toBe(12.5);
    expect(parsePesos("abc")).toBeNull();
    expect(parsePesos("-5")).toBeNull();
  });
  it("numera documentos internos", () => {
    expect(docNumber("V", 42)).toBe("V-000042");
  });
});

describe("esquemas comerciales", () => {
  const uuid = "6f3576c5-bf09-4dda-a804-6d80ac810398";
  it("convierte el formulario de venta en el JSON de la base", () => {
    const v = documentSchema.parse({
      locationId: uuid, patientId: "", prescriptionId: "", notes: "", validUntil: "",
      lines: [{ productId: uuid, quantity: "2", unitPrice: "", discount: "5.000" }],
    });
    expect(toItemsPayload(v)).toEqual({
      location_id: uuid, patient_id: null, prescription_id: null, notes: null, valid_until: null,
      items: [{ product_id: uuid, quantity: 2, unit_price: null, discount_amount: 5000 }],
    });
  });
  it("exige al menos un producto y pagos positivos", () => {
    expect(documentSchema.safeParse({ locationId: uuid, patientId: "", prescriptionId: "", notes: "", validUntil: "", lines: [] }).success).toBe(false);
    expect(paymentSchema.safeParse({ methodId: uuid, amount: "0", reference: "" }).success).toBe(false);
  });
  it("los ajustes de inventario exigen motivo; las entradas no", () => {
    const base = { productId: uuid, locationId: uuid, quantity: "3", unitCost: "", reason: "" };
    expect(movementSchema.safeParse({ ...base, type: "entrada" }).success).toBe(true);
    expect(movementSchema.safeParse({ ...base, type: "ajuste_negativo" }).success).toBe(false);
  });
});

describe("control de calidad, privacidad y exportación", () => {
  const allChecked = Object.fromEntries(QC_ITEMS.map((i) => [i.key, true]));
  it("no se aprueba sin todas las verificaciones; el rechazo exige motivo", () => {
    expect(qualitySchema.safeParse({ result: "aprobado", checks: { ...allChecked, centrado: false }, notes: "" }).success).toBe(false);
    expect(qualitySchema.safeParse({ result: "aprobado", checks: allChecked, notes: "" }).success).toBe(true);
    expect(qualitySchema.safeParse({ result: "rechazado", checks: {}, notes: "" }).success).toBe(false);
  });
  it("una solicitud solo se cierra con la respuesta registrada", () => {
    expect(privacyUpdateSchema.safeParse({ status: "respondida", response: "ok" }).success).toBe(false);
    expect(privacyUpdateSchema.safeParse({ status: "en_tramite", response: "" }).success).toBe(true);
  });
  it("valida periodo y motivo de exportación", () => {
    expect(periodSchema.safeParse({ from: "2026-10-09", to: "2026-10-01" }).success).toBe(false);
    expect(periodSchema.safeParse({ from: "2024-01-01", to: "2026-01-01" }).success).toBe(false);
    expect(exportSchema.safeParse({ kind: "ventas", from: "2026-10-01", to: "2026-10-09", reason: "corto" }).success).toBe(false);
    expect(exportSchema.safeParse({ kind: "historias", from: "2026-10-01", to: "2026-10-09", reason: "Motivo suficiente" }).success).toBe(false);
  });
});

describe("periodo de reportes", () => {
  it("acepta hasta 366 días contando ambos extremos", () => {
    expect(periodSchema.safeParse({ from: "2024-01-01", to: "2024-12-31" }).success).toBe(true); // 366 días (bisiesto)
    expect(periodSchema.safeParse({ from: "2024-01-01", to: "2025-01-01" }).success).toBe(false); // 367
  });
});
