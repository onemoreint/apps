import { describe, expect, it, vi } from 'vitest';
import { buildProgram, describeFile, livePosition, loadProgram, parseLength, PROGRAM_EPOCH_MS, type ArchiveFile } from './archive';
import type { Track } from './types';

const files: ArchiveFile[] = [
  { name: 'Kevin MacLeod/Calming/Kevin MacLeod - 01 - Autumn Day.mp3', length: '200.5' },
  { name: 'Kevin MacLeod/Calming/Kevin MacLeod - 02 - Bathed in the Light.mp3', length: '100' },
  { name: 'Kevin MacLeod/Calming/cover.jpg' },
  { name: 'Kevin MacLeod/Hard Electronic/Kevin MacLeod - 01 - Blipotron.mp3', length: '150' },
  { name: 'Kevin MacLeod/Healing/Kevin MacLeod - 01 - Aretes.mp3', length: '04:00' },
  { name: 'Bach/JohannSebastianBach-01-Aria.mp3', length: '292', title: 'Johann Sebastian Bach - 01 - Goldberg Variations - Aria', creator: 'Shelley Katz' },
];

describe('parseLength', () => {
  it('entiende segundos y mm:ss / hh:mm:ss', () => {
    expect(parseLength('292.42')).toBeCloseTo(292.42);
    expect(parseLength('04:52')).toBe(292);
    expect(parseLength('1:00:00')).toBe(3600);
    expect(parseLength(undefined)).toBe(0);
    expect(parseLength('abc')).toBe(0);
  });
});

describe('describeFile', () => {
  it('usa el patrón "Artista - NN - Título" del nombre', () => {
    expect(describeFile(files[0]!, 'Kevin MacLeod')).toEqual({ title: 'Autumn Day', artist: 'Kevin MacLeod' });
  });
  it('prioriza metadatos del archivo y añade intérprete', () => {
    expect(describeFile(files[5]!)).toEqual({ title: 'Goldberg Variations - Aria', artist: 'Johann Sebastian Bach · Shelley Katz' });
  });
});

describe('buildProgram', () => {
  it('filtra por carpetas, solo mp3, y codifica la URL de descarga', () => {
    const t = buildProgram(files, { identifier: 'KM', folders: ['Kevin MacLeod/Calming', 'Kevin MacLeod/Healing'], defaultArtist: 'Kevin MacLeod' }, 'seed');
    expect(t.map((x) => x.title).sort()).toEqual(['Aretes', 'Autumn Day', 'Bathed in the Light']);
    expect(t.every((x) => x.url.startsWith('https://archive.org/download/KM/Kevin%20MacLeod/'))).toBe(true);
    // Las pistas de un mismo álbum se mantienen en orden.
    const calm = t.filter((x) => x.album === 'Calming').map((x) => x.title);
    expect(calm).toEqual(['Autumn Day', 'Bathed in the Light']);
  });
  it('es determinista: el mismo orden para todos los oyentes', () => {
    const src = { identifier: 'KM', folders: [] };
    expect(buildProgram(files, src, 'a').map((x) => x.url)).toEqual(buildProgram(files, src, 'a').map((x) => x.url));
  });
});

describe('livePosition', () => {
  const tracks: Track[] = [
    { url: 'a', title: 'A', artist: '', duration: 100 },
    { url: 'b', title: 'B', artist: '', duration: 50 },
  ];
  it('ubica la pista y el segundo exactos en la programación', () => {
    expect(livePosition(tracks, PROGRAM_EPOCH_MS)).toEqual({ index: 0, offset: 0 });
    expect(livePosition(tracks, PROGRAM_EPOCH_MS + 120_000)).toEqual({ index: 1, offset: 20 });
    // Da la vuelta al terminar (150 s por ciclo).
    expect(livePosition(tracks, PROGRAM_EPOCH_MS + 160_000)).toEqual({ index: 0, offset: 10 });
  });
  it('funciona con fechas anteriores al inicio y listas vacías', () => {
    expect(livePosition(tracks, PROGRAM_EPOCH_MS - 10_000)).toEqual({ index: 1, offset: 40 });
    expect(livePosition([], Date.now())).toEqual({ index: 0, offset: 0 });
  });
});

describe('loadProgram', () => {
  it('descarga la lista de archivos de Internet Archive y la guarda en caché', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ result: files }), { status: 200 }));
    const src = { identifier: 'KM-test', folders: ['Kevin MacLeod/Calming'] };
    const t = await loadProgram('st1', src, fetcher as unknown as typeof fetch);
    expect(fetcher).toHaveBeenCalledWith('https://archive.org/metadata/KM-test/files');
    expect(t).toHaveLength(2);
    await loadProgram('st1', src, fetcher as unknown as typeof fetch);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('informa errores del servidor', async () => {
    const fetcher = vi.fn(async () => new Response('x', { status: 503 }));
    await expect(loadProgram('st2', { identifier: 'caido', folders: [] }, fetcher as unknown as typeof fetch)).rejects.toThrow('503');
  });
});
