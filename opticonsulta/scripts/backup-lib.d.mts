import type pg from "pg";
export type Manifest = {
  counts: Record<string, number>;
  integrity: Record<string, number>;
  dump: { file: string; sha256: string };
  migrations: { file: string; sha256: string }[];
};
export function backupDatabase(sourceUrl: string, outDir: string): Promise<Manifest>;
export function restoreDatabase(
  targetUrl: string,
  backupDir: string,
): Promise<{
  ok: boolean;
  countDiffs: { table: string; expected: number; actual: number | null }[];
  integrityFailures: { check: string; n: number }[];
  counts: Record<string, number>;
  integrity: Record<string, number>;
}>;
export function integrityChecks(client: pg.Client): Promise<Record<string, number>>;
export function tableCounts(client: pg.Client): Promise<Record<string, number>>;
