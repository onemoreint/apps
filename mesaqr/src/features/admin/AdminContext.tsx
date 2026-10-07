import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { db } from '@/shared/lib/supabase';
import { adminMessage } from '@/shared/lib/errors';
import type { Business } from './types';
import { must } from './lib';

interface AdminState {
  session: Session;
  business: Business;
  role: 'owner' | 'admin' | 'staff';
  setBusiness: (b: Business) => void;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AdminState | null>(null);

export function useAdmin(): AdminState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAdmin fuera de AdminProvider');
  return v;
}

type Phase =
  | { kind: 'checking' }
  | { kind: 'signed-out' }
  | { kind: 'no-business'; session: Session }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; session: Session; business: Business; role: AdminState['role'] };

export function useAdminSession() {
  const [phase, setPhase] = useState<Phase>({ kind: 'checking' });

  const resolve = useCallback(async (session: Session | null) => {
    if (!session) {
      setPhase({ kind: 'signed-out' });
      return;
    }
    try {
      const rows = must(
        await db()
          .from('business_members')
          .select('role, businesses(*)')
          .eq('user_id', session.user.id)
          .limit(1),
      ) as unknown as { role: AdminState['role']; businesses: Business | null }[];
      const row = rows[0];
      if (!row?.businesses) setPhase({ kind: 'no-business', session });
      else setPhase({ kind: 'ready', session, business: row.businesses, role: row.role });
    } catch (e) {
      setPhase({ kind: 'error', message: adminMessage(e) });
    }
  }, []);

  useEffect(() => {
    const client = db();
    void client.auth.getSession().then(({ data }) => resolve(data.session));
    const { data: sub } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') void resolve(session);
    });
    return () => sub.subscription.unsubscribe();
  }, [resolve]);

  return { phase, setPhase };
}

export function AdminProvider({
  session,
  business,
  role,
  onBusiness,
  children,
}: {
  session: Session;
  business: Business;
  role: AdminState['role'];
  onBusiness: (b: Business) => void;
  children: ReactNode;
}) {
  const signOut = async () => {
    await db().auth.signOut();
  };
  return <Ctx.Provider value={{ session, business, role, setBusiness: onBusiness, signOut }}>{children}</Ctx.Provider>;
}
