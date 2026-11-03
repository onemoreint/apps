// Análisis local de textos. Cuenta y detecta patrones: no interpreta como lo haría un modelo de IA.
import { norm } from './dateparse.js';

const STOPWORDS = new Set(`a al algo algun alguna algunas alguno algunos ante antes aqui asi aun
aunque cada como con contra cual cuales cuando de debe deben del desde donde dos e el ella ellas
ello ellos en entre era eran es esa esas ese eso esos esta estaba estamos estan estar estas este
esto estos fue fueron ha habia han hasta hay la las le les lo los mas me mi mis mucho muy nada ni
no nos nosotros o otra otras otro otros para pero poco por porque puede pueden que quien se sea
segun ser si sin sobre son su sus tambien tan tanto te tener tiene tienen toda todas todo todos
tu tus un una unas uno unos usted y ya yo`.split(/\s+/));

const ACTION_START = /^(hay que|debo|debemos|tengo que|tenemos que|necesito|necesitamos|falta|pendiente|revisar|enviar|llamar|preparar|definir|comprar|pagar|crear|actualizar|publicar|confirmar|contactar|agendar|terminar|entregar)\b/;

export function analyzeText(text) {
  const clean = String(text).trim();
  const words = clean.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || [];
  const sentences = clean.split(/(?<=[.!?…])\s+|\n+/).map((s) => s.trim()).filter(Boolean);

  const freq = new Map();
  words.forEach((w) => {
    const k = norm(w);
    if (k.length < 4 || STOPWORDS.has(k) || /^\d+$/.test(k)) return;
    freq.set(k, (freq.get(k) || 0) + 1);
  });
  const terms = [...freq.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 6)
    .map(([term, count]) => ({ term, count }));

  const figures = [...new Set(clean.match(/(?:[$€]\s?)?\b\d[\d.,]*\b\s?%?/g) || [])]
    .map((s) => s.trim())
    .slice(0, 8);
  const emails = [...new Set(clean.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) || [])].slice(0, 5);
  const links = [...new Set(clean.match(/https?:\/\/[^\s)]+/g) || [])].slice(0, 5);

  const actions = sentences
    .filter((s) => ACTION_START.test(norm(s).replace(/^[-•*\d.)\s]+/, '')))
    .map((s) => s.replace(/^[-•*\d.)\s]+/, '').replace(/[.;]+$/, '').slice(0, 140))
    .slice(0, 8);

  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    readingMinutes: Math.max(1, Math.round(words.length / 200)),
    terms,
    figures,
    emails,
    links,
    actions,
  };
}
