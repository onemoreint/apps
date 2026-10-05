// Instalación como app (PWA): Android/Chrome/Edge usan el aviso del navegador;
// iPhone/iPad requieren "Compartir → Agregar a inicio".
import { emit } from '../core/events.js';

let aviso = null;

export function escuchar() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    aviso = e;
    emit('instalacion:disponible');
  });
  window.addEventListener('appinstalled', () => {
    aviso = null;
    emit('instalacion:hecha');
  });
}

export const instalada = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

export const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** 'instalada' | 'disponible' | 'ios' | 'manual' */
export function estado() {
  if (instalada()) return 'instalada';
  if (aviso) return 'disponible';
  if (esIOS()) return 'ios';
  return 'manual';
}

/** @returns {Promise<boolean>} true si el usuario aceptó */
export async function instalar() {
  if (!aviso) return false;
  aviso.prompt();
  const { outcome } = await aviso.userChoice;
  aviso = null;
  return outcome === 'accepted';
}

/** Registra el service worker y avisa cuando hay una versión nueva lista. */
export async function registrarServiceWorker(alHaberVersionNueva) {
  if (!('serviceWorker' in navigator)) return null;
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (location.protocol !== 'https:' && !local) return null;
  try {
    const reg = await navigator.serviceWorker.register('./service-worker.js');
    // Solo se recarga cuando el usuario pidió actualizar (no en la primera instalación).
    let pidioActualizar = false;
    const ofrecer = w => alHaberVersionNueva(() => { pidioActualizar = true; w.postMessage({ tipo: 'activar' }); });
    if (reg.waiting && navigator.serviceWorker.controller) ofrecer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) ofrecer(w);
      });
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (pidioActualizar) location.reload();
    });
    return reg;
  } catch {
    return null; // Entornos sin soporte (vista previa, navegación privada): la app sigue funcionando en línea.
  }
}
