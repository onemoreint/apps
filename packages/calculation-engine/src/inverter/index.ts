import { type CalcResult, type Validation, requirePositive } from '../core/types.js';

export interface InverterAc {
  nominalAcPowerW: number;
  maxAcPowerW?: number | null;
  phases: 1 | 2 | 3;
  acVoltageV: number;
}

/**
 * Regla técnica configurable (viene de `technical_rules` del perfil normativo o de la empresa).
 * El motor NO trae valores por defecto: si la regla no existe, lo dice.
 */
export interface DcAcRatioRule {
  ref: string;
  min: number;
  max: number;
}

export interface InverterCompatibilityInput {
  installedKwp: number;
  inverter: InverterAc;
  site?: { phases?: 1 | 2 | 3 | null; voltageV?: number | null };
  dcAcRule?: DcAcRatioRule | null;
}

export interface InverterCompatibilityResult {
  dcAcRatio: number;
}

export function checkInverterCompatibility(input: InverterCompatibilityInput): CalcResult<InverterCompatibilityResult> {
  const kwp = requirePositive('installedKwp', input.installedKwp);
  const acW = requirePositive('inverter.nominalAcPowerW', input.inverter.nominalAcPowerW);
  const ratio = (kwp * 1000) / acW;
  const v: Validation[] = [];

  const rule = input.dcAcRule;
  if (!rule) {
    v.push({
      code: 'DCAC_RULE_MISSING',
      status: 'REVIEW_REQUIRED',
      message: 'No hay una regla configurada para la relación DC/AC; requiere revisión profesional.',
    });
  } else if (ratio < rule.min || ratio > rule.max) {
    v.push({
      code: 'DCAC_OUT_OF_RANGE',
      status: 'WARNING',
      message: `Relación DC/AC ${ratio.toFixed(2)} fuera del rango configurado (${rule.min}–${rule.max}).`,
      ruleRef: rule.ref,
    });
  } else {
    v.push({ code: 'DCAC_OK', status: 'OK', message: 'Potencia del inversor compatible.', ruleRef: rule.ref });
  }

  if (input.site?.phases && input.site.phases !== input.inverter.phases) {
    v.push({
      code: 'INVERTER_PHASES_MISMATCH',
      status: 'ERROR',
      message: `El inversor es de ${input.inverter.phases} fase(s) y el sitio de ${input.site.phases}.`,
    });
  }
  if (input.site?.voltageV && input.site.voltageV !== input.inverter.acVoltageV) {
    v.push({
      code: 'INVERTER_VOLTAGE_MISMATCH',
      status: 'REVIEW_REQUIRED',
      message: `Voltaje AC del inversor (${input.inverter.acVoltageV} V) distinto al del sitio (${input.site.voltageV} V).`,
    });
  }

  return {
    value: { dcAcRatio: ratio },
    formula: 'relación_DC/AC = potencia_DC_instalada (W) / potencia_AC_nominal_inversor (W)',
    variables: [
      { name: 'potencia_dc', value: kwp, unit: 'kWp' },
      { name: 'potencia_ac_nominal', value: acW, unit: 'W' },
    ],
    assumptions: [],
    validations: v,
  };
}
