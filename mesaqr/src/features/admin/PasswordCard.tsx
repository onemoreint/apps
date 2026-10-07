import { useState } from 'react';
import { db } from '@/shared/lib/supabase';
import { adminMessage } from '@/shared/lib/errors';
import { toast } from '@/shared/ui/Toast';
import { Button, Card, Field, Input } from './ui';

/** Cambiar la contraseña del panel (la inicial es temporal). */
export function PasswordCard() {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const tooShort = pw.length > 0 && pw.length < 8;
  const mismatch = pw2.length > 0 && pw !== pw2;

  const save = async () => {
    setBusy(true);
    const { error } = await db().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) toast(/weak|short|least/i.test(error.message) ? 'La contraseña es muy débil. Usa al menos 8 caracteres.' : adminMessage(error), 'warn');
    else {
      setPw('');
      setPw2('');
      toast('Contraseña actualizada');
    }
  };

  return (
    <Card className="space-y-3">
      <h2 className="font-display text-lg font-bold">Contraseña del panel</h2>
      <Field label="Nueva contraseña" htmlFor="pw1" error={tooShort ? 'Mínimo 8 caracteres.' : null}>
        <Input id="pw1" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={tooShort} />
      </Field>
      <Field label="Repítela" htmlFor="pw2" error={mismatch ? 'No coinciden.' : null}>
        <Input id="pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} aria-invalid={mismatch} />
      </Field>
      <Button busy={busy} disabled={pw.length < 8 || pw !== pw2} onClick={() => void save()}>
        Cambiar contraseña
      </Button>
    </Card>
  );
}
