/**
 * Almacén JSON mínimo sobre localStorage, con un espacio de nombres por modo
 * ('local' o 'demo') para que la demostración nunca toque datos reales.
 * Pensado para decenas de miles de filas; no es un reemplazo de Postgres.
 */
export interface StoredUser {
  id: string
  email: string
  fullName: string
  locale: 'es' | 'en'
  passwordHash: string
  salt: string
  createdAt: string
}

export interface LocalTables {
  version: 1
  users: StoredUser[]
  organizations: import('../types').Organization[]
  memberships: import('../types').Membership[]
  settings: import('../types').OrgSettings[]
  sessionUserId: string | null
}

const empty = (): LocalTables => ({
  version: 1,
  users: [],
  organizations: [],
  memberships: [],
  settings: [],
  sessionUserId: null,
})

export class LocalStore {
  private readonly key: string
  private memory: LocalTables | null = null

  constructor(namespace: string, private readonly storage: Storage | null = safeStorage()) {
    this.key = `ip.${namespace}.db`
  }

  read(): LocalTables {
    if (this.memory) return this.memory
    let data = empty()
    try {
      const raw = this.storage?.getItem(this.key)
      if (raw) data = { ...empty(), ...(JSON.parse(raw) as Partial<LocalTables>) }
    } catch {
      data = empty()
    }
    this.memory = data
    return data
  }

  /** Aplica una mutación y persiste. Toda escritura pasa por aquí. */
  write<T>(mutate: (db: LocalTables) => T): T {
    const db = structuredClone(this.read())
    const result = mutate(db)
    this.memory = db
    try {
      this.storage?.setItem(this.key, JSON.stringify(db))
    } catch {
      // Almacenamiento lleno o bloqueado: los datos quedan en memoria durante la sesión.
    }
    return result
  }

  clear() {
    this.memory = empty()
    try {
      this.storage?.removeItem(this.key)
    } catch {
      /* sin almacenamiento */
    }
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}
