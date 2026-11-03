// Interpreta fechas y horas dichas en español. Sin dependencias ni acceso al DOM.

/** Pasa a minúsculas y quita tildes conservando la longitud, para poder recortar el texto original. */
export function norm(text) {
  let out = '';
  for (const ch of String(text)) {
    const n = ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    out += n.length === ch.length ? n : ch;
  }
  return out;
}

const WORDS = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8,
  nueve: 9, diez: 10, once: 11, doce: 12, quince: 15, veinte: 20, treinta: 30, cuarenta: 40,
};
const NUM = `\\d{1,3}|${Object.keys(WORDS).join('|')}`;
const toNum = (s) => (/^\d+$/.test(s) ? parseInt(s, 10) : WORDS[s]);

const WEEKDAYS = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };
const MONTHS = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5, julio: 6, agosto: 7,
  septiembre: 8, setiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
};
const WEEKDAY_ALT = Object.keys(WEEKDAYS).join('|');
const MONTH_ALT = Object.keys(MONTHS).join('|');
const MERIDIEM = 'a\\.?\\s?m\\.?|p\\.?\\s?m\\.?|de la manana|de la tarde|de la noche|de la madrugada|del dia|del mediodia';
const END = '(?=[\\s,.;:!?]|$)';

function meridiemKind(m) {
  if (!m) return null;
  const s = m.replace(/[.\s]/g, '');
  if (s === 'am' || s.includes('manana') || s.includes('madrugada')) return 'am';
  if (s === 'pm' || s.includes('tarde') || s.includes('noche')) return 'pm';
  if (s.includes('mediodia') || s.includes('deldia')) return 'dia';
  return null;
}

function to24(h, kind) {
  if (kind === 'am') return h === 12 ? 0 : h;
  if (kind === 'pm') return h === 12 ? 12 : h + 12;
  if (kind === 'dia') return h;
  return h;
}

const atTime = (base, h, m) => {
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
};

/**
 * Busca una fecha u hora dentro de un texto.
 * @returns {{date: Date|null, hasDate: boolean, hasTime: boolean, rest: string}}
 *   `rest` es el texto original sin la expresión temporal.
 */
