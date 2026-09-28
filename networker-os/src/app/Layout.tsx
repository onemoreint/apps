import type { ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { useData } from './DataContext';
import { useUI } from './UIContext';
import { navigate } from './router';

const SECTIONS = [
  {
    title: 'Principal',
    items: [
      { to: '/', label: 'Inicio', icon: 'home' },
      { to: '/radar', label: 'Radar', icon: 'radar', badge: true },
      { to: '/contactos', label: 'Contactos', icon: 'users' },
    ],
  },
  {
    title: 'Herramientas',
    items: [
      { to: '/conversaciones', label: 'Conversaciones', icon: 'message' },
      { to: '/objeciones', label: 'Objeciones', icon: 'shield' },
      { to: '/simulador', label: 'Simulador', icon: 'mic' },
    ],
  },
  {
    title: 'Liderazgo',
    items: [
      { to: '/organizacion', label: 'Mi organización', icon: 'tree' },
      { to: '/entrenamiento', label: 'Entrenamiento', icon: 'trophy' },
    ],
  },
];

const MORE_PATHS = ['/mas', '/conversaciones', '/objeciones', '/simulador', '/organizacion', '/entrenamiento', '/configuracion'];

function isActive(to: string, path: string) {
  if (to === '/') return path === '/';
  return path === to || path.startsWith(`${to}/`);
}

export function Layout({ path, title, children }: { path: string; title: string; children: ReactNode }) {
  const { radar, company } = useData();
  const { openQuick } = useUI();
  const urgent = radar.inmediata.length;

  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Navegación principal">
        <div className="brand">
          <div className="brand-mark"><Icon name="radar" size={20} stroke={2.2} /></div>
          <div>
            <div className="brand-name">NETWORKER OS</div>
            <div className="brand-sub">{company.name}</div>
          </div>
        </div>
        <button className="btn btn-primary sidebar-cta" onClick={openQuick}>
          <Icon name="bolt" size={18} /> Acción rápida
        </button>
        {SECTIONS.map((s) => (
          <nav key={s.title} aria-label={s.title}>
            <div className="nav-section">{s.title}</div>
            {s.items.map((it) => (
              <a key={it.to} href={`#${it.to}`} className={`nav-link ${isActive(it.to, path) ? 'active' : ''}`} aria-current={isActive(it.to, path) ? 'page' : undefined}>
                <Icon name={it.icon} size={19} />
                {it.label}
                {'badge' in it && it.badge && urgent > 0 && <span className="count">{urgent}</span>}
              </a>
            ))}
          </nav>
        ))}
        <nav aria-label="Configuración">
          <div className="nav-section">Cuenta</div>
          <a href="#/configuracion" className={`nav-link ${isActive('/configuracion', path) ? 'active' : ''}`}>
            <Icon name="settings" size={19} /> Configuración
          </a>
        </nav>
        <div className="sidebar-foot">Tus datos se guardan solo en este dispositivo.</div>
      </aside>

      <div className="main">
        <header className="topbar mobile-only">
          <div className="brand-mark" style={{ width: 30, height: 30, borderRadius: 9 }}><Icon name="radar" size={17} stroke={2.2} /></div>
          <div className="topbar-title">{title}</div>
          <button className="icon-btn" aria-label="Configuración" onClick={() => navigate('/configuracion')}>
            <Icon name="settings" size={18} />
          </button>
        </header>
        <main className="content" id="contenido">{children}</main>
      </div>

      <nav className="bottomnav" aria-label="Navegación inferior">
        <a href="#/" className={`bn-item ${path === '/' ? 'active' : ''}`} aria-current={path === '/' ? 'page' : undefined}>
          <Icon name="home" size={22} />
          Inicio
        </a>
        <a href="#/radar" className={`bn-item ${isActive('/radar', path) ? 'active' : ''}`}>
          <Icon name="radar" size={22} />
          {urgent > 0 && <span className="bn-dot">{urgent}</span>}
          Radar
        </a>
        <a href="#/contactos" className={`bn-item ${isActive('/contactos', path) ? 'active' : ''}`}>
          <Icon name="users" size={22} />
          Contactos
        </a>
        <div style={{ display: 'grid', justifyItems: 'center' }}>
          <button className="bn-action" onClick={openQuick} aria-label="Acción rápida">
            <Icon name="bolt" size={24} stroke={2.2} />
          </button>
          <span className="bn-action-label">Acción</span>
        </div>
        <a href="#/mas" className={`bn-item ${MORE_PATHS.some((p) => isActive(p, path)) ? 'active' : ''}`}>
          <Icon name="grid" size={22} />
          Más
        </a>
      </nav>
    </div>
  );
}
