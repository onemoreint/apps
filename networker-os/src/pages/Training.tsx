import { useData } from '../app/DataContext';
import { navigate } from '../app/router';
import { Icon } from '../components/Icon';
import { Progress } from '../components/ui';
import { history, progressFor, streak } from '../domain/challenges';
import { challengesRepo } from '../data/repositories';
import { formatDateTime } from '../utils/dates';

export default function Training() {
  const { contacts, interactions, practice, checks, now } = useData();
  const data = { contacts, interactions, practice, checks };
  const today = progressFor(data, now);
  const done = today.filter((c) => c.done).length;
  const hist = history(data, now, 14);
  const st = streak(hist);
  const recent = [...practice].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Entrenamiento</div>
          <h1 className="page-title">Retos de hoy</h1>
          <p className="page-sub">Pequeñas acciones diarias que construyen un negocio. Se completan solos con lo que registras en la app.</p>
        </div>
      </div>

      <section className="card-hero">
        <div className="row" style={{ flexWrap: 'wrap', gap: 20 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="eyebrow">Progreso de hoy</div>
            <div style={{ fontSize: 34, fontWeight: 800, marginTop: 4 }} className="num">{done}<span className="faint" style={{ fontSize: 20 }}>/{today.length}</span></div>
            <div style={{ marginTop: 8 }}><Progress value={done} max={today.length} good={done === today.length} /></div>
            <p className="small muted" style={{ marginTop: 8 }}>
              {done === today.length ? '¡Día completo! Eso es constancia.' : done >= 3 ? 'Día productivo. Vas muy bien.' : 'Completa al menos 3 retos para que el día cuente en tu racha.'}
            </p>
          </div>
          <div style={{ textAlign: 'center', minWidth: 120 }}>
            <div style={{ fontSize: 34 }} aria-hidden="true">🔥</div>
            <div style={{ fontSize: 26, fontWeight: 800 }} className="num">{st}</div>
            <div className="tiny faint">día{st === 1 ? '' : 's'} de racha</div>
          </div>
        </div>
      </section>

      <section className="section stack">
        {today.map((c, i) => (
          <div key={c.def.id} className="card challenge">
            {c.def.mode === 'manual' ? (
              <button className={`check ${c.done ? 'done' : ''}`} onClick={() => challengesRepo.toggle(c.def.id, now)} aria-pressed={c.done} aria-label={`Marcar "${c.def.title}" como hecho`}>
                <Icon name="check" size={16} stroke={3} />
              </button>
            ) : (
              <div className={`check auto ${c.done ? 'done' : ''}`} aria-hidden="true"><Icon name="check" size={16} stroke={3} /></div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="tiny faint">RETO {i + 1}{c.def.mode === 'auto' ? ' · se completa automáticamente' : ' · márcalo al hacerlo'}</div>
              <h2 style={{ fontSize: 16, marginTop: 2, textDecoration: c.done ? 'line-through' : undefined, opacity: c.done ? 0.7 : 1 }}>{c.def.title}</h2>
              <p className="small muted" style={{ marginTop: 2 }}>{c.def.description}</p>
              {c.def.target > 1 && (
                <div className="row" style={{ marginTop: 8 }}>
                  <div style={{ flex: 1 }}><Progress value={c.count} max={c.def.target} good={c.done} /></div>
                  <span className="tiny muted num">{c.count}/{c.def.target}</span>
                </div>
              )}
            </div>
            {!c.done && (
              <button className="btn btn-sm" onClick={() => navigate(c.def.cta.to)}>{c.def.cta.label} <Icon name="chevron" size={14} /></button>
            )}
          </div>
        ))}
      </section>

      <div className="grid-2 section" style={{ alignItems: 'start' }}>
        <section className="card">
          <h3 className="section-title" style={{ marginBottom: 14 }}><Icon name="calendar" size={18} /> Historial (14 días)</h3>
          <div className="hist" role="img" aria-label="Retos completados por día en los últimos 14 días">
            {hist.map((h) => (
              <div
                key={h.date}
                className={`hist-col ${h.done === h.total ? 'full' : h.done > 0 ? 'part' : ''}`}
                style={{ height: `${Math.max(8, (h.done / h.total) * 100)}%` }}
                title={`${h.date}: ${h.done}/${h.total}`}
              />
            ))}
          </div>
          <div className="row tiny faint" style={{ justifyContent: 'space-between', marginTop: 6 }}>
            <span>Hace 14 días</span>
            <span>Hoy</span>
          </div>
          <p className="small muted" style={{ marginTop: 10 }}>
            {hist.filter((h) => h.done >= 3).length} días productivos (3+ retos) en las últimas 2 semanas.
          </p>
        </section>

        <section className="card">
          <h3 className="section-title" style={{ marginBottom: 12 }}><Icon name="mic" size={18} /> Prácticas recientes</h3>
          {recent.length ? (
            <div className="stack-sm">
              {recent.map((p) => (
                <div key={p.id} className="row small">
                  <Icon name={p.kind === 'simulador' ? 'mic' : 'shield'} size={16} className="faint" />
                  <span style={{ flex: 1 }}>{p.label}</span>
                  <span className="tiny faint">{formatDateTime(p.date)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="small muted">Aún no has practicado. Una simulación de 3 minutos al día hace una gran diferencia.</p>
          )}
          <div className="row" style={{ marginTop: 14, gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-sm btn-primary" onClick={() => navigate('/simulador')}><Icon name="mic" size={15} /> Simulador</button>
            <button className="btn btn-sm" onClick={() => navigate('/objeciones')}><Icon name="shield" size={15} /> Objeciones</button>
          </div>
        </section>
      </div>
    </>
  );
}
