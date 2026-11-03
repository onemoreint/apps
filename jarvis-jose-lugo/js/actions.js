// Sistema de autorizaciones.
// JARVIS solo puede proponer acciones de esta lista cerrada. El texto que ve José se genera aquí,
// a partir de los parámetros reales, para que ninguna fuente (ni la IA) pueda describir una acción
// de forma engañosa. Las acciones externas abren un borrador: el envío final siempre lo hace José.

import { uid } from './store.js';
import { formatWhen } from './dateparse.js';

const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function openExternal(url) {
  const win = window.open(url, '_blank');
  if (!win) {
    throw new Error('El navegador bloqueó la ventana nueva. Permite ventanas emergentes para esta app e inténtalo otra vez.');
  }
  win.opener = null;
}

const gcalStamp = (ts) => new Date(ts).toISOString().replace(/[-:]|\.\d{3}/g, '');

const COLLECTION_NAMES = { tasks: 'tarea', reminders: 'recordatorio', notes: 'nota', prefs: 'preferencia' };
const itemText = (item) => item?.title || item?.text || '';

export const ACTIONS = {
  whatsapp_draft: {
    external: true,
    aiAllowed: true,
    validate(p) {
      const phone = text(p.phone, 20).replace(/\D/g, '');
      const body = text(p.text, 2000);
      if (!body) throw new Error('Falta el texto del mensaje.');
      if (phone && (phone.length < 8 || phone.length > 15)) throw new Error('El número debe tener entre 8 y 15 dígitos.');
      return { phone, text: body };
    },
    describe: (p) => ({
      title: 'Preparar mensaje de WhatsApp',
      explain: 'Abriré WhatsApp con este texto escrito. El mensaje no se envía hasta que tú pulses enviar allí.',
      details: [
        ['Destinatario', p.phone ? `+${p.phone}` : 'Lo eliges en WhatsApp'],
        ['Mensaje', p.text],
      ],
    }),
    run(p) {
      openExternal(`https://wa.me/${p.phone}?text=${encodeURIComponent(p.text)}`);
      return 'Abrí el borrador en WhatsApp. El mensaje aún no se ha enviado.';
    },
  },

  email_draft: {
    external: true,
    aiAllowed: true,
    validate(p) {
      const to = text(p.to, 200);
      const subject = text(p.subject, 200);
      const body = text(p.body, 4000);
      if (to && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error('La dirección de correo no es válida.');
      if (!subject && !body) throw new Error('El correo necesita un asunto o un texto.');
      return { to, subject, body };
    },
    describe: (p) => ({
      title: 'Preparar correo',
      explain: 'Abriré tu aplicación de correo con este borrador. No se envía hasta que tú pulses enviar allí.',
      details: [
        ['Para', p.to || 'Lo eliges en tu correo'],
        ['Asunto', p.subject || 'Sin asunto'],
        ['Texto', p.body || 'Sin texto'],
      ],
    }),
    run(p) {
      const query = `subject=${encodeURIComponent(p.subject)}&body=${encodeURIComponent(p.body)}`;
      const a = document.createElement('a');
      a.href = `mailto:${encodeURIComponent(p.to).replace('%40', '@')}?${query}`;
      a.click();
      return 'Pedí a tu dispositivo que abra el borrador. Si no aparece, revisa que tengas una aplicación de correo configurada.';
    },
  },

  calendar_event: {
    external: true,
    aiAllowed: true,
    validate(p) {
      const title = text(p.title, 200);
      const start = typeof p.start === 'string' ? Date.parse(p.start) : p.start;
      if (!title) throw new Error('El evento necesita un título.');
      if (!Number.isFinite(start)) throw new Error('El evento necesita una fecha válida.');
      const parsedEnd = typeof p.end === 'string' ? Date.parse(p.end) : p.end;
      const end = Number.isFinite(parsedEnd) && parsedEnd > start ? parsedEnd : start + 3600000;
      return { title, start, end };
    },
    describe: (p) => ({
      title: 'Crear borrador en Google Calendar',
      explain: 'Abriré Google Calendar con el evento listo. Solo queda guardado si pulsas Guardar allí.',
      details: [
        ['Evento', p.title],
        ['Inicio', formatWhen(p.start)],
        ['Fin', formatWhen(p.end)],
      ],
    }),
    run(p) {
      const q = new URLSearchParams({ action: 'TEMPLATE', text: p.title, dates: `${gcalStamp(p.start)}/${gcalStamp(p.end)}` });
      openExternal(`https://calendar.google.com/calendar/render?${q}`);
      return 'Abrí el borrador en Google Calendar. Revísalo y pulsa Guardar para crearlo.';
    },
  },

  web_search: {
    external: true,
    aiAllowed: true,
    validate(p) {
      const query = text(p.query, 300);
      if (!query) throw new Error('Falta lo que quieres buscar.');
      return { query };
    },
    describe: (p) => ({
      title: 'Buscar en Google',
      explain: 'Abriré una pestaña nueva con esta búsqueda. El texto se comparte con Google.',
      details: [['Búsqueda', p.query]],
    }),
    run(p) {
      openExternal(`https://www.google.com/search?q=${encodeURIComponent(p.query)}`);
      return 'Abrí la búsqueda en una pestaña nueva.';
    },
  },

  copy_text: {
    external: false,
    aiAllowed: true,
    validate(p) {
      const body = text(p.text, 8000);
      if (!body) throw new Error('No hay texto para copiar.');
      return { text: body };
    },
    describe: (p) => ({
      title: 'Copiar al portapapeles',
      explain: 'Copiaré este texto para que lo pegues donde lo necesites.',
      details: [['Texto', clip(p.text, 400)]],
    }),
    async run(p) {
      try {
        await navigator.clipboard.writeText(p.text);
      } catch {
        throw new Error('El navegador no permitió usar el portapapeles.');
      }
      return 'Texto copiado.';
    },
  },

  create_tasks: {
    external: false,
    aiAllowed: true,
    validate(p) {
      const titles = (Array.isArray(p.titles) ? p.titles : [])
        .map((t) => text(t, 200))
        .filter(Boolean)
        .slice(0, 12);
      if (!titles.length) throw new Error('No hay tareas para crear.');
      return { project: text(p.project, 100), titles };
    },
    describe: (p) => ({
      title: `Crear ${p.titles.length} ${p.titles.length === 1 ? 'tarea' : 'tareas'}`,
      explain: 'Agregaré estas tareas a tu panel. Podrás editarlas o eliminarlas después.',
      details: [
        ...(p.project ? [['Proyecto', p.project]] : []),
        ['Tareas', p.titles.map((t, i) => `${i + 1}. ${t}`).join('\n')],
      ],
    }),
    run(p, { store }) {
      store.update((s) => {
        p.titles.forEach((title) => s.tasks.push({
          id: uid(), title, done: false, priority: 'normal', due: null, project: p.project || '', createdAt: Date.now(), doneAt: null,
        }));
      });
      return `Agregué ${p.titles.length} ${p.titles.length === 1 ? 'tarea' : 'tareas'} a tu panel.`;
    },
  },

  delete_item: {
    external: false,
    aiAllowed: false,
    validate(p, { store }) {
      const collection = text(p.collection, 20);
      if (!COLLECTION_NAMES[collection]) throw new Error('Tipo de registro desconocido.');
      const item = store.state[collection].find((x) => x.id === p.id);
      if (!item) throw new Error('Ese registro ya no existe.');
      return { collection, id: item.id, label: clip(itemText(item), 200) };
    },
    describe: (p) => ({
      title: `Eliminar ${COLLECTION_NAMES[p.collection]}`,
      explain: 'Lo pediste por voz o texto, así que confirmo antes de borrar. Esta acción no se puede deshacer.',
      details: [[COLLECTION_NAMES[p.collection][0].toUpperCase() + COLLECTION_NAMES[p.collection].slice(1), p.label]],
    }),
    run(p, { store }) {
      store.update((s) => {
        s[p.collection] = s[p.collection].filter((x) => x.id !== p.id);
      });
      return `Eliminé: ${p.label}.`;
    },
  },
};

export function createAuthorizer(store) {
  const log = (s, entry) => {
    s.audit.push({ id: uid(), at: Date.now(), ...entry });
  };

  return {
    /** Registra una propuesta si está permitida. Nunca ejecuta nada. */
    propose(type, params, source = 'local') {
      const def = Object.prototype.hasOwnProperty.call(ACTIONS, type) ? ACTIONS[type] : null;
      if (!def) throw new Error(`Acción no permitida: ${type}`);
      if (source === 'ia' && !def.aiAllowed) throw new Error(`La IA no puede proponer: ${type}`);
      const clean = def.validate(params || {}, { store });
      const proposal = { id: uid(), type, params: clean, source, status: 'pending', createdAt: Date.now() };
      store.update((s) => {
        s.proposals.push(proposal);
        log(s, { proposalId: proposal.id, type, event: 'propuesta', source });
      });
      return proposal;
    },

    describe(proposal) {
      const def = ACTIONS[proposal.type];
      return def ? def.describe(proposal.params) : null;
    },

    /** Ejecuta solo la propuesta indicada, una sola vez. Debe llamarse desde un clic de José. */
    async authorize(id) {
      const proposal = store.state.proposals.find((p) => p.id === id);
      if (!proposal || proposal.status !== 'pending') throw new Error('Esta autorización ya no está disponible.');
      const def = ACTIONS[proposal.type];
      if (!def) throw new Error('Acción no permitida.');
      // Se valida otra vez por si los datos guardados cambiaron desde la propuesta.
      const params = def.validate(proposal.params, { store });
      store.update((s) => {
        const p = s.proposals.find((x) => x.id === id);
        p.status = 'running';
      });
      try {
        const result = await def.run(params, { store });
        store.update((s) => {
          const p = s.proposals.find((x) => x.id === id);
          p.status = 'done';
          p.result = result;
          p.resolvedAt = Date.now();
          log(s, { proposalId: id, type: proposal.type, event: 'ejecutada', result });
        });
        return result;
      } catch (err) {
        store.update((s) => {
          const p = s.proposals.find((x) => x.id === id);
          p.status = 'failed';
          p.result = err.message;
          p.resolvedAt = Date.now();
          log(s, { proposalId: id, type: proposal.type, event: 'falló', result: err.message });
        });
        throw err;
      }
    },

    reject(id) {
      store.update((s) => {
        const p = s.proposals.find((x) => x.id === id);
        if (!p || p.status !== 'pending') return;
        p.status = 'rejected';
        p.resolvedAt = Date.now();
        log(s, { proposalId: id, type: p.type, event: 'rechazada' });
      });
    },
  };
}
