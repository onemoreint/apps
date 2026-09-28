// Guardia de cumplimiento: detecta presión psicológica, promesas de ingresos y afirmaciones médicas.
// Se aplica a todo texto generado y a las respuestas del usuario en el simulador.

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export type ComplianceKind = 'ingresos' | 'medico' | 'presion';

export interface ComplianceIssue {
  kind: ComplianceKind;
  match: string;
  message: string;
}

const PATTERNS: { kind: ComplianceKind; re: RegExp; message: string }[] = [
  { kind: 'ingresos', re: /ingresos? (garantizad|asegurad|segur)/, message: 'Promete ingresos garantizados.' },
  { kind: 'ingresos', re: /(ganancia|resultado)s? garantizad/, message: 'Presenta resultados económicos como garantizados.' },
  { kind: 'ingresos', re: /(te vas a|vas a) (hacer rico|volver rico|ganar (mucho|miles))/, message: 'Promete riqueza o ganancias.' },
  { kind: 'ingresos', re: /(dinero facil|sin esfuerzo|ingreso pasivo garantizado|libertad financiera (en|asegurada))/, message: 'Sugiere dinero fácil o sin esfuerzo.' },
  { kind: 'ingresos', re: /(100 ?%|cien por ciento) (seguro|garantizado)/, message: 'Afirma certeza absoluta.' },
  { kind: 'medico', re: /\b(cura|curar|curan|sana|sanar|elimina(r)? (el|la|los|las) (enfermedad|diabetes|cancer))/, message: 'Hace una afirmación médica no verificada.' },
  { kind: 'medico', re: /\b(diabetes|cancer|hipertension|tiroides|depresion|artritis)\b/, message: 'Menciona una enfermedad: evita relacionar el producto con condiciones médicas.' },
  { kind: 'medico', re: /(reemplaza|sustituye|deja(r)? (tu|la|los) (medicamento|tratamiento))/, message: 'Sugiere reemplazar tratamientos médicos.' },
  { kind: 'presion', re: /(ultima oportunidad|solo (por )?hoy|hoy o nunca|no te lo (puedes )?pierdas|cupos limitados|se acaba (hoy|ya))/, message: 'Usa urgencia artificial.' },
  { kind: 'presion', re: /(tienes que|debes) (decidir|entrar|comprar|unirte)/, message: 'Presiona para decidir.' },
  { kind: 'presion', re: /(te vas a arrepentir|si no entras ahora|los exitosos no dudan|excusas)/, message: 'Usa presión psicológica o culpa.' },
];

export function checkCompliance(text: string): ComplianceIssue[] {
  const n = normalize(text);
  const issues: ComplianceIssue[] = [];
  for (const p of PATTERNS) {
    const m = n.match(p.re);
    if (m) issues.push({ kind: p.kind, match: m[0], message: p.message });
  }
  return issues;
}
