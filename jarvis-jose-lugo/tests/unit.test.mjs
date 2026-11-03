import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWhen, formatWhen } from '../js/dateparse.js';
import { analyzeText } from '../js/analyzer.js';
import { createStore } from '../js/store.js';
import { createAuthorizer, ACTIONS } from '../js/actions.js';
import { respondLocal } from '../js/engine-local.js';
import { validateConfig } from '../js/engine-remote.js';
import worker from '../backend/worker.js';

// Martes 3 de noviembre de 2026, 5:17 p. m.
const NOW = new Date(2026, 10, 3, 17, 17, 0);
const parts = (d) => [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()];

const WHEN_CASES = [
  ['llamar a Pedro mañana a las 3 de la tarde', [2026, 11, 4, 15, 0], 'llamar a Pedro'],
  ['llamar a Pedro mañana a las 8 de la mañana', [2026, 11, 4, 8, 0], 'llamar a Pedro'],
  ['revisar el horno en 20 minutos', [2026, 11, 3, 17, 37], 'revisar el horno'],
  ['pagar la luz dentro de una hora y media', [2026, 11, 3, 18, 47], 'pagar la luz'],
  ['estirar en media hora', [2026, 11, 3, 17, 47], 'estirar'],
  ['enviar propuesta el viernes a las 10', [2026, 11, 6, 10, 0], 'enviar propuesta'],
  ['enviar propuesta el viernes a las 3', [2026, 11, 6, 15, 0], 'enviar propuesta'],
  ['reunión hoy a las 8', [2026, 11, 3, 20, 0], 'reunión'],
  ['reunión a las 6', [2026, 11, 3, 18, 0], 'reunión'],
  ['reunión a las 5', [2026, 11, 4, 5, 0], 'reunión'],
  ['cita el 15 de noviembre a las 9:30', [2026, 11, 15, 9, 30], 'cita'],
  ['cita el 2 de enero a las 4 pm', [2027, 1, 2, 16, 0], 'cita'],
  ['cita 25/12 a las 7 y media de la noche', [2026, 12, 25, 19, 30], 'cita'],
  ['pasado mañana comprar cuero', [2026, 11, 5, 9, 0], 'comprar cuero'],
  ['almuerzo mañana al mediodía', [2026, 11, 4, 12, 0], 'almuerzo'],
  ['entrenar mañana por la tarde', [2026, 11, 4, 15, 0], 'entrenar'],
  ['llamar a las 3:00 p.m. mañana', [2026, 11, 4, 15, 0], 'llamar'],
  ['ver a Domingo el lunes', [2026, 11, 9, 9, 0], 'ver a Domingo'],
  ['en 2 días a las 10 revisar', [2026, 11, 5, 10, 0], 'revisar'],
];

for (const [input, expected, rest] of WHEN_CASES) {
  test(`fecha: ${input}`, () => {
    const r = parseWhen(input, NOW);
    assert.ok(r.date, 'debe encontrar fecha');
    assert.deepEqual(parts(r.date), expected);
    assert.equal(r.rest, rest);
  });
}

test('fecha: texto sin fecha conserva el contenido', () => {
  const r = parseWhen('llamar a Pedro', NOW);
  assert.equal(r.date, null);
  assert.equal(r.rest, 'llamar a Pedro');
});

test('formatWhen usa hoy y mañana', () => {
  assert.match(formatWhen(new Date(2026, 10, 4, 15, 0), NOW), /^mañana,/);
  assert.match(formatWhen(new Date(2026, 10, 3, 18, 0), NOW), /^hoy,/);
});

test('analyzeText cuenta y detecta tareas, cifras y correos', () => {
  const a = analyzeText('Debo enviar la cotización a ana@correo.com. El presupuesto es de 2.500 dólares. El presupuesto incluye envío. Hay que confirmar la fecha.');
  assert.equal(a.sentenceCount, 4);
  assert.equal(a.actions.length, 2);
  assert.ok(a.figures.some((f) => f.includes('2.500')));
  assert.deepEqual(a.emails, ['ana@correo.com']);
  assert.equal(a.terms[0].term, 'presupuesto');
});

function setup() {
  const store = createStore();
  store.reset();
  const authorizer = createAuthorizer(store);
  const conversation = { pending: null };
  const say = (text) => respondLocal(text, { store, conversation, now: NOW });
  return { store, authorizer, conversation, say };
}

