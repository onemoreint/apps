// Motor local: reconoce comandos en español con reglas. No es un modelo de IA y lo dice cuando no entiende.
// Las escrituras de bajo riesgo (crear tareas, notas) se aplican directamente.
// Borrar y cualquier acción externa se convierten en propuestas que requieren autorización.

import { uid } from './store.js';
import { norm, parseWhen, formatWhen } from './dateparse.js';
import { analyzeText } from './analyzer.js';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Recorta muletillas del inicio. Como norm conserva longitudes, sirve para cortar el original. */
function stripPolite(text) {
  let t = text.trim();
  const re = /^(jarvis|oye|hey|por favor|porfa|puedes|podrias|quiero que|necesito que|me gustaria que|ayudame a|me ayudas a)[\s,:]+/;
  let m;
  while ((m = re.exec(norm(t)))) t = t.slice(m[0].length).trim();
  return t.replace(/[.!?]+$/, '').trim() || text.trim();
}

function tokens(s) {
  return norm(s).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2);
}

/** Busca registros cuyo texto coincida con todas (o la mayoría) de las palabras. */
function fuzzy(list, query, getText) {
  const q = tokens(query);
  if (!q.length) return [];
  const scored = list.map((item) => {
    const hay = norm(getText(item));
    const hits = q.filter((w) => hay.includes(w)).length;
    return { item, score: hits / q.length };
  }).filter((x) => x.score >= 0.6);
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0]?.score;
  return scored.filter((x) => x.score === best).map((x) => x.item);
}

function pendingTasks(s) {
  const rank = (t) => (t.priority === 'alta' ? 0 : 1);
  return s.tasks.filter((t) => !t.done).sort((a, b) => rank(a) - rank(b) || (a.due ?? Infinity) - (b.due ?? Infinity) || a.createdAt - b.createdAt);
}

function upcomingReminders(s) {
  return s.reminders.filter((r) => r.status !== 'done').sort((a, b) => a.at - b.at);
}

function taskLine(t, i) {
  const bits = [`${i + 1}. ${t.title}`];
  if (t.priority === 'alta') bits.push('(urgente)');
  if (t.due) bits.push(`para ${formatWhen(t.due)}`);
  return bits.join(' ');
}

const reply = (text, extra = {}) => ({ understood: true, text, proposals: [], ...extra });

export const COMMAND_GROUPS = [
  { name: 'Tareas', items: ['Agrega tarea preparar la presentación', 'Tarea urgente pagar el dominio para mañana', 'Qué tareas tengo', 'Completa la tarea 1', 'Elimina la tarea 1'] },
  { name: 'Recordatorios', items: ['Recuérdame llamar a Pedro mañana a las 3 de la tarde', 'Recuérdame revisar el horno en 20 minutos', 'Qué recordatorios tengo'] },
  { name: 'Notas e ideas', items: ['Anota que el cliente prefiere pago por Bold', 'Idea: hacer un taller de microapps', 'Mis notas', 'Busca Bold en la memoria'] },
  { name: 'Preferencias', items: ['Recuerda que prefiero reuniones en la mañana', 'Mis preferencias'] },
  { name: 'Planificar y analizar', items: ['Planifica el proyecto lanzamiento de catálogo', 'Qué me recomiendas hacer ahora', 'Analiza: Debo enviar la cotización. Hay que revisar el presupuesto de 2.500 dólares.'] },
  { name: 'Acciones con autorización', items: ['Envía un WhatsApp a 3001234567 diciendo ya tengo la propuesta lista', 'Escribe un correo a cliente@ejemplo.com asunto Propuesta diciendo adjunto los detalles', 'Agenda reunión con Pedro el viernes a las 10', 'Busca en internet precios de hosting en Colombia'] },
  { name: 'Consultas', items: ['Qué hora es', 'Qué día es hoy', 'Quién eres', 'Ayuda'] },
];

/**
 * @param {string} rawText
 * @param {{store: object, now?: Date, conversation: {pending: object|null}}} ctx
 * @returns {{understood: boolean, text: string, proposals: Array}}
 */
