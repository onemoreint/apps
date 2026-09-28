import Link from 'next/link';
import { TopBar } from '../components/TopBar';

const FLOW = ['Empresa', 'Cliente', 'Proyecto', 'Diagnóstico', 'Dimensionamiento', 'Equipos', 'Materiales', 'Costos', 'Precio', 'Propuesta PDF'];

export default function Home() {
  return (
    <>
      <TopBar right={<Link className="btn" href="/login">Ingresar</Link>} />
      <main className="wrap">
        <section className="hero">
          <h1>
            Del consumo del cliente a la <span>propuesta solar</span>.
          </h1>
          <p>
            Diagnóstico energético, dimensionamiento fotovoltaico, materiales, costos y cotización en una sola plataforma
            multiempresa para Colombia y Venezuela.
          </p>
          <div className="flow">
            {FLOW.map((f) => (
              <span key={f}>{f}</span>
            ))}
          </div>
          <Link className="btn" href="/login">Ingresar a la plataforma</Link>
        </section>
        <section className="grid" style={{ paddingBottom: 48 }}>
          <div className="card"><h3>Cálculos verificables</h3><p className="muted">Cada resultado muestra fórmula, variables, supuestos y advertencias.</p></div>
          <div className="card"><h3>Multiempresa real</h3><p className="muted">Aislamiento por empresa en la base de datos, no solo en la interfaz.</p></div>
          <div className="card"><h3>Normativa versionada</h3><p className="muted">Perfiles por país. El sistema señala revisiones; no certifica cumplimiento.</p></div>
        </section>
      </main>
    </>
  );
}
