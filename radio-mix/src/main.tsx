import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { brand } from './config/brand';
import { initPwa } from './components/pwa';

// Los colores de marca se aplican desde brand.ts (configuración centralizada).
const root = document.documentElement.style;
root.setProperty('--color-ink', brand.colors.background);
root.setProperty('--color-surface', brand.colors.surface);
root.setProperty('--color-accent', brand.colors.accent);
root.setProperty('--color-accent-2', brand.colors.accent2);
root.setProperty('--color-accent-3', brand.colors.accent3);

initPwa();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
