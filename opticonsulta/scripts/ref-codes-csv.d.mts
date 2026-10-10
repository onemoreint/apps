export function parseCsv(text: string, delimiter?: string): string[][];
export function toRefCodes(
  rows: string[][],
  options?: { codeColumn?: number; labelColumn?: number; header?: boolean },
): { codes: { code: string; label: string }[]; rejected: { line: number; reason: string }[] };
