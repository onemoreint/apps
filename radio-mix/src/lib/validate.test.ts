import { describe, expect, it } from 'vitest';
import catalogJson from '@/data/catalog.json';
import { checkHttpsUrl, detectFormat, isPlayable, parseCatalog, parseSpotifyPlaylist, slugify, stationIssues } from './validate';
import type { Station } from './types';

const base: Station = {
  id: 'x',
  name: 'Prueba',
  categoryId: 'salsa',
  description: '',
  kind: 'stream',
  streamUrl: 'https://stream.example.com/radio.mp3',
  format: 'auto',
  active: true,
  license: { name: 'Licencia OSA', notes: 'ok' },
};

describe('checkHttpsUrl', () => {
  it('acepta https público', () => expect(checkHttpsUrl('https://a.example.com:8000/live').ok).toBe(true));
  it.each([
    ['http://a.example.com/live', 'https'],
    ['javascript:alert(1)', 'https'],
    ['https://user:pw@a.example.com/x', 'usuario'],
    ['https://localhost/x', 'locales'],
    ['https://192.168.1.10/x', 'locales'],
    ['https://10.0.0.1/x', 'locales'],
    ['nada', 'válida'],
    ['', 'vacía'],
  ])('rechaza %s', (url, msg) => {
    const r = checkHttpsUrl(url);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(msg);
  });
});

describe('detectFormat', () => {
  it('reconoce HLS, AAC, OGG y MP3', () => {
    expect(detectFormat('https://x.com/a/playlist.m3u8?t=1')).toBe('hls');
    expect(detectFormat('https://x.com/a.aac')).toBe('aac');
    expect(detectFormat('https://x.com/a.opus')).toBe('ogg');
    expect(detectFormat('https://x.com/stream')).toBe('mp3');
    expect(detectFormat('https://x.com/stream', 'aac')).toBe('aac');
  });
});

describe('parseSpotifyPlaylist', () => {
  it('extrae el id de enlaces y URIs', () => {
    expect(parseSpotifyPlaylist('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc')).toBe('37i9dQZF1DXcBWIGoYBM5M');
    expect(parseSpotifyPlaylist('https://open.spotify.com/intl-es/playlist/37i9dQZF1DXcBWIGoYBM5M')).toBe('37i9dQZF1DXcBWIGoYBM5M');
    expect(parseSpotifyPlaylist('spotify:playlist:37i9dQZF1DXcBWIGoYBM5M')).toBe('37i9dQZF1DXcBWIGoYBM5M');
  });
  it('rechaza lo que no es una playlist de Spotify', () => {
    expect(parseSpotifyPlaylist('https://open.spotify.com/track/37i9dQZF1DXcBWIGoYBM5M')).toBeNull();
    expect(parseSpotifyPlaylist('https://evil.com/playlist/37i9dQZF1DXcBWIGoYBM5M')).toBeNull();
  });
});

describe('stationIssues', () => {
  it('una emisora correcta no tiene problemas', () => expect(stationIssues(base)).toEqual([]));
  it('exige licencia: sin permiso no se reproduce', () => {
    const s = { ...base, license: { name: '', notes: '' } };
    expect(stationIssues(s).join()).toContain('licencia');
    expect(isPlayable(s)).toBe(false);
  });
  it('exige URL https válida', () => expect(isPlayable({ ...base, streamUrl: 'http://x.com/a' })).toBe(false));
  it('una emisora desactivada no es reproducible', () => expect(isPlayable({ ...base, active: false })).toBe(false));
});

describe('catálogo publicado', () => {
  const c = parseCatalog(catalogJson);
  it('tiene las 19 categorías pedidas', () => expect(c.categories).toHaveLength(19));
  it('todas las emisoras publicadas son válidas, tienen licencia y fecha de verificación', () => {
    for (const s of c.stations) {
      expect(stationIssues(s)).toEqual([]);
      expect(s.license.notes.length).toBeGreaterThan(10);
      expect(s.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(c.categories.some((x) => x.id === s.categoryId)).toBe(true);
    }
  });
  it('las obras CC BY llevan atribución', () => {
    for (const s of c.stations.filter((x) => x.license.name.startsWith('CC BY'))) expect(s.license.attribution).toBeTruthy();
  });
  it('rechaza catálogos mal formados o con ids repetidos', () => {
    expect(() => parseCatalog({})).toThrow();
    expect(() => parseCatalog({ ...c, stations: [c.stations[0], c.stations[0]] })).toThrow(/repetido/);
  });
});

it('slugify quita tildes y símbolos', () => expect(slugify('Salsa Clásica & Romántica!')).toBe('salsa-clasica-romantica'));
