// Radar: agrupa oportunidades de acción y detecta potencial (cliente / distribuidor) con señales explicadas.

import type { Contact, Interaction, NextBestAction } from '../models';
import { daysBetween } from '../../utils/dates';
import { groupInteractions, rankActions } from './nextBestAction';

export interface PotentialResult {
  contact: Contact;
  score: number;
  signals: string[];
}

export interface RadarResult {
  inmediata: NextBestAction[];
  seguimiento: NextBestAction[];
  recuperacion: NextBestAction[];
  potencialDistribuidor: PotentialResult[];
  potencialCliente: PotentialResult[];
  all: NextBestAction[];
}

export function distributorPotential(c: Contact, own: Interaction[], now: Date): PotentialResult | null {
  if (['distribuidor', 'no_interesado'].includes(c.stage)) return null;
  const signals: string[] = [];
  let score = 0;
  if (c.interest === 'negocio') { score += 3; signals.push('Su interés principal es el negocio'); }
  if (c.interest === 'ambos') { score += 2; signals.push('Le interesan producto y negocio'); }
  const askedBusiness = own.filter((i) => i.direction === 'entrante' && i.topics.includes('negocio'));
  if (askedBusiness.length) { score += 3; signals.push(`Preguntó por el negocio ${askedBusiness.length > 1 ? `${askedBusiness.length} veces` : 'por iniciativa propia'}`); }
  if (own.some((i) => i.type === 'presentacion')) { score += 2; signals.push('Ya vio una presentación'); }
  if (c.stage === 'cliente') { score += 1; signals.push('Ya es cliente: conoce el producto'); }
  if (c.temperature === 'alta') { score += 1; signals.push('Temperatura alta'); }
  if (c.tags.some((t) => /emprend|lider|ventas|red/i.test(t))) { score += 1; signals.push('Perfil emprendedor según sus etiquetas'); }
  const last = own.reduce<string | null>((m, i) => (!m || i.date > m ? i.date : m), null);
  if (last && daysBetween(last, now) > 45) score -= 2;
  if (score < 4) return null;
  return { contact: c, score, signals };
}

export function clientPotential(c: Contact, own: Interaction[], now: Date): PotentialResult | null {
  if (['cliente', 'distribuidor', 'no_interesado'].includes(c.stage)) return null;
  const signals: string[] = [];
  let score = 0;
  if (c.interest === 'producto') { score += 3; signals.push('Su interés principal es el producto'); }
  if (c.interest === 'ambos') { score += 1; signals.push('Le interesan producto y negocio'); }
  const askedPrice = own.some((i) => i.direction === 'entrante' && i.topics.includes('precio'));
  if (askedPrice) { score += 3; signals.push('Preguntó el precio'); }
  const askedProduct = own.some((i) => i.direction === 'entrante' && i.topics.includes('producto'));
  if (askedProduct) { score += 2; signals.push('Pidió información de producto'); }
  if (c.temperature === 'alta') { score += 1; signals.push('Temperatura alta'); }
  if (c.objection === 'precio' || c.objection === 'escepticismo_producto') { score += 1; signals.push('Su objeción es sobre el producto, no sobre el interés'); }
  const last = own.reduce<string | null>((m, i) => (!m || i.date > m ? i.date : m), null);
  if (last && daysBetween(last, now) > 45) score -= 2;
  if (score < 4) return null;
  return { contact: c, score, signals };
}

export function buildRadar(contacts: Contact[], interactions: Interaction[], now: Date = new Date()): RadarResult {
  const all = rankActions(contacts, interactions, now);
  const grouped = groupInteractions(interactions);
  const potencialDistribuidor: PotentialResult[] = [];
  const potencialCliente: PotentialResult[] = [];
  for (const c of contacts) {
    const own = grouped.get(c.id) ?? [];
    const d = distributorPotential(c, own, now);
    if (d) potencialDistribuidor.push(d);
    const cl = clientPotential(c, own, now);
    if (cl) potencialCliente.push(cl);
  }
  return {
    all,
    inmediata: all.filter((a) => a.bucket === 'inmediata'),
    seguimiento: all.filter((a) => a.bucket === 'seguimiento'),
    recuperacion: all.filter((a) => a.bucket === 'recuperacion'),
    potencialDistribuidor: potencialDistribuidor.sort((a, b) => b.score - a.score),
    potencialCliente: potencialCliente.sort((a, b) => b.score - a.score),
  };
}
