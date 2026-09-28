/**
 * Pruebas matemáticas del motor (§48). Los valores esperados se calcularon a mano
 * y están escritos en los comentarios para que cualquier ingeniero pueda revisarlos.
 * Los datos de equipos son FIXTURES de prueba, no fichas técnicas reales.
 */
import { describe, expect, it } from 'vitest';
import {
  AVG_DAYS_PER_MONTH,
  CONSUMPTION_MISMATCH_MESSAGE,
  InputError,
  ROI_DISCLAIMER,
  buildScenarios,
  checkInverterCompatibility,
  checkStrings,
  co2Avoided,
  compareDeclaredVsLoads,
  computeCosts,
  computePrice,
  computeRoi,
  consumptionStats,
  generateBom,
  kwhToAh,
  loadInventory,
  roundCurrency,
  roundForDisplay,
  sizeBatteryBank,
  sizePvSystem,
  tempCorrect,
  worstStatus,
  type InverterDc,
  type PanelElectrical,
} from './index.js';

const codes = (r: { validations: { code: string }[] }) => r.validations.map((v) => v.code);

/* ─────────────────────────── Unidades y precisión ─────────────────────────── */

describe('unidades y precisión', () => {
  it('convierte kWh ↔ Ah con el voltaje nominal', () => {
    expect(kwhToAh(10.24, 51.2)).toBeCloseTo(200, 10); // 10240 Wh / 51.2 V
  });
  it('redondea moneda según decimales configurados', () => {
    expect(roundCurrency(1234.565, 2)).toBe(1234.57);
    expect(roundCurrency(1234.5, 0)).toBe(1235);
  });
  it('redondeo de presentación no acepta decimales inválidos', () => {
    expect(() => roundForDisplay(1.23, -1)).toThrow(RangeError);
  });
});

/* ─────────────────────────── Consumo (§13, §14) ─────────────────────────── */

describe('consumo manual', () => {
  const r = consumptionStats([
    { period: '2026-01', kwh: 300 },
    { period: '2026-02', kwh: 320 },
    { period: '2026-03', kwh: null },
    { period: '2026-04', kwh: 280 },
  ]);

  it('excluye meses sin dato en lugar de tratarlos como cero', () => {
    // Σ = 900 sobre 3 meses → 300; si se contara el nulo como 0 daría 225.
    expect(r.value.averageMonthlyKwh).toBe(300);
    expect(r.value.missingPeriods).toEqual(['2026-03']);
    expect(codes(r)).toContain('CONSUMPTION_MISSING_PERIODS');
  });
  it('calcula diario, anual, mínimo, máximo y variación', () => {
    expect(r.value.averageDailyKwh).toBeCloseTo(300 / AVG_DAYS_PER_MONTH, 10); // 9.8630…
    expect(r.value.annualKwh).toBe(3600);
    expect(r.value.minMonthlyKwh).toBe(280);
    expect(r.value.maxMonthlyKwh).toBe(320);
    expect(r.value.variationRatio).toBeCloseTo(40 / 300, 10);
  });
  it('usa días reales cuando todos los periodos los traen', () => {
    const d = consumptionStats([
      { period: 'a', kwh: 310, days: 31 },
      { period: 'b', kwh: 300, days: 30 },
    ]);
    expect(d.value.averageDailyKwh).toBe(10); // 610 / 61
  });
  it('rechaza consumos negativos o todos ausentes', () => {
    expect(() => consumptionStats([{ period: 'a', kwh: -1 }])).toThrow(InputError);
    expect(() => consumptionStats([{ period: 'a', kwh: null }])).toThrow(InputError);
  });
});

