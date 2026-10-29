import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { TiendaApp } from '@/tienda/TiendaApp';
import { useRuta } from '@/app/ruta';

// El panel se descarga solo al entrar a #/admin: los clientes nunca lo cargan.
const AdminApp = lazy(() => import('@/admin/AdminApp'));

/** Enlaces de recuperación de contraseña de Supabase (#access_token=… o ?code=…). */
function esRetornoDeAcceso(): boolean {
  const h = window.location.hash;
  return /access_token=|type=recovery|error_description=/.test(h) || new URLSearchParams(window.location.search).has('code');
}

function Raiz() {
  const ruta = useRuta();
  if (ruta.partes[0] === 'admin' || esRetornoDeAcceso()) {
    return (
      <Suspense
        fallback={<div className="grid min-h-dvh place-items-center bg-crema text-tinta-3">Cargando panel…</div>}
      >
        <AdminApp />
      </Suspense>
    );
  }
  return <TiendaApp />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Raiz />
  </StrictMode>,
);
