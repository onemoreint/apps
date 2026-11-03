// Memoria del dispositivo. Todo se guarda en este navegador; nada sale de aquí por este módulo.

const KEY = 'jarvis.v1';
const MAX_MESSAGES = 200;
const MAX_AUDIT = 60;

const defaults = () => ({
  version: 1,
  settings: {
    ownerName: 'José',
    speechMode: 'always', // always | voice | never
    lang: 'es-CO',
    voiceURI: '',
    rate: 1,
    pitch: 1,
    countryCode: '57',
    ai: { enabled: false, url: '', token: '', shareMemory: false },
  },
  tasks: [],
  reminders: [],
  notes: [],
  prefs: [],
  proposals: [],
  audit: [],
  messages: [],
});

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const str = (v, max = 4000) => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v) => (Number.isFinite(v) ? v : null);

function cleanTask(t) {
  const title = str(t?.title, 300).trim();
  if (!title) return null;
  return {
    id: str(t.id, 40) || uid(),
    title,
    done: Boolean(t.done),
    priority: t.priority === 'alta' ? 'alta' : 'normal',
    due: num(t.due),
    project: str(t.project, 120),
    createdAt: num(t.createdAt) || Date.now(),
    doneAt: num(t.doneAt),
  };
}

function cleanReminder(r) {
  const text = str(r?.text, 300).trim();
  const at = num(r?.at);
  if (!text || at === null) return null;
  return {
    id: str(r.id, 40) || uid(),
    text,
    at,
    status: ['pending', 'fired', 'done'].includes(r.status) ? r.status : 'pending',
    createdAt: num(r.createdAt) || Date.now(),
  };
}

function cleanNote(n) {
  const text = str(n?.text).trim();
  if (!text) return null;
  return {
    id: str(n.id, 40) || uid(),
    text,
    kind: n.kind === 'idea' ? 'idea' : 'nota',
    createdAt: num(n.createdAt) || Date.now(),
  };
}

function cleanPref(p) {
  const text = str(p?.text, 600).trim();
  if (!text) return null;
  return { id: str(p.id, 40) || uid(), text, createdAt: num(p.createdAt) || Date.now() };
}

function cleanSettings(s, base) {
  const out = structuredCloneSafe(base);
  if (!s || typeof s !== 'object') return out;
  if (typeof s.ownerName === 'string' && s.ownerName.trim()) out.ownerName = s.ownerName.trim().slice(0, 40);
  if (['always', 'voice', 'never'].includes(s.speechMode)) out.speechMode = s.speechMode;
  if (/^es(-[A-Z0-9]{2,3})?$/.test(s.lang || '')) out.lang = s.lang;
  if (typeof s.voiceURI === 'string') out.voiceURI = s.voiceURI.slice(0, 200);
  if (Number.isFinite(s.rate)) out.rate = Math.min(1.6, Math.max(0.6, s.rate));
  // 0.95 era el tono predeterminado anterior, que hacía la voz menos natural.
  if (Number.isFinite(s.pitch) && s.pitch !== 0.95) out.pitch = Math.min(1.6, Math.max(0.5, s.pitch));
  if (/^\d{1,4}$/.test(s.countryCode || '')) out.countryCode = s.countryCode;
  return out;
}

function structuredCloneSafe(v) {
  return JSON.parse(JSON.stringify(v));
}

const listOf = (arr, fn, max = 2000) => (Array.isArray(arr) ? arr.map(fn).filter(Boolean).slice(0, max) : []);

function createBackend() {
  try {
    const ls = globalThis.localStorage;
    if (!ls) throw new Error('sin localStorage');
    const probe = `${KEY}.probe`;
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return {
      persistent: true,
      read: () => ls.getItem(KEY),
      write: (v) => ls.setItem(KEY, v),
      clear: () => ls.removeItem(KEY),
    };
  } catch {
    let mem = null;
    return {
      persistent: false,
      read: () => mem,
      write: (v) => { mem = v; },
      clear: () => { mem = null; },
    };
  }
}

export function createStore() {
  const backend = createBackend();
  const listeners = new Set();
  let lastError = null;
  let state = load();

  function load() {
    const base = defaults();
    let raw = null;
    try {
      raw = backend.read();
    } catch {
      return base;
    }
    if (!raw) return base;
    try {
      const data = JSON.parse(raw);
      return {
        ...base,
        settings: {
          ...cleanSettings(data.settings, base.settings),
          ai: {
            enabled: Boolean(data.settings?.ai?.enabled),
            url: str(data.settings?.ai?.url, 300),
            token: str(data.settings?.ai?.token, 300),
            shareMemory: Boolean(data.settings?.ai?.shareMemory),
          },
        },
        tasks: listOf(data.tasks, cleanTask),
        reminders: listOf(data.reminders, cleanReminder),
        notes: listOf(data.notes, cleanNote),
        prefs: listOf(data.prefs, cleanPref),
        proposals: Array.isArray(data.proposals) ? data.proposals.slice(-100) : [],
        audit: Array.isArray(data.audit) ? data.audit.slice(-MAX_AUDIT) : [],
        messages: Array.isArray(data.messages) ? data.messages.slice(-MAX_MESSAGES) : [],
      };
    } catch {
      lastError = 'Los datos guardados estaban dañados. JARVIS empezó con una memoria vacía.';
      return base;
    }
  }

  function save() {
    try {
      backend.write(JSON.stringify(state));
      lastError = null;
    } catch {
      lastError = 'El navegador no permitió guardar. Los cambios se perderán al cerrar la app.';
    }
  }

  function emit() {
    listeners.forEach((fn) => fn(state));
  }

  return {
    get state() { return state; },
    get persistent() { return backend.persistent; },
    get lastError() { return lastError; },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    /** Aplica un cambio, lo guarda y avisa a la interfaz. */
    update(mutator) {
      mutator(state);
      if (state.messages.length > MAX_MESSAGES) state.messages = state.messages.slice(-MAX_MESSAGES);
      if (state.audit.length > MAX_AUDIT) state.audit = state.audit.slice(-MAX_AUDIT);
      save();
      emit();
    },
    /** Copia de seguridad sin el código de acceso a la IA ni las autorizaciones pendientes. */
    exportData() {
      const copy = structuredCloneSafe(state);
      copy.settings.ai = { ...copy.settings.ai, token: '' };
      copy.proposals = [];
      copy.exportedAt = new Date().toISOString();
      return copy;
    },
    /** Restaura una copia validando cada registro. Las autorizaciones nunca se importan. */
    importData(data) {
      if (!data || typeof data !== 'object' || data.version !== 1) {
        throw new Error('El archivo no es una copia de seguridad de JARVIS.');
      }
      const base = defaults();
      const counts = {
        tasks: listOf(data.tasks, cleanTask),
        reminders: listOf(data.reminders, cleanReminder),
        notes: listOf(data.notes, cleanNote),
        prefs: listOf(data.prefs, cleanPref),
      };
      this.update((s) => {
        s.settings = { ...cleanSettings(data.settings, base.settings), ai: s.settings.ai };
        Object.assign(s, counts);
        s.proposals = [];
      });
      return {
        tasks: counts.tasks.length,
        reminders: counts.reminders.length,
        notes: counts.notes.length,
        prefs: counts.prefs.length,
      };
    },
    reset() {
      try { backend.clear(); } catch { /* el estado en memoria se reinicia igual */ }
      state = defaults();
      save();
      emit();
    },
  };
}

export const store = createStore();
