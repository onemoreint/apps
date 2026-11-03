// Punto de entrada: conecta memoria, cerebro, voz, reactor, autorizaciones e interfaz.

import { store, uid } from './store.js';
import { createAuthorizer } from './actions.js';
import { createBrain } from './brain.js';
import { createReactor, STATE_LABELS } from './reactor.js';
import { createVoice, rankVoice, voiceTips, NATURAL_SCORE } from './voice.js';
import { createReminderWatcher, showSystemNotification } from './reminders.js';
import { createUI, h, icon, toast, confirmDialog } from './ui.js';
import { COMMAND_GROUPS } from './engine-local.js';
import { validateConfig, RemoteError } from './engine-remote.js';
import { parseWhen, formatWhen, tidyText } from './dateparse.js';

const $ = (sel) => document.querySelector(sel);
const authorizer = createAuthorizer(store);
const brain = createBrain({ store, authorizer });
const reactor = createReactor($('#reactor'));

/* ---------- Estado visual ---------- */
let errorTimer = 0;
function setState(state) {
  clearTimeout(errorTimer);
  document.body.dataset.state = state;
  reactor.setState(state);
  const label = STATE_LABELS[state];
  $('#state-label').textContent = label;
  $('#reactor').setAttribute('aria-label', `Estado de JARVIS: ${label.toLowerCase()}`);
  if (state === 'error') {
    errorTimer = setTimeout(() => {
      if (document.body.dataset.state === 'error') setState('idle');
    }, 7000);
  }
}

/* ---------- Conversación ---------- */
const voiceSample = () => `${greetingWord()}, ${store.state.settings.ownerName}. Así sonaré cuando te hable. ¿Te gusta esta voz?`;

