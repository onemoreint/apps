import { type CalcResult, type Validation, InputError, requirePositive } from '../core/types.js';
import { percentToFraction } from '../core/units.js';

/** Datos eléctricos del panel en condiciones STC (§17). */
export interface PanelElectrical {
  powerW: number;
  vocV: number;
  vmpV: number;
  iscA: number;
  impA: number;
  /** Coeficiente de temperatura de Voc en %/°C (normalmente negativo, p. ej. -0.27). */
  tempCoeffVocPct?: number | null;
  /** Coeficiente de temperatura de Vmp en %/°C. Si falta se aproxima con el de Voc (se declara). */
  tempCoeffVmpPct?: number | null;
  /** Coeficiente de temperatura de Isc en %/°C (positivo, p. ej. 0.05). */
  tempCoeffIscPct?: number | null;
}

export interface MpptInput {
  /** Corriente máxima de operación por MPPT (A). */
  maxInputCurrentA: number;
  /** Corriente máxima de cortocircuito admitida por MPPT (A), si el fabricante la publica. */
  maxShortCircuitCurrentA?: number | null;
  /** Máximo de strings en paralelo admitidos por el MPPT, si aplica. */
  maxStrings?: number | null;
}

/** Datos DC del inversor (§18). */
export interface InverterDc {
  maxDcVoltageV: number;
  mpptMinV: number;
  mpptMaxV: number;
  startVoltageV?: number | null;
  mppts: MpptInput[];
}

/** Condiciones de sitio para evaluar extremos. Si faltan, se marca REVIEW_REQUIRED. */
export interface SiteTemperatures {
  /** Temperatura ambiente mínima histórica (°C) → Voc máximo. */
  minAmbientC?: number | null;
  /** Temperatura de celda máxima esperada (°C) → Vmp mínimo. */
  maxCellC?: number | null;
}

export interface StringLayout {
  panelsPerString: number;
  /** Número de strings en paralelo en cada MPPT. Longitud ≤ número de MPPT. */
  stringsPerMppt: number[];
}

export interface StringCheckResult {
  totalPanels: number;
  vocStringStcV: number;
  vmpStringStcV: number;
  vocStringColdV: number | null;
  vmpStringHotV: number | null;
  vmpStringColdV: number | null;
  perMppt: Array<{ mppt: number; strings: number; impTotalA: number; iscTotalA: number }>;
  /** Rango admisible de paneles por string con los datos disponibles. */
  panelsPerStringRange: { min: number | null; max: number | null };
}

const STC_C = 25;

/** Valor corregido por temperatura: X(T) = X_stc × (1 + β × (T − 25)). β en %/°C. */
export function tempCorrect(valueStc: number, coeffPctPerC: number, tempC: number): number {
  return valueStc * (1 + percentToFraction(coeffPctPerC) * (tempC - STC_C));
}