describe('inventario de cargas', () => {
  it('aplica Potencia × Cantidad × Horas × Días × Factor ÷ 1000', () => {
    const r = loadInventory([
      { name: 'Aire acondicionado', powerW: 1200, quantity: 2, hoursPerDay: 8, daysPerMonth: 30 }, // 576 kWh
      { name: 'Bombillo', powerW: 10, quantity: 5, hoursPerDay: 5, daysPerMonth: 30, usageFactor: 0.5 }, // 3.75 kWh
    ]);
    expect(r.value.lines[0]!.monthlyKwh).toBeCloseTo(576, 10);
    expect(r.value.lines[1]!.monthlyKwh).toBeCloseTo(3.75, 10);
    expect(r.value.totalMonthlyKwh).toBeCloseTo(579.75, 10);
    expect(r.value.installedPowerW).toBe(2450);
  });
  it('rechaza horas imposibles', () => {
    expect(() => loadInventory([{ name: 'x', powerW: 1, quantity: 1, hoursPerDay: 25, daysPerMonth: 30 }])).toThrow(
      InputError,
    );
  });
  it('compara declarado vs calculado con umbral configurable', () => {
    // |576 − 500| / 500 = 0.152
    const low = compareDeclaredVsLoads(500, 576, 0.1);
    expect(low.value.significant).toBe(true);
    expect(low.validations[0]!.message).toBe(CONSUMPTION_MISMATCH_MESSAGE);
    const high = compareDeclaredVsLoads(500, 576, 0.2);
    expect(high.value.significant).toBe(false);
    expect(high.value.differenceRatio).toBeCloseTo(0.152, 10);
  });
});

/* ─────────────────────────── Dimensionamiento (§16) ─────────────────────────── */

describe('dimensionamiento fotovoltaico', () => {
  const resource = { peakSunHours: 4.5, source: 'fixture de prueba', method: 'DATABASE' as const };

  it('calcula kWp, paneles y producción', () => {
    // kWp = 10 / (4.5 × 0.8) = 2.7777… ; paneles = ⌈2777.8 / 550⌉ = 6 ; instalado 3.3 kWp
    const r = sizePvSystem({ dailyConsumptionKwh: 10, coverage: 1, resource, panelPowerW: 550, performanceRatio: 0.8 });
    expect(r.value.requiredKwp).toBeCloseTo(2.7777777778, 9);
    expect(r.value.panelCount).toBe(6);
    expect(r.value.installedKwp).toBeCloseTo(3.3, 10);
    expect(r.value.estimatedDailyKwh).toBeCloseTo(11.88, 10); // 3.3 × 4.5 × 0.8
    expect(r.value.estimatedAnnualKwh).toBeCloseTo(11.88 * 365, 8);
    expect(r.value.achievedCoverage).toBeCloseTo(1.188, 10);
    expect(r.variables.map((v) => v.name)).toEqual(
      expect.arrayContaining(['consumo_diario_kwh', 'horas_solares_pico', 'potencia_panel_w', 'performance_ratio', 'potencia_sistema_kwp']),
    );
    expect(r.formula).toContain('performance_ratio');
  });
  it('no agrega un panel extra por ruido de coma flotante', () => {
    // 9 / (4.5 × 0.8) = 2.5 kWp → exactamente 5 paneles de 500 W
    const r = sizePvSystem({ dailyConsumptionKwh: 9, coverage: 1, resource, panelPowerW: 500, performanceRatio: 0.8 });
    expect(r.value.panelCount).toBe(5);
  });
  it('marca el recurso estimado como preliminar', () => {
    const r = sizePvSystem({
      dailyConsumptionKwh: 10,
      coverage: 0.5,
      resource: { ...resource, method: 'ESTIMATE' },
      panelPowerW: 550,
      performanceRatio: 0.8,
    });
    expect(codes(r)).toContain('SOLAR_RESOURCE_ESTIMATED');
  });
  it('rechaza cobertura > 100 % y HSP físicamente imposibles', () => {
    expect(() =>
      sizePvSystem({ dailyConsumptionKwh: 10, coverage: 1.2, resource, panelPowerW: 550, performanceRatio: 0.8 }),
    ).toThrow(InputError);
    expect(() =>
      sizePvSystem({
        dailyConsumptionKwh: 10,
        coverage: 1,
        resource: { ...resource, peakSunHours: 15 },
        panelPowerW: 550,
        performanceRatio: 0.8,
      }),
    ).toThrow(InputError);
  });
  it('los escenarios son comparables y ninguno se etiqueta como recomendado', () => {
    const s = buildScenarios({ dailyConsumptionKwh: 10, resource, panelPowerW: 550, performanceRatio: 0.8 }, [
      { code: 'A', label: 'Cobertura aproximada 50 %', coverage: 0.5 },
      { code: 'B', label: 'Cobertura aproximada 80 %', coverage: 0.8 },
      { code: 'C', label: 'Cobertura aproximada 100 %', coverage: 1 },
    ]);
    expect(s.title).toBe('ESCENARIOS TÉCNICOS COMPARABLES');
    expect(s.scenarios.map((x) => x.sizing.value.panelCount)).toEqual([3, 5, 6]);
    expect(JSON.stringify(s)).not.toMatch(/recomendad|mejor|ideal/i);
  });
});

