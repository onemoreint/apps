import { useState, type FormEvent } from 'react';
import { db } from '@/shared/lib/supabase';
import { adminMessage } from '@/shared/lib/errors';
import { Button, Field, Input } from '../ui';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await db().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) setError(adminMessage(err));
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Panel del restaurante</h1>
      <p className="mt-2 text-ink-2">Entra para cambiar precios, marcar agotados y ver tus pedidos.</p>
      <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
        <Field label="Correo" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Contraseña" htmlFor="password">
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <Button type="submit" busy={busy} disabled={!email || !password} className="w-full">
          Entrar
        </Button>
      </form>
      <a href={import.meta.env.BASE_URL} className="mt-10 text-sm text-ink-3 underline underline-offset-2">
        Volver al inicio
      </a>
    </main>
  );
}
