/** Borra y recrea la base de pruebas, aplica el shim y las migraciones. */
export function prepareTestDatabase(): Promise<string[]>;

/** Borra y recrea otra base desechable (nombre terminado en _test) con shim y migraciones. */
export function prepareDatabase(url: string): Promise<string[]>;