function greetingWord(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Buenos días';
  if (hour >= 12 && hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function addMessage(message) {
  store.update((s) => {
    s.messages.push({ id: uid(), at: Date.now(), ...message, text: tidyText(message.text) });
  });
}

function scrollChatToEnd() {
  const log = $('#chat-log');
  log.scrollTop = log.scrollHeight;
}

function shouldSpeak(viaVoice) {
  const mode = store.state.settings.speechMode;
  return mode === 'always' || (mode === 'voice' && viaVoice);
}

function say(text, viaVoice) {
  if (shouldSpeak(viaVoice) && voice.caps.synthesis) {
    voice.speak(text);
  }
}

let busy = false;
async function send(raw, viaVoice = false) {
  const text = raw.trim();
  if (!text || busy) return;
  busy = true;
  voice.stopSpeaking();
  addMessage({ role: 'user', text });
  scrollChatToEnd();
  setState('processing');
  try {
    const result = await brain.respond(text);
    addMessage({ role: 'jarvis', text: result.text, source: result.source, proposalIds: result.proposalIds });
    scrollChatToEnd();
    if (result.failure) {
      setState('error');
    } else {
      setState('idle');
    }
    say(result.text, viaVoice);
  } catch (err) {
    console.error(err);
    addMessage({ role: 'alert', error: true, text: 'Ocurrió un error inesperado al procesar el mensaje. Tus datos siguen guardados.' });
    setState('error');
  } finally {
    busy = false;
    if (store.lastError) toast(store.lastError, { kind: 'error', timeout: 0, actions: [{ label: 'Entendido', run() {} }] });
  }
}

/* ---------- Voz ---------- */
const input = $('#composer-input');
const micBtn = $('#btn-mic');

function growInput() {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 128)}px`;
}

const voice = createVoice({
  getSettings: () => store.state.settings,
  onListenChange(on) {
    micBtn.setAttribute('aria-pressed', String(on));
    micBtn.innerHTML = icon(on ? 'stop' : 'mic');
    micBtn.setAttribute('aria-label', on ? 'Detener la escucha' : 'Hablar con JARVIS');
    micBtn.title = on ? 'Detener la escucha' : 'Hablar con JARVIS';
    if (on) setState('listening');
    else if (document.body.dataset.state === 'listening') setState('idle');
  },
  onInterim(text) {
    input.value = text;
    growInput();
  },
  onFinal(text) {
    input.value = '';
    growInput();
    send(text, true);
  },
  onError(message, code) {
    if (code === 'no-speech') {
      toast(message);
      return;
    }
    addMessage({ role: 'alert', error: true, text: message });
    scrollChatToEnd();
    setState('error');
  },
  onSpeakChange(on) {
    const current = document.body.dataset.state;
    if (on && current !== 'listening' && current !== 'executing') setState('speaking');
    else if (!on && current === 'speaking') setState('idle');
  },
  onBoundary() {
    reactor.pulse();
  },
});

micBtn.innerHTML = icon(voice.caps.recognition ? 'mic' : 'micoff');
if (!voice.caps.recognition) {
  micBtn.dataset.unsupported = 'true';
  micBtn.setAttribute('aria-label', 'El micrófono no está disponible en este navegador. Pulsa para ver por qué');
  micBtn.title = 'El micrófono no está disponible en este navegador';
}
micBtn.addEventListener('click', () => {
  if (voice.listening) voice.stopListening();
  else voice.startListening();
});

/* ---------- Interfaz ---------- */
const handlers = {
  greetingWord,
  send: (text) => send(text),
  async authorize(id) {
    setState('executing');
    try {
      const result = await authorizer.authorize(id);
      addMessage({ role: 'jarvis', text: result, source: 'local' });
      scrollChatToEnd();
      setState('idle');
      say(result, false);
    } catch (err) {
      addMessage({ role: 'alert', error: true, text: `No se pudo ejecutar: ${err.message}` });
      scrollChatToEnd();
      setState('idle');
      toast(err.message, { kind: 'error' });
    }
  },
  reject(id) {
    authorizer.reject(id);
    toast('Acción rechazada. No se ejecutó nada.');
  },
  toggleTask(id) {
    store.update((s) => {
      const t = s.tasks.find((x) => x.id === id);
      if (!t) return;
      t.done = !t.done;
      t.doneAt = t.done ? Date.now() : null;
    });
  },
  /** El clic directo de José es su autorización; se ofrece deshacer. */
  removeItem(collection, id) {
    const index = store.state[collection].findIndex((x) => x.id === id);
    if (index < 0) return;
    const item = store.state[collection][index];
    store.update((s) => { s[collection].splice(index, 1); });
    toast('Eliminado.', {
      actions: [{
        label: 'Deshacer',
        run: () => store.update((s) => { s[collection].splice(Math.min(index, s[collection].length), 0, item); }),
      }],
    });
  },
  snooze(id) {
    store.update((s) => {
      const r = s.reminders.find((x) => x.id === id);
      if (!r) return;
      r.status = 'pending';
      r.at = Date.now() + 10 * 60000;
    });
    toast('Pospuesto 10 minutos.');
  },
  reminderDone(id) {
    store.update((s) => {
      const r = s.reminders.find((x) => x.id === id);
      if (r) r.status = 'done';
    });
  },
  reminderToCalendar(id) {
    const r = store.state.reminders.find((x) => x.id === id);
    if (!r) return;
    authorizer.propose('calendar_event', { title: r.text, start: r.at }, 'local');
    ui.setView('auth');
    toast('Revisa y autoriza el evento en Autorizaciones.');
  },
};

const ui = createUI({ store, authorizer, handlers });
store.subscribe(() => ui.renderAll());

$('#composer').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value;
  input.value = '';
  growInput();
  send(text);
});
input.addEventListener('input', growInput);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    $('#composer').requestSubmit();
  }
});
$('#btn-send').innerHTML = icon('send');

$('#task-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const field = $('#task-input');
  const title = field.value.trim();
  if (!title) {
    field.focus();
    return;
  }
  const urgent = $('#task-urgent').checked;
  store.update((s) => {
    s.tasks.push({ id: uid(), title, done: false, priority: urgent ? 'alta' : 'normal', due: null, project: '', createdAt: Date.now(), doneAt: null });
  });
  field.value = '';
  $('#task-urgent').checked = false;
  field.focus();
});

$('#reminder-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const textField = $('#reminder-input');
  const whenField = $('#reminder-when');
  const text = textField.value.trim();
  if (!text) {
    toast('Escribe qué quieres recordar.', { kind: 'error' });
    textField.focus();
    return;
  }
  let at = whenField.value ? new Date(whenField.value).getTime() : null;
  let body = text;
  if (!at) {
    const parsed = parseWhen(text);
    if (parsed.date) {
      at = parsed.date.getTime();
      body = parsed.rest || text;
    }
  }
  if (!at) {
    toast('Elige la fecha y la hora del recordatorio.', { kind: 'error' });
    whenField.focus();
    return;
  }
  store.update((s) => {
    s.reminders.push({ id: uid(), text: body, at, status: 'pending', createdAt: Date.now() });
  });
  textField.value = '';
  whenField.value = '';
  toast(tidyText(`Recordatorio creado para ${formatWhen(at)}.`));
});

$('#memory-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const field = $('#memory-input');
  const text = field.value.trim();
  if (!text) {
    field.focus();
    return;
  }
  store.update((s) => {
    if (ui.view.memoryTab === 'notes') s.notes.push({ id: uid(), text, kind: 'nota', createdAt: Date.now() });
    else s.prefs.push({ id: uid(), text, createdAt: Date.now() });
  });
  field.value = '';
});

/* ---------- Saludo y reloj ---------- */
function tick() {
  const now = new Date();
  $('#greeting-text').textContent = `${greetingWord(now)}, ${store.state.settings.ownerName}`;
  $('#date-text').textContent = now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  $('#clock').textContent = now.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true });
  ui.renderInsight();
}

/* ---------- Conexión ---------- */
const CONN_TEXT = {
  local: 'Modo local, sin IA',
  checking: 'Comprobando la IA',
  connected: 'IA conectada',
  failed: 'IA sin respuesta',
  offline: 'Sin internet',
};
function renderConnection({ status, detail }) {
  const chip = $('#conn-chip');
  chip.dataset.status = status;
  $('#conn-text').textContent = CONN_TEXT[status];
  chip.title = detail || 'Ver la conexión de IA';
  chip.setAttribute('aria-label', `${CONN_TEXT[status]}. Abrir la configuración de IA`);
}
brain.onConnection(renderConnection);
window.addEventListener('online', () => brain.refreshConnection());
window.addEventListener('offline', () => brain.refreshConnection());

/* ---------- Encabezado y diálogos ---------- */
const muteBtn = $('#btn-mute');
let lastSpeechMode = 'always';
function renderMute() {
  const muted = store.state.settings.speechMode === 'never';
  muteBtn.innerHTML = icon(muted ? 'mute' : 'sound');
  muteBtn.setAttribute('aria-pressed', String(muted));
  const label = muted ? 'Activar la voz de JARVIS' : 'Silenciar la voz de JARVIS';
  muteBtn.setAttribute('aria-label', label);
  muteBtn.title = label;
}
muteBtn.addEventListener('click', () => {
  const current = store.state.settings.speechMode;
  if (current !== 'never') lastSpeechMode = current;
  store.update((s) => { s.settings.speechMode = current === 'never' ? lastSpeechMode : 'never'; });
  voice.stopSpeaking();
  renderMute();
  syncSettingsForm();
});

const dlgSettings = $('#dlg-settings');
const dlgHelp = $('#dlg-help');
$('#btn-settings').innerHTML = icon('gear');
$('#btn-help').innerHTML = icon('help');
document.querySelectorAll('[data-close]').forEach((b) => {
  b.innerHTML = icon('close');
  b.addEventListener('click', () => b.closest('dialog').close());
});
function backdropClose(dlg) {
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });
}
backdropClose(dlgSettings);
backdropClose(dlgHelp);

function openSettings(focusAI = false) {
  syncSettingsForm();
  renderDiagnostics();
  renderInstall();
  renderNotifyState();
  dlgSettings.showModal();
  if (focusAI) $('#ai-section').scrollIntoView();
}
$('#btn-settings').addEventListener('click', () => openSettings());
$('#conn-chip').addEventListener('click', () => openSettings(true));
$('#btn-help').addEventListener('click', () => dlgHelp.showModal());

$('#help-groups').append(...COMMAND_GROUPS.map((g) => h('div', { class: 'help-group' },
  h('h3', {}, g.name),
  h('div', { class: 'chips' }, g.items.map((c) => h('button', {
    type: 'button',
    class: 'chip',
    onclick: () => {
      dlgHelp.close();
      ui.setView('chat');
      send(c);
    },
  }, c))))));

/* ---------- Configuración ---------- */
function syncSettingsForm() {
  const s = store.state.settings;
  $('#set-owner').value = s.ownerName;
  $('#set-country').value = s.countryCode;
  $('#set-speech').value = s.speechMode;
  $('#set-lang').value = s.lang;
  $('#set-rate').value = s.rate;
  $('#set-pitch').value = s.pitch;
  $('#set-ai-enabled').checked = s.ai.enabled;
  $('#set-ai-url').value = s.ai.url;
  $('#set-ai-token').value = s.ai.token;
  $('#set-ai-share').checked = s.ai.shareMemory;
  renderVoiceOptions();
}

function renderVoiceOptions() {
  const select = $('#set-voice');
  const note = $('#voice-note');
  const voices = voice.spanishVoices();
  const { lang, voiceURI } = store.state.settings;
  select.replaceChildren();
  if (!voices.length) {
    select.append(h('option', { value: '' }, voice.caps.synthesis ? 'Sin voces en español en este dispositivo' : 'Voz no disponible en este navegador'));
    select.disabled = true;
    note.textContent = voice.caps.synthesis ? voiceTips() : '';
    return;
  }
  const isNatural = (v) => rankVoice(v, lang) >= NATURAL_SCORE;
  select.disabled = false;
  select.append(h('option', { value: '' }, `Automática: ${voices[0].name}`));
  voices.forEach((v) => select.append(h('option', { value: v.voiceURI }, `${isNatural(v) ? 'Natural: ' : ''}${v.name} (${v.lang})`)));
  select.value = voices.some((v) => v.voiceURI === voiceURI) ? voiceURI : '';
  note.textContent = voices.some(isNatural)
    ? 'Las voces marcadas como Natural suelen sonar mejor. Elige una para escucharla.'
    : `Este dispositivo no parece tener voces naturales. ${voiceTips()}`;
}
voice.onVoicesChanged = renderVoiceOptions;

const bindSetting = (selector, event, apply) => $(selector).addEventListener(event, (e) => {
  store.update((s) => apply(s.settings, e.target));
  renderMute();
  tick();
});
bindSetting('#set-owner', 'change', (s, el) => { s.ownerName = el.value.trim().slice(0, 40) || 'José'; el.value = s.ownerName; });
bindSetting('#set-country', 'change', (s, el) => { if (/^\d{1,4}$/.test(el.value.trim())) s.countryCode = el.value.trim(); else el.value = s.countryCode; });
bindSetting('#set-speech', 'change', (s, el) => { s.speechMode = el.value; });
bindSetting('#set-lang', 'change', (s, el) => { s.lang = el.value; });
bindSetting('#set-voice', 'change', (s, el) => { s.voiceURI = el.value; });
$('#set-voice').addEventListener('change', () => voice.speak(voiceSample()));
bindSetting('#set-rate', 'change', (s, el) => { s.rate = parseFloat(el.value); });
bindSetting('#set-pitch', 'change', (s, el) => { s.pitch = parseFloat(el.value); });

$('#btn-test-voice').addEventListener('click', () => {
  if (!voice.caps.synthesis) {
    toast('Este navegador no tiene síntesis de voz.', { kind: 'error' });
    return;
  }
  if (!voice.spanishVoices().length) toast('No hay voces en español instaladas; se usará la predeterminada.');
  voice.speak(voiceSample());
});

function aiResult(message, kind = 'ok') {
  const el = $('#ai-result');
  el.textContent = message;
  el.dataset.kind = kind;
}

function readAiForm() {
  return {
    enabled: $('#set-ai-enabled').checked,
    url: $('#set-ai-url').value.trim(),
    token: $('#set-ai-token').value.trim(),
    shareMemory: $('#set-ai-share').checked,
  };
}

async function saveAndTestAi() {
  const form = readAiForm();
  if (form.url || form.token || form.enabled) {
    try {
      const clean = validateConfig(form);
      form.url = clean.url;
      form.token = clean.token;
    } catch (err) {
      aiResult(err instanceof RemoteError ? err.message : 'Revisa los datos de conexión.', 'error');
      if (err.code === 'api-key') {
        $('#set-ai-token').value = '';
      }
      store.update((s) => { s.settings.ai.enabled = false; });
      $('#set-ai-enabled').checked = false;
      brain.refreshConnection();
      return;
    }
  }
  store.update((s) => { s.settings.ai = form; });
  if (!form.enabled) {
    aiResult('Guardado. JARVIS sigue en modo local.');
    brain.refreshConnection();
    return;
  }
  aiResult('Comprobando la conexión…');
  const { status, detail } = await brain.refreshConnection();
  if (status === 'connected') aiResult(`Conexión correcta${detail ? ` con el modelo ${detail}` : ''}.`);
  else if (status === 'offline') aiResult('Sin internet. Vuelve a probar cuando tengas conexión.', 'error');
  else aiResult(detail || 'No se pudo conectar.', 'error');
}
$('#btn-test-ai').addEventListener('click', saveAndTestAi);
$('#set-ai-share').addEventListener('change', () => {
  store.update((s) => { s.settings.ai.shareMemory = $('#set-ai-share').checked; });
});
$('#set-ai-enabled').addEventListener('change', saveAndTestAi);

/* Datos */
$('#btn-export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(store.exportData(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: `jarvis-copia-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast('Copia exportada. No incluye el código de acceso a tu backend.');
});
$('#btn-import').addEventListener('click', () => $('#file-import').click());
$('#file-import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('El archivo es demasiado grande.');
    const data = JSON.parse(await file.text());
    const ok = await confirmDialog({
      title: 'Importar copia',
      text: 'Reemplazará las tareas, recordatorios, notas y preferencias de este dispositivo.',
      action: 'Importar y reemplazar',
    });
    if (!ok) return;
    const c = store.importData(data);
    toast(`Importado: ${c.tasks} tareas, ${c.reminders} recordatorios, ${c.notes} notas y ${c.prefs} preferencias.`);
    syncSettingsForm();
    renderMute();
    tick();
  } catch (err) {
    toast(err instanceof SyntaxError ? 'El archivo no es un JSON válido.' : err.message, { kind: 'error' });
  }
});
$('#btn-clear-chat').addEventListener('click', async () => {
  const ok = await confirmDialog({ title: 'Borrar la conversación', text: 'Se borra el historial del chat. Tus tareas, recordatorios y notas no cambian.', action: 'Borrar conversación' });
  if (ok) store.update((s) => { s.messages = []; });
});
$('#btn-reset').addEventListener('click', async () => {
  const ok = await confirmDialog({ title: 'Borrar todos los datos', text: 'Se eliminará toda la información de JARVIS en este dispositivo. No se puede deshacer si no tienes una copia exportada.', action: 'Borrar todo' });
  if (!ok) return;
  store.reset();
  syncSettingsForm();
  renderMute();
  tick();
  brain.refreshConnection();
  toast('Datos eliminados.');
});

