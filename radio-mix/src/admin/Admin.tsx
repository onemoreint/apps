import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, Download, Eye, Link2, Loader2, LogOut, Plus, RotateCcw, Save, Trash2, Upload, XCircle } from 'lucide-react';
import type { Catalog, Category, Station, SpotifyPlaylistRef } from '@/lib/types';
import { useCatalogStore } from '@/state/catalog';
import { checkHttpsUrl, parseCatalog, parseSpotifyPlaylist, slugify, stationIssues } from '@/lib/validate';
import { brand } from '@/config/brand';
import { Cover } from '@/components/Cover';
import * as sp from '@/spotify/spotify';
import { testSource, type SourceTest } from './testSource';

type Tab = 'emisoras' | 'categorias' | 'spotify' | 'publicar';

const input = 'w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-accent/60';
const btn = 'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition disabled:opacity-50';

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export default function Admin() {
  const { published, draft, previewDraft, saveDraft, discardDraft, setPreviewDraft } = useCatalogStore();
  const [work, setWork] = useState<Catalog>(() => clone(draft ?? published));
  const [tab, setTab] = useState<Tab>('emisoras');
  const dirty = JSON.stringify(work) !== JSON.stringify(draft ?? published);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const tabs: Array<[Tab, string]> = [
    ['emisoras', 'Emisoras'],
    ['categorias', 'Categorías'],
    ['spotify', 'Spotify'],
    ['publicar', 'Publicar'],
  ];

  return (
    <div className="space-y-5 pb-10">
      <header>
        <h1 className="font-display text-3xl font-extrabold">Panel de administración</h1>
        <p className="mt-1 text-sm text-muted">
          Los cambios se guardan como <b className="text-white">borrador en este navegador</b>. Nadie más los ve hasta que los publiques (pestaña Publicar). Publicar exige tu cuenta de GitHub, que es la
          protección real del catálogo.
        </p>
      </header>

      <div className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-2 border-b border-line bg-ink/95 px-4 py-2 backdrop-blur">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`${btn} ${tab === id ? 'bg-white text-ink' : 'text-soft hover:bg-white/10'}`}>
            {label}
          </button>
        ))}
        <span className="flex-1" />
        <button type="button" disabled={!dirty} onClick={() => saveDraft(work)} className={`${btn} bg-accent text-ink`}>
          <Save size={16} /> Guardar borrador
        </button>
      </div>

      {tab === 'emisoras' && <StationsTab work={work} setWork={setWork} />}
      {tab === 'categorias' && <CategoriesTab work={work} setWork={setWork} />}
      {tab === 'spotify' && <SpotifyTab work={work} setWork={setWork} />}
      {tab === 'publicar' && (
        <PublishTab
          work={work}
          setWork={setWork}
          hasDraft={!!draft}
          previewDraft={previewDraft}
          setPreviewDraft={(v) => {
            if (dirty) saveDraft(work);
            setPreviewDraft(v);
          }}
          discard={() => {
            if (window.confirm('¿Descartar el borrador y volver al catálogo publicado?')) {
              discardDraft();
              setWork(clone(published));
            }
          }}
        />
      )}
    </div>
  );
}

type WorkProps = { work: Catalog; setWork: (c: Catalog) => void };

/* ───────────── Emisoras ───────────── */

function emptyStation(categoryId: string): Station {
  return {
    id: '',
    name: '',
    categoryId,
    description: '',
    kind: 'stream',
    streamUrl: '',
    format: 'auto',
    active: true,
    popular: false,
    license: { name: '', notes: '' },
  };
}

