import type { ImageAsset } from '../core/types';
import type { ProjectApi } from '../store';
import { LIBRARY_CATEGORIES } from '../providers/local';
import { categoryEmoji } from '../core/render';

export function DreamsPanel({ api, selectedId, onSelect, onOpenPicker }: {
  api: ProjectApi; selectedId: string | null; onSelect: (id: string | null) => void; onOpenPicker: (id: string) => void;
}) {
  const { project, assetMap, actions } = api;
  const { content } = project;
  const MAX = 16;
  return (
    <>
      <div className="section">
        <h3>Tu mapa</h3>
        <div className="field">
          <label htmlFor="bt">Título</label>
          <input id="bt" className="input" value={content.title} maxLength={60} onChange={(e) => actions.updateContent((c) => ({ ...c, title: e.target.value }))} />
        </div>
        <div className="field">
          <label htmlFor="bs">Frase o año</label>
          <input id="bs" className="input" value={content.subtitle} maxLength={90} onChange={(e) => actions.updateContent((c) => ({ ...c, subtitle: e.target.value }))} />
        </div>
        <div className="field">
          <label htmlFor="bw">Palabras de poder</label>
          <input id="bw" className="input" placeholder="Gratitud, Abundancia, Disciplina" value={(content.words ?? []).join(', ')}
            onChange={(e) => actions.updateContent((c) => ({ ...c, words: e.target.value.split(',').map((w) => w.trimStart()).slice(0, 8) }))} />
          <span className="hint" style={{ margin: 0 }}>Separadas por comas. Aparecen como etiquetas, notas o stickers en las plantillas Scrapbook, Corcho, Aura y Dopamina.</span>
        </div>
      </div>
      <div className="section">
        <h3>Sueños ({content.dreams.length})</h3>
        <div className="dream-list">
          {content.dreams.map((d, i) => {
            const a: ImageAsset | undefined = d.imageId ? assetMap.get(d.imageId) : undefined;
            const sel = selectedId === d.id;
            return (
              <div key={d.id} className={`dream-card ${sel ? 'sel' : ''}`}>
                <div className="dream-head" onClick={() => onSelect(sel ? null : d.id)}>
                  <div className="thumb" style={a ? { backgroundImage: `url("${a.thumb ?? a.src}")` } : undefined}>{!a && categoryEmoji(d.category)}</div>
                  <div className="meta">
                    <b>{d.title || 'Sin título'}</b>
                    <small>{a ? a.title : 'Sin imagen'}</small>
                  </div>
                  <span aria-hidden className="hint">{sel ? '▾' : '▸'}</span>
                </div>
                {sel && (
                  <div className="dream-body">
                    <div className="field" style={{ marginTop: 8 }}>
                      <label htmlFor={`t-${d.id}`}>Título corto (aparece en el mapa)</label>
                      <input id={`t-${d.id}`} className="input" value={d.title} maxLength={40} onChange={(e) => actions.updateDream(d.id, { title: e.target.value })} />
                    </div>
                    <div className="field">
                      <label htmlFor={`d-${d.id}`}>Describe tu sueño</label>
                      <textarea id={`d-${d.id}`} className="input" rows={2} placeholder="Ej.: Quiero un Toyota Fortuner negro 2027" value={d.description} onChange={(e) => actions.updateDream(d.id, { description: e.target.value })} />
                      <span className="hint" style={{ margin: 0 }}>Lo usamos para buscar o generar la imagen perfecta.</span>
                    </div>
                    <div className="row">
                      <div className="field grow">
                        <label htmlFor={`c-${d.id}`}>Categoría</label>
                        <select id={`c-${d.id}`} className="input" value={d.category} onChange={(e) => actions.updateDream(d.id, { category: e.target.value })}>
                          {LIBRARY_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{categoryEmoji(c.id)} {c.label}</option>)}
                        </select>
                      </div>
                      <div className="field grow">
                        <label htmlFor={`l-${d.id}`}>Lugar (opcional)</label>
                        <input id={`l-${d.id}`} className="input" value={d.location ?? ''} placeholder="Ej.: Cartagena" onChange={(e) => actions.updateDream(d.id, { location: e.target.value })} />
                      </div>
                    </div>
                    <div className="row" style={{ flexWrap: 'wrap' }}>
                      <button className="btn primary sm" onClick={() => onOpenPicker(d.id)}>🖼️ {a ? 'Cambiar imagen' : 'Elegir imagen'}</button>
                      <span className="grow" />
                      <button className="icon-btn" title="Subir" aria-label="Mover arriba" disabled={i === 0} onClick={() => actions.moveDream(d.id, -1)}>↑</button>
                      <button className="icon-btn" title="Bajar" aria-label="Mover abajo" disabled={i === content.dreams.length - 1} onClick={() => actions.moveDream(d.id, 1)}>↓</button>
                      <button className="icon-btn" title="Eliminar sueño" aria-label="Eliminar sueño" onClick={() => { actions.removeDream(d.id); onSelect(null); }}>🗑️</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button className="btn block" style={{ marginTop: 10 }} disabled={content.dreams.length >= MAX} onClick={() => onSelect(actions.addDream())}>
          ＋ Agregar sueño
        </button>
        {content.dreams.length >= MAX && <p className="hint">Máximo {MAX} sueños para que cada uno se vea bien.</p>}
      </div>
    </>
  );
}
