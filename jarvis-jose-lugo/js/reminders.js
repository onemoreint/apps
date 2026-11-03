// Vigila los recordatorios mientras la app está abierta. Un sitio estático no puede despertar
// el dispositivo con la app cerrada; los vencidos se muestran al volver a abrirla.

export function createReminderWatcher({ store, onFire }) {
  let timer = 0;

  function check() {
    const now = Date.now();
    const due = store.state.reminders.filter((r) => r.status === 'pending' && r.at <= now);
    if (!due.length) return;
    store.update((s) => {
      due.forEach((d) => {
        const r = s.reminders.find((x) => x.id === d.id);
        if (r) r.status = 'fired';
      });
    });
    due.forEach((r) => onFire(r, now - r.at > 60000));
  }

  return {
    start() {
      check();
      timer = setInterval(check, 5000);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) check();
      });
    },
    stop() {
      clearInterval(timer);
    },
    check,
  };
}

export async function showSystemNotification(title, body) {
  if (!('Notification' in globalThis) || Notification.permission !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, { body, icon: 'assets/icons/icon-192.png', badge: 'assets/icons/icon-192.png', tag: 'jarvis-aviso' });
      return true;
    }
    // eslint-disable-next-line no-new
    new Notification(title, { body, icon: 'assets/icons/icon-192.png' });
    return true;
  } catch {
    return false;
  }
}