export function parseWhen(text, now = new Date()) {
  const original = String(text);
  const n = norm(original);
  const spans = [];
  const claim = (m) => {
    spans.push([m.index, m.index + m[0].length]);
    return m;
  };
  const free = (s, m) => !spans.some(([a, b]) => m.index < b && m.index + m[0].length > a);
  const find = (re) => {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(n))) {
      if (free(n, m)) return m;
      if (!re.global) break;
    }
    return null;
  };

  let base = null; // día elegido
  let exact = null; // momento exacto («en 20 minutos»)
  let hour = null;
  let minute = 0;
  let kind = null;
  let dayKind = null; // cómo se fijó el día

  // 1. Tiempo relativo: «en 20 minutos», «dentro de una hora y media», «en media hora»
  let m = find(/\b(?:dentro de|en)\s+(media hora|un cuarto de hora)\b/g);
  if (m) {
    claim(m);
    exact = new Date(now.getTime() + (m[1] === 'media hora' ? 30 : 15) * 60000);
  }
  if (!exact) {
    m = find(new RegExp(`\\b(?:dentro de|en)\\s+(${NUM})\\s*(minutos?|mins?|horas?|dias?|semanas?)(\\s+y\\s+media)?\\b`, 'g'));
    if (m) {
      claim(m);
      const q = toNum(m[1]);
      const unit = m[2];
      if (unit.startsWith('min')) exact = new Date(now.getTime() + q * 60000);
      else if (unit.startsWith('hora')) exact = new Date(now.getTime() + (q + (m[3] ? 0.5 : 0)) * 3600000);
      else {
        base = new Date(now);
        base.setDate(base.getDate() + q * (unit.startsWith('sem') ? 7 : 1));
        dayKind = 'relativo';
      }
    }
  }

  // 2. Hora: «a las 3», «a las 3:30 pm», «a las 8 y media de la noche», «15:30», «3pm», «mediodía»
  if (!exact) {
    m = find(new RegExp(`\\b(?:a eso de las?|a las?|sobre las?|para las?)\\s+(\\d{1,2}|${Object.keys(WORDS).join('|')})(?:[:.](\\d{2}))?(?:\\s+y\\s+(media|cuarto|\\d{1,2}))?(?:\\s*(${MERIDIEM}))?${END}`, 'g'));
    if (m && toNum(m[1]) <= 24) {
      claim(m);
      hour = toNum(m[1]);
      minute = m[2] ? parseInt(m[2], 10) : 0;
      if (m[3]) minute = m[3] === 'media' ? 30 : m[3] === 'cuarto' ? 15 : parseInt(m[3], 10);
      kind = meridiemKind(m[4]);
    }
    if (hour === null) {
      m = find(new RegExp(`\\b(\\d{1,2})(?::(\\d{2}))?\\s*(${MERIDIEM})${END}`, 'g'));
      if (m && parseInt(m[1], 10) <= 12) {
        claim(m);
        hour = parseInt(m[1], 10);
        minute = m[2] ? parseInt(m[2], 10) : 0;
        kind = meridiemKind(m[3]);
      }
    }
    if (hour === null) {
      m = find(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g);
      if (m) {
        claim(m);
        hour = parseInt(m[1], 10);
        minute = parseInt(m[2], 10);
      }
    }
    if (hour === null) {
      m = find(/\b(?:al? |el )?mediodia\b/g);
      if (m) {
        claim(m);
        hour = 12;
        kind = 'dia';
      }
    }
    if (hour === null) {
      m = find(/\b(?:a |la )?medianoche\b/g);
      if (m) {
        claim(m);
        hour = 0;
        kind = 'dia';
      }
    }
    if (hour !== null && hour > 12) kind = 'dia'; // ya viene en formato de 24 horas
  }

  // 3. Día: fechas completas, «pasado mañana», «mañana», «hoy», días de la semana
  if (!exact && !base) {
    m = find(new RegExp(`\\b(?:el\\s+|para el\\s+)?(\\d{1,2})\\s+de\\s+(${MONTH_ALT})(?:\\s+(?:de|del)\\s+(\\d{4}))?\\b`, 'g'));
    if (m) {
      claim(m);
      base = new Date(now);
      base.setHours(12, 0, 0, 0);
      base.setFullYear(m[3] ? parseInt(m[3], 10) : now.getFullYear(), MONTHS[m[2]], parseInt(m[1], 10));
      dayKind = m[3] ? 'fecha-exacta' : 'fecha';
    }
  }
  if (!exact && !base) {
    m = find(/\b(?:el\s+|para el\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g);
    if (m && parseInt(m[2], 10) >= 1 && parseInt(m[2], 10) <= 12) {
      claim(m);
      const y = m[3] ? (m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10)) : now.getFullYear();
      base = new Date(now);
      base.setHours(12, 0, 0, 0);
      base.setFullYear(y, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
      dayKind = m[3] ? 'fecha-exacta' : 'fecha';
    }
  }
  if (!exact && !base) {
    m = find(/\b(?:para\s+)?pasado manana\b/g);
    if (m) {
      claim(m);
      base = new Date(now);
      base.setDate(base.getDate() + 2);
      dayKind = 'relativo';
    }
  }
  if (!exact && !base) {
    m = find(/\b(?:para\s+)?manana\b/g);
    if (m) {
      claim(m);
      base = new Date(now);
      base.setDate(base.getDate() + 1);
      dayKind = 'relativo';
    }
  }
  if (!exact && !base) {
    m = find(/\b(?:para\s+)?(?:hoy|esta (?:tarde|noche))\b/g);
    if (m) {
      claim(m);
      base = new Date(now);
      dayKind = 'hoy';
      if (hour === null && /tarde/.test(m[0])) { hour = 15; kind = 'dia'; }
      if (hour === null && /noche/.test(m[0])) { hour = 20; kind = 'dia'; }
      if (hour !== null && kind === null) kind = /tarde|noche/.test(m[0]) && hour < 12 ? 'pm' : null;
    }
  }
  if (!exact && !base) {
    m = find(new RegExp(`(?<!\\ba )\\b(?:para\\s+)?(?:(?:el|este|el proximo|este proximo|proximo)\\s+)?(${WEEKDAY_ALT})(?:\\s+que viene)?\\b`, 'g'));
    if (m) {
      claim(m);
      base = new Date(now);
      const diff = (WEEKDAYS[m[1]] - now.getDay() + 7) % 7;
      base.setDate(base.getDate() + diff);
      dayKind = diff === 0 ? 'semana-hoy' : 'semana';
    }
  }

  // Franja del día sin hora: «por la mañana», «en la tarde»
  if (!exact && hour === null) {
    m = find(/\b(?:por|en) la (manana|tarde|noche)\b/g);
    if (m) {
      claim(m);
      hour = { manana: 9, tarde: 15, noche: 20 }[m[1]];
      kind = 'dia';
      if (!base) {
        base = new Date(now);
        dayKind = 'hoy';
      }
    }
  }

  const rest = cleanRest(original, spans);

  if (exact) return { date: exact, hasDate: true, hasTime: true, rest };
  if (base === null && hour === null) return { date: null, hasDate: false, hasTime: false, rest };

  const hasDate = base !== null;
  const hasTime = hour !== null;
  const day = base ? new Date(base) : new Date(now);
  let date;

  if (!hasTime) {
    date = atTime(day, 9, 0);
  } else if (kind) {
    date = atTime(day, to24(hour, kind), minute);
  } else if (!hasDate || dayKind === 'hoy' || dayKind === 'semana-hoy') {
    // Sin a. m. ni p. m.: la siguiente vez que ocurra esa hora
    const a = atTime(day, hour === 12 ? 12 : hour, minute);
    const b = hour < 12 ? atTime(day, hour + 12, minute) : null;
    if (a > now) date = a;
    else if (b && b > now) date = b;
    else date = a;
  } else {
    // Otro día: de 1 a 6 se entiende p. m.; de 7 a 11, a. m.
    date = atTime(day, hour >= 1 && hour <= 6 ? hour + 12 : hour, minute);
  }

  if (date <= now) {
    if (dayKind === 'semana' || dayKind === 'semana-hoy') date.setDate(date.getDate() + 7);
    else if (dayKind === 'fecha') date.setFullYear(date.getFullYear() + 1);
    else if (!hasDate) date.setDate(date.getDate() + 1);
    else if (dayKind === 'hoy' && !hasTime) date = new Date(now.getTime() + 3600000);
  }

  return { date, hasDate, hasTime, rest };
}

