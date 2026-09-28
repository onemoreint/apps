'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '../../components/TopBar';
import { api, getSupabase } from '../../lib/client';

export default function LoginPage() {
  const router = useRouter();
  const sb = getSupabase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sb) return;
    setBusy(true);
    setError(null);
    const { error: authError } = await sb.auth.signInWithPassword({ email, password });
    if (authError) {
      setError('Credenciales inválidas.');
      setBusy(false);
      return;
    }
    await api('/api/auth/login-event', { method: 'POST' }).catch(() => {});
    router.push('/app');
  }

  return (
    <>
      <TopBar />
      <main className="wrap" style={{ maxWidth: 420, paddingTop: 48 }}>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Ingresar</h2>
          {!sb ? (
            <p className="notice">
              Supabase Auth no está configurado. Defina <code>NEXT_PUBLIC_SUPABASE_URL</code> y{' '}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en el archivo <code>.env</code>.
            </p>
          ) : (
            <form onSubmit={onSubmit}>
              <label htmlFor="email">Correo</label>
              <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              <label htmlFor="password">Contraseña</label>
              <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              {error && <p className="error">{error}</p>}
              <button className="btn" style={{ width: '100%', marginTop: 18 }} disabled={busy}>
                {busy ? 'Ingresando…' : 'Ingresar'}
              </button>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
