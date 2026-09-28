import type { Project } from '../../geometry/types';
import type { Issue, IssueCode } from '../../layout-engine/validate';
import { validate } from '../../layout-engine/validate';
import { CATALOG } from '../../layout-engine/catalog';
import type { RegulatoryRule, RuleDefinition, RuleResult } from '../core/types';
import { municipalityRecord } from '../jurisdictions/co';

/*
 * Registro de reglas. Cada regla declara fuente, jurisdicción, versión y estado.
 * Los valores críticos nunca se fijan en código sin fuente:
 *  - retiros y ocupación se toman de lo que el usuario ingresó en Terreno;
 *  - los criterios de ARQUIGEN se marcan como "criterio interno (no normativo)";
 *  - las normas oficiales sin fuente verificada quedan en UNVERIFIED o NOT_EVALUATED.
 */

const UPDATED = '2026-09-27';
const USER_SOURCE = 'Parámetros ingresados por el usuario en «Terreno»';
const INTERNAL_SOURCE = 'Criterio interno de ARQUIGEN 360 (no normativo)';

type R = Omit<RuleResult, 'ruleId'>;

const issuesBy = (p: Project, ...codes: IssueCode[]): Issue[] => validate(p).filter((i) => codes.includes(i.code));
const ids = (list: Issue[]) => [...new Set(list.flatMap((i) => i.roomIds))];

const internal = (id: string, title: string, requirement: string, group: RegulatoryRule['group'], sourceKind: 'internal_criterion' | 'user_input' = 'internal_criterion'): RegulatoryRule => ({
  id,
  title,
  jurisdiction: 'ARQUIGEN (todas)',
  authority: sourceKind === 'user_input' ? 'Usuario del proyecto' : 'ARQUIGEN 360',
  sourceDocument: sourceKind === 'user_input' ? USER_SOURCE : INTERNAL_SOURCE,
  version: '2026.09',
  status: 'active',
  requirement,
  validationType: sourceKind === 'user_input' ? 'parameter' : 'geometric',
  sourceKind,
  group,
  updatedAt: UPDATED,
});

/** Resultado a partir de incidencias de validate(): FAIL/WARNING si hay, PASS si no */
function fromIssues(list: Issue[], worst: 'FAIL' | 'WARNING', okMsg: string, explanation: string): R {
  if (!list.length) return { status: 'PASS', message: okMsg, explanation, affectedIds: [], findings: [] };
  return { status: worst, message: `${list.length} incidencia(s).`, explanation, affectedIds: ids(list), findings: list.map((i) => i.msg) };
}