/* ─────────────────────────── Strings e inversor (§18, §19) ─────────────────────────── */

describe('validación de strings', () => {
  const panel: PanelElectrical = {
    powerW: 550,
    vocV: 49.5,
    vmpV: 41.7,
    iscA: 13.9,
    impA: 13.2,
    tempCoeffVocPct: -0.27,
    tempCoeffVmpPct: -0.35,
  };
  const inverter: InverterDc = {
    maxDcVoltageV: 600,
    mpptMinV: 150,
    mpptMaxV: 550,
    mppts: [
      { maxInputCurrentA: 16, maxShortCircuitCurrentA: 20 },
      { maxInputCurrentA: 16, maxShortCircuitCurrentA: 20 },
    ],
  };
  const site = { minAmbientC: 10, maxCellC: 70 };

  it('corrige por temperatura', () => {
    expect(tempCorrect(49.5, -0.27, 10)).toBeCloseTo(51.50475, 10); // 49.5 × (1 + 0.0027 × 15)
    expect(tempCorrect(41.7, -0.35, 70)).toBeCloseTo(35.13225, 10); // 41.7 × (1 − 0.0035 × 45)
  });

  it('acepta una configuración válida y calcula el rango de paneles por string', () => {
    const r = checkStrings(panel, inverter, { panelsPerString: 10, stringsPerMppt: [1, 1] }, site);
    expect(r.value.vocStringColdV).toBeCloseTo(515.0475, 8);
    expect(r.value.vmpStringHotV).toBeCloseTo(351.3225, 8);
    expect(r.value.vmpStringColdV).toBeCloseTo(438.8925, 8);
    // máx = ⌊600 / 51.50475⌋ = 11 ; mín = ⌈150 / 35.13225⌉ = 5
    expect(r.value.panelsPerStringRange).toEqual({ min: 5, max: 11 });
    expect(r.value.totalPanels).toBe(20);
    expect(worstStatus(r.validations)).toBe('OK');
  });

  it('ERROR TÉCNICO si el Voc en frío supera el máximo del inversor', () => {
    const r = checkStrings(panel, inverter, { panelsPerString: 12, stringsPerMppt: [1] }, site);
    // 51.50475 × 12 = 618.06 V > 600 V
    expect(codes(r)).toContain('STRING_VOC_EXCEEDS_MAX');
    expect(worstStatus(r.validations)).toBe('ERROR');
  });

  it('corriente: ADVERTENCIA por operación y ERROR por cortocircuito', () => {
    const r = checkStrings(panel, inverter, { panelsPerString: 10, stringsPerMppt: [2] }, site);
    // Imp 26.4 A > 16 A → WARNING ; Isc 27.8 A > 20 A → ERROR
    expect(r.validations.find((v) => v.code === 'MPPT_CURRENT_EXCEEDED')?.status).toBe('WARNING');
    expect(r.validations.find((v) => v.code === 'MPPT_ISC_EXCEEDED')?.status).toBe('ERROR');
  });

  it('ERROR si se usan más MPPT de los disponibles', () => {
    const r = checkStrings(panel, inverter, { panelsPerString: 10, stringsPerMppt: [1, 1, 1] }, site);
    expect(codes(r)).toContain('MPPT_COUNT_EXCEEDED');
  });

  it('pide revisión si faltan datos para condiciones extremas (no supone)', () => {
    const r = checkStrings(panel, inverter, { panelsPerString: 10, stringsPerMppt: [1] });
    expect(codes(r)).toContain('STRING_EXTREMES_NOT_EVALUATED');
    expect(r.value.vocStringColdV).toBeNull();
    expect(worstStatus(r.validations)).toBe('REVIEW_REQUIRED');
  });

  it('relación DC/AC sin regla configurada exige revisión; con regla, valida', () => {
    const inv = { nominalAcPowerW: 5000, phases: 1 as const, acVoltageV: 220 };
    expect(codes(checkInverterCompatibility({ installedKwp: 6, inverter: inv }))).toEqual(['DCAC_RULE_MISSING']);
    const ok = checkInverterCompatibility({ installedKwp: 6, inverter: inv, dcAcRule: { ref: 'R1', min: 0.9, max: 1.3 } });
    expect(ok.value.dcAcRatio).toBeCloseTo(1.2, 10);
    expect(worstStatus(ok.validations)).toBe('OK');
    const bad = checkInverterCompatibility({
      installedKwp: 6,
      inverter: inv,
      site: { phases: 3 },
      dcAcRule: { ref: 'R1', min: 0.9, max: 1.1 },
    });
    expect(codes(bad)).toEqual(expect.arrayContaining(['DCAC_OUT_OF_RANGE', 'INVERTER_PHASES_MISMATCH']));
  });
});

