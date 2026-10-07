import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { ClipboardList, ExternalLink, Home, LayoutList, LogOut, Menu as MenuIcon, Settings, SlidersHorizontal, UtensilsCrossed } from 'lucide-react';
import { menuUrl } from './lib';
import { Sheet } from '@/shared/ui/Sheet';
import { useAdmin } from './AdminContext';

const MAIN = [
  { to: '/dashboard', label: 'Inicio', icon: Home, end: true },
  { to: '/dashboard/pedidos', label: 'Pedidos', icon: ClipboardList },
  { to: '/dashboard/productos', label: 'Productos', icon: UtensilsCrossed },
  { to: '/dashboard/ajustes', label: 'Ajustes', icon: Settings },
];
const MORE = [
  { to: '/dashboard/categorias', label: 'Categorías', icon: LayoutList },
  { to: '/dashboard/opciones', label: 'Extras y opciones', icon: SlidersHorizontal },
];

export function AdminLayout() {
  const { business, session, signOut } = useAdmin();
  const [more, setMore] = useState(false);
  const navigate = useNavigate();

  const sideLink = ({ isActive }: { isActive: boolean }) =>
    `flex h-11 items-center gap-3 rounded-xl px-3 font-medium ${isActive ? 'bg-ink text-white' : 'text-ink-2 hover:bg-shelf'}`;

  return (
    <div className="min-h-dvh bg-shelf/60 md:flex">
      {/* Lateral (tablet/escritorio) */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-paper p-4 md:flex">
        <p className="px-3 font-display text-lg leading-tight font-extrabold">{business.name}</p>
        <p className="mb-6 truncate px-3 text-sm text-ink-3">{session.user.email}</p>
        <nav className="space-y-1" aria-label="Panel">
          {[...MAIN, ...MORE].map((l) => (
            <NavLink key={l.to} to={l.to} end={'end' in l} className={sideLink}>
              <l.icon size={20} aria-hidden /> {l.label}
            </NavLink>
          ))}
        </nav>
        <button type="button" onClick={() => void signOut()} className="mt-auto flex h-11 items-center gap-3 rounded-xl px-3 text-ink-2 hover:bg-shelf">
          <LogOut size={20} aria-hidden /> Cerrar sesión
        </button>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-14 items-center border-b border-line bg-paper/95 px-4 backdrop-blur md:hidden">
          <p className="truncate font-display text-lg font-extrabold">{business.name}</p>
        </header>
        <main className="mx-auto max-w-4xl px-4 pt-5 pb-28 md:px-8 md:pt-8 md:pb-12">
          <Outlet />
        </main>
      </div>

      {/* Barra inferior (teléfono) */}
      <nav
        aria-label="Panel"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {MAIN.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => `flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium ${isActive ? 'text-ink' : 'text-ink-3'}`}
          >
            {({ isActive }) => (
              <>
                <span className={`grid h-8 w-12 place-items-center rounded-full ${isActive ? 'bg-ink text-white' : ''}`}>
                  <l.icon size={20} aria-hidden />
                </span>
                {l.label}
              </>
            )}
          </NavLink>
        ))}
        <button type="button" onClick={() => setMore(true)} className="flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium text-ink-3">
          <span className="grid h-8 w-12 place-items-center">
            <MenuIcon size={20} aria-hidden />
          </span>
          Más
        </button>
      </nav>

      <Sheet open={more} onClose={() => setMore(false)} title="Más opciones">
        <ul className="divide-y divide-line pb-4">
          {MORE.map((l) => (
            <li key={l.to}>
              <button
                type="button"
                className="flex h-14 w-full items-center gap-3 text-left font-medium"
                onClick={() => {
                  setMore(false);
                  navigate(l.to);
                }}
              >
                <l.icon size={20} aria-hidden /> {l.label}
              </button>
            </li>
          ))}
          <li>
            <a href={menuUrl()} target="_blank" rel="noopener noreferrer" className="flex h-14 w-full items-center gap-3 text-left font-medium">
              <ExternalLink size={20} aria-hidden /> Ver el menú como cliente
            </a>
          </li>
          <li>
            <button type="button" className="flex h-14 w-full items-center gap-3 text-left font-medium text-danger" onClick={() => void signOut()}>
              <LogOut size={20} aria-hidden /> Cerrar sesión
            </button>
          </li>
        </ul>
      </Sheet>
    </div>
  );
}