function StationsTab({ work, setWork }: WorkProps) {
  const [editing, setEditing] = useState<Station | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [tests, setTests] = useState<Record<string, SourceTest | 'running'>>({});
  const catName = new Map(work.categories.map((c) => [c.id, c.name]));

  async function runTest(s: Station) {
    setTests((t) => ({ ...t, [s.id]: 'running' }));
    const r = await testSource(s);
    setTests((t) => ({ ...t, [s.id]: r }));
  }

  if (editing) {
    return (
      <StationForm
        station={editing}
        isNew={isNew}
        categories={work.categories}
        existingIds={work.stations.map((s) => s.id)}
        onCancel={() => setEditing(null)}
        onSave={(s) => {
          const stations = isNew ? [...work.stations, s] : work.stations.map((x) => (x.id === editing.id ? s : x));
          setWork({ ...work, stations });
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setIsNew(true);
            setEditing(emptyStation(work.categories[0]?.id ?? ''));
          }}
          className={`${btn} bg-white/10 hover:bg-white/15`}
        >
          <Plus size={16} /> Nueva emisora
        </button>
        <button type="button" onClick={() => work.stations.forEach((s) => void runTest(s))} className={`${btn} bg-white/10 hover:bg-white/15`}>
          <CheckCircle2 size={16} /> Comprobar todas
        </button>
      </div>
      {work.stations.map((s) => {
        const issues = stationIssues(s);
        const t = tests[s.id];
        return (
          <div key={s.id} className="rounded-2xl border border-line bg-surface p-3">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {s.name} {!s.active && <span className="ml-1 rounded bg-white/10 px-1.5 text-[11px] text-muted">desactivada</span>}
                </p>
                <p className="text-xs text-muted">
                  {catName.get(s.categoryId) ?? '¿Sin categoría?'} · {s.kind === 'stream' ? `Stream ${s.format}` : `Internet Archive: ${s.archive?.identifier}`} · {s.license.name || 'sin licencia'}
                </p>
                {issues.length > 0 && <p className="mt-1 text-xs text-accent">{issues.join(' ')}</p>}
                {t === 'running' && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
                    <Loader2 size={12} className="animate-spin" /> Probando conexión…
                  </p>
                )}
                {t && t !== 'running' && (
                  <p className={`mt-1 inline-flex items-start gap-1 text-xs ${t.ok ? 'text-accent-3' : 'text-accent'}`}>
                    {t.ok ? <CheckCircle2 size={12} className="mt-0.5" /> : <XCircle size={12} className="mt-0.5" />} {t.message}
                    {t.ms ? ` (${t.ms} ms)` : ''}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-1">
                <button type="button" onClick={() => void runTest(s)} className={`${btn} bg-white/10 hover:bg-white/15`}>
                  Probar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsNew(false);
                    setEditing(clone(s));
                  }}
                  className={`${btn} bg-white/10 hover:bg-white/15`}
                >
                  Editar
                </button>
                <button type="button" onClick={() => setWork({ ...work, stations: work.stations.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)) })} className={`${btn} bg-white/10 hover:bg-white/15`}>
                  {s.active ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  type="button"
                  onClick={() => window.confirm(`¿Eliminar «${s.name}»?`) && setWork({ ...work, stations: work.stations.filter((x) => x.id !== s.id) })}
                  className={`${btn} text-accent hover:bg-accent/10`}
                  aria-label={`Eliminar ${s.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-soft">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-muted">{hint}</span>}
    </label>
  );
}

function StationForm({
  station,
  isNew,
  categories,
  existingIds,
  onSave,
  onCancel,
}: {
  station: Station;
  isNew: boolean;
  categories: Category[];
  existingIds: string[];
  onSave: (s: Station) => void;
  onCancel: () => void;
}) {
  const [s, setS] = useState<Station>(station);
  const [test, setTest] = useState<SourceTest | 'running' | null>(null);
  const set = <K extends keyof Station>(k: K, v: Station[K]) => setS((p) => ({ ...p, [k]: v }));
  const setLic = (k: keyof Station['license'], v: string) => setS((p) => ({ ...p, license: { ...p.license, [k]: v } }));
  const final: Station = { ...s, id: s.id || slugify(s.name) };
  const issues = stationIssues(final);
  if (isNew && existingIds.includes(final.id)) issues.push('Ya existe una emisora con ese identificador; cambia el nombre.');

  return (
    <form
      className="space-y-4 rounded-2xl border border-line bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (issues.length === 0) onSave({ ...final, verifiedAt: test && test !== 'running' && test.ok ? new Date().toISOString().slice(0, 10) : final.verifiedAt });
      }}
    >
      <h2 className="font-display text-xl font-bold">{isNew ? 'Nueva emisora' : `Editar: ${station.name}`}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre">
          <input className={input} value={s.name} onChange={(e) => set('name', e.target.value)} required />
        </Field>
        <Field label="Categoría">
          <select className={input} value={s.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Descripción">
        <textarea className={input} rows={2} value={s.description} onChange={(e) => set('description', e.target.value)} />
      </Field>
      <Field label="Tipo de fuente">
        <select className={input} value={s.kind} onChange={(e) => set('kind', e.target.value as Station['kind'])}>
          <option value="stream">Stream en directo (Icecast, Shoutcast, AzuraCast, Zeno, HLS)</option>
          <option value="archive">Programa con pistas de Internet Archive (licencia libre)</option>
        </select>
      </Field>
      {s.kind === 'stream' ? (
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Field label="URL del stream" hint="Debe ser https. Ejemplos: https://tu-servidor:8000/radio.mp3 · https://…/playlist.m3u8">
            <input className={input} value={s.streamUrl ?? ''} onChange={(e) => set('streamUrl', e.target.value)} inputMode="url" />
          </Field>
          <Field label="Formato">
            <select className={input} value={s.format} onChange={(e) => set('format', e.target.value as Station['format'])}>
              <option value="auto">Detectar</option>
              <option value="mp3">MP3</option>
              <option value="aac">AAC</option>
              <option value="ogg">OGG/Opus</option>
              <option value="hls">HLS (.m3u8)</option>
            </select>
          </Field>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Identificador en archive.org" hint="Lo que va después de archive.org/details/">
            <input className={input} value={s.archive?.identifier ?? ''} onChange={(e) => set('archive', { folders: s.archive?.folders ?? [], ...s.archive, identifier: e.target.value.trim() })} />
          </Field>
          <Field label="Carpetas (una por línea, opcional)">
            <textarea
              className={input}
              rows={3}
              value={(s.archive?.folders ?? []).join('\n')}
              onChange={(e) =>
                set('archive', {
                  identifier: s.archive?.identifier ?? '',
                  ...s.archive,
                  folders: e.target.value
                    .split('\n')
                    .map((x) => x.trim())
                    .filter(Boolean),
                })
              }
            />
          </Field>
        </div>
      )}
      {s.kind === 'stream' && (
        <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
          <Field label="Metadatos (canción actual)">
            <select
              className={input}
              value={s.nowPlaying?.type ?? ''}
              onChange={(e) => set('nowPlaying', e.target.value ? { type: e.target.value as 'icecast' | 'azuracast', url: s.nowPlaying?.url ?? '' } : undefined)}
            >
              <option value="">No disponibles</option>
              <option value="icecast">Icecast (status-json.xsl)</option>
              <option value="azuracast">AzuraCast (API nowplaying)</option>
            </select>
          </Field>
          {s.nowPlaying && (
            <Field label="URL de metadatos" hint="Debe permitir CORS. Ej.: https://servidor/status-json.xsl">
              <input className={input} value={s.nowPlaying.url} onChange={(e) => set('nowPlaying', { ...s.nowPlaying!, url: e.target.value })} />
            </Field>
          )}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Imagen de portada (opcional, https)">
          <input className={input} value={s.image ?? ''} onChange={(e) => set('image', e.target.value || undefined)} />
        </Field>
        <Field label="Página web de la fuente (opcional)">
          <input className={input} value={s.website ?? ''} onChange={(e) => set('website', e.target.value || undefined)} />
        </Field>
      </div>
      <fieldset className="space-y-3 rounded-xl border border-line p-3">
        <legend className="px-1 text-xs font-semibold text-accent-2">Licencia y permiso de difusión (obligatorio)</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Licencia" hint="Ej.: Licencia OSA (Sayco-Acinpro) 2026, CC BY 4.0, Autorización escrita de la emisora">
            <input className={input} value={s.license.name} onChange={(e) => setLic('name', e.target.value)} required />
          </Field>
          <Field label="Enlace a la licencia o autorización">
            <input className={input} value={s.license.url ?? ''} onChange={(e) => setLic('url', e.target.value)} />
          </Field>
        </div>
        <Field label="Atribución visible para el oyente">
          <input className={input} value={s.license.attribution ?? ''} onChange={(e) => setLic('attribution', e.target.value)} />
        </Field>
        <Field label="Notas: qué permiso respalda la difusión en esta app">
          <textarea className={input} rows={2} value={s.license.notes} onChange={(e) => setLic('notes', e.target.value)} />
        </Field>
      </fieldset>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={s.active} onChange={(e) => set('active', e.target.checked)} /> Activa
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={!!s.popular} onChange={(e) => set('popular', e.target.checked)} /> Mostrar en populares
        </label>
      </div>
      {issues.length > 0 && <p className="text-sm text-accent">{issues.join(' ')}</p>}
      {test === 'running' && (
        <p className="inline-flex items-center gap-1 text-sm text-muted">
          <Loader2 size={14} className="animate-spin" /> Probando…
        </p>
      )}
      {test && test !== 'running' && <p className={`text-sm ${test.ok ? 'text-accent-3' : 'text-accent'}`}>{test.message}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={issues.length > 0} className={`${btn} bg-accent text-ink`}>
          Aplicar cambios
        </button>
        <button
          type="button"
          disabled={issues.length > 0 || test === 'running'}
          onClick={async () => {
            setTest('running');
            setTest(await testSource(final));
          }}
          className={`${btn} bg-white/10 hover:bg-white/15`}
        >
          Probar conexión
        </button>
        <button type="button" onClick={onCancel} className={`${btn} text-muted hover:bg-white/10`}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

/* ───────────── Categorías ───────────── */

function CategoriesTab({ work, setWork }: WorkProps) {
  const cats = useMemo(() => [...work.categories].sort((a, b) => a.order - b.order), [work.categories]);
  const update = (id: string, patch: Partial<Category>) => setWork({ ...work, categories: work.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const move = (i: number, dir: -1 | 1) => {
    const a = cats[i];
    const b = cats[i + dir];
    if (!a || !b) return;
    setWork({ ...work, categories: work.categories.map((c) => (c.id === a.id ? { ...c, order: b.order } : c.id === b.id ? { ...c, order: a.order } : c)) });
  };
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => {
          const name = window.prompt('Nombre de la nueva categoría');
          if (!name) return;
          const id = slugify(name);
          if (!id || work.categories.some((c) => c.id === id)) return window.alert('Ya existe una categoría con ese nombre.');
          setWork({
            ...work,
            categories: [...work.categories, { id, name, description: '', glyph: '🎵', colors: [brand.colors.accent, '#3b1d6e'], order: Math.max(0, ...work.categories.map((c) => c.order)) + 1, active: true }],
          });
        }}
        className={`${btn} bg-white/10 hover:bg-white/15`}
      >
        <Plus size={16} /> Nueva categoría
      </button>
      {cats.map((c, i) => {
        const used = work.stations.some((s) => s.categoryId === c.id) || work.playlists.some((p) => p.categoryId === c.id);
        return (
          <div key={c.id} className="grid gap-3 rounded-2xl border border-line bg-surface p-3 sm:grid-cols-[72px_1fr_auto]">
            <Cover category={c} className="h-[72px] w-[72px] text-sm" />
            <div className="grid gap-2 sm:grid-cols-2">
              <input className={input} value={c.name} onChange={(e) => update(c.id, { name: e.target.value })} aria-label="Nombre" />
              <div className="flex gap-2">
                <input className={`${input} w-16 text-center`} value={c.glyph} onChange={(e) => update(c.id, { glyph: e.target.value })} aria-label="Símbolo" />
                <input type="color" value={c.colors[0]} onChange={(e) => update(c.id, { colors: [e.target.value, c.colors[1]] })} className="h-10 w-12 rounded-lg bg-transparent" aria-label="Color 1" />
                <input type="color" value={c.colors[1]} onChange={(e) => update(c.id, { colors: [c.colors[0], e.target.value] })} className="h-10 w-12 rounded-lg bg-transparent" aria-label="Color 2" />
              </div>
              <input className={`${input} sm:col-span-2`} value={c.description} onChange={(e) => update(c.id, { description: e.target.value })} aria-label="Descripción" placeholder="Descripción" />
              <input
                className={`${input} sm:col-span-2`}
                value={c.image ?? ''}
                onChange={(e) => update(c.id, { image: e.target.value || undefined })}
                aria-label="Imagen de portada"
                placeholder="Imagen de portada (https, opcional)"
              />
              {c.image && !checkHttpsUrl(c.image).ok && <p className="text-xs text-accent sm:col-span-2">La imagen debe ser una URL https válida.</p>}
            </div>
            <div className="flex flex-wrap items-start gap-1 sm:flex-col">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className={`${btn} bg-white/10`} aria-label="Subir">
                <ArrowUp size={16} />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === cats.length - 1} className={`${btn} bg-white/10`} aria-label="Bajar">
                <ArrowDown size={16} />
              </button>
              <button type="button" onClick={() => update(c.id, { active: !c.active })} className={`${btn} bg-white/10`}>
                {c.active ? 'Ocultar' : 'Mostrar'}
              </button>
              <button
                type="button"
                disabled={used}
                title={used ? 'Tiene emisoras o playlists: muévelas primero' : 'Eliminar'}
                onClick={() => window.confirm(`¿Eliminar «${c.name}»?`) && setWork({ ...work, categories: work.categories.filter((x) => x.id !== c.id) })}
                className={`${btn} text-accent hover:bg-accent/10`}
                aria-label={`Eliminar ${c.name}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────── Spotify ───────────── */

function SpotifyTab({ work, setWork }: WorkProps) {
  const [clientId, setClientIdState] = useState(sp.getClientId());
  const [connected, setConnected] = useState(sp.isConnected());
  const [mine, setMine] = useState<sp.MyPlaylist[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState('');
  const [linkCat, setLinkCat] = useState(work.categories[0]?.id ?? '');
  const fromEnv = !!(import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined);

  const addRef = (ref: SpotifyPlaylistRef) => setWork({ ...work, playlists: [...work.playlists.filter((p) => p.id !== ref.id), ref] });

  async function loadMine() {
    setLoading(true);
    setError(null);
    try {
      setMine(await sp.myPlaylists());
    } catch (e) {
      setError((e as Error).message);
      setConnected(sp.isConnected());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (connected && !mine) void loadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-2xl border border-line bg-surface p-4 text-sm">
        <h2 className="font-display text-lg font-bold">1 · Añadir playlists por enlace</h2>
        <p className="text-muted">Funciona con cualquier playlist pública, sin conectar cuenta. Los oyentes la escuchan con el reproductor oficial de Spotify.</p>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <input className={input} value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://open.spotify.com/playlist/…" aria-label="Enlace de la playlist" />
          <select className={input} value={linkCat} onChange={(e) => setLinkCat(e.target.value)} aria-label="Categoría">
            {work.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={`${btn} bg-[#1ed760] text-black`}
            onClick={async () => {
              const id = parseSpotifyPlaylist(link);
              if (!id) return setError('El enlace no es de una playlist de Spotify.');
              try {
                const m = await sp.fetchOEmbed(id);
                addRef({ id, url: sp.playlistUrl(id), categoryId: linkCat, title: m.title, thumbnail: m.thumbnail_url });
                setLink('');
                setError(null);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <Link2 size={16} /> Añadir
          </button>
        </div>
        {error && <p className="text-accent">{error}</p>}
        {work.playlists.length > 0 && (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {work.playlists.map((p) => (
              <li key={p.id} className="flex items-center gap-3 p-2">
                {p.thumbnail ? <img src={p.thumbnail} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <span className="h-10 w-10 rounded-lg bg-white/10" />}
                <span className="min-w-0 flex-1 truncate">{p.title ?? p.id}</span>
                <select className={`${input} w-auto`} value={p.categoryId} onChange={(e) => addRef({ ...p, categoryId: e.target.value })} aria-label="Categoría">
                  {work.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => setWork({ ...work, playlists: work.playlists.filter((x) => x.id !== p.id) })} className="text-accent" aria-label="Quitar">
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-line bg-surface p-4 text-sm">
        <h2 className="font-display text-lg font-bold">2 · Importar desde tu cuenta (opcional)</h2>
        <ol className="space-y-1 text-muted">
          <li>
            Crea una app en{' '}
            <a className="text-accent-3 underline" href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer">
              developer.spotify.com/dashboard
            </a>{' '}
            (marca «Web API»).
          </li>
          <li>
            En «Redirect URIs» añade exactamente: <code className="break-all rounded bg-ink px-1.5 py-0.5 text-soft">{sp.redirectUri()}</code>
          </li>
          <li>Copia el Client ID aquí. Es público por diseño: con PKCE no hay secreto en la app.</li>
          <li>Requisitos de Spotify en modo desarrollo: el dueño de la app debe tener Premium y solo pueden conectarse hasta 5 usuarios que añadas en «User Management».</li>
        </ol>
        <div className="flex gap-2">
          <input
            className={input}
            value={clientId}
            disabled={fromEnv}
            onChange={(e) => setClientIdState(e.target.value)}
            placeholder="Client ID de Spotify"
            aria-label="Client ID de Spotify"
          />
          {!fromEnv && (
            <button type="button" className={`${btn} bg-white/10`} onClick={() => sp.setClientId(clientId)}>
              Guardar
            </button>
          )}
        </div>
        {connected ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" className={`${btn} bg-white/10`} onClick={() => void loadMine()}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />} Recargar mis playlists
            </button>
            <button
              type="button"
              className={`${btn} text-muted hover:bg-white/10`}
              onClick={() => {
                sp.disconnect();
                setConnected(false);
                setMine(null);
              }}
            >
              <LogOut size={16} /> Desconectar
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={!clientId}
            className={`${btn} bg-[#1ed760] text-black`}
            onClick={() => {
              sp.setClientId(clientId);
              sp.startLogin().catch((e: Error) => setError(e.message));
            }}
          >
            Conectar con Spotify
          </button>
        )}
        {mine && (
          <ul className="max-h-96 divide-y divide-line overflow-y-auto rounded-xl border border-line">
            {mine.map((p) => {
              const added = work.playlists.some((x) => x.id === p.id);
              return (
                <li key={p.id} className="flex items-center gap-3 p-2">
                  {p.image ? <img src={p.image} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <span className="h-10 w-10 rounded-lg bg-white/10" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{p.name}</span>
                    <span className="text-[11px] text-muted">
                      {p.owner}
                      {p.total != null ? ` · ${p.total} canciones` : ''}
                      {p.isPublic === false ? ' · privada (los oyentes no podrán verla)' : ''}
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={added}
                    className={`${btn} bg-white/10`}
                    onClick={() => addRef({ id: p.id, url: sp.playlistUrl(p.id), categoryId: linkCat, title: p.name, thumbnail: p.image })}
                  >
                    {added ? 'Añadida' : 'Añadir'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ───────────── Publicar ───────────── */

function PublishTab({
  work,
  setWork,
  hasDraft,
  previewDraft,
  setPreviewDraft,
  discard,
}: WorkProps & { hasDraft: boolean; previewDraft: boolean; setPreviewDraft: (v: boolean) => void; discard: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  function exportJson() {
    const blob = new Blob([JSON.stringify({ ...work, version: work.version + 1, updatedAt: new Date().toISOString().slice(0, 10) }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'catalog.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }
  return (
    <div className="space-y-4 text-sm">
      <section className="space-y-3 rounded-2xl border border-line bg-surface p-4">
        <h2 className="font-display text-lg font-bold">Vista previa</h2>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={previewDraft} disabled={!hasDraft} onChange={(e) => setPreviewDraft(e.target.checked)} />
          <Eye size={16} /> Ver el borrador en lugar del catálogo publicado (solo en este navegador)
        </label>
        {!hasDraft && <p className="text-xs text-muted">Guarda un borrador para poder previsualizarlo.</p>}
      </section>

      <section className="space-y-3 rounded-2xl border border-line bg-surface p-4">
        <h2 className="font-display text-lg font-bold">Publicar para todos</h2>
        <ol className="list-decimal space-y-1 pl-5 text-muted">
          <li>Descarga el catálogo.</li>
          <li>
            Sustituye <code className="text-soft">radio-mix/src/data/catalog.json</code> en el repositorio de GitHub (puedes hacerlo desde la web de GitHub: «Edit» o «Upload files»).
          </li>
          <li>
            Ejecuta <code className="text-soft">npm run build:pages</code> y sube la carpeta <code className="text-soft">app/</code>, o pídele a Claude que lo publique.
          </li>
        </ol>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportJson} className={`${btn} bg-accent text-ink`}>
            <Download size={16} /> Descargar catalog.json
          </button>
          <label className={`${btn} cursor-pointer bg-white/10 hover:bg-white/15`}>
            <Upload size={16} /> Importar JSON
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  setWork(parseCatalog(JSON.parse(await f.text())));
                  setMsg('Catálogo importado. Revisa y guarda el borrador.');
                } catch (err) {
                  setMsg(`No se pudo importar: ${(err as Error).message}`);
                }
                e.target.value = '';
              }}
            />
          </label>
          <button type="button" onClick={discard} disabled={!hasDraft} className={`${btn} text-accent hover:bg-accent/10`}>
            <Trash2 size={16} /> Descartar borrador
          </button>
        </div>
        {msg && <p className="text-accent-3">{msg}</p>}
      </section>

      <section className="space-y-2 rounded-2xl border border-line bg-surface p-4 text-muted">
        <h2 className="font-display text-lg font-bold text-white">Nombre, logotipo y colores</h2>
        <p>
          Se cambian en <code className="text-soft">radio-mix/src/config/brand.ts</code> (nombre, monograma o URL del logotipo, colores y contacto). El manifiesto de la app instalable y los textos legales
          toman esos valores al compilar. Iconos: <code className="text-soft">npm run icons</code>.
        </p>
      </section>
    </div>
  );
}