/* ─────────────────────────── Baterías (§20) ─────────────────────────── */

describe('baterías', () => {
  it('dimensiona el banco con DoD y eficiencia', () => {
    const r = sizeBatteryBank({
      backedDailyKwh: 10,
      autonomyHours: 12,
      battery: { capacityKwh: 5.12, nominalVoltageV: 51.2, depthOfDischarge: 0.9, roundTripEfficiency: 0.95 },
    });
    // requerida = 10 × 12/24 = 5 ; nominal = 5 / (0.9 × 0.95) = 5.8480 ; ⌈5.8480 / 5.12⌉ = 2
    expect(r.value.requiredEnergyKwh).toBe(5);
    expect(r.value.requiredNominalKwh).toBeCloseTo(5.847953216, 8);
    expect(r.value.batteryCount).toBe(2);
    expect(r.value.installedNominalKwh).toBeCloseTo(10.24, 10);
    expect(r.value.usableKwh).toBeCloseTo(9.216, 10);
    expect(r.value.availableEnergyKwh).toBeCloseTo(8.7552, 10);
    expect(r.value.achievedAutonomyHours).toBeCloseTo(21.01248, 8);
    expect(r.value.installedCapacityAh).toBeCloseTo(200, 8);
  });
  it('verifica potencia pico solo si hay dato', () => {
    const base = { capacityKwh: 5, nominalVoltageV: 48, depthOfDischarge: 0.9, roundTripEfficiency: 0.95 };
    expect(codes(sizeBatteryBank({ backedDailyKwh: 5, autonomyHours: 4, battery: base, peakLoadW: 3000 }))).toEqual([
      'BATTERY_POWER_NOT_EVALUATED',
    ]);
    const r = sizeBatteryBank({ backedDailyKwh: 5, autonomyHours: 4, battery: { ...base, maxPowerW: 2500 }, peakLoadW: 3000 });
    expect(codes(r)).toEqual(['BATTERY_POWER_INSUFFICIENT']);
  });
  it('rechaza DoD fuera de (0, 1]', () => {
    expect(() =>
      sizeBatteryBank({
        backedDailyKwh: 5,
        autonomyHours: 4,
        battery: { capacityKwh: 5, nominalVoltageV: 48, depthOfDischarge: 90, roundTripEfficiency: 0.95 },
      }),
    ).toThrow(InputError);
  });
});

