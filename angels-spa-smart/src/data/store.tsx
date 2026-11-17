import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { DataSnapshot } from '../types'
import type { DataAdapter } from './adapter'
import { DomainError } from './adapter'

interface StoreValue {
  data: DataSnapshot | null
  adapter: DataAdapter
  error: string | null
  refresh: () => Promise<void>
  /** Ejecuta una acción del adaptador, refresca los datos y traduce errores a mensajes claros. */
  run: <T>(fn: (a: DataAdapter) => Promise<T>) => Promise<{ ok: true; value: T } | { ok: false; error: string }>
}

const Ctx = createContext<StoreValue | null>(null)

export function StoreProvider({ adapter, children }: { adapter: DataAdapter; children: ReactNode }) {
  const [data, setData] = useState<DataSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setData(await adapter.load())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No fue posible cargar los datos.')
    }
  }, [adapter])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const run = useCallback<StoreValue['run']>(
    async (fn) => {
      try {
        const value = await fn(adapter)
        await refresh()
        return { ok: true, value }
      } catch (e) {
        const msg = e instanceof DomainError ? e.message : 'Ocurrió un error inesperado. Intenta de nuevo.'
        if (!(e instanceof DomainError)) console.error(e)
        return { ok: false, error: msg }
      }
    },
    [adapter, refresh],
  )

  const value = useMemo(() => ({ data, adapter, error, refresh, run }), [data, adapter, error, refresh, run])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore fuera de StoreProvider')
  return v
}

/** Para pantallas que requieren datos cargados. */
export function useData(): DataSnapshot {
  const { data } = useStore()
  if (!data) throw new Error('Datos no cargados')
  return data
}
