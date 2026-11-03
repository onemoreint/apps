// Dibuja la interfaz a partir del estado. Todo el texto de usuario entra con textContent, nunca como HTML.

import { formatWhen } from './dateparse.js';

const ICONS = {
  mic: '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M8.5 21h7"/>',
  stop: '<rect x="7" y="7" width="10" height="10" fill="currentColor" stroke="none"/>',
  micoff: '<path d="M3 3l18 18M9 9v3a3 3 0 0 0 4.5 2.6M15 11V6a3 3 0 0 0-5.6-1.5"/><path d="M5.5 11.5a6.5 6.5 0 0 0 10 5.5M18.5 11.5a6.4 6.4 0 0 1-.5 2.5M12 18v3M8.5 21h7"/>',
  send: '<path d="M4 12l16-8-5 16-3-7-8-1z"/>',
  sound: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  mute: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8v.5"/><circle cx="12" cy="17" r=".7" fill="currentColor"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10.5 11v5M13.5 11v5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  snooze: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2M5 4L2.5 6.5M19 4l2.5 2.5"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="15"/><path d="M4 10.5h16M8.5 3v5M15.5 3v5"/>',
  chat: '<path d="M4 5h16v11H9l-5 4V5z"/>',
  tasks: '<path d="M4 6.5l2 2 3.5-4M4 16l2 2 3.5-4M12.5 7H20M12.5 16.5H20"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16zM10 21h4"/>',
  memory: '<rect x="6" y="6" width="12" height="12"/><path d="M9.5 3v3M14.5 3v3M9.5 18v3M14.5 18v3M3 9.5h3M3 14.5h3M18 9.5h3M18 14.5h3"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.2 7.7-8 9-4.8-1.3-8-4.5-8-9V6l8-3z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
};

export function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

/** Crea un elemento. Los textos siempre se insertan como texto plano. */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (v === undefined || v === null || v === false) return;
    if (k === 'class') el.className = v;
    else if (k === 'icon') el.innerHTML = icon(v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k in el && k !== 'list') el[k] = v;
    else el.setAttribute(k, v);
  });
  children.flat().forEach((c) => {
    if (c === null || c === undefined || c === false) return;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  });
  return el;
}

const $ = (sel) => document.querySelector(sel);

export function toast(message, { kind = 'info', actions = [], timeout = 5000 } = {}) {
  const box = $('#toasts');
  // No repite un aviso que ya está en pantalla.
  if ([...box.children].some((t) => t.querySelector('p')?.textContent === message)) return () => {};
  const close = () => el.remove();
  const el = h('div', { class: 'toast', 'data-kind': kind },
    h('p', {}, message),
    actions.map((a) => h('button', {
      type: 'button',
      onclick: () => { close(); a.run(); },
    }, a.label)));
  box.append(el);
  while (box.children.length > 3) box.firstElementChild.remove();
  if (timeout) setTimeout(close, timeout);
  return close;
}

export function confirmDialog({ title, text, action }) {
  const dlg = $('#dlg-confirm');
  $('#confirm-title').textContent = title;
  $('#confirm-text').textContent = text;
  $('#confirm-yes').textContent = action;
  return new Promise((resolve) => {
    const done = (value) => {
      dlg.close();
      $('#confirm-yes').onclick = null;
      $('#confirm-no').onclick = null;
      resolve(value);
    };
    $('#confirm-yes').onclick = () => done(true);
    $('#confirm-no').onclick = () => done(false);
    dlg.oncancel = () => resolve(false);
    dlg.showModal();
  });
}

const STATUS_TEXT = { running: 'Ejecutando…', rejected: 'Rechazada. No se ejecutó nada.' };
const EVENT_TEXT = { propuesta: 'Propuesta', ejecutada: 'Ejecutada', 'falló': 'Falló', rechazada: 'Rechazada' };

