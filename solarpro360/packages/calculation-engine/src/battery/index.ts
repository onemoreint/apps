import { type CalcResult, type Validation, requireFraction, requirePositive, InputError } from '../core/types.js';
import { HOURS_PER_DAY, kwhToAh } from '../core/units.js';

export interface BatterySpec {
  capacityKwh: number;
  nominalVoltageV: number;
  /** Profundidad de descarga admitida, (0, 1]. */
  depthOfDischarge: number;
  /** Eficiencia de ida y vuelta, (0, 1]. */
  roundTripEfficiency: number;
  maxPowerW?: number | null;
}

export interface BatterySizingInput {
  /** Consumo diario que debe respaldar el banco (kWh/día). */
  backedDailyKwh: number;
  /** Horas de autonomía deseadas. */
  autonomyHours: number;
  battery: BatterySpec;
  /** Potencia pico simultánea que debe entregar el banco (W), si se conoce. */
  peakLoadW?: number | null;
}

export interface BatterySizingResult {
  requiredEnergyKwh: number;
  requiredNominalKwh: number;
  batteryCount: number;
  installedNominalKwh: number;
  usableKwh: number;
  availableEnergyKwh: number;
  achievedAutonomyHours: number;
  installedCapacityAh: number;
}

export const BATTERY_FORMULA =
  'energía_requerida = consumo_diario × autonomía_h / 24 ; capacidad_nominal = energía_requerida / (DoD × eficiencia) ; ' +
  'cantidad = ⌈capacidad_nominal / capacidad_batería⌉ ; energía_disponible = cantidad × capacidad × DoD × eficiencia';

export function sizeBatteryBank(input: BatterySizingInput): CalcResult<BatterySizingResult> {
  const daily = requirePositive('backedDailyKwh', input.backedDailyKwh);
  const hours = requirePositive('autonomyHours', input.autonomyHours);
  const cap = requirePositive('battery.capacityKwh', input.battery.capacityKwh);
  const volt = requirePositive('battery.nominalVoltageV', input.battery.nominalVoltageV);
  const dod = requireFraction('battery.depthOfDischarge', input.battery.depthOfDischarge);
  const eff = requireFraction('battery.roundTripEfficiency', input.battery.roundTripEfficiency);
  if (input.peakLoadW !== undefined && input.peakLoadW !== null && input.peakLoadW < 0) {
    throw new InputError('peakLoadW', 'no puede ser negativo');
  }

  const requiredEnergy = (daily * hours) / HOURS_PER_DAY;
  const requiredNominal = requiredEnergy / (dod * eff);
  const count = Math.ceil(requiredNominal / cap - 1e-9);
  const installed = count * cap;
  const usable = installed * dod;
  const available = usable * eff;
  const achievedHours = (available / daily) * HOURS_PER_DAY;

  const v: Validation[] = [];
  const maxPower = input.battery.maxPowerW;
  if (typeof input.peakLoadW === 'number') {
    if (typeof maxPower !== 'number') {
      v.push({
        code: 'BATTERY_POWER_NOT_EVALUATED',
        status: 'REVIEW_REQUIRED',
        message: 'La batería no tiene potencia máxima registrada; no se puede verificar la carga pico.',
      });
    } else if (maxPower * count < input.peakLoadW) {
      v.push({
        code: 'BATTERY_POWER_INSUFFICIENT',
        status: 'ERROR',
        message: `El banco entrega ${maxPower * count} W y la carga pico es ${input.peakLoadW} W.`,
      });
    } else {
      v.push({ code: 'BATTERY_POWER_OK', status: 'OK', message: 'Potencia del banco suficiente para la carga pico.' });
    }
  }

  return {
    value: {
      requiredEnergyKwh: requiredEnergy,
      requiredNominalKwh: requiredNominal,
      batteryCount: count,
      installedNominalKwh: installed,
      usableKwh: usable,
      availableEnergyKwh: available,
      achievedAutonomyHours: achievedHours,
      installedCapacityAh: kwhToAh(installed, volt),
    },
    formula: BATTERY_FORMULA,
    variables: [
      { name: 'consumo_diario_respaldado', value: daily, unit: 'kWh/d' },
      { name: 'autonomia', value: hours, unit: 'h' },
      { name: 'dod', value: dod },
      { name: 'eficiencia', value: eff },
      { name: 'capacidad_bateria', value: cap, unit: 'kWh' },
      { name: 'voltaje_nominal', value: volt, unit: 'V' },
    ],
    assumptions: ['Se asume consumo uniforme a lo largo de las 24 h para calcular la autonomía.'],
    validations: v,
  };
}
