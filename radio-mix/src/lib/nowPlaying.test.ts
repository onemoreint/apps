import { describe, expect, it } from 'vitest';
import { parseAzuraCast, parseIcecast } from './nowPlaying';

describe('metadatos de servidores de radio', () => {
  it('Icecast: separa artista y título del campo title', () => {
    const json = { icestats: { source: [{ listenurl: 'http://x:8000/otra', title: 'No' }, { listenurl: 'http://x:8000/radio.mp3', title: 'Joe Arroyo - La Rebelión' }] } };
    expect(parseIcecast(json, 'https://x.com/radio.mp3')).toEqual({ artist: 'Joe Arroyo', title: 'La Rebelión' });
  });
  it('Icecast sin título devuelve null (no se inventa nada)', () => {
    expect(parseIcecast({ icestats: { source: { listenurl: 'x' } } })).toBeNull();
    expect(parseIcecast({})).toBeNull();
  });
  it('AzuraCast', () => {
    const json = { now_playing: { song: { title: 'Tema', artist: 'Artista', album: '', art: 'https://x/a.jpg', text: 'Artista - Tema' } } };
    expect(parseAzuraCast(json)).toEqual({ title: 'Tema', artist: 'Artista', album: undefined, artwork: 'https://x/a.jpg' });
    expect(parseAzuraCast({ now_playing: { song: {} } })).toBeNull();
  });
});
