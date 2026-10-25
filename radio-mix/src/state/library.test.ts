import { describe, expect, it, vi } from 'vitest';

describe('favoritos', () => {
  it('se guardan y se conservan al recargar la app', async () => {
    localStorage.clear();
    const { useLibrary } = await import('./library');
    useLibrary.getState().toggleFavorite('clasica-musopen');
    useLibrary.getState().toggleFavorite('calma-km');
    useLibrary.getState().toggleFavorite('calma-km');
    expect(useLibrary.getState().favorites).toEqual(['clasica-musopen']);

    // Simula una recarga: módulo nuevo que lee de localStorage.
    vi.resetModules();
    const fresh = await import('./library');
    expect(fresh.useLibrary.getState().favorites).toEqual(['clasica-musopen']);
  });

  it('recientes sin duplicados y como máximo 12', async () => {
    const { useLibrary } = await import('./library');
    for (let i = 0; i < 15; i++) useLibrary.getState().pushRecent(`s${i}`);
    useLibrary.getState().pushRecent('s3');
    const r = useLibrary.getState().recents;
    expect(r[0]).toBe('s3');
    expect(r).toHaveLength(12);
    expect(new Set(r).size).toBe(12);
  });
});