export function createUI({ store, authorizer, handlers }) {
  const view = { taskFilter: 'pending', memoryTab: 'notes', memoryQuery: '', authTab: 'pending' };

  function proposalCard(p) {
    const d = authorizer.describe(p);
    if (!d) return null;
    const pending = p.status === 'pending';
    return h('article', { class: 'proposal', 'data-status': p.status, 'data-proposal': p.id },
      h('h4', {}, d.title),
      h('p', { class: 'proposal-explain' }, d.explain),
      h('dl', {}, d.details.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])),
      h('p', { class: 'proposal-origin' }, `Propuesta por ${p.source === 'ia' ? 'la IA' : 'el modo local'}`),
      pending && h('div', { class: 'proposal-btns' },
        h('button', { type: 'button', class: 'btn-auth', onclick: () => handlers.authorize(p.id) }, 'Autorizar'),
        h('button', { type: 'button', class: 'btn-reject', onclick: () => handlers.reject(p.id) }, 'Rechazar')),
      !pending && h('p', { class: 'proposal-status' }, p.result || STATUS_TEXT[p.status] || ''));
  }

  function renderChat() {
    const log = $('#chat-log');
    const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
    const s = store.state;
    log.replaceChildren();
    if (!s.messages.length) {
      log.append(h('div', { class: 'msg msg-jarvis' },
        `${handlers.greetingWord()}, ${s.settings.ownerName}. Soy JARVIS. Funciono en modo local: tareas, recordatorios, memoria y acciones con tu autorización, sin un modelo de IA conectado. Prueba uno de estos comandos:`,
        h('div', { class: 'chips' }, ['Agrega tarea preparar la presentación', 'Recuérdame llamar a Pedro mañana a las 3', 'Qué me recomiendas hacer ahora']
          .map((c) => h('button', { type: 'button', class: 'chip', onclick: () => handlers.send(c) }, c)))));
    }
    s.messages.forEach((m) => {
      if (m.role === 'user') {
        log.append(h('div', { class: 'msg msg-user' }, m.text));
        return;
      }
      const cards = (m.proposalIds || [])
        .map((id) => s.proposals.find((p) => p.id === id))
        .filter(Boolean)
        .map(proposalCard);
      const cls = m.role === 'alert' ? `msg msg-alert${m.error ? ' msg-error' : ''}` : 'msg msg-jarvis';
      log.append(h('div', { class: cls },
        m.text,
        m.role === 'jarvis' && h('span', { class: 'msg-source' }, m.source === 'ia' ? 'Respuesta de la IA' : 'Modo local, sin IA'),
        cards));
    });
    if (atBottom || log.dataset.force) log.scrollTop = log.scrollHeight;
    delete log.dataset.force;
  }

  function renderTasks() {
    const s = store.state;
    const pending = s.tasks.filter((t) => !t.done);
    $('#count-tasks').textContent = pending.length || '';
    const showDone = view.taskFilter === 'done';
    const rank = (t) => (t.priority === 'alta' ? 0 : 1);
    const list = (showDone
      ? s.tasks.filter((t) => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0))
      : pending.sort((a, b) => rank(a) - rank(b) || (a.due ?? Infinity) - (b.due ?? Infinity) || a.createdAt - b.createdAt));
    const ul = $('#task-list');
    ul.replaceChildren();
    if (!list.length) {
      ul.append(h('li', { class: 'empty' }, showDone ? 'Aún no has completado tareas.' : 'Sin tareas pendientes. Escribe una arriba o di: agrega tarea…'));
      return;
    }
    const now = Date.now();
    list.forEach((t) => {
      ul.append(h('li', { class: `item${t.done ? ' done' : ''}` },
        h('input', {
          type: 'checkbox', checked: t.done, 'aria-label': `Marcar como hecha: ${t.title}`, onchange: () => handlers.toggleTask(t.id),
        }),
        h('div', { class: 'item-main' },
          h('div', { class: 'item-title' }, t.title),
          t.priority === 'alta' && !t.done && h('span', { class: 'item-tag' }, 'Urgente '),
          t.due && h('span', { class: `item-meta${!t.done && t.due < now ? ' overdue' : ''}` }, formatWhen(t.due)),
          t.project && h('div', { class: 'item-meta' }, t.project)),
        h('div', { class: 'item-actions' },
          h('button', { type: 'button', class: 'mini', icon: 'trash', 'aria-label': `Eliminar: ${t.title}`, title: 'Eliminar', onclick: () => handlers.removeItem('tasks', t.id) }))));
    });
  }

  function renderReminders() {
    const s = store.state;
    const list = s.reminders.filter((r) => r.status !== 'done').sort((a, b) => a.at - b.at);
    $('#count-reminders').textContent = list.length || '';
    const ul = $('#reminder-list');
    ul.replaceChildren();
    if (!list.length) {
      ul.append(h('li', { class: 'empty' }, 'Sin recordatorios. Crea uno arriba o di: recuérdame llamar a Pedro mañana a las 3.'));
      return;
    }
    list.forEach((r) => {
      const fired = r.status === 'fired';
      ul.append(h('li', { class: `item${fired ? ' fired' : ''}` },
        h('span', { class: 'reminder-dot', 'aria-hidden': 'true' }),
        h('div', { class: 'item-main' },
          h('div', { class: 'item-title' }, r.text),
          h('span', { class: `item-meta${fired ? ' overdue' : ''}` }, `${fired ? 'Venció: ' : ''}${formatWhen(r.at)}`)),
        h('div', { class: 'item-actions' },
          fired && h('button', { type: 'button', class: 'mini', icon: 'snooze', 'aria-label': `Posponer 10 minutos: ${r.text}`, title: 'Posponer 10 minutos', onclick: () => handlers.snooze(r.id) }),
          !fired && h('button', { type: 'button', class: 'mini', icon: 'calendar', 'aria-label': `Enviar a Google Calendar: ${r.text}`, title: 'Enviar a Google Calendar', onclick: () => handlers.reminderToCalendar(r.id) }),
          h('button', { type: 'button', class: 'mini', icon: 'check', 'aria-label': `Marcar como hecho: ${r.text}`, title: 'Marcar como hecho', onclick: () => handlers.reminderDone(r.id) }),
          h('button', { type: 'button', class: 'mini', icon: 'trash', 'aria-label': `Eliminar: ${r.text}`, title: 'Eliminar', onclick: () => handlers.removeItem('reminders', r.id) }))));
    });
  }

  function renderMemory() {
    const s = store.state;
    $('#count-memory').textContent = (s.notes.length + s.prefs.length) || '';
    const isNotes = view.memoryTab === 'notes';
    $('#memory-input').placeholder = isNotes ? 'Nueva nota o idea' : 'Nueva preferencia';
    const q = view.memoryQuery.trim().toLocaleLowerCase('es');
    const source = isNotes ? s.notes : s.prefs;
    const list = source
      .filter((x) => !q || x.text.toLocaleLowerCase('es').includes(q))
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt);
    const ul = $('#memory-list');
    ul.replaceChildren();
    if (!list.length) {
      ul.append(h('li', { class: 'empty' }, q
        ? `Nada coincide con «${view.memoryQuery}».`
        : isNotes ? 'Sin notas. Di: anota que el cliente prefiere pago por Bold.' : 'Sin preferencias. Di: recuerda que prefiero reuniones en la mañana.'));
      return;
    }
    list.forEach((x) => {
      ul.append(h('li', { class: 'item', style: 'grid-template-columns:minmax(0,1fr) auto' },
        h('div', { class: 'item-main' },
          h('div', { class: 'item-title' }, x.text),
          h('span', { class: 'item-meta' }, `${x.kind === 'idea' ? 'Idea, ' : ''}${formatWhen(x.createdAt)}`)),
        h('div', { class: 'item-actions' },
          h('button', { type: 'button', class: 'mini', icon: 'trash', 'aria-label': `Eliminar: ${x.text}`, title: 'Eliminar', onclick: () => handlers.removeItem(isNotes ? 'notes' : 'prefs', x.id) }))));
    });
  }

  function renderAuth() {
    const s = store.state;
    const pending = s.proposals.filter((p) => p.status === 'pending' || p.status === 'running');
    $('#count-auth').textContent = pending.length || '';
    const box = $('#auth-list');
    box.replaceChildren();
    if (view.authTab === 'pending') {
      if (!pending.length) {
        box.append(h('p', { class: 'empty' }, 'Nada por autorizar. Cuando JARVIS prepare un mensaje, un evento o un borrado, lo verás aquí antes de que ocurra.'));
      } else {
        pending.forEach((p) => box.append(proposalCard(p)));
      }
    } else {
      const entries = s.audit.slice().reverse();
      if (!entries.length) box.append(h('p', { class: 'empty' }, 'El historial está vacío.'));
      entries.forEach((a) => {
        const p = s.proposals.find((x) => x.id === a.proposalId);
        const d = p ? authorizer.describe(p) : null;
        box.append(h('div', { class: 'audit' },
          `${EVENT_TEXT[a.event] || a.event}: ${d ? d.title : a.type}`,
          a.result && a.event === 'falló' ? `. ${a.result}` : '',
          h('time', {}, formatWhen(a.at))));
      });
    }
  }

  function renderBadges() {
    const s = store.state;
    const set = (key, n) => {
      const el = document.querySelector(`[data-badge="${key}"]`);
      el.hidden = !n;
      el.textContent = n;
    };
    set('tasks', s.tasks.filter((t) => !t.done).length);
    set('reminders', s.reminders.filter((r) => r.status === 'fired').length);
    set('auth', s.proposals.filter((p) => p.status === 'pending').length);
  }

  function renderInsight() {
    const s = store.state;
    const now = Date.now();
    const pending = s.tasks.filter((t) => !t.done).length;
    const urgent = s.tasks.filter((t) => !t.done && t.priority === 'alta').length;
    const auth = s.proposals.filter((p) => p.status === 'pending').length;
    const next = s.reminders.filter((r) => r.status === 'pending' && r.at > now).sort((a, b) => a.at - b.at)[0];
    const bits = [];
    if (auth) bits.push(`${auth} por autorizar`);
    bits.push(pending ? `${pending} ${pending === 1 ? 'tarea pendiente' : 'tareas pendientes'}${urgent ? `, ${urgent} ${urgent === 1 ? 'urgente' : 'urgentes'}` : ''}` : 'Sin tareas pendientes');
    if (next) bits.push(`Próximo aviso: ${formatWhen(next.at)}`);
    $('#insight').textContent = bits.join('. ');
  }

  function renderAll() {
    renderChat();
    renderTasks();
    renderReminders();
    renderMemory();
    renderAuth();
    renderBadges();
    renderInsight();
  }

  function setView(name) {
    document.body.dataset.view = name;
    document.querySelectorAll('[data-nav]').forEach((b) => {
      if (b.dataset.nav === name) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    if (name === 'chat') {
      const log = $('#chat-log');
      log.scrollTop = log.scrollHeight;
    }
  }

  function setSeg(attr, value) {
    document.querySelectorAll(`[${attr}]`).forEach((b) => b.setAttribute('aria-pressed', String(b.getAttribute(attr) === value)));
  }

  document.querySelectorAll('[data-task-filter]').forEach((b) => b.addEventListener('click', () => {
    view.taskFilter = b.dataset.taskFilter;
    setSeg('data-task-filter', view.taskFilter);
    renderTasks();
  }));
  document.querySelectorAll('[data-memory-tab]').forEach((b) => b.addEventListener('click', () => {
    view.memoryTab = b.dataset.memoryTab;
    setSeg('data-memory-tab', view.memoryTab);
    renderMemory();
  }));
  document.querySelectorAll('[data-auth-tab]').forEach((b) => b.addEventListener('click', () => {
    view.authTab = b.dataset.authTab;
    setSeg('data-auth-tab', view.authTab);
    renderAuth();
  }));
  $('#memory-search').addEventListener('input', (e) => {
    view.memoryQuery = e.target.value;
    renderMemory();
  });
  document.querySelectorAll('[data-nav]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.nav)));
  document.querySelectorAll('.tab-ic').forEach((el) => { el.innerHTML = icon(el.dataset.ic); });

  return { view, renderAll, renderChat, renderInsight, setView };
}
