import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Activity,
  AppWindow,
  Cable,
  FileCog,
  LayoutGrid,
  ListChecks,
  LogOut,
  Menu,
  QrCode,
  ScrollText,
  Settings2,
  ShieldCheck,
  Smartphone,
  Terminal,
  X,
} from 'lucide-react';
import { useEffect } from 'react';
import { useMe, useStore } from '../store/store';
import { organizations } from '../data/demo';
import { can, ROLE_LABELS, type Permission } from '../lib/rbac';

type Item = { to: string; label: string; icon: typeof LayoutGrid; perm?: Permission };
const groups: { title: string; items: Item[] }[] = [
  {
    title: 'Flota',
    items: [
      { to: '/', label: 'Resumen', icon: LayoutGrid },
      { to: '/devices', label: 'Dispositivos', icon: Smartphone },
      { to: '/enrollment', label: 'Inscripción', icon: QrCode, perm: 'enrollment.create' },
      { to: '/commands', label: 'Comandos', icon: Terminal },
    ],
  },
  {
    title: 'Configuración',
    items: [
      { to: '/policies', label: 'Políticas', icon: ShieldCheck },
      { to: '/applications', label: 'Aplicaciones', icon: AppWindow },
      { to: '/managed-configs', label: 'Config. administradas', icon: FileCog },
    ],
  },
  {
    title: 'Control',
    items: [
      { to: '/audit', label: 'Auditoría', icon: ScrollText, perm: 'audit.read' },
      { to: '/modes', label: 'Modos y capacidades', icon: ListChecks },
      { to: '/usb-lab', label: 'Laboratorio USB', icon: Cable },
      { to: '/settings', label: 'Usuarios y roles', icon: Settings2 },
    ],
  },
];

export function Layout() {
  const me = useMe()!;
  const { activeOrgId, switchOrg, logout, resetDemo } = useStore();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);

  const nav = (
    <nav className="flex h-full flex-col bg-spruce text-paper">
      <div className="flex items-center gap-3 px-5 pt-5 pb-6">
        <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
          <rect width="32" height="32" rx="7" fill="#21423a" />
          <path d="M9 21V11h4l3 6 3-6h4v10" fill="none" stroke="#cfe3dc" strokeWidth="2.4" strokeLinejoin="round" />
        </svg>
        <div className="leading-tight">
          <div className="font-bold">Control Center</div>
          <div className="text-xs text-mint/70">Android Enterprise</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3">
        {groups.map((g) => (
          <div key={g.title} className="mb-5">
            <div className="px-2 pb-1.5 text-xs font-semibold text-mint/60">{g.title}</div>
            {g.items
              .filter((i) => !i.perm || can(me.role, i.perm))
              .map((i) => (
                <NavLink
                  key={i.to}
                  to={i.to}
                  end={i.to === '/'}
                  className={({ isActive }) =>
                    `mb-0.5 flex items-center gap-3 rounded-md px-2.5 py-2 text-sm ${
                      isActive ? 'bg-spruce-2 font-semibold text-white shadow-[inset_3px_0_0_#cfe3dc]' : 'text-mint/85 hover:bg-spruce-2/60'
                    }`
                  }
                >
                  <i.icon size={17} strokeWidth={1.9} />
                  {i.label}
                </NavLink>
              ))}
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 p-4 text-sm">
        <div className="font-semibold">{me.name}</div>
        <div className="text-xs text-mint/70">{ROLE_LABELS[me.role]}</div>
        <button onClick={logout} className="mt-3 flex items-center gap-2 text-xs text-mint/80 hover:text-white">
          <LogOut size={14} /> Cerrar sesión
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex h-full">
      <aside className="hidden w-64 shrink-0 lg:block">{nav}</aside>
      {open && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="w-72">{nav}</div>
          <button className="flex-1 bg-spruce/50" aria-label="Cerrar menú" onClick={() => setOpen(false)} />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-3 border-b border-line bg-panel px-4 py-2.5 lg:px-8">
          <button className="rounded p-1.5 lg:hidden" onClick={() => setOpen(!open)} aria-label="Abrir menú">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted">Organización</span>
            {me.role === 'SUPER_ADMIN' ? (
              <select className="input !w-auto !py-1" value={activeOrgId} onChange={(e) => switchOrg(e.target.value)}>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-semibold">{organizations.find((o) => o.id === activeOrgId)?.name}</span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-3 text-xs text-muted">
            <span className="hidden items-center gap-1.5 sm:flex">
              <Activity size={14} className="text-caution" />
              Modo demo: dispositivos simulados, datos guardados en este navegador
            </span>
            <button className="underline hover:text-ink" onClick={resetDemo}>
              Restablecer demo
            </button>
          </div>
        </div>
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