test('tareas: crear, urgente, listar, completar por número y por nombre', () => {
  const { store, say } = setup();
  assert.match(say('Agrega tarea preparar la presentación').text, /Preparar la presentación/);
  const urgent = say('Jarvis, tarea urgente pagar el dominio para mañana');
  assert.match(urgent.text, /urgente/);
  assert.equal(store.state.tasks[1].priority, 'alta');
  assert.equal(store.state.tasks[1].title, 'Pagar el dominio');
  assert.ok(store.state.tasks[1].due);
  const list = say('Qué tareas tengo');
  assert.match(list.text, /1\. Pagar el dominio/);
  say('Completa la tarea 1');
  assert.equal(store.state.tasks.find((t) => t.title === 'Pagar el dominio').done, true);
  say('Completa preparar presentación');
  assert.equal(store.state.tasks.find((t) => t.title === 'Preparar la presentación').done, true);
});

test('recordatorios: fecha directa y pregunta de seguimiento', () => {
  const { store, say, conversation } = setup();
  const direct = say('Recuérdame llamar a Pedro mañana a las 3 de la tarde');
  assert.match(direct.text, /Llamar a Pedro/);
  assert.deepEqual(parts(new Date(store.state.reminders[0].at)), [2026, 11, 4, 15, 0]);
  const ask = say('Recuérdame comprar cuero');
  assert.match(ask.text, /Cuándo/);
  assert.ok(conversation.pending);
  say('en 20 minutos');
  assert.equal(store.state.reminders[1].text, 'Comprar cuero');
  assert.equal(conversation.pending, null);
});

test('memoria: notas, ideas, preferencias y búsqueda', () => {
  const { store, say } = setup();
  say('Anota que el cliente prefiere pago por Bold');
  say('Idea: hacer un taller de microapps');
  say('Recuerda que prefiero reuniones en la mañana');
  assert.equal(store.state.notes[0].text, 'El cliente prefiere pago por Bold');
  assert.equal(store.state.notes[1].kind, 'idea');
  assert.equal(store.state.prefs.length, 1);
  assert.match(say('Busca Bold en la memoria').text, /pago por Bold/);
  assert.match(say('Busca bicicleta').text, /No tengo nada/);
});

test('eliminar por voz o texto solo crea una propuesta', () => {
  const { store, say } = setup();
  say('Agrega tarea probar borrado');
  const r = say('Elimina la tarea 1');
  assert.equal(store.state.tasks.length, 1);
  assert.equal(r.proposals[0].type, 'delete_item');
});

test('la palabra autoriza nunca ejecuta', () => {
  const { say } = setup();
  assert.match(say('Autoriza').text, /botón/);
});

test('acciones externas se proponen con los datos correctos', () => {
  const { say } = setup();
  const w = say('Envía un WhatsApp a 3001234567 diciendo ya tengo la propuesta lista');
  assert.deepEqual(w.proposals[0], { type: 'whatsapp_draft', params: { phone: '573001234567', text: 'Ya tengo la propuesta lista' } });
  const e = say('Escribe un correo a cliente@ejemplo.com asunto Propuesta diciendo adjunto los detalles');
  assert.deepEqual(e.proposals[0].params, { to: 'cliente@ejemplo.com', subject: 'Propuesta', body: 'Adjunto los detalles' });
  const v = say('Escribe un correo a ana arroba correo punto com asunto Hola diciendo qué tal');
  assert.equal(v.proposals[0].params.to, 'ana@correo.com');
  const c = say('Agenda reunión con Pedro el viernes a las 10');
  assert.equal(c.proposals[0].params.title, 'Reunión con Pedro');
  const b = say('Busca en internet precios de hosting');
  assert.equal(b.proposals[0].params.query, 'precios de hosting');
});

test('un comando desconocido no se finge entendido', () => {
  const { say } = setup();
  const r = say('¿Cuál es el sentido de la vida?');
  assert.equal(r.understood, false);
  assert.match(r.text, /sin un modelo de IA/);
});

test('recomendaciones priorizan lo urgente', () => {
  const { say } = setup();
  say('Agrega tarea ordenar archivos');
  say('Tarea urgente enviar cotización');
  assert.match(say('Qué me recomiendas hacer ahora').text, /Enviar cotización/);
});

test('autorizador: rechaza lo no permitido y ejecuta una sola vez', async () => {
  const { store, authorizer } = setup();
  assert.throws(() => authorizer.propose('transferir_dinero', {}), /no permitida/);
  assert.throws(() => authorizer.propose('toString', {}), /no permitida/);
  assert.throws(() => authorizer.propose('__proto__', {}), /no permitida/);
  store.update((s) => s.tasks.push({ id: 'a', title: 'x', done: false, priority: 'normal', createdAt: 1 }));
  assert.throws(() => authorizer.propose('delete_item', { collection: 'tasks', id: 'a' }, 'ia'), /IA no puede/);
  const p = authorizer.propose('create_tasks', { titles: ['Uno', 'Dos'] }, 'ia');
  assert.equal(store.state.tasks.length, 1, 'proponer no ejecuta');
  await authorizer.authorize(p.id);
  assert.equal(store.state.tasks.length, 3);
  await assert.rejects(authorizer.authorize(p.id), /ya no está disponible/);
  assert.equal(store.state.tasks.length, 3);
});

