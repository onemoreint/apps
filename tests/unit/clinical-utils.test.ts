import { describe, expect, it } from "vitest";
import { addDays, isValidDate, utcToZoned, weekdayIndex, zonedToUtc } from "@/lib/tz";
import { rdaGaps, type RdaInput } from "@/lib/rda";
import { ageFrom, formatDiopter, patientName } from "@/lib/clinical-labels";
import { parseCsv, toRefCodes } from "../../scripts/ref-codes-csv.mjs";

describe("zona horaria", () => {
  it("convierte hora local de Bogotá (UTC−5) a UTC y de vuelta", () => {
    const utc = zonedToUtc("2026-11-02", "09:30", "America/Bogota");
    expect(utc.toISOString()).toBe("2026-11-02T14:30:00.000Z");
    expect(utcToZoned(utc, "America/Bogota")).toMatchObject({ date: "2026-11-02", time: "09:30" });
  });

  it("respeta el cambio de horario en zonas que lo tienen", () => {
    // Madrid: UTC+1 en invierno, UTC+2 en verano.
    expect(zonedToUtc("2026-01-15", "10:00", "Europe/Madrid").toISOString()).toBe("2026-01-15T09:00:00.000Z");
    expect(zonedToUtc("2026-07-15", "10:00", "Europe/Madrid").toISOString()).toBe("2026-07-15T08:00:00.000Z");
  });

  it("aritmética de calendario", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(weekdayIndex("2026-11-02")).toBe(0); // lunes
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("2028-02-29")).toBe(true);
  });
});

describe("verificación de datos del RDA", () => {
  const complete: RdaInput = {
    location: { reps_code: "0538000001" },
    patient: {
      doc_type: "CC", doc_number: "80000001", first_name: "José", first_surname: "Pérez", birth_date: "1985-04-12",
      sex_code: "H", nationality_code: "170", residence_country_code: "170", residence_municipality_code: "05380",
      residence_zone_code: "U", payer_code: "EPS001", ethnicity_code: "6", disability_code: "N", occupation_code: "1",
    },
    encounter: {
      started_at: "2026-10-09T14:00:00Z", ended_at: "2026-10-09T14:30:00Z", modality_code: "01", service_group_code: "01",
      environment_code: "05", admission_route_code: "1", care_cause_code: "38", discharge_condition_code: "1",
    },
    diagnoses: [{ kind: "principal", diagnosis_type_code: "02" }],
    professional: { doc_type: "CC", doc_number: "1001" },
  };

  it("no reporta faltantes cuando todo está diligenciado", () => {
    expect(rdaGaps(complete)).toEqual({ missing: [], recommended: [] });
  });

  it("lista lo que falta con su número de elemento y dónde corregirlo", () => {
    const r = rdaGaps({
      ...complete,
      location: { reps_code: null },
      patient: { ...complete.patient, residence_municipality_code: null, payer_code: null },
      diagnoses: [],
    });
    expect(r.missing.map((g) => g.element)).toEqual(["16", "12.1", "37.1", "37.3"]);
    expect(r.missing.find((g) => g.element === "16")?.where).toBe("sede");
    expect(r.recommended.map((g) => g.element)).toEqual(["15.1"]);
  });
});

describe("presentación clínica", () => {
  it("muestra dioptrías con signo explícito", () => {
    expect(formatDiopter("-1.5")).toBe("-1.50");
    expect(formatDiopter("0.75")).toBe("+0.75");
    expect(formatDiopter("0")).toBe("0.00");
    expect(formatDiopter(null)).toBe("—");
  });

  it("calcula la edad y arma el nombre completo", () => {
    expect(ageFrom("1985-10-10", "2026-10-09")).toBe(40);
    expect(ageFrom("1985-10-09", "2026-10-09")).toBe(41);
    expect(patientName({ first_name: "Ana", second_name: null, first_surname: "Ruiz", second_surname: "Gil" })).toBe("Ana Ruiz Gil");
  });
});

describe("importador de catálogos", () => {
  it("lee CSV con BOM, comillas y separador dentro de comillas", () => {
    const rows = parseCsv('﻿codigo;nombre\nH521;"Miopía; prueba"\n\nX1;"Comillas ""dobles"""\r\n', ";");
    expect(rows).toEqual([["codigo", "nombre"], ["H521", "Miopía; prueba"], ["X1", 'Comillas "dobles"']]);
  });

  it("rechaza códigos inválidos y repetidos con su línea", () => {
    const { codes, rejected } = toRefCodes([["c", "n"], ["A1", "Uno"], ["A 2", "Dos"], ["A1", "Otra vez"], ["A3", ""]]);
    expect(codes).toEqual([{ code: "A1", label: "Uno" }]);
    expect(rejected.map((r) => r.line)).toEqual([3, 4, 5]);
  });
});