/* Instalación */
let installEvent = null;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvent = e;
  renderInstall();
});
window.addEventListener('appinstalled', () => {
  installEvent = null;
  renderInstall();
  toast('JARVIS quedó instalada.');
});
function installHelp() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'En iPhone o iPad: pulsa Compartir y luego Agregar a inicio.';
  if (/Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Edg/.test(ua)) return 'En Safari para Mac: abre Archivo y elige Agregar al Dock.';
  if (/Firefox/.test(ua)) return 'Firefox no instala esta app en escritorio. En Android, usa el menú y elige Instalar.';
  return 'Abre el menú del navegador y elige Instalar app o Agregar a la pantalla principal. La opción aparece cuando la app se abre desde https.';
}
function renderInstall() {
  const btn = $('#btn-install');
  const note = $('#install-note');
  if (isStandalone()) {
    btn.hidden = true;
    note.textContent = 'JARVIS ya está instalada en este dispositivo.';
  } else if (installEvent) {
    btn.hidden = false;
    note.textContent = '';
  } else {
    btn.hidden = true;
    note.textContent = installHelp();
  }
}
$('#btn-install').addEventListener('click', async () => {
  if (!installEvent) return;
  installEvent.prompt();
  await installEvent.userChoice;
  installEvent = null;
  renderInstall();
});

