import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import type { ActivityLog, ChallengeCheck, Contact, Interaction, Member, NextBestAction, PracticeLog } from '../domain/models';
import { DEFAULT_COMPANY, type CompanyConfig } from '../config/companyConfig';
import { SETTINGS } from '../services/dataService';
import { buildRadar, type RadarResult } from '../domain/engine/radar';

export interface AppData {
  now: Date;
  contacts: Contact[];
  interactions: Interaction[];
  members: Member[];
  logs: ActivityLog[];
  checks: ChallengeCheck[];
  practice: PracticeLog[];
  userName: string;
  userFullName: string;
  company: CompanyConfig;
  demoActive: boolean;
  radar: RadarResult;
  actionByContact: Map<string, NextBestAction>;
  contactById: Map<string, Contact>;
}

const Ctx = createContext<AppData | null>(null);

export function useData(): AppData {
  const v = useContext(Ctx);
  if (!v) throw new Error('useData fuera de DataProvider');
  return v;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    const onVis = () => document.visibilityState === 'visible' && setNow(new Date());
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const contacts = useLiveQuery(() => db.contacts.toArray(), []);
  const interactions = useLiveQuery(() => db.interactions.toArray(), []);
  const members = useLiveQuery(() => db.members.toArray(), []);
  const logs = useLiveQuery(() => db.activityLogs.toArray(), []);
  const checks = useLiveQuery(() => db.challengeChecks.toArray(), []);
  const practice = useLiveQuery(() => db.practice.toArray(), []);
  const settings = useLiveQuery(() => db.settings.toArray(), []);

  const value = useMemo<AppData | null>(() => {
    if (!contacts || !interactions || !members || !logs || !checks || !practice || !settings) return null;
    const s = new Map(settings.map((x) => [x.key, x.value]));
    const stored = (s.get(SETTINGS.company) as Partial<CompanyConfig> | undefined) ?? {};
    const company: CompanyConfig = { ...DEFAULT_COMPANY, ...stored, colors: { ...DEFAULT_COMPANY.colors, ...(stored.colors ?? {}) } };
    const radar = buildRadar(contacts, interactions, now);
    return {
      now,
      contacts,
      interactions,
      members,
      logs,
      checks,
      practice,
      userName: (s.get(SETTINGS.userName) as string) || 'Networker',
      userFullName: (s.get(SETTINGS.userFullName) as string) || 'Networker',
      company,
      demoActive: !!s.get(SETTINGS.demoActive),
      radar,
      actionByContact: new Map(radar.all.map((a) => [a.contactId, a])),
      contactById: new Map(contacts.map((c) => [c.id, c])),
    };
  }, [contacts, interactions, members, logs, checks, practice, settings, now]);

  useEffect(() => {
    if (!value) return;
    const r = document.documentElement.style;
    r.setProperty('--accent', value.company.colors.accent);
    r.setProperty('--accent-2', value.company.colors.accent2);
  }, [value?.company.colors.accent, value?.company.colors.accent2]);

  if (!value)
    return (
      <div className="lock">
        <div className="muted">Cargando…</div>
      </div>
    );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
