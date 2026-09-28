import { useEffect, useMemo, useRef, useState } from 'react';
import type { AIStyle, ImageAsset, SearchResult } from '../core/types';
import type { ProjectApi } from '../store';
import { getTemplate } from '../core/templates';
import { isPrintCategory } from '../core/formats';
import { InMemoryLibrary, LIBRARY_CATEGORIES } from '../providers/local';
import { SEARCH_PROVIDERS } from '../providers/web';
import { pinterest, getAIProvider } from '../providers/external';
import { assetFromFile, SOURCE_LABELS } from '../providers/assets';
import { AI_STYLES, buildAIPrompt, buildSearchQuery, toEnglishQuery } from '../providers/query';
import { candidateQuality, ImageSpecs, QualityBadge } from './quality';
import { LicenseTag } from './Inspector';

type Tab = 'device' | 'library' | 'web' | 'pinterest' | 'ai';
type Candidate = { kind: 'asset'; asset: ImageAsset } | { kind: 'result'; result: SearchResult };

const TABS: { id: Tab; e: string; label: string }[] = [
  { id: 'device', e: '📁', label: 'Mi dispositivo' },
  { id: 'library', e: '🖼️', label: 'Biblioteca' },
  { id: 'web', e: '🌐', label: 'Búsqueda web' },
  { id: 'pinterest', e: '📌', label: 'Pinterest' },
  { id: 'ai', e: '✨', label: 'Generar con IA' },
];

