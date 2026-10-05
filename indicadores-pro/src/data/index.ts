import { getSupabase } from './supabase/client'
import { SupabaseRepository } from './supabase/supabase-repository'
import { LocalRepository } from './local/local-repository'
import type { DataRepository } from './repository'

export type RepoMode = 'default' | 'demo'

const MODE_KEY = 'ip.mode'
let primary: DataRepository | null = null
let demo: LocalRepository | null = null

/** Repositorio "real": Supabase si está configurado, si no el almacenamiento local del navegador. */
export function primaryRepository(): DataRepository {
  if (!primary) {
    const sb = getSupabase()
    primary = sb ? new SupabaseRepository(sb) : new LocalRepository('local')
  }
  return primary
}

/** Repositorio de demostración: siempre local y en su propio espacio, nunca toca datos reales. */
export function demoRepository(): LocalRepository {
  if (!demo) demo = new LocalRepository('demo')
  return demo
}

export function repositoryFor(mode: RepoMode): DataRepository {
  return mode === 'demo' ? demoRepository() : primaryRepository()
}

export function getStoredMode(): RepoMode {
  try {
    return localStorage.getItem(MODE_KEY) === 'demo' ? 'demo' : 'default'
  } catch {
    return 'default'
  }
}

export function setStoredMode(mode: RepoMode) {
  try {
    if (mode === 'demo') localStorage.setItem(MODE_KEY, 'demo')
    else localStorage.removeItem(MODE_KEY)
  } catch {
    /* sin almacenamiento */
  }
}

export type { DataRepository } from './repository'
