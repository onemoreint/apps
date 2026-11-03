// Enruta cada mensaje: los comandos reconocidos se resuelven en local (gratis y sin conexión).
// Solo lo que el motor local no entiende va a la IA, si José conectó un backend.

import { respondLocal } from './engine-local.js';
import { askRemote, checkHealth, RemoteError } from './engine-remote.js';

export function createBrain({ store, authorizer }) {
  const conversation = { pending: null };
  let connection = { status: 'local', detail: '' }; // local | checking | connected | failed | offline
  const listeners = new Set();

  const setConnection = (status, detail = '') => {
    connection = { status, detail };
    listeners.forEach((fn) => fn(connection));
  };

  const aiConfig = () => store.state.settings.ai;

  function buildContext() {
    const s = store.state;
    const base = { ownerName: s.settings.ownerName, now: new Date().toString() };
    if (!s.settings.ai.shareMemory) return base;
    return {
      ...base,
      tasks: s.tasks.filter((t) => !t.done).slice(0, 30).map((t) => t.title),
      notes: s.notes.slice(-20).map((n) => n.text),
      preferences: s.prefs.slice(-20).map((p) => p.text),
    };
  }

  function buildHistory(text) {
    const history = store.state.messages
      .filter((m) => m.role === 'user' || m.role === 'jarvis')
      .slice(-12)
      .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text.slice(0, 3000) }));
    // La API espera que el último mensaje sea del usuario y que empiece por uno.
    while (history.length && history[0].role !== 'user') history.shift();
    const last = history[history.length - 1];
    if (!last || last.role !== 'user' || last.content !== text.slice(0, 3000)) {
      history.push({ role: 'user', content: text.slice(0, 3000) });
    }
    return history;
  }

  /** Convierte lo que devuelve un motor en propuestas registradas; descarta lo que no esté permitido. */
  function registerProposals(list, source) {
    const ids = [];
    const rejected = [];
    list.forEach((p) => {
      try {
        ids.push(authorizer.propose(p.type, p.params, source).id);
      } catch (err) {
        rejected.push(err.message);
      }
    });
    return { ids, rejected };
  }

  return {
    get connection() { return connection; },
    onConnection(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    async refreshConnection() {
      const ai = aiConfig();
      if (!ai.enabled) {
        setConnection(navigator.onLine === false ? 'offline' : 'local');
        return connection;
      }
      if (navigator.onLine === false) {
        setConnection('offline');
        return connection;
      }
      setConnection('checking');
      try {
        const { model } = await checkHealth(ai);
        setConnection('connected', model);
      } catch (err) {
        setConnection('failed', err.message);
      }
      return connection;
    },

    /**
     * @returns {Promise<{text: string, source: 'local'|'ia', proposalIds: string[], failure: string|null}>}
     */
    async respond(text) {
      const local = respondLocal(text, { store, conversation });

      if (local.understood) {
        const { ids } = registerProposals(local.proposals, 'local');
        return { text: local.text, source: 'local', proposalIds: ids, failure: null };
      }

      const ai = aiConfig();
      if (!ai.enabled) return { text: local.text, source: 'local', proposalIds: [], failure: null };

      if (navigator.onLine === false) {
        setConnection('offline');
        return {
          text: `Sin internet no puedo consultar la IA. ${local.text}`,
          source: 'local',
          proposalIds: [],
          failure: 'Sin conexión a internet.',
        };
      }

      try {
        const remote = await askRemote(ai, { messages: buildHistory(text), context: buildContext() });
        setConnection('connected', connection.detail);
        const { ids, rejected } = registerProposals(remote.proposals, 'ia');
        const note = rejected.length ? '\n\nDescarté una propuesta de la IA porque no está permitida o tenía datos no válidos.' : '';
        return { text: `${remote.text}${note}`, source: 'ia', proposalIds: ids, failure: null };
      } catch (err) {
        const message = err instanceof RemoteError ? err.message : 'Error inesperado al consultar la IA.';
        setConnection('failed', message);
        return {
          text: `La IA no respondió: ${message} Sigo disponible en modo local para tareas, recordatorios y notas.`,
          source: 'local',
          proposalIds: [],
          failure: message,
        };
      }
    },
  };
}
