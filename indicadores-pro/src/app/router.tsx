import { Bell, ClipboardList, FileBarChart, FolderTree, Gauge, History, ListChecks, Tags, Users } from 'lucide-react'
import { createHashRouter, Navigate } from 'react-router-dom'
import { LoginPage } from '@/features/auth/login-page'
import { RecoverPage } from '@/features/auth/recover-page'
import { RegisterPage } from '@/features/auth/register-page'
import { DashboardPage } from '@/features/dashboard/dashboard-page'
import { HelpPage } from '@/features/help/help-page'
import { CreateOrganizationPage } from '@/features/organization/create-organization-page'
import { ModulePlaceholder } from '@/features/placeholder/module-placeholder'
import { NotFoundPage } from '@/features/placeholder/not-found-page'
import { SettingsPage } from '@/features/settings/settings-page'
import { AppShell } from '@/features/shell/app-shell'
import { RequireAuth, RequireGuest, RequireOrganization, RequirePermission } from './guards'

/**
 * HashRouter: funciona en GitHub Pages y en cualquier hosting estático sin reglas de reescritura.
 * Las rutas en español coinciden con el documento de arquitectura (Fase 0).
 */
export const routes = [
  {
    element: <RequireGuest />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/registro', element: <RegisterPage /> },
    ],
  },
  { path: '/recuperar', element: <RecoverPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/bienvenida', element: <CreateOrganizationPage /> },
      {
        element: <RequireOrganization />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: '/', element: <DashboardPage /> },
              { path: '/indicadores/*', element: <ModulePlaceholder titleKey="nav.indicators" icon={Gauge} phase="Fase 3" /> },
              { path: '/resultados/*', element: <ModulePlaceholder titleKey="nav.results" icon={ListChecks} phase="Fase 4" /> },
              { path: '/planes/*', element: <ModulePlaceholder titleKey="nav.actionPlans" icon={ClipboardList} phase="Fase 6" /> },
              {
                path: '/reportes',
                element: (
                  <RequirePermission permission="report.export">
                    <ModulePlaceholder titleKey="nav.reports" icon={FileBarChart} phase="Fase 7" />
                  </RequirePermission>
                ),
              },
              { path: '/alertas', element: <ModulePlaceholder titleKey="nav.alerts" icon={Bell} phase="Fase 8" /> },
              {
                path: '/procesos',
                element: (
                  <RequirePermission permission="process.manage">
                    <ModulePlaceholder titleKey="nav.processes" icon={FolderTree} phase="Fase 3" />
                  </RequirePermission>
                ),
              },
              {
                path: '/catalogos/*',
                element: (
                  <RequirePermission permission="catalog.manage">
                    <ModulePlaceholder titleKey="nav.catalogs" icon={Tags} phase="Fase 3" />
                  </RequirePermission>
                ),
              },
              {
                path: '/usuarios',
                element: (
                  <RequirePermission permission="user.manage">
                    <ModulePlaceholder titleKey="nav.users" icon={Users} phase="Fase 3" />
                  </RequirePermission>
                ),
              },
              { path: '/configuracion', element: <SettingsPage /> },
              {
                path: '/auditoria',
                element: (
                  <RequirePermission permission="audit.view">
                    <ModulePlaceholder titleKey="nav.audit" icon={History} phase="Fase 8" />
                  </RequirePermission>
                ),
              },
              { path: '/ayuda', element: <HelpPage /> },
              { path: '/demo', element: <Navigate to="/" replace /> },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
]

export const createRouter = () =>
  createHashRouter(routes, { future: { v7_relativeSplatPath: true } })