export const RULES: RuleDefinition[] = [
  {
    rule: () => internal('ARQ-GEO-01', 'Ambientes sin superposición', 'Ningún ambiente puede ocupar el mismo espacio que otro.', 'geometry'),
    evaluate: (p) => fromIssues(issuesBy(p, 'overlap'), 'FAIL', 'Ningún ambiente se superpone.', 'Se comparan los rectángulos de todos los ambientes del modelo.'),
  },
  {
    rule: () => internal('ARQ-RET-01', 'Retiros', 'Los ambientes cubiertos deben quedar dentro del área construible definida por los retiros frontal, posterior y laterales ingresados; los exteriores dentro del lote.', 'geometry', 'user_input'),
    evaluate: (p) => {
      const s = p.site.setbacks;
      return fromIssues(issuesBy(p, 'setback', 'outside_lot'), 'FAIL', `Todo queda dentro de los retiros ingresados (frontal ${s.front} m, posterior ${s.back} m, laterales ${s.side} m).`,
        'Se verifica contra los valores de retiro que ingresaste. Confirma esos valores con la norma de tu municipio.');
    },
  },
  {
    rule: () => internal('ARQ-OCU-01', 'Ocupación máxima', 'El área cubierta no puede superar el porcentaje de ocupación ingresado en «Terreno».', 'areas', 'user_input'),
    evaluate: (p) => fromIssues(issuesBy(p, 'occupancy'), 'FAIL', `La ocupación está dentro del máximo ingresado (${p.site.maxOccupancy} %).`,
      'Ocupación = área de ambientes cubiertos ÷ área del lote. El máximo lo define la norma municipal; aquí se usa el valor que ingresaste.'),
  },
  {
    rule: () => internal('ARQ-PRG-01', 'Medidas mínimas del programa', 'Cada ambiente debe alcanzar el ancho, largo y área mínimos pedidos en el programa.', 'areas', 'user_input'),
    evaluate: (p) => (p.program.rooms.length
      ? fromIssues(issuesBy(p, 'minimum'), 'WARNING', 'Todos los ambientes alcanzan sus mínimos.', 'Los mínimos son los que definiste en «Programa». No son áreas mínimas normativas.')
      : { status: 'NOT_APPLICABLE', message: 'El programa no tiene ambientes.', explanation: '', affectedIds: [], findings: [] }),
  },
  {
    rule: () => internal('ARQ-CIR-01', 'Acceso a todos los ambientes', 'Todo ambiente cubierto debe poder alcanzarse desde la entrada por puertas o espacios abiertos, y debe existir un acceso sobre la fachada.', 'circulation'),
    evaluate: (p) => fromIssues(issuesBy(p, 'access', 'main_door'), 'WARNING', 'Todos los ambientes son accesibles desde la entrada.', 'Se recorre el grafo de puertas y espacios abiertos desde la puerta principal.'),
  },
  {
    rule: () => internal('ARQ-ILU-01', 'Iluminación natural', 'Dormitorios, sala, estudio y oficina deberían tener al menos una ventana.', 'design'),
    evaluate: (p) => fromIssues(issuesBy(p, 'daylight'), 'WARNING', 'Los ambientes habitables tienen ventana.', 'Criterio de diseño. Los requisitos de iluminación y ventilación exigibles dependen de la norma aplicable.'),
  },
  {
    rule: () => internal('ARQ-REL-01', 'Relaciones entre ambientes', 'Se revisan las relaciones de proximidad del catálogo (cocina-comedor, baño-circulación, baño privado-dormitorio) y las que marcaste en el programa.', 'design'),
    evaluate: (p) => fromIssues(issuesBy(p, 'relation'), 'WARNING', 'Las relaciones entre ambientes se cumplen.', 'Criterio funcional de diseño, no normativo.'),
  },
  {
    rule: () => internal('ARQ-GAR-01', 'Acceso vehicular', 'El garaje debe tener frente directo a la vía de acceso.', 'circulation'),
    evaluate: (p) => (p.rooms.some((r) => r.type === 'garage')
      ? fromIssues(issuesBy(p, 'garage_access'), 'WARNING', 'El garaje tiene frente a la vía.', 'Se verifica que el garaje toque la línea del área construible sobre el acceso.')
      : { status: 'NOT_APPLICABLE', message: 'El proyecto no tiene garaje.', explanation: '', affectedIds: [], findings: [] }),
  },
  {
    rule: () => internal('ARQ-ACC-01', 'Ancho libre de puertas', 'Criterio interno: puertas de al menos 0,80 m para facilitar el paso. La norma de accesibilidad aplicable debe verificarse aparte.', 'design'),
    evaluate: (p) => {
      const narrow = p.openings.filter((o) => (o.kind === 'door' || o.kind === 'garage_door') && o.width < 0.8 - 1e-6);
      if (!p.openings.some((o) => o.kind === 'door')) return { status: 'NOT_EVALUATED', message: 'No hay puertas en el modelo.', explanation: '', affectedIds: [], findings: [] };
      return narrow.length
        ? { status: 'WARNING', message: `${narrow.length} puerta(s) de menos de 0,80 m.`, explanation: 'Criterio interno de ARQUIGEN. La norma técnica de accesibilidad aplicable no está cargada (NO VERIFICADO).',
          affectedIds: [...new Set(narrow.map((o) => o.roomId))], findings: narrow.map((o) => `${p.rooms.find((r) => r.id === o.roomId)?.name ?? 'Ambiente'}: puerta de ${o.width.toFixed(2)} m`) }
        : { status: 'PASS', message: 'Todas las puertas miden 0,80 m o más.', explanation: 'Criterio interno de ARQUIGEN, no normativo.', affectedIds: [], findings: [] };
    },
  },
  {
    rule: (p) => ({
      id: `CO-URB-${(p.jurisdiction.municipality || 'SIN-MUNICIPIO').toUpperCase().replace(/[^A-Z0-9]+/g, '-')}`,
      title: 'Norma urbanística municipal',
      jurisdiction: p.jurisdiction.municipality ? `CO · ${p.jurisdiction.department} · ${p.jurisdiction.municipality}` : 'CO · municipio sin definir',
      authority: p.jurisdiction.municipality ? `Municipio de ${p.jurisdiction.municipality}` : 'Por definir',
      sourceDocument: p.jurisdiction.planningInstrument ? `${p.jurisdiction.planningInstrument} municipal vigente` : 'POT / PBOT / EOT municipal',
      version: 'NO VERIFICADO',
      status: 'unverified',
      requirement: 'Retiros, índices de ocupación y construcción, alturas, usos y demás normas de la zona o tratamiento.',
      validationType: 'reference',
      sourceKind: 'official',
      group: 'municipal',
      updatedAt: UPDATED,
    }),
    evaluate: (p) => {
      const j = p.jurisdiction;
      if (!j.municipality) return { status: 'NOT_EVALUATED', message: 'Selecciona el departamento y municipio en «Terreno → Jurisdicción».', explanation: 'Sin municipio no se puede determinar la norma urbanística aplicable.', affectedIds: [], findings: [] };
      const rec = municipalityRecord(j.department, j.municipality);
      const loaded = rec?.verifiedRules ?? 0;
      return {
        status: 'UNVERIFIED',
        message: loaded ? `${loaded} regla(s) verificadas cargadas.` : `No hay reglas urbanísticas verificadas cargadas para ${j.municipality}.`,
        explanation: 'Los retiros y la ocupación se evaluaron con los valores que ingresaste, no con la norma municipal. Consulta la curaduría o la oficina de planeación del municipio.',
        affectedIds: [],
        findings: [
          `Instrumento: ${j.planningInstrument || 'sin definir'}`,
          `Zona / tratamiento: ${j.zone || 'sin definir'}`,
        ],
      };
    },
  },
  {
    rule: () => ({
      id: 'CO-NSR10-PRE',
      title: 'Prevalidación estructural (NSR-10)',
      jurisdiction: 'CO',
      authority: 'Gobierno Nacional de Colombia',
      sourceDocument: 'Reglamento Colombiano de Construcción Sismo Resistente NSR-10',
      version: 'NO VERIFICADO (versión y modificaciones por confirmar)',
      status: 'unverified',
      requirement: 'Identificar condiciones del modelo que exigen revisión de un ingeniero estructural. No evalúa cumplimiento de la NSR-10.',
      validationType: 'precheck',
      sourceKind: 'official',
      group: 'structure',
      updatedAt: UPDATED,
    }),
    evaluate: (p) => {
      const covered = p.rooms.filter((r) => CATALOG[r.type].covered);
      if (!covered.length) return { status: 'NOT_APPLICABLE', message: 'No hay ambientes cubiertos.', explanation: '', affectedIds: [], findings: [] };
      const findings: string[] = [];
      const minX = Math.min(...covered.map((r) => r.x));
      const maxX = Math.max(...covered.map((r) => r.x + r.width));
      const minY = Math.min(...covered.map((r) => r.y));
      const maxY = Math.max(...covered.map((r) => r.y + r.length));
      const bbox = (maxX - minX) * (maxY - minY);
      const built = covered.reduce((s, r) => s + r.width * r.length, 0);
      findings.push(p.site.floors > 1 ? `Proyecto de ${p.site.floors} pisos: requiere diseño estructural completo por ingeniero.` : 'Proyecto de 1 piso según el modelo.');
      findings.push('Alturas de entrepiso: no definidas en el modelo.');
      if (bbox > 0 && built / bbox < 0.85) findings.push(`Planta con entrantes: el área cubierta ocupa ${((built / bbox) * 100).toFixed(0)} % de su rectángulo envolvente (posible irregularidad en planta).`);
      const ratio = Math.max(maxX - minX, maxY - minY) / Math.max(0.1, Math.min(maxX - minX, maxY - minY));
      if (ratio > 3) findings.push(`Planta alargada: relación largo/ancho de ${ratio.toFixed(1)}.`);
      findings.push('Falta información estructural: sistema estructural, materiales, estudio de suelos, cargas.');
      return {
        status: 'NOT_EVALUATED',
        message: 'Prevalidación arquitectónica. No constituye diseño ni cálculo estructural.',
        explanation: 'Se requiere revisión y diseño por un profesional competente. ARQUIGEN no genera certificados estructurales.',
        affectedIds: [],
        findings,
      };
    },
  },
  {
    rule: () => ({
      id: 'CO-RETIE-PRE',
      title: 'Prevalidación eléctrica (RETIE)',
      jurisdiction: 'CO',
      authority: 'Ministerio de Minas y Energía',
      sourceDocument: 'Reglamento Técnico de Instalaciones Eléctricas (RETIE)',
      version: 'NO VERIFICADO (versión vigente por confirmar)',
      status: 'unverified',
      requirement: 'Identificar espacios que requerirán puntos eléctricos y la información faltante para el diseño. No evalúa cumplimiento del RETIE.',
      validationType: 'precheck',
      sourceKind: 'official',
      group: 'installations',
      updatedAt: UPDATED,
    }),
    evaluate: (p) => {
      const covered = p.rooms.filter((r) => CATALOG[r.type].covered);
      if (!covered.length) return { status: 'NOT_APPLICABLE', message: 'No hay ambientes cubiertos.', explanation: '', affectedIds: [], findings: [] };
      const wet = covered.filter((r) => ['bathroom', 'ensuite', 'kitchen', 'laundry', 'service'].includes(r.type));
      return {
        status: 'NOT_EVALUATED',
        message: `${covered.length} espacios cubiertos requerirán puntos eléctricos.`,
        explanation: 'El modelo no contiene instalaciones eléctricas. El diseño eléctrico lo realiza un profesional competente conforme a la norma vigente.',
        affectedIds: wet.map((r) => r.id),
        findings: [
          `Zonas húmedas (${wet.map((r) => r.name).join(', ') || 'ninguna'}): verificar los requisitos de protección de la norma aplicable.`,
          'Falta información: carga instalada, acometida, tablero, circuitos.',
        ],
      };
    },
  },
  {
    rule: () => ({
      id: 'CO-RETILAP-PRE',
      title: 'Prevalidación de iluminación (RETILAP)',
      jurisdiction: 'CO',
      authority: 'Ministerio de Minas y Energía',
      sourceDocument: 'Reglamento Técnico de Iluminación y Alumbrado Público (RETILAP)',
      version: 'NO VERIFICADO (versión vigente por confirmar)',
      status: 'unverified',
      requirement: 'Identificar espacios que dependen de iluminación artificial. No evalúa niveles de iluminación.',
      validationType: 'precheck',
      sourceKind: 'official',
      group: 'installations',
      updatedAt: UPDATED,
    }),
    evaluate: (p) => {
      const covered = p.rooms.filter((r) => CATALOG[r.type].covered && r.type !== 'garage');
      if (!covered.length) return { status: 'NOT_APPLICABLE', message: 'No hay ambientes cubiertos.', explanation: '', affectedIds: [], findings: [] };
      const noWindow = covered.filter((r) => r.type !== 'hall' && !p.openings.some((o) => o.roomId === r.id && o.kind === 'window'));
      return {
        status: 'NOT_EVALUATED',
        message: noWindow.length ? `${noWindow.length} espacio(s) sin ventana dependen de iluminación artificial.` : 'Todos los espacios tienen alguna ventana.',
        explanation: 'El modelo no contiene luminarias ni cálculos de iluminación.',
        affectedIds: noWindow.map((r) => r.id),
        findings: noWindow.map((r) => `${r.name}: sin ventana`),
      };
    },
  },
];
