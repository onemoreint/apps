import { useEffect } from 'react';
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router';
import { DEMO_MODE, isConfigured, STATIC_HOSTING } from '@/shared/lib/env';
import { applyBrand } from '@/shared/lib/color';
import { AdminProvider, useAdminSession } from './AdminContext';
import { AdminLayout } from './AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import ProductFormPage from './pages/ProductFormPage';
import CategoriesPage from './pages/CategoriesPage';
import OptionsPage from './pages/OptionsPage';
import OrdersPage from './pages/OrdersPage';
import SettingsPage from './pages/SettingsPage';
import { Button } from './ui';
import { db } from '@/shared/lib/supabase';

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">{children}</main>;
}

export default function AdminApp() {
  useEffect(() => {
    document.title = 'Panel · MesaQR';
  }, []);

  if (!isConfigured) {
    return (
      <Centered>
        <h1 className="font-display text-2xl font-extrabold">{DEMO_MODE ? 'El panel se activa al conectar la base de datos' : 'Falta configurar Supabase'}</h1>
        <p className="mt-2 text-ink-2">
          {DEMO_MODE
            ? 'Por ahora el menú funciona en modo demostración. Al conectar Supabase podrás cambiar precios, marcar agotados, administrar mesas y ver los pedidos aquí.'
            : 'Crea el archivo .env.local a partir de .env.example. Instrucciones en el README.'}
        </p>
        <a href={import.meta.env.BASE_URL} className="mt-8 text-sm font-semibold underline underline-offset-2">Ir al menú</a>
      </Centered>
    );
  }
  const routes = (
    <Routes>
      <Route path="/dashboard/*" element={<AdminGate />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
  // En hosting estático las rutas del panel van en el hash (…/#/dashboard/productos).
  return STATIC_HOSTING ? (
    <HashRouter>{routes}</HashRouter>
  ) : (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>{routes}</BrowserRouter>
  );
}

function AdminGate() {
  const { phase, setPhase } = useAdminSession();

  useEffect(() => {
    if (phase.kind === 'ready') applyBrand(phase.business.primary_color);
  }, [phase]);

  switch (phase.kind) {
    case 'checking':
      return <Centered><p className="text-ink-3">Verificando sesión…</p></Centered>;
    case 'signed-out':
      return <LoginPage />;
    case 'error':
      return (
        <Centered>
          <p role="alert" className="text-danger">⚠️ {phase.message}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>Reintentar</Button>
        </Centered>
      );
    case 'no-business':
      return (
        <Centered>
          <h1 className="font-display text-2xl font-extrabold">Tu usuario no administra ningún restaurante</h1>
          <p className="mt-2 text-ink-2">
            Entraste como <strong>{phase.session.user.email}</strong>, pero esta cuenta aún no está asignada a un negocio. Pide al
            administrador que la vincule (paso “Crear usuario administrador” del README).
          </p>
          <Button variant="secondary" className="mt-6" onClick={() => void db().auth.signOut()}>
            Cerrar sesión
          </Button>
        </Centered>
      );
    case 'ready':
      return (
        <AdminProvider
          session={phase.session}
          business={phase.business}
          role={phase.role}
          onBusiness={(b) => setPhase({ ...phase, business: b })}
        >
          <Routes>
            <Route element={<AdminLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="productos" element={<ProductsPage />} />
              <Route path="productos/nuevo" element={<ProductFormPage />} />
              <Route path="productos/:id" element={<ProductFormPage />} />
              <Route path="categorias" element={<CategoriesPage />} />
              <Route path="opciones" element={<OptionsPage />} />
              <Route path="pedidos" element={<OrdersPage />} />
              <Route path="ajustes" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </AdminProvider>
      );
  }
}