test('autorizador: rechazar no ejecuta y queda en el historial', () => {
  const { store, authorizer } = setup();
  const p = authorizer.propose('create_tasks', { titles: ['Uno'] });
  authorizer.reject(p.id);
  assert.equal(store.state.tasks.length, 0);
  assert.equal(store.state.proposals[0].status, 'rejected');
  assert.ok(store.state.audit.some((a) => a.event === 'rechazada'));
});

test('importar valida datos y nunca trae autorizaciones', () => {
  const { store } = setup();
  const r = store.importData({
    version: 1,
    tasks: [{ title: 'Válida' }, { nada: true }],
    notes: [{ text: 'Nota' }],
    proposals: [{ id: 'x', type: 'whatsapp_draft', status: 'pending' }],
    settings: { ownerName: 'José', ai: { token: 'robado', url: 'https://malo.example', enabled: true } },
  });
  assert.equal(r.tasks, 1);
  assert.equal(store.state.proposals.length, 0);
  assert.equal(store.state.settings.ai.enabled, false);
  assert.throws(() => store.importData({ version: 99 }), /copia de seguridad/);
});

test('exportar no incluye el código de acceso', () => {
  const { store } = setup();
  store.update((s) => { s.settings.ai.token = 'secreto'; });
  assert.equal(store.exportData().settings.ai.token, '');
});

test('la configuración rechaza claves de API y direcciones inseguras', () => {
  assert.throws(() => validateConfig({ url: 'https://a.dev', token: 'sk-ant-abc' }), /clave de API/);
  assert.throws(() => validateConfig({ url: 'http://a.dev', token: 'x' }), /https/);
  assert.equal(validateConfig({ url: 'https://a.dev/', token: 'x' }).url, 'https://a.dev');
});

test('todas las acciones tienen validación, descripción y ejecución', () => {
  Object.values(ACTIONS).forEach((a) => {
    assert.equal(typeof a.validate, 'function');
    assert.equal(typeof a.describe, 'function');
    assert.equal(typeof a.run, 'function');
  });
});

// Backend, con la API de Anthropic simulada: comprueba el contrato, no una conexión real.
const ENV = { ANTHROPIC_API_KEY: 'clave-secreta', APP_TOKEN: 'codigo', ALLOWED_ORIGIN: 'https://app.test' };
const call = (path, opts = {}) => worker.fetch(new Request(`https://w.test${path}`, {
  ...opts,
  headers: { Origin: 'https://app.test', Authorization: 'Bearer codigo', ...(opts.headers || {}) },
}), ENV);

test('backend: rechaza origen ajeno y código incorrecto', async () => {
  const bad = await worker.fetch(new Request('https://w.test/health', { headers: { Origin: 'https://otro.test', Authorization: 'Bearer codigo' } }), ENV);
  assert.equal(bad.status, 403);
  const noAuth = await call('/health', { headers: { Authorization: 'Bearer mal' } });
  assert.equal(noAuth.status, 401);
  const ok = await call('/health');
  assert.equal((await ok.json()).ok, true);
});

test('backend: convierte la respuesta de Claude y no expone la clave', async () => {
  const realFetch = globalThis.fetch;
  let sent;
  globalThis.fetch = async (url, init) => {
    sent = { url, headers: init.headers, body: JSON.parse(init.body) };
    return new Response(JSON.stringify({
      content: [
        { type: 'text', text: 'Listo, José.' },
        { type: 'tool_use', name: 'web_search', input: { query: 'hosting' } },
      ],
    }), { status: 200 });
  };
  try {
    const res = await call('/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: [{ role: 'assistant', content: 'hola' }, { role: 'user', content: 'busca' }], context: { ownerName: 'José' } }),
    });
    const data = await res.json();
    assert.equal(data.reply, 'Listo, José.');
    assert.deepEqual(data.proposals, [{ type: 'web_search', params: { query: 'hosting' } }]);
    assert.equal(sent.url, 'https://api.anthropic.com/v1/messages');
    assert.equal(sent.headers['x-api-key'], 'clave-secreta');
    assert.equal(sent.body.messages[0].role, 'user');
    assert.ok(!JSON.stringify(data).includes('clave-secreta'));
  } finally {
    globalThis.fetch = realFetch;
  }
});
