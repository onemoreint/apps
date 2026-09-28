/**
 * Capa central de unidades (§40). Todas las conversiones del sistema pasan por aquí.
 *
 * Unidades internas normalizadas:
 *   Potencia  → W      Energía → Wh      Voltaje → V     Corriente → A
 *   Distancia → m      Peso    → kg      Temperatura → °C
 * Los módulos pueden exponer kW / kWh / km al usuario, pero convierten con estas funciones.
 */

export const W_PER_KW = 1000;
export const WH_PER_KWH = 1000;
export const M_PER_KM = 1000;
export const HOURS_PER_DAY = 24;
export const DAYS_PER_YEAR = 365;
export const MONTHS_PER_YEAR = 12;
/** Mes promedio usado cuando no se especifican días reales del periodo: 365 / 12. */
export const AVG_DAYS_PER_MONTH = DAYS_PER_YEAR / MONTHS_PER_YEAR;

export const wToKw = (w: number): number => w / W_PER_KW;
export const kwToW = (kw: number): number => kw * W_PER_KW;
export const whToKwh = (wh: number): number => wh / WH_PER_KWH;
export const kwhToWh = (kwh: number): number => kwh * WH_PER_KWH;
export const mToKm = (m: number): number => m / M_PER_KM;
export const kmToM = (km: number): number => km * M_PER_KM;

/** Energía (Wh) de una carga: potencia (W) × horas. */
export const energyWh = (powerW: number, hours: number): number => powerW * hours;

/** Capacidad en Ah a partir de energía (kWh) y voltaje nominal (V). */
export const kwhToAh = (kwh: number, voltageV: number): number => kwhToWh(kwh) / voltageV;
/** Energía (kWh) a partir de capacidad (Ah) y voltaje nominal (V). */
export const ahToKwh = (ah: number, voltageV: number): number => whToKwh(ah * voltageV);

/** Porcentaje (p. ej. -0.29 %/°C) a fracción (-0.0029). */
export const percentToFraction = (pct: number): number => pct / 100;
export const fractionToPercent = (f: number): number => f * 100;
