import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './app/App';
import { initializeApp, requestPersistence } from './services/dataService';

async function boot() {
  try {
    await initializeApp();
  } catch (e) {
    console.error('No se pudo inicializar la base de datos local', e);
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  requestPersistence().catch(() => undefined);
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !import.meta.env.DEV) {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  }
}

boot();