/* ─────────────────────────── BOM (§21) ─────────────────────────── */

describe('BOM', () => {
  const rules = [
    { id: 'r1', category: 'GRAPAS', productId: 'p-grapa', productName: 'Grapa', unit: 'und', basis: 'PER_PANEL' as const, factor: 4 },
    { id: 'r2', category: 'CONECTORES', productId: 'p-mc4', productName: 'Conector', unit: 'par', basis: 'PER_STRING' as const, factor: 2 },
    { id: 'r3', category: 'CABLE_DC', productId: 'p-cable', productName: 'Cable DC', unit: 'm', basis: 'PER_METER_DC' as const, factor: 1.05 },
    { id: 'r4', category: 'CABLE_AC', productId: 'p-cable-ac', productName: 'Cable AC', unit: 'm', basis: 'PER_METER_AC' as const, factor: 1 },
  ];
  const prices = {
    'p-grapa': { unitCost: 5000, currency: 'COP' },
    'p-cable': { unitCost: 3000, currency: 'COP', supplier: 'Proveedor fixture' },
  };

  it('genera cantidades desde reglas configurables y totaliza', () => {
    const r = generateBom(rules, { panels: 6, strings: 2, inverters: 1, batteries: 0, installedKwp: 3.3, dcCableMeters: 30 }, prices, 'COP');
    const q = Object.fromEntries(r.value.lines.map((l) => [l.productId, l.quantity]));
    expect(q).toEqual({ 'p-grapa': 24, 'p-mc4': 4, 'p-cable': 32 }); // 6×4, 2×2, ⌈30×1.05⌉
    expect(r.value.totalCost).toBe(24 * 5000 + 32 * 3000); // 216 000
    expect(r.value.unpricedCount).toBe(1);
    expect(codes(r)).toEqual(expect.arrayContaining(['BOM_PRICE_MISSING', 'BOM_BASIS_MISSING']));
    expect(r.value.totalsByCategory).toEqual({ GRAPAS: 120000, CABLE_DC: 96000 });
  });

  it('no mezcla monedas sin tasa de cambio', () => {
    const r = generateBom([rules[0]!], { panels: 1, strings: 1, inverters: 1, batteries: 0, installedKwp: 0.5 }, { 'p-grapa': { unitCost: 2, currency: 'USD' } }, 'COP');
    expect(r.value.totalCost).toBe(0);
    expect(codes(r)).toContain('BOM_CURRENCY_MISMATCH');
  });
});

/* ─────────────────────────── Costos, margen e impuestos (§23, §24) ─────────────────────────── */

describe('costos', () => {
  it('separa por categoría y suma sin error de coma flotante', () => {
    const r = computeCosts([
      { category: 'MATERIALES', description: 'a', quantity: 1, unit: 'und', unitCost: 0.1 },
      { category: 'MATERIALES', description: 'b', quantity: 1, unit: 'und', unitCost: 0.2 },
      { category: 'MANO_DE_OBRA', description: 'c', quantity: 3, unit: 'h', unitCost: 25000 },
      { category: 'TRANSPORTE', description: 'd', quantity: 40, unit: 'km', unitCost: 1500 },
    ]);
    expect(r.value.byCategory.MATERIALES).toBe(0.3); // 0.1 + 0.2 en flotante daría 0.30000000000000004
    expect(r.value.byCategory.MANO_DE_OBRA).toBe(75000);
    expect(r.value.byCategory.TRANSPORTE).toBe(60000);
    expect(r.value.byCategory.INGENIERIA).toBe(0);
    expect(r.value.totalCost).toBe(135000.3);
  });
});