export function respondLocal(rawText, ctx) {
  const { store, conversation } = ctx;
  const now = ctx.now || new Date();
  const s = store.state;
  const owner = s.settings.ownerName;
  const text = stripPolite(rawText);
  const n = norm(text);

  // Respuesta a una pregunta anterior de JARVIS
  if (conversation.pending) {
    const pending = conversation.pending;
    if (/^(cancela|cancelar|olvidalo|dejalo|no|nada)$/.test(n)) {
      conversation.pending = null;
      return reply('Cancelado.');
    }
    if (pending.kind === 'reminder') {
      const when = parseWhen(text, now);
      if (when.date) {
        conversation.pending = null;
        return createReminder(store, pending.text, when.date, now);
      }
      conversation.pending = null; // no era una fecha: se trata como un mensaje nuevo
    } else if (pending.kind === 'choose') {
      const pick = /^(\d+)$/.exec(n);
      if (pick && pending.options[parseInt(pick[1], 10) - 1]) {
        conversation.pending = null;
        return pending.onChoose(pending.options[parseInt(pick[1], 10) - 1]);
      }
      conversation.pending = null;
    }
  }

  // Conversación básica
  if (/^(hola|buenos dias|buen dia|buenas tardes|buenas noches|buenas|que tal)\b/.test(n) && n.length < 32) {
    const count = pendingTasks(s).length;
    return reply(`Hola, ${owner}. ${count ? `Tienes ${plural(count, 'tarea pendiente', 'tareas pendientes')}.` : 'No tienes tareas pendientes.'} ¿Qué organizamos?`);
  }
  if (/^(gracias|muchas gracias|perfecto|excelente)\b/.test(n) && n.length < 24) return reply('Con gusto.');
  if (/^(quien eres|que eres|como te llamas|eres una ia|eres inteligencia artificial)\b/.test(n)) {
    return reply(`Soy JARVIS, tu asistente personal, ${owner}. Ahora trabajo con ${s.settings.ai.enabled ? 'el motor local y tu conexión de IA' : 'el motor local: reglas que reconocen comandos, sin un modelo de IA conectado'}. Organizo tareas, recordatorios y memoria en este dispositivo, y preparo acciones que solo se ejecutan si las autorizas.`);
  }
  if (/^(ayuda|que puedes hacer|que sabes hacer|comandos|como funcionas)\b/.test(n)) {
    return reply('Puedo agregar y completar tareas, crear recordatorios, guardar notas y preferencias, plantear un plan de proyecto, analizar un texto y preparar mensajes, correos o eventos que solo se abren si los autorizas. Pulsa el botón de ayuda para ver ejemplos que puedes probar con un toque.');
  }
  if (/\b(que hora es|que hora tienes|dime la hora|la hora)\b/.test(n) && n.length < 26) {
    return reply(`Son las ${now.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true })}.`);
  }
  if (/\b(que dia es|que fecha es|fecha de hoy|dia es hoy)\b/.test(n)) {
    return reply(`Hoy es ${now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.`);
  }

  // Las autorizaciones nunca se conceden por texto o voz
  if (/^(autoriza|autorizo|aprueba|apruebo|confirma|confirmo)\b/.test(n)) {
    return reply('Por seguridad, las autorizaciones solo se conceden con el botón Autorizar. Así evitamos que una palabra mal reconocida ejecute algo.');
  }

  // Listas (antes de los comandos de creación)
  if (/\b(recordatorios|avisos)\b/.test(n) && /^(que|cuales|mis|ver|muestra|lista|tengo|dime)\b/.test(n)) {
    const list = upcomingReminders(s);
    if (!list.length) return reply('No tienes recordatorios activos. Prueba con: recuérdame llamar a Pedro mañana a las 3.');
    return reply(`Tienes ${plural(list.length, 'recordatorio', 'recordatorios')}:\n${list.slice(0, 8).map((r, i) => `${i + 1}. ${r.text}, ${formatWhen(r.at, now)}${r.at <= now.getTime() ? ' (vencido)' : ''}`).join('\n')}`);
  }
  if (/\b(tareas|pendientes|pendiente)\b/.test(n) && /^(que|cuales|mis|ver|muestra|lista|tengo|dime|cuantas)\b/.test(n)) {
    const list = pendingTasks(s);
    if (!list.length) return reply('No tienes tareas pendientes. Prueba con: agrega tarea preparar la presentación.');
    return reply(`Tienes ${plural(list.length, 'tarea pendiente', 'tareas pendientes')}:\n${list.slice(0, 10).map(taskLine).join('\n')}`);
  }
  if (/^(mis |ver |muestra |lista de |que )?(preferencias)\b/.test(n)) {
    if (!s.prefs.length) return reply('Aún no has guardado preferencias. Prueba con: recuerda que prefiero reuniones en la mañana.');
    return reply(`Tus preferencias:\n${s.prefs.map((p, i) => `${i + 1}. ${p.text}`).join('\n')}`);
  }
  if (/^(mis |ver |muestra |lista de |que )?(notas|ideas)\b/.test(n)) {
    const wantIdeas = /\bideas\b/.test(n);
    const list = s.notes.filter((x) => !wantIdeas || x.kind === 'idea');
    if (!list.length) return reply(`Aún no has guardado ${wantIdeas ? 'ideas' : 'notas'}.`);
    return reply(`${wantIdeas ? 'Tus ideas' : 'Tus notas'}:\n${list.slice(-8).reverse().map((x, i) => `${i + 1}. ${x.text}`).join('\n')}`);
  }

  // Recordatorios
  let m = /^(recuerdame|recordarme|recordatorio|avisame|nuevo recordatorio|ponme un recordatorio|pon un recordatorio|crea un recordatorio|agrega un recordatorio)(\s+(de|para|que))?(\s+|:\s*)/.exec(n);
  if (m) {
    const body = text.slice(m[0].length);
    const when = parseWhen(body, now);
    if (!when.rest) return reply('¿Qué quieres que te recuerde?');
    if (!when.date) {
      conversation.pending = { kind: 'reminder', text: when.rest };
      return reply(`¿Cuándo quieres que te recuerde «${when.rest}»? Puedes decir, por ejemplo: mañana a las 3, o en 20 minutos.`);
    }
    return createReminder(store, when.rest, when.date, now);
  }

  // Acciones externas: se proponen, no se ejecutan
  m = /^(envia|enviar|manda|mandar|escribe|escribele|prepara|redacta)?\s*(un |una |el )?(mensaje (de |por )?)?(whatsapp|wasap|whats app|guasap|wsp)\b\s*(a\s+|al\s+|para\s+)?/.exec(n);
  if (m) return draftWhatsapp(text.slice(m[0].length), s);

  m = /^(envia|enviar|manda|mandar|escribe|prepara|redacta)\s+(un |el )?(correo|email|e-mail|mail)\b\s*(a\s+|para\s+)?/.exec(n);
  if (m) return draftEmail(text.slice(m[0].length));

  m = /^(agenda|agendar|agrega al calendario|agregar al calendario|anade al calendario|pon en el calendario|crea un evento|crear evento|nuevo evento)(\s+(de|para))?\s+/.exec(n);
  if (m) {
    const when = parseWhen(text.slice(m[0].length), now);
    if (!when.rest) return reply('¿Qué evento quieres agendar?');
    if (!when.date) return reply(`Dime cuándo es «${when.rest}». Por ejemplo: agenda ${when.rest} el viernes a las 10.`);
    return reply(`Preparé el evento «${when.rest}» para ${formatWhen(when.date, now)}. Necesito tu autorización para abrirlo en Google Calendar.`, {
      proposals: [{ type: 'calendar_event', params: { title: cap(when.rest), start: when.date.getTime() } }],
    });
  }

  m = /^(busca|buscar|buscame|investiga)\s+(en\s+)?(internet|google|la web)\s*(sobre|acerca de)?\s*/.exec(n);
  if (m) {
    const query = text.slice(m[0].length).trim();
    if (!query) return reply('¿Qué quieres buscar en internet?');
    return reply('Preparé la búsqueda. Necesito tu autorización para abrirla.', { proposals: [{ type: 'web_search', params: { query } }] });
  }

  // Crear tarea
  m = /^(agrega|agregar|anade|anadir|crea|crear|anota|apunta|pon|registra|nueva|nuevo)(\s+(una|la|otra|un))?(\s+nueva)?\s+tarea(\s+(urgente|importante))?(\s*:\s*|\s+(de|para|que)\s+|\s+)/.exec(n)
    || /^tarea(\s+(urgente|importante))?(\s*:\s*|\s+)/.exec(n)
    || /^(tengo que|debo|hay que)\s+/.exec(n);
  if (m) {
    const urgentWord = /\b(urgente|importante)\b/.test(m[0]);
    let body = text.slice(m[0].length);
    const urgentTail = /[,\s]+(es\s+)?urgente$/i.exec(norm(body));
    if (urgentTail) body = body.slice(0, urgentTail.index);
    const when = parseWhen(body, now);
    const title = cap(when.rest);
    if (!title) return reply('¿Cuál es la tarea? Prueba con: agrega tarea preparar la presentación.');
    const task = {
      id: uid(), title, done: false, priority: urgentWord || urgentTail ? 'alta' : 'normal', due: when.date ? when.date.getTime() : null, project: '', createdAt: Date.now(), doneAt: null,
    };
    store.update((st) => { st.tasks.push(task); });
    return reply(`Tarea agregada: ${title}${task.priority === 'alta' ? ', marcada como urgente' : ''}${task.due ? `, para ${formatWhen(task.due, now)}` : ''}.`);
  }

  // Completar tarea
  m = /^(completa|completar|termina|terminar|finaliza|finalizar|marca|marcar|ya hice|ya termine|ya complete)(\s+(la|el|mi))?(\s+tarea)?(\s+(numero|n|#))?\s+/.exec(n);
  if (m) {
    const query = text.slice(m[0].length).replace(/\s+(como\s+)?(completada|terminada|lista|hecha)$/i, '').trim();
    const list = pendingTasks(s);
    if (!list.length) return reply('No tienes tareas pendientes.');
    const num = /^\d+$/.test(query) ? list[parseInt(query, 10) - 1] : null;
    const found = num ? [num] : fuzzy(list, query, (t) => t.title);
    const complete = (t) => {
      store.update((st) => {
        const x = st.tasks.find((y) => y.id === t.id);
        x.done = true;
        x.doneAt = Date.now();
      });
      return reply(`Tarea completada: ${t.title}.`);
    };
    if (!found.length) return reply(`No encontré esa tarea. Tienes:\n${list.slice(0, 8).map(taskLine).join('\n')}`);
    if (found.length > 1) {
      conversation.pending = { kind: 'choose', options: found, onChoose: complete };
      return reply(`Encontré varias. Responde con el número:\n${found.map((t, i) => `${i + 1}. ${t.title}`).join('\n')}`);
    }
    return complete(found[0]);
  }

  // Eliminar: siempre requiere autorización
  m = /^(elimina|eliminar|borra|borrar|quita|quitar|cancela|cancelar|olvida|olvidar)(\s+(la|el|mi|esa|ese))?(\s+(tarea|recordatorio|aviso|nota|idea|preferencia))?(\s+(numero|n|#|que|sobre|de))?\s+/.exec(n);
  if (m) {
    const query = text.slice(m[0].length).trim();
    const kindWord = (m[4] || '').trim();
    const collections = {
      tarea: ['tasks'], recordatorio: ['reminders'], aviso: ['reminders'], nota: ['notes'], idea: ['notes'], preferencia: ['prefs'],
    }[kindWord] || ['tasks', 'reminders', 'notes', 'prefs'];
    const found = [];
    collections.forEach((c) => {
      const source = c === 'tasks' ? pendingTasks(s) : c === 'reminders' ? upcomingReminders(s) : s[c];
      if (/^\d+$/.test(query) && kindWord) {
        const item = source[parseInt(query, 10) - 1];
        if (item) found.push({ collection: c, item });
      } else {
        fuzzy(source, query, (x) => x.title || x.text).forEach((item) => found.push({ collection: c, item }));
      }
    });
    if (!found.length) return reply('No encontré ese registro. Revísalo en los paneles o dime otras palabras.');
    if (found.length > 1) {
      const proposeDelete = (f) => reply('Necesito tu autorización para eliminarlo.', { proposals: [{ type: 'delete_item', params: { collection: f.collection, id: f.item.id } }] });
      conversation.pending = { kind: 'choose', options: found, onChoose: proposeDelete };
      return reply(`Encontré varios. Responde con el número:\n${found.map((f, i) => `${i + 1}. ${f.item.title || f.item.text}`).join('\n')}`);
    }
    return reply('Necesito tu autorización para eliminarlo.', { proposals: [{ type: 'delete_item', params: { collection: found[0].collection, id: found[0].item.id } }] });
  }

  // Preferencias
  m = /^(recuerda que|recuerda|guarda como preferencia(\s+que)?|mi preferencia es(\s+que)?)\s+/.exec(n);
  const prefers = /^prefiero\s+/.test(n);
  if (m || prefers) {
    const body = cap(prefers ? text : text.slice(m[0].length));
    if (!body) return reply('¿Qué preferencia quieres que guarde?');
    store.update((st) => { st.prefs.push({ id: uid(), text: body, createdAt: Date.now() }); });
    return reply(`Preferencia guardada en este dispositivo: ${body}.`);
  }

  // Notas e ideas
  m = /^(anota|anotar|apunta|apuntar|guarda|guardar|registra|registrar|toma nota|nota|idea)(\s+(una|la|esta|mi|nueva))?(\s+(nota|idea))?(\s+(de\s+)?que|\s*:|\s+de)?\s+/.exec(n);
  if (m) {
    const body = cap(text.slice(m[0].length).trim());
    if (!body) return reply('¿Qué quieres que anote?');
    const isIdea = /\bidea\b/.test(m[0]);
    store.update((st) => { st.notes.push({ id: uid(), text: body, kind: isIdea ? 'idea' : 'nota', createdAt: Date.now() }); });
    return reply(`${isIdea ? 'Idea' : 'Nota'} guardada: ${body}.`);
  }

  // Consultar la memoria
  m = /^(busca|buscar|buscame|consulta|consultar|que sabes|que recuerdas|que tengo guardado|que guarde|que anote)(\s+en\s+(la\s+)?memoria)?(\s+(sobre|de|acerca de))?\s+/.exec(n);
  if (m) return searchMemory(text.slice(m[0].length).replace(/\s+en\s+(la\s+)?memoria$/i, '').trim(), s);

  // Planificar
  m = /^(planifica|planificar|planea|planear|organiza|organizar|haz un plan para|hazme un plan para|plan para|plan de)(\s+(el|mi|un|una|la))?(\s+proyecto)?(\s+(de|para))?\s+/.exec(n);
  if (m) {
    const project = cap(text.slice(m[0].length).trim());
    if (!project) return reply('¿Qué proyecto quieres planificar?');
    const titles = [
      `Definir el resultado esperado y la fecha límite de ${project}`,
      'Listar recursos, personas y costos necesarios',
      'Dividir el trabajo en entregables de una semana',
      'Completar y revisar el primer entregable',
      'Revisar el avance y ajustar el plan',
    ];
    return reply(`Esta es una plantilla general, no un análisis de IA. Propongo cinco pasos para «${project}». Si la autorizas, los agrego como tareas y puedes adaptarlos.`, {
      proposals: [{ type: 'create_tasks', params: { project, titles } }],
    });
  }

  // Analizar texto
  m = /^(analiza|analizar|analisis de|revisa este texto|resume)(\s+(este|el|esta|la))?(\s+(texto|informacion|mensaje))?\s*:?\s*/.exec(n);
  if (m) {
    const body = text.slice(m[0].length).trim();
    if (body.length < 20) return reply('Escribe o pega el texto después de la palabra analiza. Por ejemplo: analiza: debo enviar la cotización y revisar el presupuesto.');
    return analysisReply(body);
  }

  // Recomendación
  if (/\b(que hago|que hacer|que me recomiendas|recomiendame|recomendacion|que sigue|por donde empiezo|plan del dia|mi dia|resumen|como voy|que tengo hoy|que debo hacer|que tengo pendiente)\b/.test(n)) {
    return recommend(s, now);
  }

  return {
    understood: false,
    text: 'No reconozco ese comando. Ahora trabajo en modo local, con reglas y sin un modelo de IA, así que no puedo mantener una conversación libre. Prueba con «agrega tarea…», «recuérdame…», «anota que…» o abre la ayuda para ver más ejemplos.',
    proposals: [],
  };
}

function createReminder(store, textBody, date, now) {
  const body = cap(textBody);
  store.update((st) => {
    st.reminders.push({ id: uid(), text: body, at: date.getTime(), status: 'pending', createdAt: Date.now() });
  });
  return reply(`Recordatorio creado: ${body}, ${formatWhen(date, now)}. Te avisaré si la app está abierta en ese momento.`);
}

function draftWhatsapp(body, s) {
  const n = norm(body);
  const sep = /\s*(diciendo|diciendole|que diga|que dice|con el mensaje|con el texto|y dile|dile que|:)\s*(que\s+)?/.exec(n);
  if (!sep) {
    return reply('Dime también el mensaje. Por ejemplo: envía un WhatsApp a 3001234567 diciendo ya tengo la propuesta lista.');
  }
  const target = body.slice(0, sep.index).trim();
  const message = cap(body.slice(sep.index + sep[0].length).trim());
  if (!message) return reply('¿Qué quieres decir en el mensaje?');
  const digits = target.replace(/\D/g, '');
  let phone = '';
  let note = '';
  if (digits.length >= 8) {
    phone = digits.length === 10 ? `${s.settings.countryCode}${digits}` : digits;
    if (digits.length === 10) note = ` Agregué el indicativo +${s.settings.countryCode}.`;
  } else if (target) {
    note = ` No guardo contactos, así que elegirás a ${target} en WhatsApp.`;
  }
  return reply(`Preparé el mensaje.${note} Necesito tu autorización para abrirlo.`, {
    proposals: [{ type: 'whatsapp_draft', params: { phone, text: message } }],
  });
}

function spokenEmail(s) {
  return norm(s).replace(/\s+arroba\s+/g, '@').replace(/\s+punto\s+/g, '.').replace(/\s+/g, '');
}

function draftEmail(body) {
  const n = norm(body);
  const bodySep = /\s*(diciendo|diciendole|con el texto|con el mensaje|que diga|que dice)\s*(que\s+)?/.exec(n);
  const before = bodySep ? body.slice(0, bodySep.index) : body;
  const content = bodySep ? cap(body.slice(bodySep.index + bodySep[0].length).trim()) : '';
  const subjSep = /\s*(?:con\s+)?asunto:?\s*/.exec(norm(before));
  const toPart = subjSep ? before.slice(0, subjSep.index) : before;
  const subject = subjSep ? cap(before.slice(subjSep.index + subjSep[0].length).trim()) : '';
  const to = toPart.trim() ? (toPart.includes('@') ? toPart.trim() : spokenEmail(toPart)) : '';
  const looksEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to);
  if (!subject && !content) {
    return reply('Dime el asunto o el texto. Por ejemplo: escribe un correo a cliente@ejemplo.com asunto Propuesta diciendo adjunto los detalles.');
  }
  return reply(`Preparé el borrador${looksEmail ? '' : '. El destinatario lo eliges en tu correo'}. Necesito tu autorización para abrirlo.`, {
    proposals: [{ type: 'email_draft', params: { to: looksEmail ? to : '', subject, body: content } }],
  });
}

function searchMemory(query, s) {
  if (!query) return reply('¿Qué quieres que busque en tu memoria?');
  const groups = [
    ['Notas', fuzzy(s.notes, query, (x) => x.text).map((x) => x.text)],
    ['Preferencias', fuzzy(s.prefs, query, (x) => x.text).map((x) => x.text)],
    ['Tareas', fuzzy(s.tasks, query, (x) => x.title).map((x) => `${x.title}${x.done ? ' (completada)' : ''}`)],
    ['Recordatorios', fuzzy(s.reminders, query, (x) => x.text).map((x) => x.text)],
  ].filter(([, list]) => list.length);
  if (!groups.length) return reply(`No tengo nada guardado sobre «${query}» en este dispositivo.`);
  return reply(`Esto es lo que tengo sobre «${query}»:\n${groups.map(([name, list]) => `${name}:\n${list.slice(0, 5).map((x) => `• ${x}`).join('\n')}`).join('\n')}`);
}

function analysisReply(body) {
  const a = analyzeText(body);
  const lines = [
    `Análisis local del texto (conteo y patrones, sin IA):`,
    `• ${plural(a.wordCount, 'palabra', 'palabras')}, ${plural(a.sentenceCount, 'oración', 'oraciones')}, unos ${plural(a.readingMinutes, 'minuto', 'minutos')} de lectura.`,
  ];
  if (a.terms.length) lines.push(`• Términos que más se repiten: ${a.terms.map((t) => `${t.term} (${t.count})`).join(', ')}.`);
  if (a.figures.length) lines.push(`• Cifras: ${a.figures.join(', ')}.`);
  if (a.emails.length) lines.push(`• Correos: ${a.emails.join(', ')}.`);
  if (a.links.length) lines.push(`• Enlaces: ${a.links.join(', ')}.`);
  if (a.actions.length) {
    lines.push(`• Posibles tareas detectadas: ${a.actions.length}. Si las autorizas, las agrego a tu panel.`);
    return reply(lines.join('\n'), { proposals: [{ type: 'create_tasks', params: { project: '', titles: a.actions.map(cap) } }] });
  }
  lines.push('• No detecté frases que parezcan tareas.');
  return reply(lines.join('\n'));
}

function recommend(s, now) {
  const t = now.getTime();
  const tasks = pendingTasks(s);
  const overdueRem = s.reminders.filter((r) => r.status !== 'done' && r.at <= t);
  const nextRem = s.reminders.filter((r) => r.status === 'pending' && r.at > t).sort((a, b) => a.at - b.at)[0];
  const overdueTasks = tasks.filter((x) => x.due && x.due < t);
  const urgent = tasks.filter((x) => x.priority === 'alta');
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const today = tasks.filter((x) => x.due && x.due >= t && x.due <= endOfDay.getTime());

  if (!tasks.length && !overdueRem.length && !nextRem) {
    return reply('Tu panel está vacío. Recomiendo anotar las tres cosas más importantes de hoy: agrega cada una con «agrega tarea…».');
  }

  let pick;
  if (overdueRem[0]) pick = `Atiende primero el recordatorio vencido: ${overdueRem[0].text}.`;
  else if (overdueTasks[0]) pick = `Empieza por ${overdueTasks[0].title}, porque ya pasó su fecha.`;
  else if (urgent[0]) pick = `Empieza por ${urgent[0].title}, porque la marcaste como urgente.`;
  else if (today[0]) pick = `Empieza por ${today[0].title}, porque vence hoy.`;
  else if (tasks[0]) pick = `Empieza por ${tasks[0].title}, porque es la tarea más antigua sin fecha.`;
  else pick = 'No tienes tareas pendientes.';

  const facts = [`${plural(tasks.length, 'tarea pendiente', 'tareas pendientes')}`];
  if (urgent.length) facts.push(`${plural(urgent.length, 'urgente', 'urgentes')}`);
  if (overdueTasks.length) facts.push(`${plural(overdueTasks.length, 'atrasada', 'atrasadas')}`);
  const next = nextRem ? ` Tu próximo aviso: ${nextRem.text}, ${formatWhen(nextRem.at, now)}.` : '';
  return reply(`${pick}\nEn total: ${facts.join(', ')}.${next}`);
}
