import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { demoRepository, getStoredMode, repositoryFor, setStoredMode, type RepoMode } from '@/data'
import { startDemo } from '@/data/local/demo'
import type { DataRepository, SignUpInput, SignUpResult } from '@/data/repository'
import type { Session } from '@/data/types'

interface AuthContextValue {
  status: 'loading' | 'signed_out' | 'signed_in'
  session: Session | null
  repo: DataRepository
  mode: RepoMode
  signIn: (email: string, password: string) => Promise<void>
  signUp: (input: SignUpInput) => Promise<SignUpResult>
  signOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  enterDemo: () => void
  exitDemo: () => Promise<void>
  resetDemo: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<RepoMode>(getStoredMode)
  const repo = useMemo(() => repositoryFor(mode), [mode])
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<AuthContextValue['status']>('loading')

  useEffect(() => {
    let active = true
    setStatus('loading')
    repo.auth
      .getSession()
      .then((s) => {
        if (!active) return
        setSession(s)
        setStatus(s ? 'signed_in' : 'signed_out')
      })
      .catch(() => {
        if (!active) return
        setSession(null)
        setStatus('signed_out')
      })
    const off = repo.auth.onChange((s) => {
      if (!active) return
      setSession(s)
      setStatus(s ? 'signed_in' : 'signed_out')
    })
    return () => {
      active = false
      off()
    }
  }, [repo])

  const switchMode = useCallback(
    (next: RepoMode) => {
      setStoredMode(next)
      queryClient.clear() // nunca mezclar caché de demo con datos reales
      setMode(next)
    },
    [queryClient],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      repo,
      mode,
      signIn: async (email, password) => {
        await repo.auth.signIn(email, password)
      },
      signUp: (input) => repo.auth.signUp(input),
      signOut: async () => {
        await repo.auth.signOut()
        queryClient.clear()
      },
      requestPasswordReset: (email) => repo.auth.requestPasswordReset(email),
      enterDemo: () => {
        startDemo(demoRepository())
        switchMode('demo')
      },
      exitDemo: async () => {
        await demoRepository().auth.signOut()
        switchMode('default')
      },
      resetDemo: () => {
        const demo = demoRepository()
        demo.store.clear()
        startDemo(demo)
        queryClient.clear()
        void demo.auth.getSession().then((s) => setSession(s))
      },
    }),
    [status, session, repo, mode, queryClient, switchMode],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
