import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import Raiz from './Raiz';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Raiz />
  </StrictMode>,
);

// PWA: funciona sin internet e instalable. No se registra dentro de claude.ai ni al abrir el archivo local.
const enClaude = typeof (window as unknown as { claude?: unknown }).claude !== 'undefined';
if ('serviceWorker' in navigator && !enClaude && (location.protocol === 'https:' || location.hostname === 'localhost') && !import.meta.env.DEV) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => undefined));
}

// Guarda el aviso de instalación para ofrecerlo desde "Perfil y datos"
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as unknown as { __instalar?: Event }).__instalar = e;
  window.dispatchEvent(new Event('instalable'));
});