export function checkStrings(
  panel: PanelElectrical,
  inverter: InverterDc,
  layout: StringLayout,
  site: SiteTemperatures = {},
): CalcResult<StringCheckResult> {
  const n = layout.panelsPerString;
  if (!Number.isInteger(n) || n < 1) throw new InputError('layout.panelsPerString', 'debe ser entero >= 1');
  requirePositive('panel.vocV', panel.vocV);
  requirePositive('panel.vmpV', panel.vmpV);
  requirePositive('panel.iscA', panel.iscA);
  requirePositive('panel.impA', panel.impA);
  requirePositive('inverter.maxDcVoltageV', inverter.maxDcVoltageV);
  requirePositive('inverter.mpptMinV', inverter.mpptMinV);
  requirePositive('inverter.mpptMaxV', inverter.mpptMaxV);
  if (inverter.mpptMinV >= inverter.mpptMaxV) throw new InputError('inverter.mppt', 'mínimo debe ser menor que máximo');
  if (inverter.mppts.length === 0) throw new InputError('inverter.mppts', 'se requiere al menos un MPPT');

  const v: Validation[] = [];
  const assumptions: string[] = ['Corrección térmica: X(T) = X_STC × (1 + β/100 × (T − 25 °C)).'];

  const vocStc = panel.vocV * n;
  const vmpStc = panel.vmpV * n;

  // ── Extremos térmicos ─────────────────────────────────────────────
  const hasVocCoeff = typeof panel.tempCoeffVocPct === 'number';
  const vmpCoeff =
    typeof panel.tempCoeffVmpPct === 'number' ? panel.tempCoeffVmpPct : hasVocCoeff ? panel.tempCoeffVocPct! : null;
  if (typeof panel.tempCoeffVmpPct !== 'number' && hasVocCoeff) {
    assumptions.push('Coeficiente térmico de Vmp no disponible: se aproxima con el coeficiente de Voc.');
  }
  const canCold = hasVocCoeff && typeof site.minAmbientC === 'number';
  const canHot = vmpCoeff !== null && typeof site.maxCellC === 'number';

  const vocCold = canCold ? tempCorrect(panel.vocV, panel.tempCoeffVocPct!, site.minAmbientC!) * n : null;
  const vmpCold = canCold && vmpCoeff !== null ? tempCorrect(panel.vmpV, vmpCoeff, site.minAmbientC!) * n : null;
  const vmpHot = canHot ? tempCorrect(panel.vmpV, vmpCoeff!, site.maxCellC!) * n : null;

  if (!canCold || !canHot) {
    v.push({
      code: 'STRING_EXTREMES_NOT_EVALUATED',
      status: 'REVIEW_REQUIRED',
      message:
        'No hay datos suficientes (coeficientes térmicos del panel o temperaturas del sitio) para evaluar condiciones extremas.',
    });
  }

  // ── Voltaje máximo del inversor ──────────────────────────────────
  const vocForMax = vocCold ?? vocStc;
  if (vocForMax > inverter.maxDcVoltageV) {
    v.push({
      code: 'STRING_VOC_EXCEEDS_MAX',
      status: 'ERROR',
      message: `Voc del string (${vocForMax.toFixed(1)} V${vocCold ? ' en frío' : ' STC'}) supera el voltaje DC máximo del inversor (${inverter.maxDcVoltageV} V).`,
    });
  } else {
    v.push({ code: 'STRING_VOC_OK', status: 'OK', message: 'Voltaje máximo del string compatible con el inversor.' });
  }

  // ── Rango MPPT ───────────────────────────────────────────────────
  if (vmpStc < inverter.mpptMinV || vmpStc > inverter.mpptMaxV) {
    v.push({
      code: 'STRING_VMP_OUT_OF_MPPT_STC',
      status: 'ERROR',
      message: `Vmp del string en STC (${vmpStc.toFixed(1)} V) fuera del rango MPPT (${inverter.mpptMinV}–${inverter.mpptMaxV} V).`,
    });
  } else {
    v.push({ code: 'STRING_VMP_MPPT_OK', status: 'OK', message: 'Vmp del string dentro del rango MPPT en STC.' });
  }
  if (vmpHot !== null && vmpHot < inverter.mpptMinV) {
    v.push({
      code: 'STRING_VMP_HOT_BELOW_MPPT',
      status: 'WARNING',
      message: `En temperatura máxima el Vmp del string (${vmpHot.toFixed(1)} V) cae bajo el mínimo MPPT: posible pérdida de producción.`,
    });
  }
  if (vmpCold !== null && vmpCold > inverter.mpptMaxV) {
    v.push({
      code: 'STRING_VMP_COLD_ABOVE_MPPT',
      status: 'WARNING',
      message: `En temperatura mínima el Vmp del string (${vmpCold.toFixed(1)} V) supera el máximo MPPT.`,
    });
  }
  if (typeof inverter.startVoltageV === 'number' && vmpStc < inverter.startVoltageV) {
    v.push({
      code: 'STRING_BELOW_START_VOLTAGE',
      status: 'WARNING',
      message: 'El voltaje del string está por debajo del voltaje de arranque del inversor.',
    });
  }

  // ── Distribución y corriente por MPPT ────────────────────────────
  if (layout.stringsPerMppt.length > inverter.mppts.length) {
    v.push({
      code: 'MPPT_COUNT_EXCEEDED',
      status: 'ERROR',
      message: `La distribución usa ${layout.stringsPerMppt.length} MPPT y el inversor solo tiene ${inverter.mppts.length}.`,
    });
  }

  const iscHotFactor =
    typeof panel.tempCoeffIscPct === 'number' && typeof site.maxCellC === 'number'
      ? 1 + percentToFraction(panel.tempCoeffIscPct) * (site.maxCellC - STC_C)
      : 1;

  const perMppt = layout.stringsPerMppt.map((strings, i) => {
    if (!Number.isInteger(strings) || strings < 0) {
      throw new InputError(`layout.stringsPerMppt[${i}]`, 'debe ser entero >= 0');
    }
    const impTotal = panel.impA * strings;
    const iscTotal = panel.iscA * iscHotFactor * strings;
    const m = inverter.mppts[i];
    if (m) {
      if (impTotal > m.maxInputCurrentA) {
        v.push({
          code: 'MPPT_CURRENT_EXCEEDED',
          status: 'WARNING',
          message: `MPPT ${i + 1}: corriente de operación (${impTotal.toFixed(2)} A) supera la máxima de entrada (${m.maxInputCurrentA} A); el inversor limitará corriente.`,
        });
      }
      if (typeof m.maxShortCircuitCurrentA === 'number' && iscTotal > m.maxShortCircuitCurrentA) {
        v.push({
          code: 'MPPT_ISC_EXCEEDED',
          status: 'ERROR',
          message: `MPPT ${i + 1}: corriente de cortocircuito (${iscTotal.toFixed(2)} A) supera la admitida (${m.maxShortCircuitCurrentA} A).`,
        });
      }
      if (typeof m.maxShortCircuitCurrentA !== 'number') {
        v.push({
          code: 'MPPT_ISC_NOT_EVALUATED',
          status: 'REVIEW_REQUIRED',
          message: `MPPT ${i + 1}: el inversor no tiene registrada la corriente máxima de cortocircuito.`,
        });
      }
      if (typeof m.maxStrings === 'number' && strings > m.maxStrings) {
        v.push({
          code: 'MPPT_STRINGS_EXCEEDED',
          status: 'ERROR',
          message: `MPPT ${i + 1}: ${strings} strings supera el máximo admitido (${m.maxStrings}).`,
        });
      }
    }
    return { mppt: i + 1, strings, impTotalA: impTotal, iscTotalA: iscTotal };
  });

  // ── Rango admisible de paneles por string ────────────────────────
  const vocPerPanelMax = canCold ? tempCorrect(panel.vocV, panel.tempCoeffVocPct!, site.minAmbientC!) : panel.vocV;
  const vmpPerPanelMin = canHot ? tempCorrect(panel.vmpV, vmpCoeff!, site.maxCellC!) : panel.vmpV;
  const max = Math.floor(inverter.maxDcVoltageV / vocPerPanelMax + 1e-9);
  const min = Math.ceil(inverter.mpptMinV / vmpPerPanelMin - 1e-9);

  return {
    value: {
      totalPanels: n * layout.stringsPerMppt.reduce((a, b) => a + b, 0),
      vocStringStcV: vocStc,
      vmpStringStcV: vmpStc,
      vocStringColdV: vocCold,
      vmpStringHotV: vmpHot,
      vmpStringColdV: vmpCold,
      perMppt,
      panelsPerStringRange: { min: min <= max ? min : null, max: max >= 1 ? max : null },
    },
    formula:
      'V_string = V_panel × n ; Voc_frío = Voc × (1 + βVoc × (Tmín − 25)) × n ; Vmp_caliente = Vmp × (1 + βVmp × (Tcelda_máx − 25)) × n ; I_MPPT = I_panel × strings_paralelo',
    variables: [
      { name: 'paneles_por_string', value: n },
      { name: 'voc_panel', value: panel.vocV, unit: 'V' },
      { name: 'vmp_panel', value: panel.vmpV, unit: 'V' },
      { name: 't_min_ambiente', value: site.minAmbientC ?? null, unit: '°C' },
      { name: 't_max_celda', value: site.maxCellC ?? null, unit: '°C' },
      { name: 'v_dc_max_inversor', value: inverter.maxDcVoltageV, unit: 'V' },
    ],
    assumptions,
    validations: v,
  };
}
