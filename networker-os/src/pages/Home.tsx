import { useData } from '../app/DataContext';
import { useUI } from '../app/UIContext';
import { navigate } from '../app/router';
import { ActionCard } from '../components/ActionCard';
import { Icon } from '../components/Icon';
import { Callout, Empty, Progress, fullName } from '../components/ui';
import { computeStats, processInsights } from '../domain/engine/stats';
import { progressFor } from '../domain/challenges';
import { dueLabel, greeting } from '../utils/dates';
import { clearDemo } from '../services/dataService';
import { Globe } from '../components/Globe';

export default function Home() {
  const d = useData();
  const { confirm, toast } = useUI();
  const { radar, now, contacts, interactions } = d;
  const stats = computeStats(contacts, interactions, now);
  const top = radar.all.slice(0, 5);
  const altas = radar.all.filter((a) => a.priority === 'alta').length;
  const seguimientos = radar.seguimiento.length + radar.recuperacion.length;
  const insights = processInsights(contacts, interactions, now);
  const challenges = progressFor({ contacts, interactions, practice: d.practice, checks: d.checks }, now);
  const doneChallenges = challenges.filter((c) => c.done).length;
  const todayTasks = contacts
    .filter((c) => c.nextAction && new Date(c.nextAction.dueDate) <= new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59))
    .sort((a, b) => a.nextAction!.dueDate.localeCompare(b.nextAction!.dueDate));

  const countries = Array.from(new Set(contacts.map((c) => c.country.trim()).filter(Boolean)));

  const kpis = [
    { label: 'Contactos totales', value: stats.total, hint: 'Ver todos', to: '/contactos' },
    { label: 'Nuevos (7 días)', value: stats.nuevos, hint: 'Iniciar conversaciones', to: '/contactos?filtro=nuevos' },
    { label: 'Seguimientos pendientes', value: seguimientos, hint: 'Ver en el Radar', to: '/radar' },
    { label: 'Presentaciones (30 días)', value: stats.presentaciones, hint: 'Ver quién vio una', to: '/contactos?estado=presentacion_realizada' },
    { label: 'Clientes', value: stats.clientes, hint: 'Cuidar la relación', to: '/contactos?estado=cliente' },
    { label: 'Distribuidores', value: stats.distribuidores, hint: 'Acompañar', to: '/contactos?estado=distribuidor' },
    { label: 'Contactos activos', value: stats.activos, hint: 'Interacción ≤14 días', to: '/contactos?filtro=activos' },
    { label: 'Contactos fríos', value: stats.frios, hint: 'Candidatos a recuperar', to: '/contactos?filtro=frios' },
  ];

  async function startReal() {
    const ok = await confirm({
      title: 'Empezar con tus datos',
      message: 'Se borrarán solo los datos de demostración. Todo lo que hayas creado tú se conserva.',
      confirmLabel: 'Borrar datos demo',
      danger: true,
    });
    if (ok) {
      await clearDemo();
      toast('Datos demo eliminados. ¡A construir tu lista!');
    }
  }

  return (
    <>
      {d.demoActive && (
        <div className="demo-banner">
          <Icon name="info" size={17} />
          <span style={{ flex: 1, minWidth: 200 }}>Estás viendo <b>datos de demostración</b> para explorar cómo funciona.</span>
          <button className="btn btn-sm" onClick={startReal}>Empezar con mis datos</button>
        </div>
      )}

      <section className="card-hero hero-globe">
        <div className="hero-text">
          <div className="eyebrow">{now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <h1 className="page-title hero-title">{greeting(now)}, {d.userName}.</h1>
          <p className="hero-network">
            <span className="live-dot" aria-hidden="true" />
            <span>Tu red: <b>{contacts.length}</b> contactos conectados en <b>{countries.length}</b> {countries.length === 1 ? 'país' : 'países'}</span>
          </p>
          <p className="muted" style={{ marginTop: 14 }}>Hoy tienes:</p>
          <div className="today-pills">
            <button className="today-pill" onClick={() => navigate('/radar')}>🔥 <b>{altas}</b> acciones prioritarias</button>
            <button className="today-pill" onClick={() => navigate('/radar')}>🟡 <b>{seguimientos}</b> seguimientos</button>
            <button className="today-pill" onClick={() => navigate('/contactos?filtro=nuevos')}>👥 <b>{stats.nuevos}</b> prospectos nuevos</button>
          </div>
        </div>
        <div className="hero-visual">
          <Globe hub={d.company.country} active={countries} size={380} />
        </div>
      </section>

      <section className="section" aria-labelledby="qhn">
        <div className="section-head">
          <h2 className="section-title" id="qhn"><Icon name="bolt" size={19} /> ¿Qué hago ahora?</h2>
          {radar.all.length > 5 && (
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/radar')}>
              Ver las {radar.all.length} <Icon name="chevron" size={15} />
            </button>
          )}
        </div>
        {top.length ? (
          <div className="stack">
            {top.map((a, i) => (
              <ActionCard key={a.contactId} action={a} contact={d.contactById.get(a.contactId)!} rank={i + 1} now={now} />
            ))}
          </div>
        ) : (
          <Empty
            icon="check"
            title="No hay acciones urgentes"
            action={<button className="btn btn-primary" onClick={() => navigate('/contactos/nuevo')}><Icon name="user-plus" size={17} /> Agregar contacto</button>}
          >
            {contacts.length ? 'Tu lista está al día. Es un buen momento para contactar personas nuevas.' : 'Agrega tu primer contacto y el sistema te dirá qué hacer con cada persona.'}
          </Empty>
        )}
      </section>

      <div className="grid-2 section">
        <section className="card" aria-labelledby="tareas">
          <div className="section-head">
            <h2 className="section-title" id="tareas"><Icon name="calendar" size={18} /> Tareas del día</h2>
            <span className="badge">{todayTasks.length}</span>
          </div>
          {todayTasks.length ? (
            <div className="stack-sm">
              {todayTasks.slice(0, 5).map((c) => (
                <button key={c.id} className="list-item" style={{ padding: '8px 0' }} onClick={() => navigate(`/contactos/${c.id}`)}>
                  <Icon name="clock" size={17} className="faint" />
                  <div className="li-main">
                    <div className="li-title">{fullName(c)}</div>
                    <div className="li-sub">{c.nextAction!.text}</div>
                  </div>
                  <span className={`badge ${new Date(c.nextAction!.dueDate) < now ? 'badge-alta' : 'badge-media'}`}>{dueLabel(c.nextAction!.dueDate, now)}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="muted small">No tienes tareas programadas para hoy. Las acciones del motor están arriba.</p>
          )}
          <div className="divider" />
          <button className="row" style={{ width: '100%', background: 'none', border: 0, cursor: 'pointer', padding: 0, textAlign: 'left' }} onClick={() => navigate('/entrenamiento')}>
            <Icon name="trophy" size={18} />
            <div style={{ flex: 1 }}>
              <div className="small" style={{ fontWeight: 600 }}>Retos de hoy: {doneChallenges}/{challenges.length}</div>
              <Progress value={doneChallenges} max={challenges.length} />
            </div>
            <Icon name="chevron" size={16} className="faint" />
          </button>
        </section>

        <section className="card" aria-labelledby="proceso">
          <div className="section-head">
            <h2 className="section-title" id="proceso"><Icon name="target" size={18} /> ¿Dónde está fallando el proceso?</h2>
          </div>
          <div className="stack-sm">
            {insights.map((i) => (
              <Callout key={i.title} tone={i.tone === 'warn' ? 'warn' : i.tone === 'good' ? 'good' : 'info'}>
                <b>{i.title}</b>
                <div className="small muted">{i.detail}</div>
              </Callout>
            ))}
          </div>
        </section>
      </div>

      <section className="section" aria-labelledby="indicadores">
        <div className="section-head">
          <h2 className="section-title" id="indicadores"><Icon name="grid" size={18} /> Tu lista en números</h2>
        </div>
        <div className="kpis">
          {kpis.map((k) => (
            <button key={k.label} className="kpi" onClick={() => navigate(k.to)}>
              <div className="kpi-value">{k.value}</div>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-hint">{k.hint} →</div>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