export function ImagePicker({ api, dreamId, onClose }: { api: ProjectApi; dreamId: string; onClose: () => void }) {
  const { project, assets, actions } = api;
  const dream = project.content.dreams.find((d) => d.id === dreamId)!;
  const [tab, setTab] = useState<Tab>('library');
  const [cand, setCand] = useState<Candidate | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const useAsset = async (a: ImageAsset) => {
    if (a.source !== 'library') await actions.addAsset(a);
    actions.updateDream(dreamId, { imageId: a.id, focusX: 0.5, focusY: 0.5 });
    onClose();
  };

  const useCandidate = async () => {
    if (!cand) return;
    setError('');
    if (cand.kind === 'asset') return useAsset(cand.asset);
    setBusy(true);
    try {
      const provider = SEARCH_PROVIDERS.find((p) => p.id === cand.result.providerId) ?? SEARCH_PROVIDERS[0];
      const a = await provider.fetchAsset(cand.result);
      await useAsset(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const print = isPrintCategory(project.format.category);
  const specsOf = cand ? (cand.kind === 'asset' ? cand.asset : { width: cand.result.width, height: cand.result.height }) : null;
  const q = specsOf && specsOf.width > 0 ? candidateQuality(project, dreamId, specsOf) : null;

  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal wide" role="dialog" aria-modal="true" aria-labelledby="picker-title">
        <div className="modal-head">
          <h2 id="picker-title">¿De dónde quieres la imagen? <span className="hint">· {dream.title}</span></h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="modal-body">
          <div className="source-tabs">
            {TABS.map((t) => (
              <button key={t.id} className={`source-tab ${tab === t.id ? 'on' : ''}`} onClick={() => { setTab(t.id); setCand(null); setError(''); }}>
                <span className="e">{t.e}</span>{t.label}
              </button>
            ))}
          </div>
          <div className="picker-layout">
            <div>
              {tab === 'device' && <DeviceTab onPicked={(a) => setCand({ kind: 'asset', asset: a })} />}
              {tab === 'library' && <LibraryTab assets={assets} selected={cand?.kind === 'asset' ? cand.asset.id : null} onSelect={(a) => setCand({ kind: 'asset', asset: a })} onDelete={(id) => { actions.removeAsset(id); setCand(null); }} />}
              {tab === 'web' && <WebTab dream={dream} orientation={project.format.orientation} selected={cand?.kind === 'result' ? cand.result.id : null} onSelect={(r) => setCand({ kind: 'result', result: r })}
                onReference={(url, note) => actions.addReference(dreamId, { provider: 'web', url, note })} />}
              {tab === 'pinterest' && <PinterestTab api={api} dreamId={dreamId} />}
              {tab === 'ai' && <AITab api={api} dreamId={dreamId} onGenerated={(a) => setCand({ kind: 'asset', asset: a })} />}
            </div>
            <aside className="preview-pane" aria-live="polite">
              {!cand && tab !== 'pinterest' && <p className="hint" style={{ margin: 0 }}>Selecciona una imagen para ver su vista previa, resolución y calidad en tu mapa.</p>}
              {tab === 'pinterest' && !cand && (
                <p className="hint" style={{ margin: 0 }}>Las referencias de Pinterest <b>no se colocan en el mapa</b>: se guardan junto al sueño para inspirarte al elegir, buscar o generar la imagen.</p>
              )}
              {cand && specsOf && (
                <>
                  <div className="big-thumb" style={{ backgroundImage: `url("${cand.kind === 'asset' ? cand.asset.src : cand.result.thumbUrl}")` }} />
                  <b style={{ display: 'block', marginBottom: 6 }}>{cand.kind === 'asset' ? cand.asset.title : cand.result.title}</b>
                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className="label">CALIDAD {print ? 'DE IMPRESIÓN' : ''}</span>
                    {q ? <QualityBadge q={q} /> : <span className="hint">Tamaño desconocido</span>}
                  </div>
                  {specsOf.width > 0 && <ImageSpecs asset={specsOf} q={q} print={print} />}
                  {q?.level === 'insuficiente' && (
                    <p className="error-text">Esta imagen es pequeña para este tamaño. No la ampliaremos artificialmente: prueba otra, súbela en mayor resolución o genérala con IA.</p>
                  )}
                  {cand.kind === 'result' && (
                    <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
                      <span className="hint" style={{ margin: 0 }}>Fuente externa: {cand.result.sourceName}{cand.result.creator ? ` · ${cand.result.creator}` : ''}</span>
                      <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}><span className="tag">{cand.result.license.name}</span><LicenseTag commercial={cand.result.license.commercialUse} /></div>
                      <a className="hint" href={cand.result.pageUrl} target="_blank" rel="noreferrer noopener">Ver página de origen ↗</a>
                    </div>
                  )}
                  {cand.kind === 'asset' && cand.asset.source !== 'library' && (
                    <div className="row" style={{ marginTop: 10, gap: 6, flexWrap: 'wrap' }}>
                      <span className="tag">{SOURCE_LABELS[cand.asset.source]}</span>
                      {cand.asset.origin?.provider && <span className="tag">{cand.asset.origin.provider}</span>}
                    </div>
                  )}
                  {error && <p className="error-text">{error}</p>}
                  <button className="btn primary block" style={{ marginTop: 12 }} disabled={busy} onClick={useCandidate}>
                    {busy ? <span className="spinner" /> : null} {dream.imageId ? 'Reemplazar con esta imagen' : 'Usar esta imagen'}
                  </button>
                  {cand.kind === 'result' && (
                    <button className="btn ghost block sm" style={{ marginTop: 6 }} onClick={() => { actions.addReference(dreamId, { provider: 'web', url: cand.result.pageUrl, note: cand.result.title }); setError(''); }}>
                      📌 Guardar solo como referencia
                    </button>
                  )}
                </>
              )}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────── Mi dispositivo ───────── */
function DeviceTab({ onPicked }: { onPicked: (a: ImageAsset) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState('');
  const handle = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    setErr('');
    if (f.size > 60 * 1024 * 1024) { setErr('La imagen supera 60 MB.'); return; }
    try { onPicked(await assetFromFile(f)); } catch (e) { setErr(e instanceof Error ? e.message : 'No se pudo leer la imagen.'); }
  };
  return (
    <div>
      <div className={`dropzone ${drag ? 'drag' : ''}`} role="button" tabIndex={0}
        onClick={() => fileRef.current?.click()} onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files); }}>
        <div style={{ fontSize: 34 }}>📁</div>
        <b>Sube una imagen desde tu computador o teléfono</b>
        <p className="hint">Arrastra aquí o toca para elegir · JPG, PNG, WEBP, HEIC (según tu navegador)</p>
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn" onClick={() => camRef.current?.click()}>📷 Tomar una foto</button>
        <span className="hint" style={{ margin: 0 }}>Consejo: para imprimir en grande, usa la foto original (no capturas de pantalla ni imágenes de WhatsApp).</span>
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => handle(e.target.files)} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => handle(e.target.files)} />
      {err && <p className="error-text">{err}</p>}
    </div>
  );
}