function cleanRest(original, spans) {
  let out = '';
  let pos = 0;
  [...spans].sort((a, b) => a[0] - b[0]).forEach(([a, b]) => {
    out += `${original.slice(pos, a)} `;
    pos = b;
  });
  out += original.slice(pos);
  let prev;
  out = out.replace(/\s+/g, ' ').trim();
  do {
    prev = out;
    out = out
      .replace(/^(que|de|para|el|la|a)\s+/i, (s) => (/^(a|la|el)\s/i.test(s) && prev === out && /^(a|la|el)\s+\p{Lu}/u.test(out) ? s : ''))
      .replace(/\s+(el|la|a|para|de|que|y|en|por)$/i, '')
      .replace(/[,;:\s]+$/g, '')
      .replace(/^[,;:\s]+/g, '')
      .trim();
  } while (out !== prev);
  return out;
}

/** Devuelve un texto como «mañana, 3:00 p. m.» para confirmar lo que se entendió. */
export function formatWhen(ts, now = new Date()) {
  const d = new Date(ts);
  const time = d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true });
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(d) - startOf(now)) / 86400000);
  if (diff === 0) return `hoy, ${time}`;
  if (diff === 1) return `mañana, ${time}`;
  if (diff === -1) return `ayer, ${time}`;
  const sameYear = d.getFullYear() === now.getFullYear();
  const day = d.toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', ...(sameYear ? {} : { year: 'numeric' }),
  });
  return `${day}, ${time}`;
}

/** Evita el punto doble cuando una frase termina en «p. m.». */
export const tidyText = (text) => String(text).replace(/([ap])\.(\s)m\.\./g, '$1.$2m.');