/* Notificaciones */
function renderNotifyState() {
  const btn = $('#btn-notify');
  const note = $('#notify-note');
  if (!('Notification' in window)) {
    btn.hidden = true;
    note.textContent = 'Este navegador no ofrece notificaciones. Los avisos aparecerán dentro de la app.';
    return;
  }
  const map = {
    granted: 'Notificaciones activas. Se muestran cuando la app está abierta, aunque esté en segundo plano; con la app cerrada no se pueden lanzar.',
    denied: 'Las notificaciones están bloqueadas. Puedes permitirlas en los ajustes del sitio.',
    default: 'Muestra los recordatorios como notificaciones del sistema mientras la app está abierta.',
  };
  btn.hidden = Notification.permission !== 'default';
  note.textContent = map[Notification.permission];
}
$('#btn-notify').addEventListener('click', async () => {
  await Notification.requestPermission();
  renderNotifyState();
  if (Notification.permission === 'granted') showSystemNotification('JARVIS', 'Notificaciones activadas.');
});

/* Diagnóstico */
async function renderDiagnostics() {
  const caps = voice.caps;
  const voices = voice.spanishVoices();
  const swActive = Boolean(navigator.serviceWorker?.controller);
  let persisted = false;
  try { persisted = await navigator.storage?.persisted?.(); } catch { /* no disponible */ }
  const rows = [
    ['Página segura (https)', caps.secure],
    ['Reconocimiento de voz', caps.recognition],
    ['Respuestas por voz', caps.synthesis],
    [`Voces en español: ${voices.length}`, voices.length > 0],
    ['Memoria del dispositivo', store.persistent],
    ['Protección contra limpieza automática', Boolean(persisted)],
    ['Funcionamiento sin conexión', swActive],
    ['Notificaciones', 'Notification' in window && Notification.permission === 'granted'],
  ];
  $('#diag').replaceChildren(...rows.map(([label, ok]) => h('li', {},
    h('span', {}, label),
    h('span', { class: ok ? 'ok' : 'no' }, ok ? 'Disponible' : 'No disponible'))));
}