/* ───────── Biblioteca local ───────── */
function LibraryTab({ assets, selected, onSelect, onDelete }: { assets: ImageAsset[]; selected: string | null; onSelect: (a: ImageAsset) => void; onDelete: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('todas');
  const lib = useMemo(() => new InMemoryLibrary(assets), [assets]);
  const items = lib.search(query, cat);
  const sel = assets.find((a) => a.id === selected);
  return (
    <div>
      <div className="row" style={{ marginBottom: 10 }}>
        <input className="input grow" placeholder="Buscar: casa, viaje, dinero…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar en la biblioteca" />
        {sel && sel.source !== 'library' && <button className="btn danger sm" onClick={() => onDelete(sel.id)}>🗑️ Eliminar</button>}
      </div>
      <div className="chips" style={{ marginBottom: 12 }}>
        {[{ id: 'todas', label: 'Todas' }, { id: 'mias', label: 'Mis imágenes' }, ...LIBRARY_CATEGORIES.filter((c) => c.id !== 'otro')].map((c) => (
          <button key={c.id} className={`chip ${cat === c.id ? 'on' : ''}`} onClick={() => setCat(c.id)}>{c.label}</button>
        ))}
      </div>
      {items.length === 0 && <p className="hint">No hay imágenes con ese filtro. {cat === 'mias' ? 'Las que subas, busques o generes aparecerán aquí.' : ''}</p>}
      <div className="img-grid">
        {items.map((a) => (
          <button key={a.id} className={`img-cell ${selected === a.id ? 'on' : ''}`} onClick={() => onSelect(a)} aria-label={a.title}>
            <img src={a.thumb ?? a.src} alt="" loading="lazy" />
            <span className="cap">{a.source !== 'library' ? `${SOURCE_LABELS[a.source].split(' ')[0]} ` : ''}{a.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────── Búsqueda web ───────── */
function WebTab({ dream, orientation, selected, onSelect, onReference }: {
  dream: { title: string; description: string; location?: string }; orientation: 'vertical' | 'horizontal' | 'cuadrado';
  selected: string | null; onSelect: (r: SearchResult) => void; onReference: (url: string, note?: string) => void;
}) {
  const auto = useMemo(() => buildSearchQuery(dream), [dream]);
  const [providerId, setProviderId] = useState(SEARCH_PROVIDERS[0].id);
  const [english, setEnglish] = useState(true);
  const [query, setQuery] = useState(() => toEnglishQuery(auto));
  const [results, setResults] = useState<SearchResult[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'error' | 'done'>('idle');
  const [err, setErr] = useState('');
  const provider = SEARCH_PROVIDERS.find((p) => p.id === providerId)!;

  const run = async (q = query) => {
    if (!q.trim()) return;
    setState('loading'); setErr('');
    try {
      const r = await provider.search(q.trim(), { orientation });
      setResults(r);
      setState('done');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setState('error');
    }
  };
  // Búsqueda automática a partir del sueño
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run(); }, [providerId]);

  return (
    <div>
      <div className="row" style={{ marginBottom: 8, flexWrap: 'wrap' }}>
        <input className="input grow" style={{ minWidth: 200 }} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run()} aria-label="Búsqueda de imágenes" />
        <button className="btn primary" onClick={() => run()}>Buscar</button>
      </div>
      <div className="row" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
        <select className="input" style={{ width: 'auto' }} value={providerId} onChange={(e) => setProviderId(e.target.value)} aria-label="Proveedor">
          {SEARCH_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <label className="check"><input type="checkbox" checked={english} onChange={(e) => { setEnglish(e.target.checked); const q = e.target.checked ? toEnglishQuery(auto) : auto; setQuery(q); run(q); }} /> Buscar en inglés (más resultados)</label>
      </div>
      <p className="hint" style={{ marginTop: 0 }}>Consulta creada desde tu sueño: «{auto}». Solo bancos con licencias abiertas; revisa siempre la licencia antes de un uso comercial.</p>
      {state === 'loading' && <p className="hint"><span className="spinner" /> Buscando…</p>}
      {state === 'error' && (
        <div className="notice">
          <b>No pudimos conectar con {provider.name}.</b> {err}
          <br />Prueba otro proveedor, revisa tu conexión o usa la Biblioteca, tu dispositivo o la generación con IA.
        </div>
      )}
      {state === 'done' && results.length === 0 && <p className="hint">Sin resultados. Prueba con menos palabras.</p>}
      <div className="img-grid">
        {results.map((r) => (
          <button key={r.id} className={`img-cell ${selected === r.id ? 'on' : ''}`} onClick={() => onSelect(r)} aria-label={r.title}>
            <img src={r.thumbUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
            <span className="cap">{r.sourceName}</span>
          </button>
        ))}
      </div>
      {state === 'done' && results.length > 0 && (
        <button className="btn ghost sm" style={{ marginTop: 10 }} onClick={() => onReference(`https://openverse.org/search/image?q=${encodeURIComponent(query)}`, `Búsqueda: ${query}`)}>📌 Guardar esta búsqueda como referencia</button>
      )}
    </div>
  );
}

/* ───────── Pinterest (referencias) ───────── */
function PinterestTab({ api, dreamId }: { api: ProjectApi; dreamId: string }) {
  const dream = api.project.content.dreams.find((d) => d.id === dreamId)!;
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const q = buildSearchQuery(dream);
  const save = () => {
    if (!/^https?:\/\//i.test(url.trim())) { setErr('Pega un enlace que empiece por https://'); return; }
    setErr('');
    api.actions.addReference(dreamId, { provider: pinterest.isValidReference(url) ? 'pinterest' : 'otro', url: url.trim(), note: note.trim() || undefined });
    setUrl(''); setNote('');
  };
  return (
    <div>
      <div className="notice" style={{ marginBottom: 12 }}>
        <b>Pinterest como inspiración.</b> DREAMMAP AI no copia imágenes de Pinterest. Abre la búsqueda, encuentra tu inspiración y guarda el enlace como <b>referencia</b> de este sueño. Para ponerla en el mapa, sube tu propia foto, busca una imagen con licencia o genérala con IA a partir de esa idea.
      </div>
      <a className="btn primary" href={pinterest.searchUrl(q)} target="_blank" rel="noreferrer noopener">📌 Buscar inspiración en Pinterest: «{q}» ↗</a>
      <h4>Guardar referencia</h4>
      <div className="field">
        <label htmlFor="pin-url">Enlace del pin o tablero</label>
        <input id="pin-url" className="input" placeholder="https://pin.it/…" value={url} onChange={(e) => setUrl(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="pin-note">Nota (opcional)</label>
        <input id="pin-note" className="input" placeholder="Ej.: este color de fachada" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {err && <p className="error-text">{err}</p>}
      <button className="btn" onClick={save}>Guardar referencia</button>
      {dream.references.length > 0 && (
        <>
          <h4>Referencias de este sueño</h4>
          {dream.references.map((r) => (
            <div key={r.id} className="ref-item">
              <span>{r.provider === 'pinterest' ? '📌' : '🔗'}</span>
              <a href={r.url} target="_blank" rel="noreferrer noopener">{r.note || r.url}</a>
              <span className="tag">Referencia</span>
              <button className="icon-btn" aria-label="Eliminar referencia" onClick={() => api.actions.removeReference(dreamId, r.id)}>✕</button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/* ───────── Generar con IA ───────── */
function AITab({ api, dreamId, onGenerated }: { api: ProjectApi; dreamId: string; onGenerated: (a: ImageAsset) => void }) {
  const { project, actions } = api;
  const dream = project.content.dreams.find((d) => d.id === dreamId)!;
  const [style, setStyle] = useState<AIStyle>('fotorealista');
  const template = getTemplate(project.templateId);
  const autoPrompt = buildAIPrompt({ dream, style, template, orientation: project.format.orientation, preferences: project.preferences });
  const [prompt, setPrompt] = useState(autoPrompt);
  const [edited, setEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [showCfg, setShowCfg] = useState(false);
  useEffect(() => { if (!edited) setPrompt(autoPrompt); }, [autoPrompt, edited]);
  const provider = getAIProvider(project.aiEndpoint);

  const generate = async () => {
    setBusy(true); setErr('');
    try {
      const long = 2048;
      const ar = project.format.widthMm / project.format.heightMm;
      const a = await provider.generate({ prompt, style, width: ar >= 1 ? long : Math.round(long * ar), height: ar >= 1 ? Math.round(long / ar) : long });
      onGenerated(a);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <span className="label">Estilo</span>
      <div className="chips" style={{ margin: '6px 0 12px' }}>
        {AI_STYLES.map((s) => <button key={s.id} className={`chip ${style === s.id ? 'on' : ''}`} onClick={() => setStyle(s.id)}>{s.label}</button>)}
      </div>
      <div className="field">
        <label htmlFor="prefs">Tus preferencias (se usan en todos los sueños)</label>
        <input id="prefs" className="input" placeholder="Ej.: tonos cálidos, personas latinas, estilo tropical" value={project.preferences} onChange={(e) => actions.setPreferences(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="prompt">Descripción visual (creada automáticamente, puedes editarla)</label>
        <textarea id="prompt" className="input" rows={5} value={prompt} onChange={(e) => { setPrompt(e.target.value); setEdited(true); }} />
        {edited && <button className="btn ghost sm" style={{ justifySelf: 'start' }} onClick={() => setEdited(false)}>↺ Volver a la automática</button>}
      </div>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button className="btn primary" disabled={busy || !prompt.trim()} onClick={generate}>{busy ? <span className="spinner" /> : '✨'} Generar imagen</button>
        <span className="hint" style={{ margin: 0 }}>Proveedor: {provider.name}</span>
        <button className="btn ghost sm" onClick={() => setShowCfg((v) => !v)}>⚙️ Configurar</button>
      </div>
      {!provider.isReal && (
        <div className="notice" style={{ marginTop: 10 }}>
          <b>Modo demostración.</b> Sin un proveedor conectado se crea una imagen de muestra marcada como «DEMO». Para imágenes reales, conecta tu servidor de IA (la clave del proveedor vive en el servidor, nunca en esta app).
        </div>
      )}
      {showCfg && (
        <div className="field" style={{ marginTop: 10 }}>
          <label htmlFor="endpoint">URL de tu servidor de generación (AIImageProvider)</label>
          <input id="endpoint" className="input" placeholder="https://tu-dominio.com/api/generate-image" value={project.aiEndpoint} onChange={(e) => actions.setAiEndpoint(e.target.value.trim())} />
          <span className="hint" style={{ margin: 0 }}>Recibe POST {'{prompt, style, width, height}'} y devuelve la imagen. Hay un ejemplo en <code>server/generate-image.example.mjs</code>.</span>
        </div>
      )}
      {err && <p className="error-text">{err}</p>}
    </div>
  );
}
