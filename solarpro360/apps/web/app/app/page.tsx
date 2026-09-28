'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '../../components/TopBar';
import { api, getSupabase } from '../../lib/client';

interface Me {
  user: { id: string; email: string; isSuperAdmin: boolean };
  role: string | null;
  permissions: string[];
  memberships: Array<{ companyId: string; legalName: string; tradeName: string | null; countryCode: string; role: string }>;
}

/** Hoja de ruta del §51. Solo el Módulo 0 está construido. */
const MODULES = [
  { n: 0, title: 'Arquitectura, seguridad y modelo de datos', done: true },
  { n: 1, title: 'Empresa + configuración CO/VE' },
  { n: 2, title: 'Clientes + proyectos' },
  { n: 3, title: 'Diagnóstico energético' },
  { n: 4, title: 'Dimensionamiento solar' },
  { n: 5, title: 'Catálogo, costos y mano de obra' },
  { n: 6, title: 'Presupuesto' },
  { n: 7, title: 'Propuesta PDF' },
  { n: 8, title: 'Dashboard, usuarios y SaaS' },
  { n: 9, title: 'SolarAI' },
  { n: 10, title: 'Multiusuario avanzado' },
  { n: 11, title: 'Inventario' },
  { n: 12, title: 'CRM' },
  { n: 13, title: 'Financiación' },
  { n: 14, title: 'Portal del cliente' },
];

const STORAGE_KEY = 'solarpro.activeCompany';

export default function AppHome() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [company, setCompany] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {}
    api<Me>('/api/auth/me', { companyId: stored })
      .then((m) => {
        setMe(m);
        const valid = m.memberships.find((x) => x.companyId === stored)?.companyId ?? m.memberships[0]?.companyId ?? null;
        setCompany(valid);
      })
      .catch((e: Error) => (e.message === 'Sesión no iniciada' ? router.replace('/login') : setError(e.message)));
  }, [router]);

  function selectCompany(id: string) {
    setCompany(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {}
  }

  async function logout() {
    await api('/api/auth/logout-event', { method: 'POST' }).catch(() => {});
    await getSupabase()?.auth.signOut();
    router.replace('/login');
  }

  const active = me?.memberships.find((m) => m.companyId === company);

  return (
    <>
      <TopBar right={me && <button className="btn secondary" onClick={logout}>Salir</button>} />
      <main className="wrap" style={{ paddingTop: 24, paddingBottom: 48 }}>
        {error && <p className="error">{error}</p>}
        {!me && !error && <p className="muted">Cargando…</p>}
        {me && (
          <>
            <div className="card" style={{ marginBottom: 16 }}>
              <p className="muted" style={{ margin: 0 }}>{me.user.email}{me.user.isSuperAdmin ? ' · SUPER_ADMIN' : ''}</p>
              {me.memberships.length === 0 ? (
                <p className="notice">Su usuario aún no pertenece a ninguna empresa. Solicite acceso a un administrador.</p>
              ) : (
                <>
                  <label htmlFor="company">Empresa activa</label>
                  <select id="company" value={company ?? ''} onChange={(e) => selectCompany(e.target.value)}>
                    {me.memberships.map((m) => (
                      <option key={m.companyId} value={m.companyId}>
                        {m.tradeName ?? m.legalName} · {m.countryCode} · {m.role}
                      </option>
                    ))}
                  </select>
                  {active && <p className="muted">Rol en esta empresa: <strong>{active.role}</strong></p>}
                </>
              )}
            </div>
            <h2>Hoja de ruta</h2>
            <div className="grid">
              {MODULES.map((m) => (
                <div key={m.n} className="card module">
                  <span className="n">MÓDULO {m.n}</span>
                  <h3>{m.title}</h3>
                  <span className={`badge ${m.done ? 'done' : ''}`}>{m.done ? 'Base lista' : 'Pendiente'}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
