import { lazy, Suspense } from 'react';
import { Toaster } from '@/shared/ui/Toast';
import MenuPage from '@/features/menu/MenuPage';
import HomePage from './HomePage';
import { useUrl } from './nav';

// El panel admin (con React Router y Supabase) se descarga solo al entrar a /dashboard.
const AdminApp = lazy(() => import('@/features/admin/AdminApp'));

export function App() {
  const { path, search, hash } = useUrl();
  let page;
  if (path === '/dashboard' || path.startsWith('/dashboard/') || hash.startsWith('#/dashboard')) {
    page = (
      <Suspense fallback={<div className="grid min-h-dvh place-items-center text-ink-3">Cargando panel…</div>}>
        <AdminApp />
      </Suspense>
    );
  } else if (path === '/menu' || path === '/menu/' || search.has('mesa')) {
    page = <MenuPage />;
  } else {
    page = <HomePage />;
  }
  return (
    <>
      {page}
      <Toaster />
    </>
  );
}
