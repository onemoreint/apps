import { lazy, Suspense } from 'react';
import { Toaster } from '@/shared/ui/Toast';
import MenuPage from '@/features/menu/MenuPage';
import { useUrl } from './nav';

// El panel admin (con React Router y Supabase) se descarga solo al entrar a /dashboard.
const AdminApp = lazy(() => import('@/features/admin/AdminApp'));

/** Un solo enlace: la raíz es el menú. El panel vive en /dashboard (o #/dashboard). */
export function App() {
  const { path, hash } = useUrl();
  const admin = path === '/dashboard' || path.startsWith('/dashboard/') || hash.startsWith('#/dashboard');
  return (
    <>
      {admin ? (
        <Suspense fallback={<div className="grid min-h-dvh place-items-center text-ink-3">Cargando panel…</div>}>
          <AdminApp />
        </Suspense>
      ) : (
        <MenuPage />
      )}
      <Toaster />
    </>
  );
}
