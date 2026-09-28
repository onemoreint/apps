import { useData } from '../app/DataContext';
import { navigate } from '../app/router';
import { Icon } from '../components/Icon';

const ITEMS = [
  { to: '/conversaciones', icon: 'message', title: 'Conversaciones', desc: 'Mensajes y guiones sin presión para cada situación' },
  { to: '/objeciones', icon: 'shield', title: 'Laboratorio de objeciones', desc: 'Entiende qué hay detrás antes de responder' },
  { to: '/simulador', icon: 'mic', title: 'Simulador de prospectos', desc: 'Practica y recibe retroalimentación' },
  { to: '/organizacion', icon: 'tree', title: 'Mi organización', desc: 'Estructura del equipo e índice de duplicación' },
  { to: '/entrenamiento', icon: 'trophy', title: 'Entrenamiento', desc: 'Retos diarios, racha e historial' },
  { to: '/configuracion', icon: 'settings', title: 'Configuración', desc: 'Perfil, empresa, respaldo y seguridad' },
];

export default function More() {
  const { company } = useData();
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">NETWORKER OS · {company.name}</div>
          <h1 className="page-title">Más herramientas</h1>
          <p className="page-sub">No solo te dice quién es tu prospecto. Te ayuda a saber qué hacer después.</p>
        </div>
      </div>
      <div className="list">
        {ITEMS.map((i) => (
          <button key={i.to} className="list-item" onClick={() => navigate(i.to)}>
            <span className="qi-icon" style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'color-mix(in srgb, var(--accent) 14%, transparent)', color: 'var(--accent)' }}>
              <Icon name={i.icon} size={19} />
            </span>
            <div className="li-main">
              <div className="li-title">{i.title}</div>
              <div className="li-sub">{i.desc}</div>
            </div>
            <Icon name="chevron" size={16} className="faint" />
          </button>
        ))}
      </div>
    </>
  );
}
