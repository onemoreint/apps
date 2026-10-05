import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/features/auth/auth-context'
import { applyBrand } from '@/lib/brand'
import { can, type Permission } from '@/lib/permissions'
import type { MyOrganization, NewOrganizationInput, OrganizationPatch } from '@/data/types'

interface OrganizationContextValue {
  status: 'loading' | 'error' | 'ready'
  organizations: MyOrganization[]
  active: MyOrganization | null
  setActive: (id: string) => void
  create: (input: NewOrganizationInput) => Promise<MyOrganization>
  update: (patch: OrganizationPatch) => Promise<void>
  can: (permission: Permission) => boolean
  refetch: () => void
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null)

const activeKey = (mode: string, userId: string) => `ip.activeOrg.${mode}.${userId}`

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { repo, session, mode } = useAuth()
  const queryClient = useQueryClient()
  const userId = session?.user.id ?? 'anon'
  const queryKey = useMemo(() => ['organizations', mode, userId] as const, [mode, userId])

  const query = useQuery({
    queryKey,
    queryFn: () => repo.organizations.listMine(),
    enabled: Boolean(session),
  })

  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    try {
      setActiveId(localStorage.getItem(activeKey(mode, userId)))
    } catch {
      setActiveId(null)
    }
  }, [mode, userId])

  const organizations = useMemo(() => query.data ?? [], [query.data])
  const active = organizations.find((o) => o.id === activeId) ?? organizations[0] ?? null

  useEffect(() => {
    applyBrand(active ? { primary: active.primaryColor, secondary: active.secondaryColor } : null)
  }, [active])

  const setActive = useCallback(
    (id: string) => {
      setActiveId(id)
      try {
        localStorage.setItem(activeKey(mode, userId), id)
      } catch {
        /* sin almacenamiento */
      }
    },
    [mode, userId],
  )

  const createMutation = useMutation({
    mutationFn: (input: NewOrganizationInput) => repo.organizations.create(input),
    onSuccess: (org) => {
      queryClient.setQueryData<MyOrganization[]>(queryKey, (prev) => [...(prev ?? []), org])
      setActive(org.id)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: OrganizationPatch }) => repo.organizations.update(id, patch),
    onSuccess: (org) => {
      queryClient.setQueryData<MyOrganization[]>(queryKey, (prev) =>
        (prev ?? []).map((o) => (o.id === org.id ? { ...org, role: o.role } : o)),
      )
    },
  })

  const value = useMemo<OrganizationContextValue>(
    () => ({
      status: query.isPending ? 'loading' : query.isError ? 'error' : 'ready',
      organizations,
      active,
      setActive,
      create: (input) => createMutation.mutateAsync(input),
      update: async (patch) => {
        if (!active) return
        await updateMutation.mutateAsync({ id: active.id, patch })
      },
      can: (permission) => can(active?.role, permission),
      refetch: () => void query.refetch(),
    }),
    [query, organizations, active, setActive, createMutation, updateMutation],
  )

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext)
  if (!ctx) throw new Error('useOrganization debe usarse dentro de OrganizationProvider')
  return ctx
}
