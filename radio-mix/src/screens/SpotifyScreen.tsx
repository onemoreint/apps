import { useState } from 'react';
import { Info, Plus } from 'lucide-react';
import { useCatalog, sortedCategories } from '@/state/catalog';
import { useLibrary } from '@/state/library';
import { parseSpotifyPlaylist } from '@/lib/validate';
import { PlaylistCard } from '@/spotify/PlaylistViews';
import { fetchOEmbed, playlistUrl } from '@/spotify/spotify';
import { Section } from '@/components/Section';
import { Empty } from './Home';

export function SpotifyScreen() {
  const catalog = useCatalog();
  const my = useLibrary((s) => s.myPlaylists);
  const add = useLibrary((s) => s.addMyPlaylist);
  const remove = useLibrary((s) => s.removeMyPlaylist);
  const [link, setLink] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const cats = sortedCategories(catalog).filter((c) => catalog.playlists.some((p) => p.categoryId === c.id));

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const id = parseSpotifyPlaylist(link);
    if (!id) {
      setMsg({ ok: false, text: 'Pega un enlace de playlist de Spotify, por ejemplo https://open.spotify.com/playlist/…' });
      return;
    }
    setBusy(true);
    try {
      const m = await fetchOEmbed(id);
      add({ id, url: playlistUrl(id), categoryId: 'personal', title: m.title, thumbnail: m.thumbnail_url });
      setMsg({ ok: true, text: `Añadida: ${m.title}` });
      setLink('');
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-7">
      <header>
        <h1 className="font-display text-3xl font-extrabold">Spotify</h1>
        <p className="mt-1 flex gap-2 text-sm text-muted">
          <Info size={16} className="mt-0.5 shrink-0" />
          Las playlists se escuchan con el reproductor oficial de Spotify. Es independiente de la radio: la radio transmite con sus propias fuentes autorizadas.
        </p>
      </header>

      {cats.length ? (
        cats.map((c) => (
          <Section key={c.id} title={`${c.glyph} ${c.name}`}>
            <div className="scroll-x -mx-4 flex gap-4 overflow-x-auto px-4 pb-1">
              {catalog.playlists
                .filter((p) => p.categoryId === c.id)
                .map((p) => (
                  <PlaylistCard key={p.id} playlist={p} />
                ))}
            </div>
          </Section>
        ))
      ) : (
        <Empty text="La radio aún no ha publicado playlists recomendadas." />
      )}

      <Section title="Mis playlists">
        <form onSubmit={onAdd} className="flex gap-2">
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Pega el enlace de una playlist de Spotify"
            className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent/60"
            aria-label="Enlace de playlist de Spotify"
            inputMode="url"
          />
          <button type="submit" disabled={busy} className="inline-flex items-center gap-1 rounded-xl bg-[#1ed760] px-4 text-sm font-bold text-black disabled:opacity-60">
            <Plus size={16} /> Añadir
          </button>
        </form>
        {msg && <p className={`mt-2 text-sm ${msg.ok ? 'text-accent-3' : 'text-accent'}`}>{msg.text}</p>}
        {my.length ? (
          <div className="scroll-x -mx-4 mt-4 flex gap-4 overflow-x-auto px-4 pb-1">
            {my.map((p) => (
              <PlaylistCard key={p.id} playlist={p} onRemove={() => remove(p.id)} />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted">Se guardan solo en este dispositivo. Funciona con playlists públicas.</p>
        )}
      </Section>
    </div>
  );
}
