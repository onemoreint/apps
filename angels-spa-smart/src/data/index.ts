import type { DataAdapter } from './adapter'
import { DemoAdapter } from './demoAdapter'
import { createSupabaseAdapter } from './supabaseAdapter'

export const APP_MODE: 'demo' | 'production' = import.meta.env.VITE_APP_MODE === 'production' ? 'production' : 'demo'

export function createAdapter(): DataAdapter {
  return APP_MODE === 'production' ? createSupabaseAdapter() : new DemoAdapter()
}