describe('precio de venta', () => {
  it('MARKUP: costo → utilidad → impuestos → precio final', () => {
    const r = computePrice({
      totalCost: 1_000_000,
      margin: 0.3,
      marginMode: 'MARKUP',
      taxes: [{ code: 'IVA', name: 'IVA (fixture)', rate: 0.19 }],
      currency: 'COP',
      currencyDecimals: 0,
    });
    expect(r.value.utilidad).toBe(300_000);
    expect(r.value.subtotal).toBe(1_300_000);
    expect(r.value.impuestos).toBe(247_000);
    expect(r.value.precio_final).toBe(1_547_000);
    // Nunca confundir costo con precio
    expect(r.value.costo_total).not.toBe(r.value.precio_final);
  });
  it('GROSS_MARGIN: la utilidad es el margen sobre el precio sin impuestos', () => {
    const r = computePrice({ totalCost: 1000, margin: 0.3, marginMode: 'GROSS_MARGIN', taxes: [], currency: 'USD', currencyDecimals: 2 });
    expect(r.value.utilidad / r.value.subtotal).toBeCloseTo(0.3, 12);
    expect(r.value.rounded.subtotal).toBe(1428.57);
    expect(codes(r)).toContain('NO_TAXES_CONFIGURED');
  });
  it('rechaza tasas expresadas como porcentaje entero', () => {
    expect(() =>
      computePrice({ totalCost: 1, margin: 0, marginMode: 'MARKUP', taxes: [{ code: 'X', name: 'X', rate: 19 }], currency: 'COP', currencyDecimals: 0 }),
    ).toThrow(InputError);
  });
});

/* ─────────────────────────── ROI (§26) ─────────────────────────── */

describe('ROI', () => {
  const base = {
    investment: 10_000,
    firstYearProductionKwh: 5000,
    selfConsumptionRatio: 1,
    tariffPerKwh: 0.2,
    tariffEscalation: 0,
    annualDegradation: 0,
    annualMaintenance: 0,
    lifetimeYears: 20,
  };

  it('caso lineal verificable a mano', () => {
    const r = computeRoi(base);
    expect(r.value.annualSavingsYear1).toBe(1000); // 5000 × 0.2
    expect(r.value.monthlySavingsYear1).toBeCloseTo(1000 / 12, 10);
    expect(r.value.simplePaybackYears).toBe(10);
    expect(r.value.cumulativePaybackYears).toBe(10);
    expect(r.value.horizons).toEqual({ '5': -5000, '10': 0, '15': 5000, '20': 10000 });
    expect(r.assumptions).toContain(ROI_DISCLAIMER);
  });
  it('aplica reemplazos, degradación e incremento tarifario', () => {
    const r = computeRoi({ ...base, replacements: [{ year: 12, cost: 2000, description: 'Inversor' }] });
    expect(r.value.horizons['20']).toBe(8000);
    const d = computeRoi({ ...base, annualDegradation: 0.01, tariffEscalation: 0.05, lifetimeYears: 2 });
    // año 2: 5000 × 0.99 × 0.2 × 1.05 = 1039.5
    expect(d.value.years[1]!.grossSavings).toBeCloseTo(1039.5, 10);
  });
  it('horizontes fuera de la vida útil son null (no se extrapolan)', () => {
    expect(computeRoi({ ...base, lifetimeYears: 12 }).value.horizons['15']).toBeNull();
  });
});

/* ─────────────────────────── Ambiental ─────────────────────────── */

describe('CO₂ evitado', () => {
  it('calcula con factor configurado y no inventa uno si falta', () => {
    expect(co2Avoided(1000, { kgCo2PerKwh: 0.1, source: 'fixture' }).value.annualKgCo2).toBeCloseTo(100, 10);
    const missing = co2Avoided(1000, null);
    expect(missing.value.annualKgCo2).toBeNull();
    expect(missing.validations[0]!.message).toContain('No hay información suficiente para determinar este valor');
  });
});