/* ---------- Recordatorios ---------- */
const watcher = createReminderWatcher({
  store,
  onFire(r, wasLate) {
    const text = wasLate ? `Recordatorio vencido: ${r.text} (${formatWhen(r.at)}).` : `Recordatorio: ${r.text}.`;
    addMessage({ role: 'alert', text });
    scrollChatToEnd();
    toast(tidyText(text), {
      kind: 'alert',
      timeout: wasLate ? 8000 : 0,
      actions: [
        { label: 'Hecho', run: () => handlers.reminderDone(r.id) },
        { label: 'Posponer 10 min', run: () => handlers.snooze(r.id) },
      ],
    });
    if (!wasLate) {
      showSystemNotification('JARVIS', r.text);
      if (!voice.listening && store.state.settings.speechMode !== 'never') voice.speak(text);
    }
  },
});

/* ---------- Service worker ---------- */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('service-worker.js');
      const offerUpdate = (worker) => {
        toast('Hay una versión nueva de JARVIS.', {
          timeout: 0,
          actions: [{ label: 'Actualizar', run: () => worker.postMessage('skip-waiting') }],
        });
      };
      if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(worker);
        });
      });
      let reloaded = false;
      const hadController = Boolean(navigator.serviceWorker.controller);
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (hadController && !reloaded) {
          reloaded = true;
          location.reload();
        }
      });
      navigator.storage?.persist?.().catch(() => {});
    } catch (err) {
      console.warn('Sin funcionamiento fuera de línea:', err);
    }
  });
}

/* ---------- Inicio ---------- */
document.addEventListener('visibilitychange', () => reactor.pause(document.hidden));
ui.renderAll();
renderMute();
tick();
setInterval(tick, 15000);
setState('idle');
watcher.start();
brain.refreshConnection();
registerServiceWorker();
scrollChatToEnd();
if (!store.persistent) {
  toast('Este navegador no permite guardar datos. Lo que hagas se perderá al cerrar la app.', { kind: 'error', timeout: 0, actions: [{ label: 'Entendido', run() {} }] });
}
if (store.lastError) {
  toast(store.lastError, { kind: 'error', timeout: 0, actions: [{ label: 'Entendido', run() {} }] });
}
